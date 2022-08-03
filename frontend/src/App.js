import {CloseOutlined, GithubOutlined, TwitterOutlined} from "@ant-design/icons";
import {BrowserOpenURL, Quit} from "@wailsapp/runtime";
import {Col, Empty, Image, Layout, Row} from "antd";
import React, {useState} from "react";

import "./App.css";
import AppContext from "./context/AppContext";
import useApp from "./hooks/useApp";
import About from "./pages/About";
import Changelog from "./pages/Changelog";
import Update from "./pages/Update";
import staticContent from "./staticContent";

const {Header, Content, Footer} = Layout;

function App() {
  const appContextData = useApp();

  const [currentPage, setCurrentPage] = useState(10);

  const renderPage = page => {
    switch (page) {
      case 10:
        return <Update />;
      case 20:
        return <Changelog />;
      case 900:
        return <About />;
      default:
        return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }
  };

  return (
    <AppContext.Provider value={appContextData}>
      <Layout className="layout">
        <Header style={{padding: "0 0.8rem"}} data-wails-drag>
          <Row>
            <Col span={5}>
              <h2>{staticContent.title}</h2>
            </Col>
            <Col span={17} style={{display: "inline-flex", height: "fit-content"}}>
              {[
                {
                  title: "Update",
                  pageID: 10,
                },
                {
                  title: "Changelog",
                  pageID: 20,
                },
                {
                  title: "About",
                  pageID: 900,
                },
              ].map(entry => {
                return (
                  <div
                    data-wails-no-drag
                    onClick={e => {
                      e.preventDefault();
                      setCurrentPage(entry.pageID);
                    }}
                    className="nav-item"
                  >
                    {entry.title}
                  </div>
                );
              })}
            </Col>
            <Col span={2} style={{textAlign: "end", fontSize: "1.3rem"}}>
              <CloseOutlined
                className="quit"
                onClick={e => {
                  e.preventDefault();
                  Quit();
                }}
              />
            </Col>
          </Row>
        </Header>
        <Content>
          <div style={{padding: "0.5rem 1rem 0.2rem 1rem", height: "100%", width: "100%"}}>{renderPage(currentPage)}</div>
        </Content>
        <Footer style={{padding: "0 1rem"}}>
          <hr />
          <Row>
            <Col span={8} style={{display: "inline-flex"}}>
              <Image
                width={42}
                preview={false}
                style={{
                  paddingRight: "1rem",
                }}
                src="/logo.png"
              />
              <h3>
                {staticContent.company} v{staticContent.version}
              </h3>
            </Col>
            <Col span={8} style={{textAlign: "center", fontSize: "1.3rem"}}>
              {[
                {
                  title: "Twitter",
                  icon: <TwitterOutlined />,
                  link: staticContent.links.twitter,
                },
                {
                  title: "GitHub",
                  icon: <GithubOutlined />,
                  link: staticContent.links.github,
                },
              ].map(entry => {
                return (
                  <a
                    href="#"
                    title={entry.title}
                    onClick={e => {
                      e.preventDefault();
                      BrowserOpenURL(entry.link);
                    }}
                    style={{padding: "0 0.2rem", cursor: "pointer", color: "inherit"}}
                  >
                    {entry.icon}
                  </a>
                );
              })}
            </Col>
            <Col span={8}></Col>
          </Row>
        </Footer>
      </Layout>
    </AppContext.Provider>
  );
}

export default App;
