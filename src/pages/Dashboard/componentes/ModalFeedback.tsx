/**
 * ModalFeedback.tsx
 * ------------------------------------------------------------------
 * Componente de modal para envio de feedback sobre alertas.
 * - Interface moderna e integrada ao design do dashboard
 * - Animações suaves e transições elegantes
 * - Validação de entrada e estados de carregamento
 * ------------------------------------------------------------------
 */

import React, { useState, useEffect, useRef } from "react";
import type { Alerta } from "../tipos";

interface Props {
  /** Se o modal está aberto */
  isOpen: boolean;
  /** Callback para fechar o modal */
  onClose: () => void;
  /** Alerta para o qual o feedback será enviado */
  alerta: Alerta | null;
  /** Callback executado ao enviar o feedback */
  onEnviarFeedback: (alertaId: string, feedback: string) => Promise<void>;
}

const ModalFeedback: React.FC<Props> = ({
  isOpen,
  onClose,
  alerta,
  onEnviarFeedback
}) => {
  const [feedback, setFeedback] = useState("");
  const [isEnviando, setIsEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Limpa o estado quando o modal abre/fecha
  useEffect(() => {
    if (isOpen) {
      setFeedback("");
      setErro(null);
      // Foca no textarea após a animação
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Fecha o modal com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Previne scroll do body quando modal está aberto
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleEnviar = async () => {
    if (!alerta || !feedback.trim()) {
      setErro("Por favor, digite seu feedback");
      return;
    }

    try {
      setIsEnviando(true);
      setErro(null);
      await onEnviarFeedback(alerta.id, feedback.trim());
      onClose();
    } catch (error) {
      setErro("Erro ao enviar feedback. Tente novamente.");
      console.error("Erro ao enviar feedback:", error);
    } finally {
      setIsEnviando(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !alerta) return null;

  return (
    <div 
      className="modal-overlay"
      onClick={handleOverlayClick}
    >
      <div className="modal-container">
        {/* Cabeçalho do modal */}
        <div className="modal-header">
          <div className="modal-title-section">
            <div className="modal-icon">
              👎
            </div>
            <div>
              <h3 className="modal-title">Reportar Problema</h3>
              <p className="modal-subtitle">
                Descreva o problema encontrado neste alerta
              </p>
            </div>
          </div>
          <button
            className="modal-close-btn"
            onClick={onClose}
            disabled={isEnviando}
            title="Fechar (ESC)"
          >
            ✕
          </button>
        </div>

        {/* Informações do alerta */}
        <div className="modal-alert-info">
          <div className="alert-info-item">
            <span className="alert-info-label">ID:</span>
            <span className="alert-info-value">{alerta.id}</span>
          </div>
          <div className="alert-info-item">
            <span className="alert-info-label">Título:</span>
            <span className="alert-info-value">{alerta.title}</span>
          </div>
          <div className="alert-info-item">
            <span className="alert-info-label">Severidade:</span>
            <span className={`alert-info-value badge ${getSeverityClass(alerta.severity)}`}>
              {alerta.severity.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Área de texto do feedback */}
        <div className="modal-content">
          <label htmlFor="feedback-textarea" className="modal-label">
            Descrição do problema:
          </label>
          <textarea
            id="feedback-textarea"
            ref={textareaRef}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Descreva o problema encontrado neste alerta, sugestão de melhoria ou observação..."
            className="modal-textarea"
            rows={4}
            maxLength={500}
            disabled={isEnviando}
          />
          <div className="modal-char-count">
            {feedback.length}/500 caracteres
          </div>
        </div>

        {/* Mensagem de erro */}
        {erro && (
          <div className="modal-error">
            ⚠️ {erro}
          </div>
        )}

        {/* Rodapé com botões */}
        <div className="modal-footer">
          <button
            className="btn btn-outline"
            onClick={onClose}
            disabled={isEnviando}
          >
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleEnviar}
            disabled={isEnviando || !feedback.trim()}
          >
            {isEnviando ? (
              <>
                <span className="loading-spinner"></span>
                Enviando...
              </>
            ) : (
              "Reportar Problema"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper para obter a classe CSS da severidade
function getSeverityClass(severity: string): string {
  switch (severity) {
    case "crítica": return "badge-critical";
    case "alta": return "badge-high";
    case "média": return "badge-medium";
    default: return "badge-low";
  }
}

export default ModalFeedback;
