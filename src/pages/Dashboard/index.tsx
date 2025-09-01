import React, { useEffect, useMemo, useState } from "react";

import {
  listAlertHeaders,
  filterAlerts,
  type FilterBody,
  type ApiAlertHeaderRaw,
} from "../../api/alerts";

import LinhaDoTempoAlertas from "./componentes/LinhaDoTempoAlertas";
import MedidorDeRisco from "./componentes/MedidorDeRisco";
import CartoesSeveridade from "./componentes/CartoesSeveridade";

import { parseEmUtc, formatarDataUTC } from "./uteis/tempo";
import type { Alerta, Severidade, Status, Intervalo } from "./tipos";

import "./dashboard.css";

/* ===================== Util/Erros ===================== */
function formatarErro(e: any): string {
  if (!e) return "Erro desconhecido";
  if (typeof e === "string") return e;
  const msg = e?.response?.data?.message ?? e?.response?.data?.error ?? e?.message;
  if (typeof msg === "string") return msg;
  try { return JSON.stringify(msg ?? e); } catch { return String(e); }
}

/* ===================== Header ===================== */
const Cabecalho: React.FC = () => (
  <header className="dashboard-header" style={{ borderBottom: "1px solid #eef1f5", background: "#fff" }}>
    <div className="header-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Dashboard</h2>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div className="user-avatar" style={{ width: 28, height: 28, borderRadius: 6, background: "#0ea5e9", color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 }}>JC</div>
        <span className="user-name" style={{ fontSize: 12, color: "#475569" }}>João Carlos</span>
      </div>
    </div>
  </header>
);

/* ===================== Normalizadores / Mapeamentos ===================== */
const paraISO = (v?: string | number) => {
  if (v == null) return undefined;
  if (typeof v === "number") {
    const ms = v < 1e12 ? v * 1000 : v;
    return new Date(ms).toISOString();
  }
  return v;
};

const mapearSeveridade = (s?: string): Severidade | undefined => {
  const v = s?.toLowerCase();
  if (!v) return undefined;
  if (v.startsWith("cr")) return "crítica";
  if (v.startsWith("al")) return "alta";
  if (v.startsWith("mé") || v.startsWith("me")) return "média";
  if (v.startsWith("ba")) return "baixa";
  return undefined;
};

const mapearStatus = (s?: string): Status | undefined => {
  const v = s?.toLowerCase();
  if (!v) return undefined;
  if (v.includes("progress")) return "em_progresso";
  if (v.includes("fech") || v.includes("clos")) return "fechada";
  if (v.includes("ab") || v.includes("open")) return "aberta";
  return undefined;
};

const pontuacaoPorSeveridade: Record<Severidade, number> = {
  crítica: 100,
  alta: 75,
  média: 50,
  baixa: 25,
};

function adaptarHeaderParaAlerta(h: ApiAlertHeaderRaw): Alerta {
  const sev = mapearSeveridade((h as any).severidade) ?? "média";
  const dataEvento = (h as any).data_evento ?? (h as any).created_at;
  const origem = (h as any).origem ?? (h as any).endpoint ?? "desconhecido";
  return {
    id: (h as any).alerta_id,
    title: (h as any).titulo || `Alerta ${(h as any).alerta_id}`,
    createdAt: (paraISO(dataEvento) as string) || new Date().toISOString(),
    updatedAt: paraISO((h as any).updated_at),
    severity: sev,
    status: mapearStatus((h as any).status) ?? "aberta",
    endpoint: origem,
    category: ((h as any).categoria as Alerta["category"]) || "outros",
    score: pontuacaoPorSeveridade[sev],
  };
}

/* ===================== Risco ===================== */
function calcularScoreRiscoDosHeaders(headers: ApiAlertHeaderRaw[]): number {
  const w: Record<Severidade, number> = { crítica: 1.0, alta: 0.7, média: 0.4, baixa: 0.2 };
  const sum = headers.reduce((acc, h: any) => acc + w[mapearSeveridade(h.severidade) ?? "média"], 0);
  return Math.max(0, Math.min(100, Math.round((sum / 10) * 100)));
}

/* ===================== Helpers visuais ===================== */
function classeSeveridade(s: Severidade) {
  switch (s) { case "crítica": return "badge-critical"; case "alta": return "badge-high"; case "média": return "badge-medium"; default: return "badge-low"; }
}
function rotuloStatus(s: Status) { return s.replace("em_progresso", "Em Progresso").replace("aberta", "Aberta").replace("fechada", "Fechada"); }
function classeStatus(s: Status) { switch (s) { case "em_progresso": return "status-progress"; case "fechada": return "status-closed"; default: return "status-open"; } }

/* ===================== UI Primitives ===================== */
const Cartao: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = "", children }) =>
  <div className={`card ${className}`}>{children}</div>;

const CartaoIndicador: React.FC<{ title: string; value: React.ReactNode; subtitle?: string; }> = ({ title, value, subtitle }) => (
  <div className="card" style={{ padding: 18, borderRadius: 14, background: "rgba(255,255,255,0.65)", backdropFilter: "blur(8px)", border: "1px solid rgba(15,23,42,0.06)" }}>
    <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700, letterSpacing: 0.3 }}>{title}</div>
    <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginTop: 6 }}>{value}</div>
    {subtitle ? <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>{subtitle}</div> : null}
  </div>
);

/* ===================== Conversão de DATA (sem hora) ===================== */
// "2025-09-01" -> "2025-09-01T00:00:00Z"
function dataLocalParaUTCInicio(v?: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(`${v}T00:00:00Z`);
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}
// "2025-09-01" -> "2025-09-01T23:59:59Z"
function dataLocalParaUTCFim(v?: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(`${v}T23:59:59Z`);
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/* ===================== Barra de Filtros ===================== */
const BarraFiltros: React.FC<{ onApply: (filters: any) => void }> = ({ onApply }) => {
  const [severity, setSeverity] = useState<string>("todas");
  const [origem, setOrigem] = useState<string>("todas");
  const [inicio, setInicio] = useState<string>("");
  const [fim, setFim] = useState<string>("");

  const limpar = () => { setSeverity("todas"); setOrigem("todas"); setInicio(""); setFim(""); };

  return (
    <Cartao>
      <div className="filter-bar" style={{ gap: 12 }}>
        <div className="field">
          <label className="label">Severidade</label>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="select">
            <option value="todas">Todas</option><option value="crítica">Crítica</option><option value="alta">Alta</option><option value="média">Média</option><option value="baixa">Baixa</option>
          </select>
        </div>
        <div className="field">
          <label className="label">Origem</label>
          <select value={origem} onChange={(e) => setOrigem(e.target.value)} className="select">
            <option value="todas">Todas</option><option value="Firewall">Firewall</option><option value="AD">AD</option><option value="Endpoint">Endpoint</option><option value="Antivírus">Antivírus</option>
          </select>
        </div>
        <div className="field">
          <label className="label">Início</label>
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="input" />
        </div>
        <div className="field">
          <label className="label">Fim</label>
          <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="input" />
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={limpar} className="btn btn-outline">Limpar</button>
          <button onClick={() => onApply({ severity, origem, inicio, fim })} className="btn btn-primary">Aplicar</button>
        </div>
      </div>
    </Cartao>
  );
};

/* ===================== DetalhesDoAlerta ===================== */
const DetalhesDoAlerta: React.FC<{
  item: Alerta;
  raw?: ApiAlertHeaderRaw;
}> = ({ item }) => {
  return (
    <div className="alert-details">
      <div className="kv-grid compact">
        <div className="kv"><div className="k">ID:</div><div className="v">{item.id}</div></div>
        <div className="kv"><div className="k">Título:</div><div className="v">{item.title}</div></div>
        <div className="kv"><div className="k">Origem:</div><div className="v">{item.endpoint}</div></div>
        <div className="kv"><div className="k">Categoria:</div><div className="v">{item.category ?? "—"}</div></div>
        <div className="kv"><div className="k">Detecção (UTC):</div><div className="v">{formatarDataUTC(item.createdAt)}</div></div>
        <div className="kv"><div className="k">Atualizado:</div><div className="v">{item.updatedAt ? formatarDataUTC(item.updatedAt) : "—"}</div></div>
      </div>
    </div>
  );
};

/* ===================== Linha do Alerta (UTC) ===================== */
const LinhaAlerta: React.FC<{ item: Alerta; raw?: ApiAlertHeaderRaw }> = ({ item, raw }) => {
  const [open, setOpen] = useState(false);
  const alternar = () => setOpen(v => !v);
  const h: any = raw ?? {};
  const id = h.alerta_id ?? item.id;
  const cliente = h.cliente_id ?? "—";
  const origem = h.origem ?? item.endpoint ?? "—";
  const quando = h.data_evento ?? item.createdAt;

  return (
    <div className="card" style={{ padding: 14, borderRadius: 12, border: "1px solid rgba(15,23,42,0.06)", background: "#fff" }}>
      <div className="row-between" style={{ alignItems: "center", gap: 12, cursor: "pointer" }} onClick={alternar}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className={`badge ${classeSeveridade(item.severity)}`}>{item.severity.toUpperCase()}</span>
          <div>
            <div style={{ fontWeight: 700, color: "#0f172a" }}>{item.title}</div>
            <div className="alert-meta">
              <span>ID: {id}</span><span>Cliente: {cliente}</span><span>Origem: {origem}</span>
              <span>Detecção: {formatarDataUTC(quando)}</span>
              {item.updatedAt && <span>Atualizado: {formatarDataUTC(item.updatedAt)}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={(e) => e.stopPropagation()}>
          <span className={`badge ${classeStatus(item.status)}`}>{rotuloStatus(item.status)}</span>
        </div>
      </div>

      {open && (
        <DetalhesDoAlerta item={item} raw={raw} />
      )}
    </div>
  );
};

/* ===================== Helpers de filtro/back ===================== */
function severidadeParaServidor(s: string) {
  const base = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (base === "critica") return "Crítico";
  if (base === "alta") return "Alto";
  if (base === "media") return "Médio";
  if (base === "baixa") return "Baixo";
  return s;
}
function origemParaServidor(s: string) {
  const base = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (base === "Antivirus") return "Antivirus";
  return s;
}
function corpoFiltroParaServidor(f: any): FilterBody {
  const body: any = {};
  if (Array.isArray(f?.severity)) {
    const arr = f.severity.filter(Boolean).map((s: string) => severidadeParaServidor(s));
    if (arr.length) body.severidade = arr;
  } else if (f?.severity && f.severity !== "todas") {
    body.severidade = severidadeParaServidor(f.severity);
  }
  if (f?.origem && f.origem !== "todas") body.ferramenta = origemParaServidor(f.origem);

  // datas (sem hora)
  const di = dataLocalParaUTCInicio(f?.inicio);
  const df = dataLocalParaUTCFim(f?.fim);
  if (di) body.data_inicio = di;
  if (df) body.data_fim = df;

  console.log("POST /filtrar body =>", body);
  return body as FilterBody;
}
function deveFiltrarNoServidor(f: any | null): boolean {
  if (!f) return false;
  const hasSeverity = Array.isArray(f.severity) ? f.severity.length > 0 : (f.severity && f.severity !== "todas");
  const hasOrigem = f.origem && f.origem !== "todas";
  return !!(hasSeverity || hasOrigem || f.inicio || f.fim);
}

/* ===================== Página ===================== */
const PaginaDashboard: React.FC = () => {
  const [headers, setHeaders] = useState<ApiAlertHeaderRaw[]>([]);
  const [filters, setFilters] = useState<any | null>(null);
  const [selSeveridades, setSelSeveridades] = useState<Severidade[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // card expandível do período filtrado
  const [rangeOpen, setRangeOpen] = useState(false);

  const toggleSeverityChip = (s: Severidade) => {
    setSelSeveridades(prev => {
      const exists = prev.includes(s);
      return exists ? prev.filter(x => x !== s) : [...prev, s];
    });
  };

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        let data: ApiAlertHeaderRaw[] = [];
        if (filters && deveFiltrarNoServidor(filters)) {
          const body = corpoFiltroParaServidor(filters);
          data = await filterAlerts(body);
          console.log("RETORNO /filtrar =>", Array.isArray(data) ? `${data.length} itens` : data, (data as any)?.[0]);
        } else {
          data = await listAlertHeaders();
          console.log("RETORNO /alerta (lista) =>", Array.isArray(data) ? `${data.length} itens` : data, (data as any)?.[0]);
        }
        if (!cancelado) setHeaders(data);
      } catch (e: any) {
        if (!cancelado) setErr(formatarErro(e));
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => { cancelado = true; };
  }, [filters]);

  const alerts = useMemo(() => headers.map(adaptarHeaderParaAlerta), [headers]);
  const riskScore = useMemo(() => calcularScoreRiscoDosHeaders(headers), [headers]);

  const selectedRange = useMemo<Intervalo>(() => {
    if (!filters) return {};
    return {
      start: filters?.inicio ? dataLocalParaUTCInicio(filters.inicio) : undefined,
      end:   filters?.fim    ? dataLocalParaUTCFim(filters.fim)       : undefined,
    };
  }, [filters]);

  const rangeAtivo = !!(selectedRange.start || selectedRange.end);
  useEffect(() => { setRangeOpen(rangeAtivo); }, [rangeAtivo]);

  const totals = useMemo(() => {
    const pStart = selectedRange.start ? parseEmUtc(selectedRange.start) : null;
    const pEnd   = selectedRange.end   ? parseEmUtc(selectedRange.end)   : null;
    const inPeriodo = (a: Alerta) => {
      const t = parseEmUtc(a.createdAt);
      if (t == null) return false;
      if (pStart != null && t < pStart) return false;
      if (pEnd != null && t > pEnd) return false;
      return true;
    };
    const noPeriodo = (pStart || pEnd) ? alerts.filter(inPeriodo) : alerts;

    const total = noPeriodo.length;
    const criticos = noPeriodo.filter((a) => a.severity === "crítica").length;

    const now = Date.now();
    const SEVEN = 7 * 24 * 60 * 60 * 1000;
    const start7 = now - SEVEN;
    const last7 = alerts.filter(a => {
      const t = parseEmUtc(a.createdAt);
      return t != null && t >= start7 && t <= now;
    });
    const fechados = last7.filter(a => a.status === "fechada");
    const resolucao = last7.length ? fechados.length / last7.length : 0;

    const fechadosComTempo = fechados.filter(a => a.updatedAt);
    const avgMs = fechadosComTempo.length
      ? Math.round(
          fechadosComTempo.reduce((acc, a) => {
            const s = parseEmUtc(a.createdAt) ?? 0;
            const e = parseEmUtc(a.updatedAt!) ?? s;
            return acc + Math.max(0, e - s);
          }, 0) / fechadosComTempo.length
        )
      : 0;
    const tmr = Math.round(avgMs / (60 * 60 * 1000));

    return { total, criticos, resolucao, tmr };
  }, [alerts, selectedRange]);

  return (
    <div className="dashboard">
      <Cabecalho />
      <div className="dashboard-container">
        {loading && <p>Carregando…</p>}
        {err && <p style={{ color: "tomato" }}>{err}</p>}

        {/* KPIs */}
        <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, marginBottom: 18 }}>
          <CartaoIndicador title="Alertas (período)" value={<span>{totals.total}</span>} subtitle="Com base no período ativo" />
          <CartaoIndicador title="Críticos abertos" value={<span>{totals.criticos}</span>} subtitle="estado atual" />
          <CartaoIndicador title="Taxa de resolução" value={<span>{Math.round(totals.resolucao * 100)}%</span>} subtitle="7 dias" />
        </div>

        {/* Filtros */}
        <BarraFiltros onApply={setFilters} />

        {/* Cartões de severidade (contagens + expansão de abertos) */}
        <CartoesSeveridade
          alerts={alerts}
          renderItem={(a) => <LinhaAlerta item={a} />}
        />

        {/* CARD EXPANDÍVEL: Gráfico do período filtrado */}
        {rangeAtivo && (
          <>
            <div className="row-between" style={{ margin: "10px 0 6px", alignItems: "center" }}>
              <h4 className="section-title" style={{ margin: 0, fontSize: 14, color: "#475569" }}>
                Gráfico do Período Filtrado
              </h4>
              <button className="btn btn-outline" onClick={() => setRangeOpen(o => !o)}>
                {rangeOpen ? "Recolher" : "Expandir"}
              </button>
            </div>
            {rangeOpen && (
              <LinhaDoTempoAlertas
                alerts={alerts}
                range={selectedRange}
                severidadesSelecionadas={selSeveridades}
                aoAlternarSeveridade={(s) => {
                  const exists = selSeveridades.includes(s);
                  setSelSeveridades(exists ? selSeveridades.filter(x => x !== s) : [...selSeveridades, s]);
                }}
              />
            )}
          </>
        )}

        {/* Timeline principal (sempre relativa) + gauge */}
        <div className="cards-3" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18 }}>
          <LinhaDoTempoAlertas
            alerts={alerts}
            severidadesSelecionadas={selSeveridades}
            aoAlternarSeveridade={toggleSeverityChip}
          />
          <MedidorDeRisco
            score={riskScore}
            alerts={alerts}
            severidadesSelecionadas={selSeveridades}
            aoDefinirSomente={(s) => {
              const next = s ? [s] as Severidade[] : [];
              setSelSeveridades(next);
            }}
          />
        </div>

        {/* Lista */}
        <h3 className="section-title" style={{ marginTop: 20 }}>Alertas Recentes</h3>
        <div className="space-y" style={{ display: "grid", gap: 12 }}>
          {headers.map((h: any) => {
            const a = adaptarHeaderParaAlerta(h);
            return <LinhaAlerta key={a.id} item={a} raw={h} />;
          })}
        </div>

        <div className="footer">Safeteer</div>
      </div>
    </div>
  );
};

export default PaginaDashboard;
