/**
 * Página Dashboard
 * - Busca os alertas no backend (lista geral ou filtrada)
 * - Normaliza os dados recebidos para um tipo interno `Alerta`
 * - Calcula métricas/KPIs e um score de risco simples
 * - Renderiza filtros, timeline, gauge de risco, cartões de severidade e a lista de alertas
 */

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  listarCabecalhosAlertas,
  filtrarAlertas,
  atualizarStatusPorAlertaId,
  type FilterBody,
  type ApiAlertHeaderRaw,
} from "../../api/alerts";

import LinhaDoTempoAlertas from "./componentes/LinhaDoTempoAlertas";
import MedidorDeRisco from "./componentes/MedidorDeRisco";
import CartoesSeveridade from "./componentes/CartoesSeveridade";
import ModalFeedback from "./componentes/ModalFeedback";

import { parseEmUtc, formatarDataLocal } from "./uteis/tempo";
import type { Alerta, Severidade, Status, Intervalo } from "./tipos";
import { usePrefs } from "../../contexts/PrefsContext";

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
/** Cabeçalho visual do dashboard com navegação para Configurações */
const Cabecalho: React.FC = () => {
  const navigate = useNavigate();
  const { darkMode } = usePrefs();

  return (
    <header
      className="dashboard-header"
      style={{ borderBottom: "1px solid var(--outline)", background: "var(--surface)" }}
    >
      <div
        className="header-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          position: "relative",
        }}
      >
        {/* Logo à esquerda */}
        <div
          className="header-left"
          style={{
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
          }}
          onClick={() => navigate("/dashboard")}
          title="Ir para o Dashboard"
        >
          {/* Logo */}
          <div className="logo-container">
            <img
              src={darkMode ? "/assets/Horizontal-1.png" : "/assets/Horizontal-2.png"}
              alt="Safeteer Logo"
              className="logo-image"
              style={{
                height: 32,
                width: "auto",
                maxWidth: 200,
                objectFit: "contain",
              }}
              onError={(e) => {
                // Fallback caso a imagem não carregue
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.textContent = 'Safeteer';
                fallback.style.cssText = `
                  height: 32px;
                  display: flex;
                  align-items: center;
                  font-size: 18px;
                  font-weight: 700;
                  color: var(--text);
                  background: linear-gradient(135deg, #1dc0ab, #0d9488);
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  background-clip: text;
                `;
                target.parentNode?.insertBefore(fallback, target);
              }}
            />
          </div>
        </div>

        {/* Título centralizado */}
        <h2
          className="header-center"
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: "var(--text)",
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            cursor: "pointer",
          }}
          onClick={() => navigate("/dashboard")}
          title="Ir para o Dashboard"
        >
          Dashboard
        </h2>

        {/* Perfil: clique leva para /config */}
        <button
          type="button"
          onClick={() => navigate("/config")}
          title="Abrir configurações"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 4,
            borderRadius: 8,
          }}
        >
          <div
            className="user-avatar"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "#0ea5e9",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            JC
          </div>
          <span className="user-name" style={{ fontSize: 12, color: "var(--muted)" }}>
            João Carlos
          </span>
        </button>
      </div>
    </header>
  );
};

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
  if (!s) return undefined;
  const v = s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s|_/g, "");

  if (/^(emandamento|inprogress|progress|andamento)$/.test(v)) return "em_progresso";
  if (/^(fechada|closed|resolvida|resolvido)$/.test(v)) return "fechada";
  if (/^(aberta|aberto|open|opened|novo|nova)$/.test(v)) return "aberta";

  console.warn("Status não mapeado:", s);
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


/* ===================== Helpers visuais ===================== */
function classeSeveridade(s: Severidade) {
  switch (s) {
    case "crítica": return "badge-critical";
    case "alta": return "badge-high";
    case "média": return "badge-medium";
    default: return "badge-low";
  }
}
function rotuloStatus(s: Status) {
  return s.replace("em_progresso", "Em Progresso").replace("aberta", "Aberta").replace("fechada", "Fechada");
}
function classeStatus(s: Status) {
  switch (s) {
    case "em_progresso": return "status-progress";
    case "fechada": return "status-closed";
    default: return "status-open";
  }
}

/* ===================== UI Primitives ===================== */
const Cartao: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = "", children }) =>
  <div className={`card ${className}`}>{children}</div>;

const CartaoIndicador: React.FC<{ title: string; value: React.ReactNode; subtitle?: string; }> = ({ title, value, subtitle }) => (
  <div className="card" style={{ padding: 18, borderRadius: 14, background: "var(--surface)", backdropFilter: "blur(8px)", border: "1px solid var(--outline)" }}>
    <div style={{ color: "var(--muted)", fontSize: 12, fontWeight: 700, letterSpacing: 0.3 }}>{title}</div>
    <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", marginTop: 6 }}>{value}</div>
    {subtitle ? <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>{subtitle}</div> : null}
  </div>
);

/* ===================== Conversão de DATA (sem hora) ===================== */
function dataLocalParaUTCInicio(v?: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(`${v}T00:00:00Z`);
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}
function dataLocalParaUTCFim(v?: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(`${v}T23:59:59Z`);
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/* ===================== Barra de Filtros ===================== */
const BarraFiltros: React.FC<{ onApply: (filters: any) => void }> = ({ onApply }) => {
  const [severity, setSeverity] = useState<string>("todas");
  const [origem, setOrigem] = useState<string>("todas");
  const [status, setStatus] = useState<string>("todas");
  const [inicio, setInicio] = useState<string>("");
  const [fim, setFim] = useState<string>("");

  const limpar = () => { setSeverity("todas"); setOrigem("todas"); setStatus("todas"); setInicio(""); setFim(""); };

  return (
    <Cartao>
      <div className="filter-bar" style={{ gap: 12, alignItems: "flex-end" }}>
        <div className="field">
          <label className="label">Severidade</label>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="select select-pill">
            <option value="todas">Todas</option>
            <option value="crítica">Crítica</option>
            <option value="alta">Alta</option>
            <option value="média">Média</option>
            <option value="baixa">Baixa</option>
          </select>
        </div>
        <div className="field">
          <label className="label">Origem</label>
          <select value={origem} onChange={(e) => setOrigem(e.target.value)} className="select select-pill">
            <option value="todas">Todas</option>
            <option value="Firewall">Firewall</option>
            <option value="AD">AD</option>
            <option value="Endpoint">Endpoint</option>
            <option value="Antivírus">Antivírus</option>
          </select>
        </div>
        <div className="field">
          <label className="label">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="select select-pill">
            <option value="todas">Todos</option>
            <option value="aberta">Aberta</option>
            <option value="em_progresso">Em Progresso</option>
            <option value="fechada">Fechada</option>
          </select>
        </div>
        <div className="field">
          <label className="label">Início</label>
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="input" placeholder="dd/mm/aaaa" />
        </div>
        <div className="field">
          <label className="label">Fim</label>
          <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="input" placeholder="dd/mm/aaaa" />
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={limpar} className="btn btn-outline">Limpar</button>
          <button onClick={() => onApply({ severity, origem, status, inicio, fim })} className="btn btn-primary">Aplicar</button>
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
                 <div className="kv"><div className="k">Detecção:</div><div className="v">{formatarDataLocal(item.createdAt)}</div></div>
         <div className="kv"><div className="k">Atualizado:</div><div className="v">{item.updatedAt ? formatarDataLocal(item.updatedAt) : "—"}</div></div>
      </div>
    </div>
  );
};

/* ===================== Linha do Alerta (UTC) ===================== */
const LinhaAlerta: React.FC<{ item: Alerta; raw?: ApiAlertHeaderRaw; onUpdateStatus?: (alertaId: string, newStatus: Status) => void; onAbrirModalFeedback: (alerta: Alerta) => void }> = ({ item, raw, onUpdateStatus, onAbrirModalFeedback }) => {
  const [open, setOpen] = useState(false);
  const [feedbackEnviado, setFeedbackEnviado] = useState<boolean>(() => {
    try { 
      return localStorage.getItem(`alert-feedback-${item.id}`) === "1" || (raw as any)?.feedback_enviado === true;
    } catch { 
      return false; 
    }
  });
  const alternar = () => setOpen(v => !v);
  const h: any = raw ?? {};
  const id = h.alerta_id ?? item.id;
  const cliente = h.cliente_id ?? "—";
  const origem = h.origem ?? item.endpoint ?? "—";
  const quando = h.data_evento ?? item.createdAt;

  // Atualiza o estado quando o feedback é enviado
  useEffect(() => {
    const checkFeedback = () => {
      try {
        const enviado = localStorage.getItem(`alert-feedback-${item.id}`) === "1" || (raw as any)?.feedback_enviado === true;
        setFeedbackEnviado(enviado);
      } catch {
        setFeedbackEnviado(false);
      }
    };

    // Verifica imediatamente
    checkFeedback();

    // Escuta evento personalizado de feedback enviado
    const handleFeedbackEnviado = (e: CustomEvent) => {
      if (e.detail.alertaId === item.id) {
        setFeedbackEnviado(true);
      }
    };

    // Escuta mudanças no localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `alert-feedback-${item.id}`) {
        checkFeedback();
      }
    };

    window.addEventListener('feedbackEnviado', handleFeedbackEnviado as EventListener);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('feedbackEnviado', handleFeedbackEnviado as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [item.id, raw]);

  function handleEnviarFeedback() {
    onAbrirModalFeedback(item);
  }

  async function handleTrocarStatus(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation();
    const novo = e.target.value as Status;
    
    
    try {
      await atualizarStatusPorAlertaId(id, novo);
      
      // Chama a callback para atualizar o estado global PRIMEIRO
      if (onUpdateStatus) {
        onUpdateStatus(id, novo);
      }
      
      // Atualiza o status localmente para feedback imediato
      item.status = novo;
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      alert("Falha ao atualizar status do alerta.");
    }
  }

  return (
    <div className="card" style={{ padding: 14, borderRadius: 12, border: "1px solid var(--outline)", background: "var(--surface)" }}>
      <div className="row-between" style={{ alignItems: "center", gap: 12, cursor: "pointer" }} onClick={alternar}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className={`badge ${classeSeveridade(item.severity)}`}>{item.severity.toUpperCase()}</span>
          <div>
            <div style={{ fontWeight: 700, color: "var(--text)" }}>{item.title}</div>
            <div className="alert-meta">
              <span>ID: {id}</span>
              <span>Cliente: {cliente}</span>
              <span>Origem: {origem}</span>
                             <span>Detecção: {formatarDataLocal(quando)}</span>
               {item.updatedAt && <span>Atualizado: {formatarDataLocal(item.updatedAt)}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }} onClick={(e) => e.stopPropagation()}>
          <span className={`badge ${classeStatus(item.status)}`}>{rotuloStatus(item.status)}</span>
          <button
            className={`btn btn-ghost like-btn ${feedbackEnviado ? "liked" : ""}`}
            title={feedbackEnviado ? "Problema reportado" : "Reportar problema"}
            onClick={handleEnviarFeedback}
            disabled={feedbackEnviado}
          >
            {feedbackEnviado ? "✅" : "👎"}
          </button>
          <select
            value={item.status}
            onChange={handleTrocarStatus}
            className="select select-pill"
          >
            <option value="aberta">Aberta</option>
            <option value="em_progresso">Em Progresso</option>
            <option value="fechada">Fechada</option>
          </select>
        </div>
      </div>

      {open && <DetalhesDoAlerta item={item} raw={raw} />}
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
function normalizarTexto(v?: string) {
  return (v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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

  const di = dataLocalParaUTCInicio(f?.inicio);
  const df = dataLocalParaUTCFim(f?.fim);
  if (di) body.data_inicio = di;
  if (df) body.data_fim = df;

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
  const [selectedSeverity, setSelectedSeverity] = useState<Severidade | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [rangeOpen, setRangeOpen] = useState(false);
  
  // Estado do modal de feedback
  const [modalFeedbackAberto, setModalFeedbackAberto] = useState(false);
  const [alertaParaFeedback, setAlertaParaFeedback] = useState<Alerta | null>(null);

  const toggleSeverityChip = (s: Severidade) => {
    setSelSeveridades(prev => {
      const exists = prev.includes(s);
      return exists ? prev.filter(x => x !== s) : [...prev, s];
    });
  };

  // Funções para gerenciar o modal de feedback
  const abrirModalFeedback = (alerta: Alerta) => {
    setAlertaParaFeedback(alerta);
    setModalFeedbackAberto(true);
  };

  const fecharModalFeedback = () => {
    setModalFeedbackAberto(false);
    setAlertaParaFeedback(null);
  };

  const enviarFeedback = async (alertaId: string, feedback: string) => {
    try {
      // Aqui você pode implementar a chamada para a API de feedback
      // await enviarFeedbackAPI(alertaId, feedback);
      
      // Por enquanto, apenas simula o envio
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Marca como enviado no localStorage
      localStorage.setItem(`alert-feedback-${alertaId}`, "1");
      
      // Dispara evento personalizado para atualizar o estado dos componentes
      window.dispatchEvent(new CustomEvent('feedbackEnviado', { 
        detail: { alertaId } 
      }));
      
      // Atualiza o estado local para mostrar que o feedback foi enviado
      setHeaders(prevHeaders => 
        prevHeaders.map(header => {
          if ((header as any).alerta_id === alertaId) {
            return { ...header, feedback_enviado: true };
          }
          return header;
        })
      );
    } catch (error) {
      console.error("Erro ao enviar feedback:", error);
      throw error;
    }
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
          data = await filtrarAlertas(body);
          console.log("🔍 ALERTAS FILTRADOS da API:", data);
          console.log("📊 Resumo dos alertas filtrados:", {
            total: data.length,
            porStatus: data.reduce((acc, alert) => {
              const status = alert.status || 'indefinido';
              acc[status] = (acc[status] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
            porSeveridade: data.reduce((acc, alert) => {
              const severidade = alert.severidade || 'indefinido';
              acc[severidade] = (acc[severidade] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          });
        } else {
          data = await listarCabecalhosAlertas();
          console.log("📋 TODOS OS ALERTAS da API:", data);
          console.log("📊 Resumo de todos os alertas:", {
            total: data.length,
            porStatus: data.reduce((acc, alert) => {
              const status = alert.status || 'indefinido';
              acc[status] = (acc[status] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
            porSeveridade: data.reduce((acc, alert) => {
              const severidade = alert.severidade || 'indefinido';
              acc[severidade] = (acc[severidade] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          });
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

  const alertsForGraph = useMemo(() => {
    const list = alerts;
    const hasStatus = !!(filters?.status && filters.status !== "todas");
    const hasOrigem = !!(filters?.origem && filters.origem !== "todas");
    
    return list.filter((a) => {
      const okStatus = hasStatus ? a.status === filters.status : true;
      const okOrigem = hasOrigem ? normalizarTexto(a.endpoint) === normalizarTexto(filters.origem) : true;
      return okStatus && okOrigem;
    });
  }, [alerts, filters]);

  // Risk score baseado nos alertas filtrados (para o gauge)
  const riskScoreForGauge = useMemo(() => {
    if (!alertsForGraph.length) return 0;
    
    const w: Record<Severidade, number> = { crítica: 1.0, alta: 0.7, média: 0.4, baixa: 0.2 };
    const sum = alertsForGraph.reduce((acc, a) => acc + w[a.severity], 0);
    return Math.max(0, Math.min(100, Math.round((sum / 10) * 100)));
  }, [alertsForGraph]);

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

    // Cálculo melhorado da taxa de resolução

    // Taxa de resolução melhorada: considera todos os alertas ativos
    const totalAlertas = alerts.length;
    const alertasFechados = alerts.filter(a => a.status === "fechada").length;
    
    // Taxa de resolução: alertas fechados / total de alertas
    const resolucao = totalAlertas > 0 ? alertasFechados / totalAlertas : 0;


    // Cálculo do tempo médio de resolução (apenas para alertas fechados com updatedAt)
    const fechadosComTempo = alerts.filter(a => a.status === "fechada" && a.updatedAt);
    const avgMs = fechadosComTempo.length
      ? Math.round(
          fechadosComTempo.reduce((acc: number, a: Alerta) => {
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

        {/* KPIs principais */}
        <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, marginBottom: 18 }}>
          <CartaoIndicador title="Alertas (período)" value={<span>{totals.total}</span>} subtitle="Com base no período ativo" />
          <CartaoIndicador title="Críticos abertos" value={<span>{totals.criticos}</span>} subtitle="estado atual" />
          <CartaoIndicador title="Taxa de resolução" value={<span>{Math.round(totals.resolucao * 100)}%</span>} subtitle="total de alertas" />
        </div>

        {/* Cartões de severidade */}
        <CartoesSeveridade 
          alerts={alerts} 
          onFilterBySeverity={setSelectedSeverity}
          selectedSeverity={selectedSeverity}
        />

        {/* Filtros */}
        <BarraFiltros onApply={setFilters} />

        {/* Timeline do período filtrado */}
        {rangeAtivo && (
          <>
            <div className="row-between" style={{ margin: "10px 0 6px", alignItems: "center" }}>
                             <h4 className="section-title" style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>
                Gráfico do Período Filtrado
              </h4>
              <button className="btn btn-outline" onClick={() => setRangeOpen(o => !o)}>
                {rangeOpen ? "Recolher" : "Expandir"}
              </button>
            </div>
            {rangeOpen && (
              <LinhaDoTempoAlertas
                alerts={alertsForGraph}
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

        {/* Timeline principal + gauge */}
        <div className="cards-3" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18 }}>
          <LinhaDoTempoAlertas
            alerts={alertsForGraph}
            severidadesSelecionadas={selSeveridades}
            aoAlternarSeveridade={toggleSeverityChip}
          />
          <MedidorDeRisco
            score={riskScoreForGauge}
            alerts={alertsForGraph}
            severidadesSelecionadas={selSeveridades}
            aoDefinirSomente={(s) => {
              const next = s ? [s] as Severidade[] : [];
              setSelSeveridades(next);
            }}
          />
        </div>

        {/* Lista de alertas */}
        <h3 id="alertas-recentes" className="section-title" style={{ marginTop: 20 }}>
          Alertas Recentes
          {selectedSeverity && (
            <span style={{ 
              marginLeft: 8,
              fontSize: 14,
                             color: "var(--muted)",
              fontWeight: 500
            }}>
              — Filtrado por {selectedSeverity}
            </span>
          )}
        </h3>
        <div className="space-y" style={{ display: "grid", gap: 12 }}>
          {headers
            .map((h: any) => {
              const a = adaptarHeaderParaAlerta(h);
              return { alert: a, raw: h };
            })
            .filter(({ alert }) => {
              const matchSeverity = selectedSeverity ? alert.severity === selectedSeverity : true;
              const hasStatusFilter = !!(filters?.status && filters.status !== "todas");
              const matchStatus = hasStatusFilter
                ? alert.status === filters.status
                : (selectedSeverity ? alert.status === "aberta" : true);
              const hasOrigemFilter = !!(filters?.origem && filters.origem !== "todas");
              const matchOrigem = hasOrigemFilter
                ? normalizarTexto(alert.endpoint) === normalizarTexto(filters.origem)
                : true;
              return matchSeverity && matchStatus && matchOrigem;
            })
            .map(({ alert, raw }) => (
              <LinhaAlerta 
                key={alert.id} 
                item={alert} 
                raw={raw} 
                onUpdateStatus={(alertaId, newStatus) => {
                  setHeaders(prevHeaders => 
                    prevHeaders.map(header => {
                      if ((header as any).alerta_id === alertaId) {
                        // Converte o status interno para o formato da API
                        const statusParaAPI = newStatus === "em_progresso" ? "Em Andamento" : 
                                             newStatus === "fechada" ? "Fechada" : 
                                             newStatus === "aberta" ? "Aberta" : newStatus;
                        return { ...header, status: statusParaAPI };
                      }
                      return header;
                    })
                  );
                }}
                onAbrirModalFeedback={abrirModalFeedback}
              />
            ))
          }
        </div>

        <div className="footer">Safeteer</div>
      </div>

      {/* Modal de Feedback */}
      <ModalFeedback
        isOpen={modalFeedbackAberto}
        onClose={fecharModalFeedback}
        alerta={alertaParaFeedback}
        onEnviarFeedback={enviarFeedback}
      />
    </div>
  );
};

export default PaginaDashboard;
