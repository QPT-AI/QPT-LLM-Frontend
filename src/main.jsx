import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import "./styles/global.css";
import "./styles/pages.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Suspense fallback={null}>
      <App />
    </Suspense>
  </StrictMode>
);
