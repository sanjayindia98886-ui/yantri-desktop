import axios from "axios";
import { getCompanyId } from "./companyService";

// Axios Instance
const api = axios.create({
  baseURL: "http://localhost:5000/api"
});

// Interceptor: Har API Request mein company_id automatically bhejne ke liye
api.interceptors.request.use(
  function(config) {
    const companyId = getCompanyId();
    config.params = config.params || {};
    config.params.company_id = companyId;
    return config;
  },
  function(error) {
    return Promise.reject(error);
  }
);

export default api;