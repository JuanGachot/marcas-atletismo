import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";
import Registrar from "./Registrar";
import Historico from "./Historico";

export default function App() {
  const [sesion, setSesion] = useState(undefined); // undefined = cargando, null = sin sesión
  const [vista, setVista] = useState("registrar");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nuevaSesion) => {
      setSesion(nuevaSesion);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (sesion === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#5B6B76" }}>
        Cargando…
      </div>
    );
  }

  if (!sesion) {
    return <Auth />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F6F4EF" }}>
      <div style={{ background: "linear-gradient(135deg, #14304A 0%, #1E4568 100%)", padding: "20px 16px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "#BFD0DE", fontSize: 12 }}>{sesion.user.email}</div>
            <h1 style={{ fontFamily: "'Oswald', sans-serif", color: "#FFFFFF", fontSize: 22, fontWeight: 700, margin: 0 }}>
              Mis marcas de atletismo
            </h1>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 8, padding: "8px 12px", color: "#F7F5F0", fontSize: 12.5, cursor: "pointer" }}
          >
            Salir
          </button>
        </div>
      </div>

      <div style={{ padding: "16px 16px 0", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", background: "#F0EDE5", borderRadius: 10, padding: 3 }}>
          {[
            { id: "registrar", label: "Registrar" },
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
                fontSize: 14,
                cursor: "pointer",
                background: vista === v.id ? "#14304A" : "transparent",
                color: vista === v.id ? "#FFFFFF" : "#5B6B76",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {vista === "registrar" ? <Registrar userId={sesion.user.id} /> : <Historico userId={sesion.user.id} />}
    </div>
  );
}
