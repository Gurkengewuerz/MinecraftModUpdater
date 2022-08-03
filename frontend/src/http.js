import axios from "axios";

import staticContent from "./staticContent";

const fetchClient = () => {
  const defaultOptions = {
    baseURL: staticContent.api,
    method: "get",
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: false,
  };

  let instance = axios.create(defaultOptions);

  instance.interceptors.request.use(function (config) {
    const token = localStorage.getItem("token");
    config.headers.Authorization = token ? `Bearer ${token}` : "";
    return config;
  });

  return instance;
};

export default fetchClient();
