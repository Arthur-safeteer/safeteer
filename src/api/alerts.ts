// src/api/alerts.ts
import axios from "axios";
import { getJwt } from "../auth/token";
import { httpColetar, coletarPath, FILTRAR_URL, STATUS_URL } from "./http";

/** Payload que o front usa após normalização */
export type ApiAlertHeaderRaw = {
  alerta_id: string;
  titulo?: string;

  // datas
  data_evento?: string | number;     // preferido
  created_at?: string | number;      // fallback
  updated_at?: string | number;

  // classificação/estado
  severidade?: string;               // "Baixo" | "Médio" | "Alto" | "Crítico"
  status?: string;                   // "Aberto" | "Fechado" | "Em Progresso" | etc.

  // de onde veio
  origem?: string;                   // "Firewall" | "AD" | "Endpoint" | "Antivirus"
  endpoint?: string;                 // fallback (algumas rotas só mandam isso)

  // identificação
  cliente_id?: string;
  caminho_log?: string;
  categoria?: string;
};

/** Status aceitos para atualização */
export type Status = "aberta" | "em_progresso" | "fechada";

/** Body aceito na Lambda de filtro */
export type FilterBody = {
  severidade?: string | string[];
  status?: string | string[];
  data_inicio?: string;              // ex.: "2025-09-01T08:59:59-03:00"
  data_fim?: string;                 // idem
  ferramenta?: string | string[];    // Firewall | AD | Endpoint | Antivirus
  cliente_id?: string | string[];
};

/* ------------------------- Normalização ------------------------- */

function normalizeHeader(h: any): ApiAlertHeaderRaw {
  const r: ApiAlertHeaderRaw = {
    alerta_id: h.alerta_id ?? h.id ?? h.alertId ?? "",
    titulo: h.titulo ?? h.title,

    // datas: preferir data_evento; cair pra created_at/event_time
    data_evento: h.data_evento ?? h.event_time ?? h.created_at,
    created_at: h.created_at,
    updated_at: h.updated_at,

    severidade: h.severidade ?? h.severity,
    status: h.status ?? h.state,

    // origem: aceitar variantes comuns
    origem: h.origem ?? h.ferramenta ?? h.source ?? h.endpoint,
    endpoint: h.endpoint,

    cliente_id: h.cliente_id ?? h.customer_id,
    caminho_log: h.caminho_log ?? h.log_path,
    categoria: h.categoria ?? h.category,
  };

  // se só veio endpoint, usar como origem
  if (!r.origem && r.endpoint) r.origem = r.endpoint;
  // se não veio data_evento, usar created_at
  if (!r.data_evento && r.created_at) r.data_evento = r.created_at;

  return r;
}

function normalizeArray(arr: any[]): ApiAlertHeaderRaw[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(normalizeHeader);
}

/* --------------------------- Calls --------------------------- */

/**
 * Lista alertas. Preferimos a rota de filtro (shape mais rico) mesmo sem critérios.
 * Se a API recusar body vazio, fazemos fallback para o coletor (/alerta).
 */
export async function listAlertHeaders(): Promise<ApiAlertHeaderRaw[]> {
  const jwt = getJwt();
  try {
    const { data } = await axios.post(
      FILTRAR_URL,
      {}, // sem filtros → todos
      {
        headers: {
          Authorization: jwt ? `Bearer ${jwt}` : "",
          "Content-Type": "application/json",
        },
      }
    );
    return normalizeArray(data);
  } catch {
    const { data } = await httpColetar.get(coletarPath("/alerta"));
    return normalizeArray(data);
  }
}

// Busca detalhes de um alerta específico (por id)
export async function getAlertDetails(alerta_id: string) {
  const { data } = await httpColetar.get(
    coletarPath(`/alerta/${encodeURIComponent(alerta_id)}`)
  );
  return data;
}

// Filtra no backend (POST) e já normaliza o resultado
export async function filterAlerts(body: FilterBody): Promise<ApiAlertHeaderRaw[]> {
  const jwt = getJwt();
  const { data } = await axios.post(FILTRAR_URL, body, {
    headers: {
      Authorization: jwt ? `Bearer ${jwt}` : "",
      "Content-Type": "application/json",
    },
  });
  return normalizeArray(data);
}

// Atualiza o status de um alerta (ex.: aberta → em_progresso)
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
