import { createGlobalStyle } from "styled-components";

export default createGlobalStyle`
  /* ---- Tokens (usados pelas páginas) ---- */
  :root{
    --bg:#0b1220;                     /* fundo de página */
    --surface:#ffffff;                /* cartões e superfícies principais */
    --text:#0f172a;                   /* texto primário em superfícies claras */
    --muted:#5b6677;                  /* texto secundário */
    --outline:rgba(15,23,42,.14);   /* contornos sutis */
    --surface-2:rgba(15,23,42,.06); /* campos, abas, etc */
    --p1:#1fe0c8; --p2:#19bfa9;       /* gradiente primário levemente mais vívido */
    --r:14px; --r-lg:20px;            /* cantos um pouco mais arredondados */
    --pad:8px; --gap:10px;
    --shadow-lg:0 24px 48px rgba(2,6,23,.22);
    --shadow-md:0 10px 18px rgba(25,191,169,.22);
  }

  /* ---- Reset/Base ---- */
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { height: 100%; }
  body {
    margin: 0;
    background: radial-gradient(1200px 600px at 10% 0%, rgba(31, 208, 185, .18), transparent 60%),
                radial-gradient(900px 520px at 100% 20%, rgba(29, 192, 171, .14), transparent 60%),
                var(--bg);
    color: #fff; 
    font-family: 'Roboto', system-ui, -apple-system, Segoe UI, Arial, sans-serif;
    -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
  }
  button, input, textarea, select { font: inherit; }
  button { cursor: pointer; }
  :focus { outline: none; }
  :focus-visible { outline: 2px solid var(--p2); outline-offset: 2px; }
`;
