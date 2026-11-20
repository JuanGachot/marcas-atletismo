import { useState } from "react";
import { eventosDisponibles } from "./eventos";
import Registrar from "./Registrar";
import Historico from "./Historico";
import Progreso from "./Progreso";
import Ajustes from "./Ajustes";

const USER_ID_LOCAL = "atleta-local";

export default function App() {
  const [vista, setVista] = useState("registrar");
  const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
  const [recargarClave, setRecargarClave] = useState(0);

  const [tema, setTema] = useState(() => localStorage.getItem("tema") || "claro");
  const [pistaDefecto, setPistaDefecto] = useState(() => {
    try {
      const guardada = localStorage.getItem("pista-defecto");
      return guardada ? JSON.parse(guardada) : null;
    } catch {
      return null;
    }
  });
  const [pruebaDefecto, setPruebaDefecto] = useState(() => {
    try {
      const guardada = localStorage.getItem("prueba-defecto");
      return guardada ? JSON.parse(guardada) : { categoria: "pista", eventoId: eventosDisponibles("pista")[5].id };
    } catch {
      return { categoria: "pista", eventoId: eventosDisponibles("pista")[5].id };
    }
  });

  return (
    <div className="app-root" data-theme={tema}>
      <div style={{ background: "linear-gradient(135deg, #14304A 0%, #1E4568 100%)", padding: "20px 16px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "#BFD0DE", fontSize: 12 }}>Modo offline · Memoria local</div>
            <h1 style={{ fontFamily: "'Oswald', sans-serif", color: "#FFFFFF", fontSize: 22, fontWeight: 700, margin: 0 }}>
              Mis marcas de atletismo
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setAjustesAbiertos(true)}
              aria-label="Ajustes"
              style={{ background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 8, padding: 9, color: "#F7F5F0", cursor: "pointer", fontSize: 16 }}
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 16px 0", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", background: "var(--seg-bg)", borderRadius: 10, padding: 3 }}>
          {[
            { id: "registrar", label: "Registrar" },
            { id: "progreso", label: "Progreso" },
            { id: "historico", label: "Histórico" },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setVista(v.id)}
              style={{
                flex: 1,
                border: "none",
                borderRadius: 8,
                padding: "10px 0",
                fontWeight: 600,
                fontSize: 13.5,
                cursor: "pointer",
                background: vista === v.id ? "#14304A" : "transparent",
                color: vista === v.id ? "#FFFFFF" : "var(--text-secondary)",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {vista === "registrar" && <Registrar key={`reg-${recargarClave}`} userId={USER_ID_LOCAL} pistaDefecto={pistaDefecto} />}
      {vista === "progreso" && <Progreso key={`prog-${recargarClave}`} userId={USER_ID_LOCAL} pruebaDefecto={pruebaDefecto} tema={tema} />}
      {vista === "historico" && <Historico key={`hist-${recargarClave}`} userId={USER_ID_LOCAL} />}

      {ajustesAbiertos && (
        <Ajustes
          userId={USER_ID_LOCAL}
          tema={tema}
          setTema={setTema}
          pistaDefecto={pistaDefecto}
          setPistaDefecto={setPistaDefecto}
          pruebaDefecto={pruebaDefecto}
          setPruebaDefecto={setPruebaDefecto}
          onCerrar={(cambiaronDatos) => {
            setAjustesAbiertos(false);
            if (cambiaronDatos) setRecargarClave((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}