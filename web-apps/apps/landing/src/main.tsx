import React from "react";
import ReactDOM from "react-dom/client";

import { LandingPage } from "./LandingPage";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <LandingPage />
  </React.StrictMode>,
);
