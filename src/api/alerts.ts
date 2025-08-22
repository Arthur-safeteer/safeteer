// src/api/alerts.ts
import axios from "axios";
import { getJwt } from "../auth/token";
import { httpColetar, coletarPath, FILTRAR_URL, STATUS_URL } from "./http";


export type ApiAlertHeaderRaw = {
  alerta_id: string;
  titulo?: string;
  created_at?: string | number;
  updated_at?: string | number;
  severidade?: string;   
  status?: string;       
  endpoint?: string;     
  categoria?: string;    
};

export async function listAlertHeaders(): Promise<ApiAlertHeaderRaw[]> {
  const { data } = await httpColetar.get(coletarPath("/alerta"));
  return data as ApiAlertHeaderRaw[];
}

export async function getAlertDetails(alerta_id: string) {
  const { data } = await httpColetar.get(coletarPath(`/alerta/${encodeURIComponent(alerta_id)}`));
  return data; 
}

/** Body aceito na Lambda de filtro */
export type FilterBody = {
  severidade?: string | string[];
  classificador?: string | string[];
  ferramenta?: string | string[];
  user?: string | string[];
  hostname?: string | string[];
  acao?: string | string[];
  data_inicio?: string; 
  data_fim?: string;    
};

export async function filterAlerts(body: FilterBody): Promise<ApiAlertHeaderRaw[]> {
  const jwt = getJwt();
  const { data } = await axios.post(FILTRAR_URL, body, {
    headers: {
      Authorization: jwt ? `Bearer ${jwt}` : "",
      "Content-Type": "application/json",
    },
  });
  return data as ApiAlertHeaderRaw[];
}

export type Status = "aberta" | "em_progresso" | "fechada";
export async function updateAlertStatus(alerta_id: string, status: Status) {
  const jwt = getJwt();
  const { data } = await axios.post(
    STATUS_URL,
    { alerta_id, status },
    {
      headers: {
        Authorization: jwt ? `Bearer ${jwt}` : "",
        "Content-Type": "application/json",
      },
    }
  );
  return data;
}
