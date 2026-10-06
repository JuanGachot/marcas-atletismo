import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { normalizar } from "./utils";

// Buscador de pistas: lee el catálogo compartido de Supabase, permite elegir
// una existente o crear una nueva (que queda disponible para todos).
export default function PistaBuscador({ valorTexto, onCambiar, onElegir }) {
  const [pistas, setPistas] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaCiudad, setNuevaCiudad] = useState("");
  const [guardandoNueva, setGuardandoNueva] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("pistas").select("id, nombre, ciudad").order("ciudad");
      if (!error && data) setPistas(data);
    })();
  }, []);

  const sugerencias = useMemo(() => {
    const q = normalizar(valorTexto);
    if (!q) return [];
    return pistas
      .filter((p) => normalizar(p.nombre).includes(q) || normalizar(p.ciudad).includes(q))
      .slice(0, 6);
  }, [valorTexto, pistas]);

  function elegir(p) {
    onElegir(p);
    setMostrarSugerencias(false);
    setMostrarNueva(false);
  }

  function abrirNueva() {
    setNuevoNombre(valorTexto);
    setNuevaCiudad("");
    setMostrarNueva(true);
    setMostrarSugerencias(false);
  }

  async function guardarNueva() {
    if (!nuevoNombre.trim() || !nuevaCiudad.trim()) return;
    setGuardandoNueva(true);
    const { data, error } = await supabase
      .from("pistas")
      .insert({ nombre: nuevoNombre.trim(), ciudad: nuevaCiudad.trim() })
      .select()
      .single();
    setGuardandoNueva(false);
    if (!error && data) {
      setPistas((prev) => [...prev, data]);
      elegir(data);
    } else if (error && error.code === "23505") {
      // ya existía (nombre + ciudad únicos): la buscamos y la usamos igual
      const existente = pistas.find(
        (p) => normalizar(p.nombre) === normalizar(nuevoNombre) && normalizar(p.ciudad) === normalizar(nuevaCiudad)
      );
      if (existente) elegir(existente);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        value={valorTexto}
        onChange={(e) => {
          onCambiar(e.target.value);
          setMostrarSugerencias(true);
          setMostrarNueva(false);
        }}
        onFocus={() => setMostrarSugerencias(true)}
        onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
        placeholder="ej. Curicó o Santiago"
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 9,
          border: "1px solid #DCD6C9",
          fontSize: 15,
        }}
      />

      {mostrarSugerencias && valorTexto.trim() && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: "#FFFFFF",
            border: "1px solid #DCD6C9",
            borderRadius: 10,
            boxShadow: "0 4px 14px rgba(20,48,74,0.14)",
            zIndex: 20,
            overflow: "hidden",
          }}
        >
          {sugerencias.map((p) => (
            <button
              key={p.id}
              onMouseDown={() => elegir(p)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid #EFEBE2",
                padding: "9px 12px",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 14, color: "#16232C", fontWeight: 500 }}>{p.nombre}</div>
              <div style={{ fontSize: 12, color: "#5B6B76" }}>{p.ciudad}</div>
            </button>
          ))}
          <button
            onMouseDown={abrirNueva}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              background: "#F6F4EF",
              border: "none",
              padding: "9px 12px",
              cursor: "pointer",
              fontSize: 13,
              color: "#E8601C",
              fontWeight: 600,
            }}
          >
            + Agregar "{valorTexto.trim()}" como pista nueva
          </button>
        </div>
      )}

      {mostrarNueva && (
        <div style={{ marginTop: 8, padding: 12, background: "#F6F4EF", borderRadius: 10, border: "1px solid #E7E2D8" }}>
          <div style={{ fontSize: 12.5, color: "#5B6B76", marginBottom: 8 }}>
            Pista nueva: queda disponible para todos los que usan esta app.
          </div>
          <input
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Nombre de la pista"
            style={{ width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid #DCD6C9", fontSize: 14, marginBottom: 7 }}
          />
          <input
            value={nuevaCiudad}
            onChange={(e) => setNuevaCiudad(e.target.value)}
            placeholder="Ciudad"
            style={{ width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid #DCD6C9", fontSize: 14, marginBottom: 9 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={guardarNueva}
              disabled={guardandoNueva}
              style={{ flex: 1, background: "#14304A", color: "#FFFFFF", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
            >
              {guardandoNueva ? "Guardando…" : "Guardar pista"}
            </button>
            <button
              onClick={() => setMostrarNueva(false)}
              style={{ background: "transparent", border: "1px solid #DCD6C9", borderRadius: 8, padding: "8px 14px", fontSize: 13.5, color: "#5B6B76", cursor: "pointer" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
