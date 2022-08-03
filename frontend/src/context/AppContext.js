import React from "react";

export const DefaultAppContext = {
  fetchVersions: async () => {},
  selectVersion: async version => {},
  selectedVersion: undefined,
  versions: [],
  versionConfig: {},
  openFileDialog: cb => {},
  startInstall: () => {},
  cancelInstall: () => {},
  isLoading: false,
  selectedMods: [],
  selectMod: (mod, state) => {},
  getModStatus: () => {},
  minecraftPath: "",
  setMinecraftPath: path => {},
  changelog: {data: "", lastChanged: 0},
  getChangelog: async () => {},
  installResult: {},
  availableVersions: [],
};

const AppContext = React.createContext(DefaultAppContext);

export default AppContext;
