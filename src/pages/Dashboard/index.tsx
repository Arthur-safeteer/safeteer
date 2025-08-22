import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  listAlertHeaders,
  getAlertDetails,
  filterAlerts,
  type FilterBody,
  type ApiAlertHeaderRaw,
} from "../../api/alerts";
import "./dashboard.css";

// --- Normaliza erro do Axios/JS para string, evitando renderizar objetos no JSX
function formatErr(e: any): string {
  if (!e) return "Erro desconhecido";
  if (typeof e === "string") return e;
  const msg = e?.response?.data?.message ?? e?.response?.data?.error ?? e?.message;
  if (typeof msg === "string") return msg;
  try { return JSON.stringify(msg ?? e); } catch { return String(e); }
}


/* ===================== Tipos de UI ===================== */
type Severity = "crítica" | "alta" | "média" | "baixa";
type Status = "aberta" | "em_progresso" | "fechada";

type Alert = {
  id: string;
  title: string;
  createdAt: string; // pode ser ISO ou dd/MM/yyyy HH:mm:ss (parser trata)
  updatedAt?: string;
  severity: Severity;
  status: Status;
  endpoint: string;
  category: "ransomware" | "login_suspeito" | "software_bloqueado" | "outros";
  score: number;
  aiSummary?: string;
  recommendations?: string[];
};

type TimelinePoint = {
  hour: string;
  baixa: number;
  media: number;
  alta: number;
  critica: number;
};

/* ===================== Normalizadores ===================== */
const toISO = (v?: string | number) =>
  v == null ? undefined : typeof v === "number" ? new Date(v).toISOString() : v;

const mapSeverity = (s?: string): Severity | undefined => {
  const v = s?.toLowerCase();
  if (!v) return undefined;
  if (v.startsWith("cr")) return "crítica";
  if (v.startsWith("al")) return "alta";
  if (v.startsWith("mé") || v.startsWith("me")) return "média";
  if (v.startsWith("ba")) return "baixa";
  return undefined;
};

const mapStatus = (s?: string): Status | undefined => {
  const v = s?.toLowerCase();
  if (!v) return undefined;
  if (v.includes("progress")) return "em_progresso";
  if (v.includes("fech") || v.includes("clos")) return "fechada";
  if (v.includes("ab") || v.includes("open")) return "aberta";
  return undefined;
};

const scoreBySeverity: Record<Severity, number> = {
  crítica: 100,
  alta: 75,
  média: 50,
  baixa: 25,
};

function adaptHeaderToAlert(h: ApiAlertHeaderRaw): Alert {
  const sev = mapSeverity(h.severidade) ?? "média";
  return {
    id: h.alerta_id,
    title: h.titulo || `Alerta ${h.alerta_id}`,
    createdAt: (toISO(h.created_at) as string) || new Date().toISOString(),
    updatedAt: toISO(h.updated_at),
    severity: sev,
    status: mapStatus(h.status) ?? "aberta",
    endpoint: h.endpoint || "desconhecido",
    category: (h.categoria as Alert["category"]) || "outros",
    score: scoreBySeverity[sev],
  };
}

/* ===================== Timeline (24h) baseada em ALERTS adaptados ===================== */
function toMillis(v?: string | number): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v; // epoch s->ms
  const iso = Date.parse(v); // tenta ISO
  if (!Number.isNaN(iso)) return iso;
  // fallback dd/MM/yyyy [HH:mm:ss]
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/);
  if (m) {
    const [, dd, mm, yyyy, hh = "00", mi = "00", ss = "00"] = m;
    return new Date(+yyyy, +mm - 1, +dd, +hh, +mi, +ss).getTime();
  }
  return null;
}

function buildTimeline24hFromAlerts(alerts: Alert[]): TimelinePoint[] {
  const now = Date.now();
  const start = now - 24 * 60 * 60 * 1000;

  const bins: TimelinePoint[] = Array.from({ length: 24 }, (_, i) => {
    const t = new Date(start + i * 60 * 60 * 1000);
    const hour = `${String(t.getHours()).padStart(2, "0")}:00`;
    return { hour, baixa: 0, media: 0, alta: 0, critica: 0 };
  });

  for (const a of alerts) {
    const ms = toMillis(a.createdAt);
    if (ms == null || ms < start || ms > now) continue;
    const idx = Math.min(23, Math.max(0, Math.floor((ms - start) / (60 * 60 * 1000))));
    if (a.severity === "baixa") bins[idx].baixa++;
    else if (a.severity === "média") bins[idx].media++;
    else if (a.severity === "alta") bins[idx].alta++;
    else if (a.severity === "crítica") bins[idx].critica++;
  }
  return bins;
}

/* ===================== Risco (segue usando headers crus) ===================== */
function computeRiskScoreFromHeaders(headers: ApiAlertHeaderRaw[]): number {
  const w: Record<Severity, number> = {
    crítica: 1.0,
    alta: 0.7,
    média: 0.4,
    baixa: 0.2,
  };
  const sum = headers.reduce(
    (acc, h) => acc + w[mapSeverity(h.severidade) ?? "média"],
    0
  );
  return Math.max(0, Math.min(100, Math.round((sum / 10) * 100)));
}

/* ===================== Helpers visuais ===================== */
function severityClass(s: Severity) {
  switch (s) {
    case "crítica":
      return "badge-critical";
    case "alta":
      return "badge-high";
    case "média":
      return "badge-medium";
    default:
      return "badge-low";
  }
}
function statusLabel(s: Status) {
  return s
    .replace("em_progresso", "Em Progresso")
    .replace("aberta", "Aberta")
    .replace("fechada", "Fechada");
}
function statusClass(s: Status) {
  switch (s) {
    case "em_progresso":
      return "status-progress";
    case "fechada":
      return "status-closed";
    default:
      return "status-open";
  }
}

/* ===================== UI Primitives ===================== */
const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = "",
  children,
}) => <div className={`card ${className}`}>{children}</div>;

const StatCard: React.FC<{
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
}> = ({ title, value, subtitle, icon }) => (
  <Card>
    <div className="row">
      {icon && <div>{icon}</div>}
      <div>
        <div className="stat-title">{title}</div>
        <div className="stat-value">{value}</div>
        {subtitle ? <div className="stat-sub">{subtitle}</div> : null}
      </div>
    </div>
  </Card>
);

/* ===================== FilterBar ===================== */
const FilterBar: React.FC<{ onApply: (filters: any) => void }> = ({ onApply }) => {
  const [start, setStart] = useState<string>(
    new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10)
  );
  const [end, setEnd] = useState<string>(new Date().toISOString().slice(0, 10));
  const [severity, setSeverity] = useState<string>("todas");
  const [status, setStatus] = useState<string>("todos");
  const [endpoint, setEndpoint] = useState<string>("todos");
  const [q, setQ] = useState("");

  return (
    <Card>
      <div className="filter-bar">
        <div className="field">
          <label className="label">Data Início</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="input"
          />
        </div>
        <div className="field">
          <label className="label">Data Fim</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="input"
          />
        </div>
        <div className="field">
          <label className="label">Severidade</label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="select"
          >
            <option value="todas">Todas</option>
            <option value="crítica">Crítica</option>
            <option value="alta">Alta</option>
            <option value="média">Média</option>
            <option value="baixa">Baixa</option>
          </select>
        </div>
        <div className="field">
          <label className="label">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="select"
          >
            <option value="todos">Todos</option>
            <option value="aberta">Aberta</option>
            <option value="em_progresso">Em Progresso</option>
            <option value="fechada">Fechada</option>
          </select>
        </div>
        <div className="field">
          <label className="label">Endpoint</label>
          <select
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            className="select"
          >
            <option value="todos">Todos</option>
            <option value="server-web-01">server-web-01</option>
            <option value="api-gateway">api-gateway</option>
            <option value="finops-workstation-05">finops-workstation-05</option>
          </select>
        </div>
        <div className="field flex-1">
          <label className="label">Buscar</label>
          <input
            placeholder="Palavra-chave, ID ou host"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input"
          />
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              setQ("");
              setSeverity("todas");
              setStatus("todos");
              setEndpoint("todos");
            }}
            className="btn btn-outline"
          >
            Limpar Filtros
          </button>
          <button
            onClick={() => onApply({ start, end, severity, status, endpoint, q })}
            className="btn btn-primary"
          >
            Aplicar
          </button>
        </div>
      </div>
    </Card>
  );
};

/* ===================== AlertItem ===================== */
const AlertItem: React.FC<{ alert: Alert }> = ({ alert }) => {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && !detail) {
      try {
        setLoading(true);
        const d = await getAlertDetails(alert.id);
        setDetail(d);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Card className={`alert-card ${open ? "is-open" : ""}`}>
      <div className="alert-head clickable" onClick={toggle} role="button" tabIndex={0}>
        <span className={`badge ${severityClass(alert.severity)}`}>
          {alert.severity.toUpperCase()}
        </span>

        <div style={{ flex: 1 }}>
          <div className="row-between">
            <div>
              <h4 style={{ margin: 0, fontWeight: 600 }}>{alert.title}</h4>
              <div className="alert-meta">
                <span>ID: {alert.id}</span>
                <span>HOST: {alert.endpoint}</span>
                <span>Primeira detecção: {new Date(alert.createdAt).toLocaleString()}</span>
                {alert.updatedAt && (
                  <span>Última atualização: {new Date(alert.updatedAt).toLocaleString()}</span>
                )}
              </div>
            </div>
            <div className="alert-actions">
              <span className={`badge ${statusClass(alert.status)}`}>
                {statusLabel(alert.status)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="alert-body"
          >
            {loading && <p>Carregando detalhe…</p>}
            {!loading && detail && (
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {JSON.stringify(detail, null, 2)}
              </pre>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

/* ===================== Timeline (BarChart) ===================== */
const AlertTimeline: React.FC<{ data: TimelinePoint[] }> = ({ data }) => (
  <Card>
    <h3 className="section-title">Linha do Tempo de Alertas (últimas 24h)</h3>
    <div style={{ height: 224 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="hour" tick={{ fill: "#475569", fontSize: 12 }} tickLine={false} />
          <YAxis tick={{ fill: "#475569", fontSize: 12 }} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "#111b36",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              color: "#ffffff",
            }}
          />
          <Bar dataKey="baixa" stackId="a" fill="#1dc0ab" />
          <Bar dataKey="media" stackId="a" fill="#f4c542" />
          <Bar dataKey="alta" stackId="a" fill="#f58a1f" />
          <Bar dataKey="critica" stackId="a" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </Card>
);

/* ===================== Gauge ===================== */
const RiskGauge: React.FC<{ score: number }> = ({ score }) => {
  const r = 80;
  const c = Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const filled = (pct / 100) * c;

  return (
    <Card>
      <h3 className="gauge-title">Nível de Risco Atual</h3>
      <svg width={220} height={140} viewBox="0 0 220 140">
        <g transform="translate(110,120)">
          <path d={`M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0`} fill="none" stroke="rgba(0, 0, 0, 0.15)" strokeWidth={18} />
          <path
            d={`M ${-r} 0 A ${r} ${r} 0 0 1 ${-r + 2 * r * (pct / 100)} 0`}
            fill="none"
            stroke="url(#g)"
            strokeWidth={18}
            strokeLinecap="round"
            pathLength={c}
            strokeDasharray={`${filled} ${c - filled}`}
          />
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
        </g>
      </svg>
      <div className="gauge-score">
        <div className="val">{score}</div>
        <div className="sub">Risco Médio-Alto</div>
      </div>
    </Card>
  );
};

/* ===================== Helpers de filtro/back ===================== */
function toServerFilterBody(f: any): FilterBody {
  const body: FilterBody = {} as any;
  if (f.severity && f.severity !== "todas") (body as any).severidade = f.severity;
  if (f.start) (body as any).data_inicio = `${f.start}T00:00:00Z`;
  if (f.end) (body as any).data_fim = `${f.end}T23:59:59Z`;
  if (f.endpoint && f.endpoint !== "todos") (body as any).hostname = f.endpoint;
  return body;
}
function isServerFilterable(f: any | null): boolean {
  if (!f) return false;
  return (
    (f.severity && f.severity !== "todas") ||
    (f.endpoint && f.endpoint !== "todos") ||
    !!f.start ||
    !!f.end
  );
}

/* ===================== Página ===================== */
const DashboardPage: React.FC = () => {
  const [headers, setHeaders] = useState<ApiAlertHeaderRaw[]>([]);
  const [filters, setFilters] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        let data: ApiAlertHeaderRaw[];
        if (filters && isServerFilterable(filters)) {
          data = await filterAlerts(toServerFilterBody(filters));
        } else {
          data = await listAlertHeaders();
        }

        if (!cancel) setHeaders(data);
      } catch (e: any) {
        if (!cancel) setErr(formatErr(e));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [filters]);

  // filtro adicional no front (status + busca livre + endpoint/severity quando vieram "sem back")
  const filteredRaw = useMemo(() => {
    const base = headers;
    if (!filters) return base;

    return base.filter((h) => {
      const sev = mapSeverity(h.severidade);
      const st = mapStatus(h.status);

      if (filters.severity && filters.severity !== "todas" && sev !== filters.severity) return false;
      if (filters.status && filters.status !== "todos" && st !== filters.status) return false;
      if (filters.endpoint && filters.endpoint !== "todos" && h.endpoint !== filters.endpoint) return false;
      if (filters.q) {
        const q = String(filters.q).toLowerCase();
        const inTitle = (h.titulo || "").toLowerCase().includes(q);
        const inId = (h.alerta_id || "").toLowerCase().includes(q);
        const inHost = (h.endpoint || "").toLowerCase().includes(q);
        if (!inTitle && !inId && !inHost) return false;
      }

      if (filters.start || filters.end) {
        const d = h.created_at ? new Date(h.created_at) : null;
        if (d) {
          if (filters.start && d < new Date(filters.start)) return false;
          if (filters.end) {
            const end = new Date(filters.end);
            end.setHours(23, 59, 59, 999);
            if (d > end) return false;
          }
        }
      }
      return true;
    });
  }, [headers, filters]);

  const alerts: Alert[] = useMemo(() => filteredRaw.map(adaptHeaderToAlert), [filteredRaw]);
  const timeline = useMemo(() => buildTimeline24hFromAlerts(alerts), [alerts]);
  const riskScore = useMemo(() => computeRiskScoreFromHeaders(filteredRaw), [filteredRaw]);

  const totals = useMemo(() => {
    const total = alerts.length;
    const criticos = alerts.filter((a) => a.severity === "crítica").length;
    const resolucao = 0.94; // TODO: calcular com base no status
    const tmr = 12;         // idem
    return { total, criticos, resolucao, tmr };
  }, [alerts]);

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        {loading && <p>Carregando…</p>}
        {err && <p style={{ color: "tomato" }}>{err}</p>}

        {/* Stats */}
        <div className="stats-grid">
          <StatCard
            title="Alertas Hoje"
            value={
              <span>
                {totals.total}{" "}
                <span style={{ color: "#b1b5c0", fontSize: 12 }}>(+22% vs ontem)</span>
              </span>
            }
          />
          <StatCard title="Críticos Abertos" value={<span>{totals.criticos}</span>} subtitle="2 novos" />
          <StatCard title="Taxa de Resolução" value={<span>{Math.round(totals.resolucao * 100)}%</span>} subtitle="+1% esta semana" />
          <StatCard title="Tempo Médio Resposta" value={<span>{totals.tmr}m</span>} subtitle="12m na média" />
        </div>

        {/* Filtros */}
        <FilterBar onApply={setFilters} />

        {/* Timeline + Gauge */}
        <div className="cards-3">
          <AlertTimeline data={timeline} />
          <RiskGauge score={riskScore} />
        </div>

        {/* Lista */}
        <h3 className="section-title" style={{ marginTop: 20 }}>
          Alertas Recentes
        </h3>
        <div className="space-y">
          {alerts.map((a) => (
            <AlertItem key={a.id} alert={a} />
          ))}
        </div>

        <div className="footer">Safeteer</div>
      </div>
    </div>
  );
};

export default DashboardPage;
