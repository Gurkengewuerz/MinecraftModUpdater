import {EventsEmit, EventsOnce, EventsOnMultiple, LogDebug, LogError, LogInfo} from "@wailsapp/runtime";
import DOMPurify from "dompurify";
import {parse} from "marked";
import {useCallback, useEffect, useState} from "react";
import cmp from "semver-compare";

import http from "../http";
import staticContent from "../staticContent";

const useApp = () => {
  const isOnWails = window.runtime;

  const [selectedVersion, setSelectedVersion] = useState(undefined);
  const [selectedMods, setSelectedMods] = useState([]);
  const [versions, setVersions] = useState([]);
  const [availableVersions, setAvailableVersions] = useState([]);
  const [versionConfig, setVersionConfig] = useState({});
  const [isLoading, setLoading] = useState(false);
  const [minecraftPath, setMinecraftPath] = useState("");
  const [installResult, setInstallResult] = useState({});
  const [changelog, setChangelog] = useState({
    data: "",
    lastChanged: 0,
  });

  useEffect(() => {
    if (isOnWails) {
      EventsOnMultiple("minecraftPath", path => {
        setMinecraftPath(path);
      });

      EventsOnMultiple("install_result", data => {
        warpWailsLog(LogDebug, JSON.stringify(data));
        setInstallResult(data);
      });

      EventsOnMultiple("getMinecraftVersions_result", data => {
        warpWailsLog(LogDebug, JSON.stringify(data));
        setAvailableVersions(data);
      });
    }
  }, []);

  useEffect(() => {
    if (minecraftPath) {
      if (isOnWails) {
        EventsEmit("getMinecraftVersions", minecraftPath);
      }
    } else setAvailableVersions([]);
  }, [minecraftPath]);

  const warpWailsLog = (func, msg) => {
    if (isOnWails) func(msg);
    else console.log(msg);
  };

  const fetchVersions = useCallback(async () => {
    setLoading(true);

    const res = await http.get(`/versions.json?ts=${new Date().getTime()}`);
    const statusCode = res.status;
    if (statusCode !== 200) {
      const err = {name: "HTTPException", message: "Fehler beim Abrufen der Versionen"};
      warpWailsLog(LogError, JSON.stringify(err));
      setLoading(false);
      throw err;
    }
    const availableVersions = res.data.versions;
    warpWailsLog(LogInfo, `Fetched ${availableVersions.length} versions`);

    if (versions.length === 0) {
      const newVer = res.data.updater.version;
      if (!staticContent.version.includes("-") && cmp(newVer, staticContent.version) === 1) {
        notification("info", "Neues Update", `Ein Update auf v${newVer} steht bereit`);
      }
    }

    setVersions(availableVersions);
    setLoading(false);
  });

  const fetchVersionConfig = useCallback(async version => {
    setLoading(true);

    const res = await http.get(`/versions/${version}.json?ts=${new Date().getTime()}`);
    const statusCode = res.status;
    if (statusCode !== 200) {
      const err = {
        name: "HTTPException",
        mesage: `Fehler beim Abrufen der Version Config für Version ${version}`,
      };
      warpWailsLog(LogError, JSON.stringify(err));
      setLoading(false);
      throw err;
    }
    warpWailsLog(LogInfo, `Fetched versionConfig for version ${version} with ${res.data.mods.length} mods`);
    setLoading(false);
    return res.data;
  });

  const selectVersion = useCallback(async version => {
    if (!version) return;
    warpWailsLog(LogInfo, `Selected ${version}`);

    const res = await fetchVersionConfig(version);
    setSelectedVersion(version);
    setVersionConfig(res);
    setSelectedMods([]);

    if (isOnWails) {
      EventsEmit("selectedVersion", version);
      EventsEmit("selectedVersionConfig", res);
    }
    return res;
  });

  const selectMod = useCallback((mod, state) => {
    if (!versionConfig) return;
    warpWailsLog(LogInfo, `selected mod ${mod.name}`);
    const conflict = getModStatus()[mod.name];
    if (state) {
      if (selectedMods.some(selectedMod => selectedMod.name === mod.name)) return;
      if (conflict.isConflict) {
        throw {
          name: "ModConflict",
          message: `${mod.name} steht im Konflikt mit ${conflict.conflictWith.join(",")}`,
        };
      }
      let newMod = [mod];
      if (mod.depends) {
        const notSelected = mod.depends
          .map(dependency => {
            const dependencyMod = versionConfig.mods.find(anyMod => anyMod.name === dependency);
            if (!dependencyMod) return;
            return {...dependencyMod, isDependency: true};
          })
          .filter(a => a);
        if (notSelected.length > 0) newMod = [...newMod, ...notSelected];
      }

      setSelectedMods([...selectedMods.filter(a => !newMod.map(b => b.name).includes(a.name)), ...newMod]);
    } else {
      if (conflict.isDependency) return;
      const newSlectedMods = selectedMods.filter(selectedMod => selectedMod.name !== mod.name);

      setSelectedMods(
        newSlectedMods.map(selectedMod => {
          // cleanup dependencies
          if (!selectedMod.isDependency) return selectedMod;
          const stillRequired = newSlectedMods.filter(a => a.depends).filter(a => a.depends.includes(selectedMod.name));

          if (stillRequired.length > 0) return selectedMod;
          delete selectedMod.isDependency;
          return selectedMod;
        })
      );
    }
  });

  const getModStatus = useCallback(() => {
    if (Object.keys(versionConfig).length === 0) return [];
    const selectedModsName = selectedMods.map(selectedMod => selectedMod.name);
    let ret = {};
    versionConfig.mods.forEach(mod => {
      let conflictAlready = selectedMods.filter(selectedMod => selectedMod.conflicts.includes(mod.name)).map(m => m.name);
      let canConflict = mod.conflicts.filter(conflictMod => selectedModsName.includes(conflictMod));
      let dependency = selectedMods.filter(selectedMod => selectedMod.name === mod.name).filter(selectedMod => selectedMod.isDependency);
      let requiredBy = selectedMods
        .filter(selectedMod => selectedMod.depends !== undefined)
        .filter(anyMod => anyMod.depends.includes(mod.name))
        .map(m => m.name);
      ret[mod.name] = {
        isConflict: conflictAlready.length > 0 || canConflict.length > 0,
        conflictWith: [...conflictAlready, ...canConflict],
        isDependency: dependency.length > 0,
        requiredBy,
      };
    });
    return ret;
  });

  const openFileDialog = useCallback(cb => {
    if (!isOnWails) return;
    EventsOnce("openDirectoryDialog_result", data => {
      warpWailsLog(LogDebug, JSON.stringify(data));
      cb(data);
    });
    EventsEmit("openDirectoryDialog");
  });

  const startInstall = useCallback(() => {
    if (!isOnWails) return;
    EventsEmit("startInstall", {
      ...versionConfig,
      mods: selectedMods,
      mcDir: minecraftPath,
      mcVersion: selectedVersion,
      packFolder: versionConfig.packFolder || ".modupdater"
    });
  });

  const cancelInstall = useCallback(() => {
    if (!isOnWails) return;
    EventsEmit("cancelInstall");
  });

  const notification = useCallback((type, title, message) => {
    if (!isOnWails) {
      console.log(`notification-${type}`, {title, message});
      return;
    }
    EventsEmit("notification", {type, title, message});
  });

  const getChangelog = useCallback(async () => {
    const now = new Date().getTime();
    if (now - changelog.lastChanged < 5 * 60 * 1000) return;
    const res = await http.get("/changelog.md?ts=${new Date().getTime()}");
    const statusCode = res.status;
    if (statusCode !== 200) {
      const err = {name: "HTTPException", message: "Fehler beim Abrufen des Changelogs"};
      warpWailsLog(LogError, JSON.stringify(err));
      throw err;
    }
    warpWailsLog(LogInfo, `Fetched Changelog successfully`);
    const parsedData = DOMPurify.sanitize(parse(res.data));
    setChangelog({
      ...changelog,
      data: parsedData,
      lastChanged: now,
    });
  });

  return {
    selectedVersion,
    versions,
    versionConfig,
    fetchVersions,
    selectVersion,
    openFileDialog,
    startInstall,
    cancelInstall,
    isLoading,
    selectedMods,
    selectMod,
    getModStatus,
    minecraftPath,
    setMinecraftPath,
    changelog,
    getChangelog,
    installResult,
    availableVersions,
  };
};

export default useApp;
