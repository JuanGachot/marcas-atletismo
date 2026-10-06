import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Auth() {
  const [modo, setModo] = useState("login"); // "login" | "registro"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function enviar(e) {
    e.preventDefault();
    setError("");
    setMensaje("");
    if (!email.trim() || !password.trim()) {
      setError("Completá tu correo y contraseña.");
      return;
    }
    setCargando(true);
    try {
      if (modo === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (err) throw err;
        setMensaje("Cuenta creada. Si pide confirmar el correo, revisá tu bandeja de entrada; si no, ya podés entrar.");
      }
    } catch (err) {
      setError(err.message || "Algo salió mal. Probá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #14304A 0%, #1E4568 100%)",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 360,
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        }}
      >
        <h1
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 24,
            fontWeight: 700,
            color: "#14304A",
            margin: "0 0 4px",
          }}
        >
          Mis marcas de atletismo
        </h1>
        <p style={{ color: "#5B6B76", fontSize: 13.5, margin: "0 0 20px" }}>
          {modo === "login" ? "Iniciá sesión con tu cuenta" : "Creá tu cuenta para empezar a registrar"}
        </p>

        <form onSubmit={enviar}>
          <label style={{ display: "block", fontSize: 13, color: "#5B6B76", marginBottom: 5 }}>Correo</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 9,
              border: "1px solid #DCD6C9",
              fontSize: 15,
              marginBottom: 14,
            }}
          />
          <label style={{ display: "block", fontSize: 13, color: "#5B6B76", marginBottom: 5 }}>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 9,
              border: "1px solid #DCD6C9",
              fontSize: 15,
              marginBottom: 16,
            }}
          />

          {error && <div style={{ color: "#B23A2E", fontSize: 13, marginBottom: 12 }}>{error}</div>}
          {mensaje && <div style={{ color: "#2E7D5B", fontSize: 13, marginBottom: 12 }}>{mensaje}</div>}

          <button
            type="submit"
            disabled={cargando}
            style={{
              width: "100%",
              background: "#E8601C",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 10,
              padding: "12px 0",
              fontSize: 15,
              fontWeight: 600,
              cursor: cargando ? "default" : "pointer",
              opacity: cargando ? 0.7 : 1,
            }}
          >
            {cargando ? "Un momento…" : modo === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>

        <button
          onClick={() => {
            setModo(modo === "login" ? "registro" : "login");
            setError("");
            setMensaje("");
          }}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            color: "#14304A",
            fontSize: 13,
            marginTop: 14,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          {modo === "login" ? "¿No tenés cuenta? Creá una" : "¿Ya tenés cuenta? Iniciá sesión"}
        </button>
      </div>
    </div>
  );
}
