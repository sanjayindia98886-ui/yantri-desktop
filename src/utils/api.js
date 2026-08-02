import axios from "axios";
import { getCompanyId } from "./companyService";

// Render Live Backend URL (Yahan apna Render URL daalein)
const RENDER_BACKEND_URL = "https://yantri-desktop.onrender.com/api";

const api = axios.create({
  baseURL: RENDER_BACKEND_URL
});

// Interceptor: Har API Request mein company_id automatically attach karne ke liye
api.interceptors.request.use(
  function(config) {
    const companyId = getCompanyId();

    // 1. GET Requests ke params mein company_id
    config.params = config.params || {};
    if (companyId) {
      config.params.company_id = companyId;
    }

    // 2. POST / PUT / DELETE Requests ki body mein company_id
    if (config.data && typeof config.data === "object" && !Array.isArray(config.data)) {
      if (companyId && !config.data.company_id) {
        config.data.company_id = companyId;
      }
    }

    return config;
  },
  function(error) {
    return Promise.reject(error);
  }
);

export default api;