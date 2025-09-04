/**
 * LinhaDoTempoAlertas.tsx
 * ------------------------------------------------------------------
 * Componente de gráfico (Recharts) que exibe a linha do tempo de alertas.
 * - Pode trabalhar em dois modos:
 *   (1) relativo: 24h / 7d / 30d
 *   (2) customizado: quando recebe um `range` (início/fim em UTC)
 * - A legenda é clicável e funciona como filtro de severidade.
 * - O cálculo/agrupamento dos dados fica em `construirTimelineAPartirDeAlertas`
 *   (módulo ../uteis/tempo), para manter este componente focado só em UI.
 * ------------------------------------------------------------------
 */

import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import {
  construirTimelineAPartirDeAlertas,
  formatarDataLocal
} from "../uteis/tempo";
import { usePrefs } from "../../../contexts/PrefsContext";
import type { Alerta, Intervalo, Severidade } from "../tipos";

/** Propriedades esperadas pelo componente */
type Props = {
  /** Lista bruta de alertas (já normalizados no nível de página) */
  alerts: Alerta[];
  /** Severidades atualmente selecionadas (para “ligar/desligar” no gráfico) */
  severidadesSelecionadas: Severidade[];
  /** Callback disparado ao clicar numa severidade da legenda */
  aoAlternarSeveridade: (s: Severidade) => void;
  /** Período customizado (quando preenchido, o seletor 24h/7d/30d pode ser desabilitado) */
  range?: Intervalo;
  /** Título exibido no canto superior esquerdo */
  titulo?: string;
  /** Se true, desabilita os botões 24h/7d/30d quando `range` estiver ativo */
  desabilitarPeriodoQuandoRange?: boolean;
};

const LinhaDoTempoAlertas: React.FC<Props> = ({
  alerts,
  severidadesSelecionadas,
  aoAlternarSeveridade,
  range,
  titulo = "Linha do Tempo de Alertas",
  desabilitarPeriodoQuandoRange = true
}) => {
  const { timezone } = usePrefs();
  /** Estado local do período relativo (apenas para o gráfico principal) */
  const [periodo, setPeriodo] = useState<"24h" | "7d" | "30d">("24h");

  /**
   * Monta os dados do gráfico:
   * - usa `construirTimelineAPartirDeAlertas` para agrupar por hora/dia
   * - aplica o filtro de severidades da legenda
   */
  const dados = useMemo(() => {
    const base = construirTimelineAPartirDeAlertas(alerts, periodo, range, timezone);
    
    // Se nenhuma severidade estiver selecionada, mostra todos os dados
    if (!severidadesSelecionadas.length) {
      return base;
    }

    const want = new Set(severidadesSelecionadas);
    return base.map((b) => ({
      ...b,
      baixa: want.has("baixa") ? b.baixa : 0,
      media: want.has("média") ? b.media : 0,
      alta: want.has("alta") ? b.alta : 0,
      critica: want.has("crítica") ? b.critica : 0
    }));
  }, [alerts, periodo, range, severidadesSelecionadas, timezone]);

  /** `range` ativo indica modo “customizado” (intervalo de datas) */
  const rangeAtivo = !!(range?.start || range?.end);

  /** Helpers da UI (estilo e estado da legenda clicável) */
  const isSel = (s: Severidade) => severidadesSelecionadas.includes(s);
  const chip = (ativo: boolean): React.CSSProperties => ({
    cursor: "pointer",
    opacity: ativo ? 1 : 0.55,
    border: ativo
      ? "1px solid rgba(15,23,42,0.18)"
      : "1px solid rgba(15,23,42,0.08)"
  });

  return (
    <div className="card">
      {/* Cabeçalho do gráfico: título + seletor de período */}
      <div className="timeline-header">
        <div className="timeline-title-row">
          <h3 className="timeline-title">{titulo}</h3>

          {/* Seletor 24h/7d/30d (pode ser desabilitado se `range` estiver ativo) */}
          <div className="period-selector">
            <button
              className={`period-btn ${periodo === "24h" ? "active" : ""}`}
              onClick={() => setPeriodo("24h")}
              disabled={rangeAtivo && desabilitarPeriodoQuandoRange}
            >
              24h
            </button>
            <button
              className={`period-btn ${periodo === "7d" ? "active" : ""}`}
              onClick={() => setPeriodo("7d")}
              disabled={rangeAtivo && desabilitarPeriodoQuandoRange}
            >
              7d
            </button>
            <button
              className={`period-btn ${periodo === "30d" ? "active" : ""}`}
              onClick={() => setPeriodo("30d")}
              disabled={rangeAtivo && desabilitarPeriodoQuandoRange}
            >
              30d
            </button>
          </div>
        </div>

        {/* Subtítulo com contexto do período exibido */}
        <div className="timeline-subtitle">
          {rangeAtivo
            ? `Período filtrado${
                range?.start ? ` de ${formatarDataLocal(range.start!)}` : ""
              }${range?.end ? ` até ${formatarDataLocal(range.end!)}` : ""} (${timezone})`
            : periodo === "24h"
            ? `últimas 24 horas (${timezone})`
            : periodo === "7d"
            ? `últimos 7 dias (${timezone})`
            : `últimos 30 dias (${timezone})`}
        </div>
      </div>

      {/* Área do gráfico (Recharts) */}
      <div className="timeline-chart">
        <ResponsiveContainer width="100%" height="100%">
          {/* Gráfico de barras empilhadas: uma barra por bucket (hora/dia) com 4 severidades */}
          <BarChart data={dados} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.04)" vertical={false} />
            <XAxis
              dataKey="hour"
              tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              tickMargin={12}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 400 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tickMargin={8}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--outline)",
                borderRadius: 12,
                boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                color: "var(--text)"
              }}
              labelStyle={{
                color: "var(--text)",
                fontWeight: 600,
                fontSize: 14
              }}
              formatter={(value, name) => {
                const colors = {
                  baixa: "#1dc0ab",
                  media: "#facc15", 
                  alta: "#f97316",
                  critica: "#ef4444"
                };
                const labels = {
                  baixa: "Baixa",
                  media: "Média",
                  alta: "Alta", 
                  critica: "Crítica"
                };
                return [
                  <span key={name} style={{ color: colors[name as keyof typeof colors] }}>
                    {labels[name as keyof typeof labels]}: {value}
                  </span>,
                  ""
                ];
              }}
            />

            {/* Cada Bar representa uma severidade; `stackId="a"` faz a pilha */}
            <Bar dataKey="baixa"   stackId="a" fill="#1dc0ab" stroke="none" radius={[0, 0, 4, 4]} />
            <Bar dataKey="media"   stackId="a" fill="#facc15" stroke="none" radius={0} />
            <Bar dataKey="alta"    stackId="a" fill="#f97316" stroke="none" radius={0} />
            <Bar dataKey="critica" stackId="a" fill="#ef4444" stroke="none" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda clicável (filtro visual por severidade) */}
      <div className="timeline-legend">
        <div
          className="legend-item"
          style={chip(isSel("baixa"))}
          onClick={() => aoAlternarSeveridade("baixa")}
        >
          <div className="legend-dot low" />
          <span>Baixa</span>
        </div>

        <div
          className="legend-item"
          style={chip(isSel("média"))}
          onClick={() => aoAlternarSeveridade("média")}
        >
          <div className="legend-dot medium" />
          <span>Média</span>
        </div>

        <div
          className="legend-item"
          style={chip(isSel("alta"))}
          onClick={() => aoAlternarSeveridade("alta")}
        >
          <div className="legend-dot high" />
          <span>Alta</span>
        </div>

        <div
          className="legend-item"
          style={chip(isSel("crítica"))}
          onClick={() => aoAlternarSeveridade("crítica")}
        >
          <div className="legend-dot critical" />
          <span>Crítica</span>
        </div>
      </div>
    </div>
  );
};

export default LinhaDoTempoAlertas;
