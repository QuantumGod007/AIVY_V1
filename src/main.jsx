import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// On GitHub Pages the app is served under /AIVY_V1/
// import.meta.env.BASE_URL is set by vite.config.js base option
const basename = import.meta.env.BASE_URL;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
