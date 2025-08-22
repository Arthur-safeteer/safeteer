import { createGlobalStyle } from "styled-components";

export default createGlobalStyle`
  /* ---- Tokens (usados pelas páginas) ---- */
  :root{
    --bg:#0b1220;
    --surface:#fff;
    --text:#0f172a;
    --muted:#475569;
    --outline:rgba(0,0,0,.12);
    --surface-2:rgba(0,0,0,.05);
    --p1:#1fd5bf; --p2:#1dc0ab;
    --r:12px; --r-lg:18px;
    --pad:8px; --gap:10px;
    --shadow-lg:0 22px 44px rgba(0,0,0,.16);
    --shadow-md:0 8px 14px rgba(29,192,171,.18);
  }

  /* ---- Reset/Base ---- */
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { height: 100%; }
  body {
    margin: 0;
    background: var(--bg);
    color: #fff; /* texto padrão; cada página ajusta o que precisar */
    font-family: 'Roboto', system-ui, -apple-system, Segoe UI, Arial, sans-serif;
    -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
  }
  button, input, textarea, select { font: inherit; }
  button { cursor: pointer; }
  :focus { outline: none; }
  :focus-visible { outline: 2px solid var(--p2); outline-offset: 2px; }
`;
