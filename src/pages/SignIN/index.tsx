import React, { useMemo, useState } from "react";
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

export default function SignIN() {
  const [tab, setTab] = useState<"login" | "register">("login");

  // Estados separados por aba
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showRegPass, setShowRegPass] = useState(false);

  const loginEmailErr = useMemo(() => (loginEmail && !loginEmail.includes("@") ? "Email inválido" : ""), [loginEmail]);
  const loginPassErr  = useMemo(() => (loginPassword && loginPassword.length < 6 ? "Mínimo 6 caracteres" : ""), [loginPassword]);

  const regNameErr  = useMemo(() => (regName && regName.length < 2 ? "Nome muito curto" : ""), [regName]);
  const regEmailErr = useMemo(() => (regEmail && !regEmail.includes("@") ? "Email inválido" : ""), [regEmail]);
  const regPassErr  = useMemo(() => (regPassword && regPassword.length < 6 ? "Mínimo 6 caracteres" : ""), [regPassword]);

  function onSubmitLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loginEmailErr || loginPassErr) return;
    console.log("[LOGIN]", { email: loginEmail, password: loginPassword });
    alert("Login simulado! Veja o console.");
  }

  function onSubmitRegister(e: React.FormEvent) {
    e.preventDefault();
    if (regNameErr || regEmailErr || regPassErr) return;
    console.log("[REGISTER]", { name: regName, email: regEmail, password: regPassword });
    alert("Cadastro simulado! Veja o console.");
  }

  return (
    <div className="screen">
      <div className="card pop-in">
        <div className="header">
          <h1 className="title">Entrar ou Criar conta</h1>
            <div className="subtitle">
                {tab === "login" ? "Entre na sua conta" : "Crie uma nova conta"}
            </div>
        </div>

        <div className={`tabs ${tab === "register" ? "is-register" : "is-login"}`} role="tablist" aria-label="Escolher ação">
          <span className="tabIndicator" aria-hidden />
          <button
            className="tabButton btn-login"
            role="tab"
            aria-selected={tab === "login"}
            onClick={() => setTab("login")}
            aria-controls="pane-login"
            id="tab-login"
          >
            Entrar
          </button>
          <button
            className="tabButton btn-register"
            role="tab"
            aria-selected={tab === "register"}
            onClick={() => setTab("register")}
            aria-controls="pane-register"
            id="tab-register"
          >
            Criar conta
          </button>
        </div>

        <div className={`forms ${tab === "register" ? "is-register" : "is-login"}`}>
          <div className="slider">
            {/* LOGIN */}
            <section className="pane" id="pane-login" aria-labelledby="tab-login" aria-hidden={tab !== "login"}>
              <form className="form" onSubmit={onSubmitLogin} noValidate>
                <label className="field">
                  <input
                    className="input"
                    type="email"
                    placeholder="Email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    autoComplete="email"
                  />
                  {loginEmailErr && <span className="error">{loginEmailErr}</span>}
                </label>

                <label className="field">
                  <div className="inputWrap">
                    <input
                      className="input withToggle"
                      type={showLoginPass ? "text" : "password"}
                      placeholder="Senha"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="togglePass"
                      aria-label={showLoginPass ? "Ocultar senha" : "Mostrar senha"}
                      aria-pressed={showLoginPass}
                      onMouseDown={() => setShowLoginPass(true)}
                      onMouseUp={() => setShowLoginPass(false)}
                      onMouseLeave={() => setShowLoginPass(false)}
                      onKeyDown={(e) => (e.key === " " || e.key === "Enter") && setShowLoginPass(v => !v)}
                    >
                      <EyeIcon on={showLoginPass} />
                    </button>
                  </div>
                  {loginPassErr && <span className="error">{loginPassErr}</span>}
                </label>

                <button className="btn btn-primary" disabled={!!loginEmailErr || !!loginPassErr}>Entrar</button>
              </form>
            </section>

            {/* REGISTER */}
            <section className="pane" id="pane-register" aria-labelledby="tab-register" aria-hidden={tab !== "register"}>
              <form className="form" onSubmit={onSubmitRegister} noValidate>
                <label className="field">
                  
                  <input
                    className="input"
                    placeholder="Seu nome"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                  />
                  {regNameErr && <span className="error">{regNameErr}</span>}
                </label>

                <label className="field">
                  
                  <input
                    className="input"
                    placeholder="Telefone"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                  />
                  {regNameErr && <span className="error">{regNameErr}</span>}
                </label>

                <label className="field">
                  
                  <input
                    className="input"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    autoComplete="email"
                  />
                  {regEmailErr && <span className="error">{regEmailErr}</span>}
                </label>

                <label className="field">
                  
                  <div className="inputWrap">
                    <input
                      className="input withToggle"
                      type={showRegPass ? "text" : "password"}
                      placeholder="Senha"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="togglePass"
                      aria-label={showRegPass ? "Ocultar senha" : "Mostrar senha"}
                      aria-pressed={showRegPass}
                      onMouseDown={() => setShowRegPass(true)}
                      onMouseUp={() => setShowRegPass(false)}
                      onMouseLeave={() => setShowRegPass(false)}
                      onKeyDown={(e) => (e.key === " " || e.key === "Enter") && setShowRegPass(v => !v)}
                    >
                      <EyeIcon on={showRegPass} />
                    </button>
                  </div>
                  {regPassErr && <span className="error">{regPassErr}</span>}
                </label>

                <button className="btn btn-primary" disabled={!!regNameErr || !!regEmailErr || !!regPassErr}>Criar conta</button>
              </form>
            </section>
          </div>
        </div>

        <p className="hint"> Safeteer </p>
      </div>
    </div>
  );
}