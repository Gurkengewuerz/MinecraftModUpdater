import {Alert, Button, Checkbox, Col, Empty, Progress, Row, Select, Tooltip} from "antd";
import {useContext, useEffect, useState} from "react";
import SplitPane from "react-split-pane";
import Pane from "react-split-pane/lib/Pane";

import AppContext from "../context/AppContext";
import "./Update.css";

const {Option} = Select;

const Update = () => {
  const appContext = useContext(AppContext);

  const [toAdd, setToAdd] = useState([]);

  useEffect(() => {
    if (appContext.versions.length === 0) appContext.fetchVersions();
  }, []);

  useEffect(() => {
    if (Object.keys(appContext.versionConfig).length > 0) {
      setToAdd(appContext.versionConfig.mods.filter(anyMod => anyMod["default"] === true));
    }
  }, [appContext.versionConfig]);

  useEffect(() => {
    // Must use useEffect to handle states correctly in useApp
    if (toAdd.length > 0) {
      appContext.selectMod(toAdd[toAdd.length - 1], true);
      setToAdd(toAdd.slice(0, -1));
    }
  }, [toAdd]);

  const handleVersionChange = async value => {
    await appContext.selectVersion(value.value);
  };

  const handleCheckboxChange = e => {
    appContext.selectMod(e.target.value, e.target.checked);
  };

  const handleMinecraftPath = e => {
    appContext.openFileDialog(appContext.setMinecraftPath);
  };

  const renderDownloadStatus = data => {
    const percentage = data.Percentage ? data.Percentage : 0;
    let status = "";
    if (percentage > 0 && percentage < 100) {
      status = "active";
    } else if (percentage >= 100) {
      status = "success";
    }
    if (data.IsCancel === true) {
      status = "exception";
    }

    let message = "";
    if (data.State) {
      message = `Lade ${data.State} herunter`;
      if (data.State === "FABRIC") message = "";
      else if (data.State === "CLEANUP") message = "Lösche alte und unbekannte Mods";
      else if (data.State === "FINISH") message = "Installation erfolgreich";
      else if (data.State === "CANCEL") message = "Installation abgebrochen";
    }
    return (
      <>
        <Progress strokeWidth={12} percent={percentage} status={status} />
        <span>{message}</span>
      </>
    );
  };

  const renderMods = () => {
    if (Object.keys(appContext.versionConfig).length === 0) return <Empty style={{margin: "auto"}} image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    const conflictMods = appContext.getModStatus();
    return appContext.versionConfig.mods.map(mod => {
      const isDisabled = conflictMods[mod.name].isConflict || conflictMods[mod.name].isDependency;
      const isSelected = appContext.selectedMods.find(selectedMod => selectedMod.name === mod.name) !== undefined;

      const checkBox = (
        <Checkbox checked={isSelected} disabled={isDisabled} onChange={handleCheckboxChange} value={mod}>
          {mod.name}
        </Checkbox>
      );

      let tooltipText = mod.tooltip;
      if (isDisabled) tooltipText = `${mod.name} steht im Konflikt mit ${conflictMods[mod.name].conflictWith.join(",")}`;
      if (isDisabled && isSelected) tooltipText = `${mod.name} wird benötigt durch ${conflictMods[mod.name].requiredBy.join(",")}`;

      return (
        <Col span={24}>
          {tooltipText ? (
            <Tooltip placement="right" title={tooltipText}>
              {checkBox}
            </Tooltip>
          ) : (
            checkBox
          )}
        </Col>
      );
    });
  };

  return (
    <div style={{height: "100%"}}>
      <SplitPane split="vertical">
        <Pane initialSize="50%" minSize="50%" maxSize="50%">
          <div onClick={handleMinecraftPath} style={{width: "100%"}}>
            <b>Minecraft: </b>
            <span style={{float: "right", marginRight: "1rem", cursor: "pointer"}}>
              {appContext.minecraftPath ? appContext.minecraftPath : <i>nicht erkannt</i>}
            </span>
          </div>
          <Select
            showSearch
            labelInValue
            disabled={appContext.isLoading}
            style={{width: "100%", marginTop: "1rem"}}
            placeholder="Minecraft Version"
            optionFilterProp="children"
            onChange={handleVersionChange}
            filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
            filterSort={(optionA, optionB) => optionA.children.toLowerCase().localeCompare(optionB.children.toLowerCase())}
          >
            {appContext.versions.map(ver => (
              <Option key={ver} value={ver}>
                {ver}
              </Option>
            ))}
          </Select>
          <h3 className="subtitle topMargin">Download</h3>
          {renderDownloadStatus(appContext.installResult)}
          <Button
            type="primary"
            style={{width: "100%", marginTop: "0.5rem"}}
            loading={appContext.isLoading}
            disabled={
              Object.keys(appContext.selectedMods).length === 0 ||
              !appContext.minecraftPath ||
              !appContext.availableVersions.includes(appContext.selectedVersion)
            }
            onClick={async () => {
              if (appContext.isLoading) return;
              await appContext.startInstall();
            }}
          >
            Mods installieren
          </Button>
          {appContext.selectedVersion && !appContext.availableVersions.includes(appContext.selectedVersion) && (
            <Alert
              style={{marginTop: "1rem"}}
              message={`Version ${appContext.selectedVersion} kann nicht installiert werden. Starte einmalig die Version ohne Mods oder überprüfe den Minecraft Pfad.`}
              type="error"
              showIcon
            />
          )}
        </Pane>
        <Pane initialSize="50%" minSize="50%" maxSize="50%" size="100%">
          <div
            style={{
              height: "100%",
              justifyContent: "space-between",
              flexDirection: "column",
              display: "flex",
            }}
          >
            <div>
              <h3 className="subtitle">Repository</h3>
              <Row
                style={{
                  marginLeft: "2rem",
                  marginRight: "2rem",
                }}
              >
                {renderMods()}
              </Row>
            </div>

            <Button
              type="ghost"
              loading={appContext.isLoading}
              onClick={async () => {
                if (appContext.isLoading) return;
                await appContext.fetchVersions();
                handleVersionChange({value: appContext.selectedVersion});
              }}
            >
              Update Repository
            </Button>
          </div>
        </Pane>
      </SplitPane>
    </div>
  );
};

export default Update;
