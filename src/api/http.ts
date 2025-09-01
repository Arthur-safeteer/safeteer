// Configuração HTTP compartilhada para chamadas ao coletor e lambdas de filtro/status
import axios from "axios";
import { getJwt } from "../auth/token";

// Junta segmentos de path, removendo barras duplicadas nas extremidades
function join(...parts: Array<string | undefined>) {
  const cleaned = parts
    .filter(Boolean)
    .map((p) => String(p).replace(/^\/+/, "").replace(/\/+$/, ""))
    .join("/");
  return cleaned.startsWith("/") ? cleaned : "/" + cleaned;
}

// Base e stage (opcionais) vindos do .env
const COLETAR_BASE = process.env.REACT_APP_COLETAR_BASE || "";
const COLETAR_STAGE = process.env.REACT_APP_COLETAR_STAGE || ""; 

if (!/^https?:\/\//.test(COLETAR_BASE)) {
  console.warn("[Safeteer] REACT_APP_COLETAR_BASE inválida/ausente. Usando fallback.");
}

// Instância HTTP para o coletor. Se não houver env, usa fallback público
export const httpColetar = axios.create({
  baseURL: COLETAR_BASE || "https://gyleaogu57.execute-api.us-east-2.amazonaws.com",
});

console.log("[coletar] base:", httpColetar.defaults.baseURL, "stage:", COLETAR_STAGE);

// Monta o path adicionando o stage quando existir
export function coletarPath(path: string) {
  return COLETAR_STAGE ? join("/", COLETAR_STAGE, path) : join("/", path);
}

// Endpoints das lambdas de filtro e status (vindos do .env)
export const FILTRAR_URL = process.env.REACT_APP_FILTRAR_URL!;
export const STATUS_URL = process.env.REACT_APP_STATUS_URL!;

// Interceptor global para anexar JWT automaticamente
[httpColetar].forEach((instance) => {
  instance.interceptors.request.use((config) => {
    const jwt = getJwt();
    if (jwt) config.headers.Authorization = `Bearer ${jwt}`;
    return config;
  });
});
