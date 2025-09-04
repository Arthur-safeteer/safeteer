import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  loginWithCognito,
  registerWithCognito,
  confirmRegistration,
  resendConfirmationCode,
} from "../../auth/cognitoAuth";
import { usePrefs } from "../../contexts/PrefsContext";
import "./SignIN.css";

function EyeIcon({ on }: { on: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6" />
      <circle cx="12" cy="12" r="2.5" />
      {!on && <path d="M3 3l18 18" />}
    </svg>
  );
}

type RegStep = "form" | "code";

export default function SignIN() {
  const { darkMode } = usePrefs();
  const [tab, setTab] = useState<"login" | "register">("login");

  // LOGIN
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPass, setShowLoginPass] = useState(false);

  // REGISTER
  const [regStep, setRegStep] = useState<RegStep>("form");
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");        
  const [regClientId, setRegClientId] = useState("");      
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegPass2, setShowRegPass2] = useState(false); 
  const [code, setCode] = useState("");

  const loginEmailErr = useMemo(() => (loginEmail && !loginEmail.includes("@") ? "Email inválido" : ""), [loginEmail]);
  const loginPassErr  = useMemo(() => (loginPassword && loginPassword.length < 6 ? "Mínimo 6 caracteres" : ""), [loginPassword]);

  const regNameErr    = useMemo(() => (regName && regName.length < 2 ? "Nome muito curto" : ""), [regName]);
  const regEmailErr   = useMemo(() => (regEmail && !regEmail.includes("@") ? "Email inválido" : ""), [regEmail]);
  const regPassErr    = useMemo(() => (regPassword && regPassword.length < 6 ? "Mínimo 6 caracteres" : ""), [regPassword]);
  const regConfirmErr = useMemo(() => (regConfirm && regPassword !== regConfirm ? "Senhas não coincidem" : ""), [regPassword, regConfirm]);
  const regClientErr  = useMemo(() => (regClientId ? "Informe o Client ID" : ""), [regClientId]);

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function onSubmitLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loginEmailErr || loginPassErr) return;

    try {
      setLoading(true);
      await loginWithCognito({ email: loginEmail, password: loginPassword });
      navigate("/dashboard");
    } catch (err: any) {
      alert(err?.message || "Falha no login. Verifique e-mail/senha.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitRegister(e: React.FormEvent) {
    e.preventDefault();
    if (regNameErr || regEmailErr || regPassErr || regConfirmErr || regClientErr) return;

    try {
      setLoading(true);
      await registerWithCognito({
        email: regEmail,
        password: regPassword,
        name: regName,
        phone: regPhone || undefined,
        clientId: regClientId, 
      });
      setRegStep("code");
      alert("Enviamos um código para seu email. Digite abaixo para confirmar.");
    } catch (err: any) {
      alert(err?.message || "Falha no cadastro.");
    } finally {
      setLoading(false);
    }
  }

  async function onConfirmCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code) return;
    try {
      setLoading(true);
      await confirmRegistration(regEmail, code);
      await loginWithCognito({ email: regEmail, password: regPassword });
      navigate("/dashboard");
    } catch (err: any) {
      alert(err?.message || "Código inválido/expirado.");
    } finally {
      setLoading(false);
    }
  }

  async function onResendCode() {
    try {
      await resendConfirmationCode(regEmail);
      alert("Código reenviado para seu email.");
    } catch (err: any) {
      alert(err?.message || "Não foi possível reenviar o código.");
    }
  }

  return (
    <div className={`screen signin ${darkMode ? 'dark' : ''}`}>
      <div className="card pop-in">
        <div className="header">
          {/* Logo */}
          <div className="logo-container">
            <img
              src={darkMode ? "/assets/Vertical-2.png" : "/assets/Vertical-1.png"}
              alt="Safeteer Logo"
              className="logo-image"
              onError={(e) => {
                // Fallback caso a imagem não carregue
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.textContent = 'Safeteer';
                fallback.style.cssText = `
                  height: 60px;
                  display: flex;
                  align-items: center;
                  font-size: 24px;
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
          
          <h1 className="title">
            {tab === "login" ? "Entrar na conta" : "Criar conta"}
          </h1>
          <div className="subtitle">
            {tab === "login" ? "Entre na sua conta" : "Crie uma nova conta"}
          </div>
        </div>

        <div className={`tabs ${tab === "register" ? "is-register" : "is-login"}`} role="tablist" aria-label="Escolher ação">
          <span className="tabIndicator" aria-hidden />
          <button className="tabButton btn-login" role="tab" aria-selected={tab === "login"} onClick={() => setTab("login")} id="tab-login">
            Entrar
          </button>
          <button className="tabButton btn-register" role="tab" aria-selected={tab === "register"} onClick={() => { setTab("register"); setRegStep("form"); }} id="tab-register">
            Criar conta
          </button>
        </div>

        <div className={`forms ${tab === "register" ? "is-register" : "is-login"}`}>
          <div className="slider">
            {/* LOGIN */}
            <section className="pane" id="pane-login" aria-hidden={tab !== "login"}>
              <form className="form" onSubmit={onSubmitLogin} noValidate>
                <label className="field">
                  <input className="input" type="email" placeholder="Email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} autoComplete="email" />
                  {loginEmailErr && <span className="error">{loginEmailErr}</span>}
                </label>

                <label className="field">
                  <div className="inputWrap">
                    <input className="input withToggle" type={showLoginPass ? "text" : "password"} placeholder="Senha" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} autoComplete="current-password" />
                    <button type="button" className="togglePass" aria-label={showLoginPass ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showLoginPass}
                      onMouseDown={() => setShowLoginPass(true)} onMouseUp={() => setShowLoginPass(false)} onMouseLeave={() => setShowLoginPass(false)}
                      onKeyDown={(e) => (e.key === " " || e.key === "Enter") && setShowLoginPass(v => !v)}>
                      <EyeIcon on={showLoginPass} />
                    </button>
                  </div>
                  {loginPassErr && <span className="error">{loginPassErr}</span>}
                </label>

                <button className="btn btn-primary" disabled={loading || !!loginEmailErr || !!loginPassErr}>
                  {loading ? "Entrando..." : "Entrar"}
                </button>
              </form>
            </section>

            {/* REGISTER */}
            <section className="pane" id="pane-register" aria-hidden={tab !== "register"}>
              {regStep === "form" ? (
                <form className="form" onSubmit={onSubmitRegister} noValidate>
                  <label className="field">
                    <input className="input" placeholder="Seu nome" value={regName} onChange={(e) => setRegName(e.target.value)} />
                    {regNameErr && <span className="error">{regNameErr}</span>}
                  </label>

                  <label className="field">
                    <input className="input" placeholder="Telefone (+55...)" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} />
                  </label>

                  <label className="field">
                    <input className="input" type="email" placeholder="email@exemplo.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} autoComplete="email" />
                    {regEmailErr && <span className="error">{regEmailErr}</span>}
                  </label>

                  {/* Client ID */}
                  <label className="field">
                    <input className="input" placeholder="Client ID (empresa)" value={regClientId} onChange={(e) => setRegClientId(e.target.value)} />
                    {regClientErr && <span className="error">{regClientErr}</span>}
                  </label>

                  {/* Senha */}
                  <label className="field">
                    <div className="inputWrap">
                      <input className="input withToggle" type={showRegPass ? "text" : "password"} placeholder="Senha" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} autoComplete="new-password" />
                      <button type="button" className="togglePass" aria-label={showRegPass ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showRegPass}
                        onMouseDown={() => setShowRegPass(true)} onMouseUp={() => setShowRegPass(false)} onMouseLeave={() => setShowRegPass(false)}
                        onKeyDown={(e) => (e.key === " " || e.key === "Enter") && setShowRegPass(v => !v)}>
                        <EyeIcon on={showRegPass} />
                      </button>
                    </div>
                    {regPassErr && <span className="error">{regPassErr}</span>}
                  </label>

                  {/* Confirmar senha */}
                  <label className="field">
                    <div className="inputWrap">
                      <input className="input withToggle" type={showRegPass2 ? "text" : "password"} placeholder="Confirmar senha" value={regConfirm} onChange={(e) => setRegConfirm(e.target.value)} autoComplete="new-password" />
                      <button type="button" className="togglePass" aria-label={showRegPass2 ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showRegPass2}
                        onMouseDown={() => setShowRegPass2(true)} onMouseUp={() => setShowRegPass2(false)} onMouseLeave={() => setShowRegPass2(false)}
                        onKeyDown={(e) => (e.key === " " || e.key === "Enter") && setShowRegPass2(v => !v)}>
                        <EyeIcon on={showRegPass2} />
                      </button>
                    </div>
                    {regConfirmErr && <span className="error">{regConfirmErr}</span>}
                  </label>

                  <button
                    className="btn btn-primary"
                    disabled={
                      loading ||
                      !!regNameErr || !!regEmailErr || !!regPassErr || !!regConfirmErr || !!regClientErr
                    }
                  >
                    {loading ? "Enviando..." : "Criar conta"}
                  </button>
                </form>
              ) : (
                <form className="form" onSubmit={onConfirmCode} noValidate>
                  <p className="subtitle">Enviamos um código para <b>{regEmail}</b>. Digite para confirmar.</p>
                  <label className="field">
                    <input className="input" placeholder="Código de confirmação" value={code} onChange={(e) => setCode(e.target.value)} />
                  </label>
                  <div className="row" style={{ gap: 8 }}>
                    <button type="button" className="btn btn-outline" onClick={onResendCode}>Reenviar código</button>
                    <button className="btn btn-primary" disabled={loading || !code}>{loading ? "Confirmando..." : "Confirmar e entrar"}</button>
                  </div>
                </form>
              )}
            </section>
          </div>
        </div>

        <p className="hint">Safeteer</p>
      </div>
    </div>
  );
}
