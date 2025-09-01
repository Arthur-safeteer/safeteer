import React, { useMemo, useState } from "react";
import type { Alerta, Severidade } from "../tipos";
import { formatarDataUTC } from "../uteis/tempo";

/**
 * Cartões de Severidade
 * - Mostra 4 cards (Baixa, Média, Alta, Crítica) com contagens total/abertos.
 * - Clique em um card para expandir a lista de alertas em ABERTO daquela severidade.
 * - Se a prop `renderItem` for fornecida, usamos ela para renderizar cada alerta
 *   (ex.: reaproveitar o seu <LinhaAlerta /> do index). Senão, usamos um item básico.
 */
type Props = {
  alerts: Alerta[];
  renderItem?: (a: Alerta) => React.ReactNode;
  incluirEmProgresso?: boolean; // se true, considera "em_progresso" como aberto
};

const CartoesSeveridade: React.FC<Props> = ({
  alerts,
  renderItem,
  incluirEmProgresso = false,
}) => {
  const [aberto, setAberto] = useState<Severidade | null>(null);

  // mapeia classe CSS da badge pela severidade
  const classeSeveridade = (s: Severidade) =>
    s === "crítica" ? "badge-critical" :
    s === "alta"    ? "badge-high"     :
    s === "média"   ? "badge-medium"   : "badge-low";

  const titulo = (s: Severidade) =>
    s === "baixa" ? "Baixa" : s === "média" ? "Média" : s === "alta" ? "Alta" : "Crítica";

  // agrupa e conta
  const grupos = useMemo(() => {
    const base: Record<Severidade, { total: number; abertos: number; itensAbertos: Alerta[] }> = {
      baixa:   { total: 0, abertos: 0, itensAbertos: [] },
      média:   { total: 0, abertos: 0, itensAbertos: [] },
      alta:    { total: 0, abertos: 0, itensAbertos: [] },
      crítica: { total: 0, abertos: 0, itensAbertos: [] },
    };
    for (const a of alerts) {
      const g = base[a.severity];
      g.total += 1;
      const isAberto = a.status === "aberta" || (incluirEmProgresso && a.status === "em_progresso");
      if (isAberto) {
        g.abertos += 1;
        g.itensAbertos.push(a);
      }
    }
    return base;
  }, [alerts, incluirEmProgresso]);

  const ordem: Severidade[] = ["baixa", "média", "alta", "crítica"];
  const cardStyle = (ativo: boolean): React.CSSProperties => ({
    cursor: "pointer",
    padding: 16,
    borderRadius: 14,
    border: ativo ? "1px solid rgba(15,23,42,0.18)" : "1px solid rgba(15,23,42,0.08)",
    background: "#fff",
    boxShadow: ativo ? "0 2px 0 rgba(15,23,42,0.06)" : "0 1px 0 rgba(15,23,42,0.04)",
    transition: "border-color .15s, box-shadow .15s",
  });

  // fallback simples se você não passar renderItem
  const ItemBasico: React.FC<{ a: Alerta }> = ({ a }) => (
    <div className="card" style={{ padding: 14, borderRadius: 12, border: "1px solid rgba(15,23,42,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className={`badge ${classeSeveridade(a.severity)}`}>{a.severity.toUpperCase()}</span>
        <div>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>{a.title}</div>
          <div className="alert-meta">
            <span>Origem: {a.endpoint}</span>
            <span>Detecção: {formatarDataUTC(a.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ marginTop: 14 }}>
      {/* grid dos 4 cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14 }}>
        {ordem.map((s) => {
          const ativo = aberto === s;
          const info = grupos[s];
          return (
            <div key={s} className="card" style={cardStyle(ativo)} onClick={() => setAberto(ativo ? null : s)}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span className={`badge ${classeSeveridade(s)}`}>{titulo(s).toUpperCase()}</span>
                <div style={{ fontWeight: 800, fontSize: 20, color: "#0f172a" }}>{info.total}</div>
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Abertos: <b>{info.abertos}</b></div>
            </div>
          );
        })}
      </div>

      {/* área expandida com a lista */}
      {aberto && (
        <div style={{ marginTop: 12 }}>
          <div className="row-between" style={{ alignItems: "center", marginBottom: 6 }}>
            <h4 className="section-title" style={{ margin: 0 }}>
              Alertas <b>abertos</b> — severidade {titulo(aberto)}
            </h4>
            <button className="btn btn-outline" onClick={() => setAberto(null)}>Fechar</button>
          </div>

          {grupos[aberto].itensAbertos.length === 0 ? (
            <div className="card" style={{ padding: 14, color: "#64748b" }}>
              Nenhum alerta aberto para esta severidade.
            </div>
          ) : (
            <div className="space-y" style={{ display: "grid", gap: 12 }}>
              {grupos[aberto].itensAbertos.map((a) =>
                renderItem ? <React.Fragment key={a.id}>{renderItem(a)}</React.Fragment>
                           : <ItemBasico key={a.id} a={a} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CartoesSeveridade;
