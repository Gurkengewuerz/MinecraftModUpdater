import {useContext, useEffect, useState} from "react";

import AppContext from "../context/AppContext";

const Changelog = () => {
  const appContext = useContext(AppContext);

  const [changelog, setChangelog] = useState("Keine Daten");

  useEffect(async () => {
    try {
      await appContext.getChangelog();
    } catch {
      setChangelog("Keine Daten.");
    }
  }, []);

  useEffect(async () => {
    setChangelog(appContext.changelog.data || "Keine Daten.");
  }, [appContext.changelog]);

  return <div dangerouslySetInnerHTML={{__html: changelog}} />;
};

export default Changelog;
