import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "reveal.js/dist/reveal.css";
import "reveal.js/dist/theme/white.css";
import "./style.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
