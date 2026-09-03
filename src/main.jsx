import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import AdminContextProvider from "./context/AdminContext.jsx";
import EnvironmentBanner from "./components/EnvironmentBanner.jsx";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AdminContextProvider>
      <EnvironmentBanner />
      <App />
    </AdminContextProvider>
  </BrowserRouter>
);
