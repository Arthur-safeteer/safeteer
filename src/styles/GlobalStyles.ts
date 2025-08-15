import { createGlobalStyle } from 'styled-components';

export default createGlobalStyle`
  /* Box sizing consistente */
  *, *::before, *::after {
    box-sizing: border-box;
  }

  /* Altura total para layout full-height */
  html, body, #root {
    height: 100%;
  }

  /* Reset básico */
  body {
    margin: 0;
    font-family: 'Roboto', system-ui, -apple-system, Segoe UI, Arial, sans-serif;
    /* não mexo em background aqui para não sobrescrever o da página */
  }

  /* Mantenha bordas padrão (não zere globalmente) */
  button, input, textarea, select {
    font: inherit;
  }

  button { cursor: pointer; }

  /* Acessibilidade: só remove outline “feio”, mantendo para teclado */
  :focus { outline: none; }
  :focus-visible {
    outline: 2px solid #1dc0ab;
    outline-offset: 2px;
  }
`;
