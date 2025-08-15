// imports de bibliotecas e estilos
import React, { useMemo, useState } from "react";         //importa o react e hooks
import { motion, AnimatePresence } from "framer-motion";  //animações
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";                                        //gráficos
import "./dashboard.css";                                 //css

// ---------------------- Tipos ----------------------
type Severity = "crítica" | "alta" | "média" | "baixa";   //tipos de severidade
type Status = "aberta" | "em_progresso" | "fechada";      //tipos de status

type Alert = {
  id: string;                  //id do alerta
  title: string;               //titulo do alerta
  createdAt: string;           //data de criação
  updatedAt?: string;          //data de atualização
  severity: Severity;          //severidade
  status: Status;              //status
  endpoint: string;            //endpoint afetado
  category: "ransomware" | "login_suspeito" | "software_bloqueado" | "outros";   //categoria do alerta
  score: number;               //pontuação de risco
  aiSummary?: string;          //resumo gerado por IA
  recommendations?: string[];  //recomendações de mitigação
};

// ---------------------- Mock Data ----------------------

//Dados "Fakes" para testar 
const mockAlerts: Alert[] = [
  {
    id: "ALR-2321-457",
    title: "Tentativa de Ransomware Detectada",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    severity: "crítica",
    status: "em_progresso",
    endpoint: "server-web-01",
    category: "ransomware",
    score: 92,
    aiSummary:
      "Detectado comportamento consistente com ransomware. O processo suspicious.exe tentou modificar 487 arquivos em 30 segundos, incluindo extensões .doc, .xls e .pdf. Padrão de criptografia identificado. O processo foi originado de um email recebido às 14:15. Conexão estabelecida com servidor C2 conhecido (185.234.XX.XX). Ação imediata tomada para conter a ameaça.",
    recommendations: [
      "Isolar imediatamente o servidor-web-01 da rede",
      "Verificar backups recentes antes do incidente (14:00)",
      "Escanear todos os endpoints que acessaram o servidor hoje",
      "Revisar logs de email do usuário que originou o processo",
      "Considerar restauração do servidor após análise forense",
    ],
  },
  {
    id: "ALR-1902-010",
    title: "Login Suspeito Detectado",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    severity: "média",
    status: "aberta",
    endpoint: "api-gateway",
    category: "login_suspeito",
    score: 63,
    aiSummary:
      "Tentativas de login sequenciais por IP desconhecido — possível força bruta.",
    recommendations: ["Forçar MFA no próximo login", "Bloquear IP por 24h"],
  },
  {
    id: "ALR-1022-884",
    title: "Software não autorizado instalado",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    severity: "alta",
    status: "fechada",
    endpoint: "finops-workstation-05",
    category: "software_bloqueado",
    score: 70,
  },
];

// Dados para a linha do tempo
// Simula 24 horas de dados de alertas
// basicamente transforma um array de 24 horas em um array de objetos com contagem de alertas por severidade 
// ai cada vez q atualiza a pagina, os valores mudam por usar o math.random --> vai mudar para os dados reais depois 

const hours = Array.from({ length: 24 }).map((_, i) => i);
const timelineData = hours.map((h) => ({
  hour: `${String(h).padStart(2, "0")}:00`,
  baixa: Math.floor(Math.random() * 4),
  media: Math.floor(Math.random() * 5),
  alta: Math.floor(Math.random() * 3),
  critica: Math.floor(Math.random() * 2),
}));

// ---------------------- Helpers ----------------------
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

// ---------------------- UI Primitives ----------------------
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

// ---------------------- FilterBar ----------------------
const FilterBar: React.FC<{ onApply: (filters: any) => void }> = ({
  onApply,
}) => {
  const [start, setStart] = useState<string>(
    new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10)
  );
  const [end, setEnd]             = useState<string>(new Date().toISOString().slice(0, 10));
  const [severity, setSeverity]   = useState<string>("todas");
  const [status, setStatus]       = useState<string>("em_progresso");
  const [endpoint, setEndpoint]   = useState<string>("todos");
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
            <option value="todas">     Todas</option>
            <option value="crítica">   Crítica</option>
            <option value="alta">      Alta</option>
            <option value="média">     Média</option>
            <option value="baixa">     Baixa</option>
          </select>
        </div>
        <div className="field">
          <label className="label">    Status</label>
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
            onClick={() =>
              onApply({ start, end, severity, status, endpoint, q })
            }
            className="btn btn-primary"
          >
            Aplicar
          </button>
        </div>
      </div>
    </Card>
  );
};

// ---------------------- AlertItem (click no cabeçalho) ----------------------
const AlertItem: React.FC<{ alert: Alert }> = ({ alert }) => {
  const [open, setOpen] = useState(false);

  const toggle = () => setOpen((v) => !v);

  return (
    <Card className={`alert-card ${open ? "is-open" : ""}`}>
      <div
        className="alert-head clickable"
        onClick={toggle}
        role="button"
        tabIndex={0}
      >
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
                <span>
                  Primeira detecção: {new Date(alert.createdAt).toLocaleString()}
                </span>
                {alert.updatedAt && (
                  <span>
                    Última atualização:{" "}
                    {new Date(alert.updatedAt).toLocaleString()}
                  </span>
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
            {alert.aiSummary && (
              <div style={{ marginBottom: 12 }}>
                <h5 style={{ margin: "0 0 4px 0", fontWeight: 600 }}>
                  Análise da IA
                </h5>
                <p style={{ margin: 0, lineHeight: 1.5, color: "#cbd5e1", fontSize: 14 }}>
                  {alert.aiSummary}
                </p>
              </div>
            )}

            {alert.recommendations && alert.recommendations.length > 0 && (
              <div>
                <h5 style={{ margin: "0 0 8px 0", fontWeight: 600 }}>
                  Recomendações
                </h5>
                <ul style={{ margin: 0, paddingLeft: 18, color: "#cbd5e1", fontSize: 14 }}>
                  {alert.recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

// ---------------------- Timeline ----------------------
const AlertTimeline: React.FC = () => (
  <Card>
    <h3 className="section-title">Linha do Tempo de Alertas (últimas 24h)</h3>
    <div style={{ height: 224 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={timelineData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis
            dataKey="hour"
            tick={{ fill: "#b1b5c0", fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#b1b5c0", fontSize: 12 }}
            tickLine={false}
            allowDecimals={false}
          />
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

// ---------------------- Gauge ----------------------

//calculo da geometria do grafico 
const RiskGauge: React.FC<{ score: number }> = ({ score }) => {
  const r = 80;                                   //raio 
  const c = Math.PI * r;                          //comprimento total do arco
  const pct = Math.max(0, Math.min(100, score));  //garante que o valor esteja entre 0 e 100
  const filled = (pct / 100) * c;                 //parte preenchida do arco

  return (
    <Card>
      <h3 className="gauge-title">Nível de Risco Atual</h3>
      <svg width={220} height={140} viewBox="0 0 220 140">
        <g transform="translate(110,120)">
          <path
            d={`M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0`}
            fill="none"
            stroke="rgba(0, 0, 0, 0.15)"
            strokeWidth={18}
          />
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

// ---------------------- Página ----------------------
const DashboardPage: React.FC = () => {
  const [filters, setFilters] = useState<any | null>(null);

  const totals = useMemo(() => {
    const total = mockAlerts.length + 44;
    const criticos = mockAlerts.filter((a) => a.severity === "crítica").length + 2;
    const resolucao = 0.94;
    const tmr = 12;
    return { total, criticos, resolucao, tmr };
  }, []);

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        {/* Stats */}
        <div className="stats-grid">
          <StatCard
            title="Alertas Hoje"
            value={
              <span>
                {totals.total} <span style={{ color: "#b1b5c0", fontSize: 12 }}>(+22% vs ontem)</span>
              </span>
            }
          />
          <StatCard title="Críticos Abertos" value={<span>{totals.criticos}</span>} subtitle="2 novos" />
          <StatCard title="Taxa de Resolução" value={<span>{Math.round(totals.resolucao * 100)}%</span>} subtitle="+1% esta semana" />
          <StatCard title="Tempo Médio Resposta" value={<span>{totals.tmr}m</span>} subtitle="12m na média" />
        </div>

        {/* Filters */}
        <FilterBar onApply={setFilters} />

        {/* Charts + Gauge */}
        <div className="cards-3">
          <AlertTimeline />
          <RiskGauge score={73} />
        </div>

        {/* Recent Alerts */}
        <h3 className="section-title" style={{ marginTop: 20 }}>Alertas Recente</h3>
        <div className="space-y">
          {mockAlerts.map((a) => (
            <AlertItem key={a.id} alert={a} />
          ))}
        </div>

        <div className="footer">Safeteer</div>
      </div>
    </div>
  );
};

export default DashboardPage;
