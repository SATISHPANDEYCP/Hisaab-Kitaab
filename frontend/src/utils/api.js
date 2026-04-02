import axios from "axios";

const getApiBaseUrl = () => {
  const explicitBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL;

  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/$/, "");
  }

  if (import.meta.env.DEV) {
    return "http://localhost:5000/api";
  }

  throw new Error("VITE_API_BASE_URL is required in production.");
};

const API = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

export default API;
