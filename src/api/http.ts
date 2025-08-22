// src/api/http.ts
import axios from "axios";
import { getJwt } from "../auth/token";

function join(...parts: Array<string | undefined>) {
  return parts
    .filter(Boolean)
    .map(p => p!.replace(/(^\/+|\/+$)/g, ""))
    .join("/")
    .replace(/^\//, "/");
}

const COLETAR_BASE = process.env.REACT_APP_COLETAR_BASE || "";
const COLETAR_STAGE = process.env.REACT_APP_COLETAR_STAGE || ""; // "prod" ou ""

if (!/^https?:\/\//.test(COLETAR_BASE)) {
  console.warn("[Safeteer] REACT_APP_COLETAR_BASE inválida/ausente. Usando fallback.");
}

export const httpColetar = axios.create({
  baseURL: COLETAR_BASE || "https://gyleaogu57.execute-api.us-east-2.amazonaws.com",
});

// log útil para ver no console do navegador
console.log("[coletar] base:", httpColetar.defaults.baseURL, "stage:", COLETAR_STAGE);

export function coletarPath(path: string) {
  // Se tiver stage, vira /prod/alerta; se não, fica /alerta
  return COLETAR_STAGE ? join("/", COLETAR_STAGE, path) : join("/", path);
}

export const FILTRAR_URL = process.env.REACT_APP_FILTRAR_URL!;
export const STATUS_URL = process.env.REACT_APP_STATUS_URL!;

[httpColetar].forEach((instance) => {
  instance.interceptors.request.use((config) => {
    const jwt = getJwt();
    if (jwt) config.headers.Authorization = `Bearer ${jwt}`;
    return config;
  });
});
