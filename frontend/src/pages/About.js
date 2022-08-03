import {BrowserOpenURL} from "@wailsapp/runtime";
import {Col, Image, Row} from "antd";
import React from "react";
import SplitPane from "react-split-pane";
import Pane from "react-split-pane/lib/Pane";

import staticContent from "../staticContent";

const About = () => {
  const linkStyle = {display: "inline", cursor: "pointer"};

  const handleURL = e => {
    e.preventDefault();
    const url = e.target.getAttribute("data-url");
    if (window.runtime) {
      BrowserOpenURL(url);
    } else window.open(url);
  };

  return (
    <div style={{height: "100%"}}>
      <SplitPane split="horizontal">
        <Pane initialSize="30%" minSize="30%" maxSize="30%">
          <Row>
            <Col span={12}>
              <h2>
                {staticContent.company} Mod Updater v{staticContent.version}
              </h2>
              <div>
                Entwickler-Seite:{" "}
                <div data-url={"https://mc8051.de"} onClick={handleURL} style={linkStyle}>
                  mc8051.de
                </div>
              </div>
              <div>
                Projekt-Seite:{" "}
                <div data-url={"https://github.com/Gurkengewuerz/MinecraftModUpdater"} onClick={handleURL} style={linkStyle}>
                  github.com/Gurkengewuerz/MinecraftModUpdater
                </div>
              </div>
              <div>Copyright (c) 2022-{new Date().getFullYear()} Niklas Schütrumpf (Gurkengewuerz)</div>
            </Col>
            <Col span={12} style={{width: "100%"}}>
              <Image
                width={128}
                preview={false}
                wrapperStyle={{
                  float: "right",
                  marginRight: "2rem",
                }}
                src="/logo.png"
              />
            </Col>
          </Row>
        </Pane>
        <Pane initialSize="70%" minSize="70%" maxSize="70%">
          <div style={{overflowY: "auto", wordWrap: "break-word", height: "100%"}}>
            <h1>Haftungsausschluss</h1>
            Gemäß <i>§1 Absatz 2 Satz 3 ProdHaftG</i> haftet das Entwickler-Team nicht für Schäden, die aus der Nutzung des Clients entstehen, da dieser
            unentgeltlich angeboten und ehrenamtlich entwickelt wird. Das Entwickler-Team übernimmt darüber hinaus keine Garantie für die ordnungsgemäße
            Funktion des Clients.
            <br />
            <br />
            Darausfolgt auch, dass es keinen Anspruch darauf gibt, dass der Client auf jedem System funktioniert oder Programmfehler durch Updates behoben
            werden. Wir bemühen uns zwar, ein fehlerfreies Programm anzubieten, bitten aber um Verständnis, dass nicht jeder Fehler unsererseits behoben werden
            kann.
            <br />
          </div>
        </Pane>
      </SplitPane>
    </div>
  );
};

export default About;
