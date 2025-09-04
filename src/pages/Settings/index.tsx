// src/pages/Settings/index.tsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePrefs } from "../../contexts/PrefsContext";
import { signOut } from "../../auth/cognitoAuth";

// Fusos do Brasil (sem repetir offsets): Fernando de Noronha, Brasília, Amazonas e Acre
const BR_TIMEZONES = [
  { id: "America/Noronha",    label: "Fernando de Noronha (UTC-02)" },
  { id: "America/Sao_Paulo",  label: "Brasília (UTC-03)" },
  { id: "America/Manaus",     label: "Amazonas (UTC-04)" },
  { id: "America/Rio_Branco", label: "Acre (UTC-05)" },
];

/* ===================== Header ===================== */
const Cabecalho: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header
      className="dashboard-header"
      style={{ 
        borderBottom: "1px solid var(--outline)", 
        background: "var(--surface)" 
      }}
    >
      <div
        className="header-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
        }}
      >
        {/* Título que volta para /dashboard */}
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: "var(--text)",
            cursor: "pointer",
          }}
          onClick={() => navigate("/dashboard")}
          title="Voltar para o Dashboard"
        >
          ← Dashboard
        </h2>

        {/* Título da página */}
        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: "var(--text)",
          }}
        >
          Configurações
        </h1>

        {/* Espaçador */}
        <div style={{ width: 28 }} />
      </div>
    </header>
  );
};

/* ===================== UI Components ===================== */
const Cartao: React.FC<{ 
  title: string; 
  subtitle?: string;
  children: React.ReactNode;
  icon?: string;
}> = ({ title, subtitle, children, icon }) => (
  <div
    style={{
      background: "var(--surface)",
      border: "1px solid var(--outline)",
      borderRadius: 16,
      padding: 24,
      marginBottom: 20,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}
  >
    {/* Header do card */}
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      gap: 12, 
      marginBottom: 20 
    }}>
      {icon && (
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
          display: "grid",
          placeItems: "center",
          fontSize: 18,
          color: "#fff"
        }}>
          {icon}
        </div>
      )}
      <div>
        <h3 style={{ 
          margin: 0, 
          fontSize: 18, 
          fontWeight: 700,
          color: "var(--text)"
        }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{ 
            margin: "4px 0 0", 
            fontSize: 14, 
            color: "var(--muted)",
            lineHeight: 1.4
          }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>

    {/* Conteúdo */}
    {children}
  </div>
);

const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}> = ({ checked, onChange, label, description }) => (
  <div style={{ 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "space-between",
    padding: "16px 0"
  }}>
    <div>
      <div style={{ 
        fontSize: 16, 
        fontWeight: 600,
        color: "var(--text)",
        marginBottom: 4
      }}>
        {label}
      </div>
      {description && (
        <div style={{ 
          fontSize: 14, 
          color: "var(--muted)",
          lineHeight: 1.4
        }}>
          {description}
        </div>
      )}
    </div>
    
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 52,
        height: 28,
        background: checked ? "#16a34a" : "var(--surface-2)",
        borderRadius: 999,
        border: "none",
        cursor: "pointer",
        padding: 2,
        transition: "all 0.2s ease",
        position: "relative",
      }}
      title={checked ? "Desativar" : "Ativar"}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "#fff",
          transform: `translateX(${checked ? 24 : 0}px)`,
          transition: "transform 0.2s ease",
          boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
        }}
      />
    </button>
  </div>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; label: string }>;
  description?: string;
  helperText?: string;
}> = ({ label, value, onChange, options, description, helperText }) => (
  <div>
    <div style={{ marginBottom: 12 }}>
      <div style={{ 
        fontSize: 16, 
        fontWeight: 600,
        color: "var(--text)",
        marginBottom: 4
      }}>
        {label}
      </div>
      {description && (
        <div style={{ 
          fontSize: 14, 
          color: "var(--muted)",
          lineHeight: 1.4
        }}>
          {description}
        </div>
      )}
    </div>

    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "12px 16px",
        borderRadius: 12,
        border: "1px solid var(--outline)",
        background: "var(--surface)",
        color: "var(--text)",
        fontSize: 14,
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>

    {helperText && (
      <div style={{ 
        marginTop: 8, 
        fontSize: 13, 
        color: "var(--muted)",
        fontStyle: "italic"
      }}>
        {helperText}
      </div>
    )}
  </div>
);

const DangerButton: React.FC<{
  onClick: () => void;
  label: string;
  description?: string;
}> = ({ onClick, label, description }) => (
  <div style={{ 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "space-between",
    padding: "16px 0",
    borderTop: "1px solid var(--outline)",
    marginTop: 16
  }}>
    <div>
      <div style={{ 
        fontSize: 16, 
        fontWeight: 600,
        color: "var(--text)",
        marginBottom: 4
      }}>
        {label}
      </div>
      {description && (
        <div style={{ 
          fontSize: 14, 
          color: "var(--muted)",
          lineHeight: 1.4
        }}>
          {description}
        </div>
      )}
    </div>
    
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        background: "transparent",
        color: "#ef4444",
        border: "1px solid #ef4444",
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#ef4444";
        e.currentTarget.style.color = "#fff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "#ef4444";
      }}
    >
      Sair
    </button>
  </div>
);

const ModalConfirmacao: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", cancelText = "Cancelar" }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--outline)",
          borderRadius: 16,
          padding: 24,
          maxWidth: 400,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
        }}
      >
        <h3 style={{ 
          margin: "0 0 12px", 
          fontSize: 18, 
          fontWeight: 700, 
          color: "var(--text)" 
        }}>
          {title}
        </h3>
        <p style={{ 
          margin: "0 0 24px", 
          fontSize: 14, 
          color: "var(--muted)",
          lineHeight: 1.5
        }}>
          {message}
        </p>
        <div style={{ 
          display: "flex", 
          gap: 12, 
          justifyContent: "flex-end" 
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              background: "transparent",
              color: "var(--muted)",
              border: "1px solid var(--outline)",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "10px 20px",
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ===================== Página Principal ===================== */
export default function Settings() {
  const { darkMode, timezone, setDarkMode, setTimezone } = usePrefs();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const agora = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "full",
        timeStyle: "medium",
        timeZone: timezone,
      }).format(new Date());
    } catch {
      return "";
    }
  }, [timezone]);

  const handleLogout = () => {
    signOut();
    navigate("/");
  };

  return (
    <div className="dashboard" style={{ 
      minHeight: "100vh", 
      background: "var(--bg)" 
    }}>
      <Cabecalho />
      
      <div className="dashboard-container" style={{ 
        maxWidth: 800, 
        margin: "0 auto", 
        padding: "24px 16px" 
      }}>
        {/* Card - Aparência */}
        <Cartao 
          title="Aparência" 
          subtitle="Personalize a aparência da interface"
        >
          <ToggleSwitch
            checked={darkMode}
            onChange={setDarkMode}
            label="Modo escuro"
            description="Ative o tema escuro para reduzir o cansaço visual"
          />
        </Cartao>

        {/* Card - Fuso-horário */}
        <Cartao 
          title="Fuso-horário" 
          subtitle="Configure seu horário local"
        >
          <SelectField
            label="Selecione seu fuso"
            value={timezone}
            onChange={setTimezone}
            options={BR_TIMEZONES}
            description="Escolha seu fuso do Brasil. Usaremos isso para mostrar datas/horas no seu horário local."
            helperText={`Hora atual nesse fuso: ${agora}`}
          />
        </Cartao>

        {/* Card - Conta */}
        <Cartao 
          title="Conta" 
          subtitle="Gerencie sua conta e sessão"
        >
          <DangerButton
            onClick={() => setShowLogoutModal(true)}
            label="Sair da conta"
            description="Encerre sua sessão atual e retorne à tela de login"
          />
        </Cartao>

        {/* Botões */}
        <div style={{ 
          display: "flex", 
          justifyContent: "center",
          gap: 16,
          marginTop: 32 
        }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              padding: "12px 24px",
              background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: "0 2px 8px rgba(14, 165, 233, 0.25)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(14, 165, 233, 0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(14, 165, 233, 0.25)";
            }}
          >
            Voltar ao Dashboard
          </button>
        </div>

        <div className="footer" style={{ 
          textAlign: "center", 
          marginTop: 48,
          padding: "24px 0",
          fontSize: 14,
          color: "var(--muted)"
        }}>
          Safeteer
        </div>
      </div>

      {/* Modal de confirmação de logout */}
      <ModalConfirmacao
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        title="Sair da conta"
        message="Tem certeza que deseja sair da sua conta? Você precisará fazer login novamente para acessar o sistema."
        confirmText="Sair"
        cancelText="Cancelar"
      />
    </div>
  );
}
