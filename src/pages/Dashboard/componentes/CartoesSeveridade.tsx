import React, { useMemo } from "react";import type { Alerta, Severidade } from "../tipos";

/**
 * Cartões de Severidade
 * - Mostra 4 cards (Crítica, Alta, Média, Baixa) com contagens total/abertos.
 * - Clique em um card para filtrar os alertas na seção "Alertas Recentes".
 * - Redireciona para a seção de alertas com filtro aplicado.
 */
type Props = {
  alerts: Alerta[];
  onFilterBySeverity: (severity: Severidade | null) => void;
  selectedSeverity: Severidade | null;
  incluirEmProgresso?: boolean; // se true, considera "em_progresso" como aberto
};

const CartoesSeveridade: React.FC<Props> = ({
  alerts,
  onFilterBySeverity,
  selectedSeverity,
  incluirEmProgresso = false,
}) => {
  // (removido) mapeamento de classe não é mais usado neste componente

  const titulo = (s: Severidade) =>
    s === "baixa" ? "Baixa" : s === "média" ? "Média" : s === "alta" ? "Alta" : "Crítica";

  // cores e ícones para cada severidade (versão minimalista)
  const getSeverityConfig = (s: Severidade) => {
    switch (s) {
      case "crítica":
        return {
          bgColor: "var(--surface)",
          borderColor: "#dc2626",
          icon: "🔴",
          textColor: "#dc2626",
          badgeColor: "#dc2626"
        };
      case "alta":
        return {
          bgColor: "var(--surface)",
          borderColor: "#ea580c",
          icon: "🟠",
          textColor: "#ea580c",
          badgeColor: "#ea580c"
        };
      case "média":
        return {
          bgColor: "var(--surface)",
          borderColor: "#d97706",
          icon: "🟡",
          textColor: "#d97706",
          badgeColor: "#d97706"
        };
      case "baixa":
        return {
          bgColor: "var(--surface)",
          borderColor: "#16a34a",
          icon: "🟢",
          textColor: "#16a34a",
          badgeColor: "#16a34a"
        };
    }
  };

  // agrupa e conta
  const grupos = useMemo(() => {
    const base: Record<Severidade, { total: number; abertos: number }> = {
      baixa:   { total: 0, abertos: 0 },
      média:   { total: 0, abertos: 0 },
      alta:    { total: 0, abertos: 0 },
      crítica: { total: 0, abertos: 0 },
    };
    for (const a of alerts) {
      const g = base[a.severity];
      g.total += 1;
      const isAberto = a.status === "aberta" || (incluirEmProgresso && a.status === "em_progresso");
      if (isAberto) {
        g.abertos += 1;
      }
    }
    return base;
  }, [alerts, incluirEmProgresso]);

  const ordem: Severidade[] = ["crítica", "alta", "média", "baixa"];
  
  const cardStyle = (s: Severidade, ativo: boolean): React.CSSProperties => {
    const config = getSeverityConfig(s);
    return {
      cursor: "pointer",
      padding: 16,
      borderRadius: 12,
      border: `1px solid var(--outline)`,
      background: config.bgColor,
      color: "var(--text)",
      boxShadow: ativo ? "0 4px 12px rgba(0,0,0,0.12)" : "0 1px 3px rgba(0,0,0,0.06)",
      transition: "all 0.2s ease",
      transform: ativo ? "translateY(-1px)" : "translateY(0)",
      position: "relative",
    };
  };

  const handleCardClick = (severity: Severidade) => {
    // Se já está selecionado, remove o filtro
    if (selectedSeverity === severity) {
      onFilterBySeverity(null);
    } else {
      // Aplica o filtro e scroll para a seção de alertas
      onFilterBySeverity(severity);
      
      // Scroll suave para a seção de alertas recentes
      setTimeout(() => {
        const alertsSection = document.getElementById('alertas-recentes');
        
        if (alertsSection) {
          alertsSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
        } else {
          // Fallback: procura por texto que contenha "Alertas Recentes"
          const elements = document.querySelectorAll('h3');
          const alertsTitle = Array.from(elements).find(el => 
            el.textContent?.includes('Alertas Recentes')
          );
          if (alertsTitle) {
            alertsTitle.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start',
              inline: 'nearest'
            });
          }
        }
      }, 150);
    }
  };

  return (
    <div style={{ marginTop: 18, marginBottom: 32 }}>
      {/* Título da seção */}
      <h3 className="section-title" style={{ 
        margin: "0 0 16px", 
        fontSize: 18, 
                     color: "var(--text)",
        fontWeight: 700 
      }}>
        Severidade dos Alertas
      </h3>

      {/* grid dos 4 cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16 }}>
        {ordem.map((s) => {
          const ativo = selectedSeverity === s;
          const info = grupos[s];
          const config = getSeverityConfig(s);
          
          return (
            <div 
              key={s} 
              className="card" 
              style={cardStyle(s, ativo)} 
              onClick={() => handleCardClick(s)}
              title={`Clique para filtrar alertas ${s}`}
            >
              {/* Header com ícone e título */}
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                marginBottom: 12
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ 
                    fontSize: 12, 
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: config.textColor
                  }}>
                    {titulo(s)}
                  </span>
                </div>
                
                {/* Indicador de filtro ativo */}
                {ativo && (
                  <div style={{ fontSize: 12, opacity: 0.7, color: "var(--text)", fontWeight: 600 }}>✓</div>
                )}
              </div>
              
              {/* Contadores principais */}
              <div style={{ 
                display: "flex", 
                alignItems: "baseline", 
                gap: 8,
                marginBottom: 8
              }}>
                <div style={{ 
                  fontSize: 24, 
                  fontWeight: 700,
                  lineHeight: 1
                }}>
                  {info.total}
                </div>
                <div style={{ 
                  fontSize: 11, 
                  opacity: 0.7,
                  fontWeight: 500
                }}>
                  total
                </div>
              </div>
              
              {/* Alertas abertos */}
              <div style={{ 
                fontSize: 11,
                opacity: 0.8,
                fontWeight: 500
              }}>
                {info.abertos} em aberto
              </div>
            </div>
          );
        })}
      </div>

      {/* Indicador de filtro ativo */}
      {selectedSeverity && (
        <div style={{ 
          marginTop: 16,
          padding: "12px 16px",
          background: "var(--surface-2)",
          borderRadius: 12,
          border: "1px solid var(--outline)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ 
              fontSize: 14, 
              fontWeight: 600,
              color: "var(--text)"
            }}>
              Filtro ativo: {titulo(selectedSeverity)}
            </span>
          </div>
          <button 
            className="btn btn-outline" 
            onClick={() => onFilterBySeverity(null)}
            style={{
              padding: "6px 12px",
              fontSize: 11,
              fontWeight: 600
            }}
          >
            Limpar
          </button>
        </div>
      )}
    </div>
  );
};

export default CartoesSeveridade;
