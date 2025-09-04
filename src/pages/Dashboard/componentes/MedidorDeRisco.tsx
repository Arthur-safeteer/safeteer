import React from "react";
import type { Alerta, Severidade } from "../tipos";

type Props = {
  score: number;
  alerts: Alerta[];
  severidadesSelecionadas: Severidade[];
  aoDefinirSomente: (s: Severidade | null) => void;
};

const MedidorDeRisco: React.FC<Props> = ({ score, alerts, severidadesSelecionadas, aoDefinirSomente }) => {
  const cores = { baixa: "#10b981", média: "#facc15", alta: "#f97316", crítica: "#ef4444" } as const;
  const color = score <= 25 ? cores.baixa : score <= 50 ? "#f59e0b" : score <= 75 ? cores.alta : cores.crítica;
  const nivel = score <= 25 ? "Baixo" : score <= 50 ? "Médio" : score <= 75 ? "Médio-Alto" : "Alto";

  const cont = {
    crítica: alerts.filter(a => a.severity === "crítica").length,
    alta:    alerts.filter(a => a.severity === "alta").length,
    média:   alerts.filter(a => a.severity === "média").length,
    baixa:   alerts.filter(a => a.severity === "baixa").length,
  };
  const total = cont.crítica + cont.alta + cont.média + cont.baixa;
  const segs = total
    ? (["baixa","média","alta","crítica"] as Severidade[]).map(k => ({ key: k, value: (cont as any)[k], color: (cores as any)[k], pct: ((cont as any)[k] / total) * 100 }))
    : [];

  const isOnly = (s: Severidade) => severidadesSelecionadas.length === 1 && severidadesSelecionadas[0] === s;
  const chip = (act: boolean): React.CSSProperties => ({ cursor: "pointer", border: act ? "1px solid rgba(15,23,42,0.18)" : "1px solid rgba(15,23,42,0.08)" });

  const radius = 80, sw = 12, cx = 90, cy = 80, r = radius - sw/2, sweep = 180, start = 180;
  const polar = (a: number) => { const rad = (a*Math.PI)/180; return { x: cx + r*Math.cos(rad), y: cy + r*Math.sin(rad) }; };
  const arco = (a0: number, a1: number) => { const p0 = polar(a0), p1 = polar(a1); const la = a1 - a0 > 180 ? 1 : 0; return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${la} 1 ${p1.x} ${p1.y}`; };
  const ang = (p: number) => start + (p/100)*sweep;

  return (
    <div className="card">
      <div className="gauge-header">
        <h3 className="gauge-title">Nível de Risco Atual</h3>
        <div className="gauge-status" style={{ backgroundColor: color + "15", color }}>{nivel}</div>
      </div>

      <div className="gauge-container">
        <div className="gauge-visual">
          <div className="gauge-semicircle">
            <svg width="180" height="100" viewBox="0 0 180 100">
              <path d={arco(start, start + sweep)} fill="none" stroke="#e2e8f0" strokeWidth={sw} strokeLinecap="round" />
              {total ? (() => { let acc = 0; return segs.map(s => {
                  const a0 = ang(acc === 0 ? acc : acc - 0.15);
                  const a1 = ang(acc + s.pct + 0.15);
                  acc += s.pct;
                  return <path key={s.key} d={arco(a0, a1)} fill="none" stroke={s.color} strokeWidth={sw} strokeLinecap="butt" />;
              }); })() : null}
            </svg>
          </div>
          <div className="gauge-score-container small">
            <div className="gauge-score">{score}</div>
            <div className="gauge-label">PONTOS</div>
            <div className="gauge-subtitle">de risco</div>
          </div>
        </div>
      </div>

      <div className="gauge-severity">
        <div className="severity-item" style={chip(isOnly("crítica"))} onClick={() => aoDefinirSomente(isOnly("crítica") ? null : "crítica")}><div className="severity-dot critical" /><span>Crítico: {cont.crítica}</span></div>
        <div className="severity-item" style={chip(isOnly("alta"))} onClick={() => aoDefinirSomente(isOnly("alta") ? null : "alta")}><div className="severity-dot high" /><span>Alto: {cont.alta}</span></div>
        <div className="severity-item" style={chip(isOnly("média"))} onClick={() => aoDefinirSomente(isOnly("média") ? null : "média")}><div className="severity-dot medium" /><span>Médio: {cont.média}</span></div>
        <div className="severity-item" style={chip(isOnly("baixa"))} onClick={() => aoDefinirSomente(isOnly("baixa") ? null : "baixa")}><div className="severity-dot low" /><span>Baixo: {cont.baixa}</span></div>
      </div>
    </div>
  );
};

export default MedidorDeRisco;
