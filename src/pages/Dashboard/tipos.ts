export type Severidade = "crítica" | "alta" | "média" | "baixa";
export type Status = "aberta" | "em_progresso" | "fechada";

export type Alerta = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
  severity: Severidade;
  status: Status;
  endpoint: string;
  category: "ransomware" | "login_suspeito" | "software_bloqueado" | "outros";
  score: number;
  aiSummary?: string;
  recommendations?: string[];
};

export type PontoTimeline = {
  hour: string;
  baixa: number;
  media: number;
  alta: number;
  critica: number;
};

export type Intervalo = { start?: string; end?: string };
