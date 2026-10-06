import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { EVENTOS, eventosDisponibles } from "./eventos";
import { fechaLegible } from "./utils";

export default function Historico({ userId }) {
  const [categoria, setCategoria] = useState("pista"); // "pista" | "campo" | "pesas"
  const [marcas, setMarcas] = useState([]);
  const [pesas, setPesas] = useState([]);
  const [cargado, setCargado] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({});

  async function cargar() {
    const [resMarcas, resPesas] = await Promise.all([
      supabase.from("marcas").select("*").eq("user_id", userId).order("fecha", { ascending: false }),
      supabase.from("pesas").select("*").eq("user_id", userId).order("fecha", { ascending: false }),
    ]);
    if (resMarcas.data) setMarcas(resMarcas.data);
    if (resPesas.data) setPesas(resPesas.data);
    setCargado(true);
  }

  useEffect(() => {
    cargar();
  }, [userId]);

  async function borrar(tabla, id) {
    await supabase.from(tabla).delete().eq("id", id);
    cargar();
  }

  function empezarEdicion(item, esPesas) {
    setEditandoId(item.id);
    if (esPesas) {
      setForm({ evento_id: item.evento_id, peso: item.peso, potencia: item.potencia || "", fecha: item.fecha, nota: item.nota || "" });
    } else {
      setForm({
        categoria: item.categoria,
        tipo: item.tipo,
        evento_id: item.evento_id,
        marca: item.marca,
        viento: item.viento || "",
        pista_texto: item.pista_texto || "",
        fecha: item.fecha,
        nota: item.nota || "",
      });
    }
  }

  async function guardarEdicion(esPesas) {
    if (esPesas) {
      const ejercicio = EVENTOS.pesas.find((e) => e.id === form.evento_id);
      await supabase
        .from("pesas")
        .update({
          evento_id: ejercicio.id,
          evento_nombre: ejercicio.nombre,
          peso: parseFloat(String(form.peso).replace(",", ".")),
          potencia: form.potencia ? parseFloat(String(form.potencia).replace(",", ".")) : null,
          fecha: form.fecha,
          nota: form.nota || null,
        })
        .eq("id", editandoId);
    } else {
      const lista = eventosDisponibles(form.categoria);
      const evento = lista.find((e) => e.id === form.evento_id) || lista[0];
      await supabase
        .from("marcas")
        .update({
          tipo: form.tipo,
          evento_id: evento.id,
          evento_nombre: evento.nombre,
          marca: form.marca,
          viento: evento.viento ? form.viento || null : null,
          pista_texto: form.pista_texto,
          fecha: form.fecha,
          nota: form.nota || null,
        })
        .eq("id", editandoId);
    }
    setEditandoId(null);
    cargar();
  }

  const lista = categoria === "pesas" ? pesas : marcas.filter((m) => m.categoria === categoria);

  return (
    <div style={{ padding: "16px 16px 40px", maxWidth: 480, margin: "0 auto" }}>
      <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, fontWeight: 600, color: "#14304A", margin: "0 0 12px" }}>
        Registro histórico
      </h2>

      <div style={{ display: "flex", background: "#F0EDE5", borderRadius: 10, padding: 3, marginBottom: 16 }}>
        {[
          { id: "pista", label: "Pista" },
          { id: "campo", label: "Campo" },
          { id: "pesas", label: "Pesas" },
        ].map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoria(c.id)}
            style={{
              flex: 1,
              border: "none",
              borderRadius: 8,
              padding: "8px 0",
              fontWeight: 600,
              fontSize: 13.5,
              cursor: "pointer",
              background: categoria === c.id ? "#14304A" : "transparent",
              color: categoria === c.id ? "#FFFFFF" : "#5B6B76",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {!cargado ? (
        <div style={{ color: "#5B6B76", fontSize: 14 }}>Cargando…</div>
      ) : lista.length === 0 ? (
        <div style={{ background: "#FFFFFF", border: "1px dashed #DCD6C9", borderRadius: 12, padding: "22px 16px", textAlign: "center", color: "#5B6B76", fontSize: 14 }}>
          Todavía no hay marcas acá.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {lista.map((item) => {
            const esPesas = categoria === "pesas";
            const enEdicion = editandoId === item.id;

            if (enEdicion) {
              return (
                <div key={item.id} style={{ background: "#FFFFFF", borderRadius: 12, padding: 14, border: "1px solid #E8C25A" }}>
                  {!esPesas && (
                    <div style={{ display: "flex", background: "#F0EDE5", borderRadius: 9, padding: 3, marginBottom: 9 }}>
                      {["entrenamiento", "competencia"].map((t) => (
                        <button
                          key={t}
                          onClick={() => setForm({ ...form, tipo: t })}
                          style={{ flex: 1, border: "none", borderRadius: 7, padding: "7px 0", fontWeight: 600, fontSize: 12.5, cursor: "pointer", background: form.tipo === t ? "#E8601C" : "transparent", color: form.tipo === t ? "#FFFFFF" : "#5B6B76" }}
                        >
                          {t === "competencia" ? "Competencia" : "Entrenamiento"}
                        </button>
                      ))}
                    </div>
                  )}

                  <select
                    value={form.evento_id}
                    onChange={(e) => setForm({ ...form, evento_id: e.target.value })}
                    style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #DCD6C9", fontSize: 13.5, marginBottom: 9 }}
                  >
                    {(esPesas ? EVENTOS.pesas : eventosDisponibles(form.categoria)).map((e) => (
                      <option key={e.id} value={e.id}>{e.nombre}</option>
                    ))}
                  </select>

                  {esPesas ? (
                    <div style={{ display: "flex", gap: 8, marginBottom: 9 }}>
                      <input value={form.peso} onChange={(e) => setForm({ ...form, peso: e.target.value })} placeholder="Peso (kg)" style={{ flex: 1, padding: "9px 10px", borderRadius: 8, border: "1px solid #DCD6C9", fontSize: 13.5 }} />
                      <input value={form.potencia} onChange={(e) => setForm({ ...form, potencia: e.target.value })} placeholder="Potencia (W)" style={{ flex: 1, padding: "9px 10px", borderRadius: 8, border: "1px solid #DCD6C9", fontSize: 13.5 }} />
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", gap: 8, marginBottom: 9 }}>
                        <input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} placeholder="Marca" style={{ flex: 1, padding: "9px 10px", borderRadius: 8, border: "1px solid #DCD6C9", fontSize: 13.5 }} />
                        <input value={form.viento} onChange={(e) => setForm({ ...form, viento: e.target.value })} placeholder="Viento" style={{ flex: 1, padding: "9px 10px", borderRadius: 8, border: "1px solid #DCD6C9", fontSize: 13.5 }} />
                      </div>
                      <input value={form.pista_texto} onChange={(e) => setForm({ ...form, pista_texto: e.target.value })} placeholder="Pista" style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #DCD6C9", fontSize: 13.5, marginBottom: 9 }} />
                    </>
                  )}

                  <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #DCD6C9", fontSize: 13.5, marginBottom: 9 }} />
                  <textarea value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} placeholder="Nota" rows={2} style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #DCD6C9", fontSize: 13.5, marginBottom: 9, fontFamily: "inherit" }} />

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => guardarEdicion(esPesas)} style={{ flex: 1, background: "#14304A", color: "#FFFFFF", border: "none", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Guardar cambios</button>
                    <button onClick={() => setEditandoId(null)} style={{ background: "transparent", border: "1px solid #DCD6C9", borderRadius: 8, padding: "9px 14px", fontSize: 13, color: "#5B6B76", cursor: "pointer" }}>Cancelar</button>
                  </div>
                </div>
              );
            }

            return (
              <div key={item.id} style={{ background: "#FFFFFF", borderRadius: 12, padding: "13px 14px", border: "1px solid #E7E2D8", borderLeft: `4px solid ${esPesas ? "#6B4FA0" : item.categoria === "pista" ? "#14304A" : "#E8601C"}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  {!esPesas && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: item.tipo === "competencia" ? "#E8601C" : "#5B6B76", background: item.tipo === "competencia" ? "#FCE7DA" : "#EDEAE2", borderRadius: 5, padding: "2px 6px", marginRight: 6 }}>
                      {item.tipo === "competencia" ? "Competencia" : "Entrenamiento"}
                    </span>
                  )}
                  <span style={{ fontSize: 13, color: "#5B6B76" }}>{item.evento_nombre}</span>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, fontWeight: 700, color: "#16232C" }}>
                    {esPesas ? `${item.peso} kg` : item.marca}
                  </div>
                  <div style={{ fontSize: 12, color: "#5B6B76", marginTop: 2, display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {!esPesas && item.viento && <span>{item.viento}</span>}
                    {esPesas && item.potencia && <span>{item.potencia} W</span>}
                    {!esPesas && item.pista_texto && <span>{item.pista_texto}</span>}
                    <span>{fechaLegible(item.fecha)}</span>
                  </div>
                  {item.nota && <div style={{ fontSize: 11.5, color: "#5B6B76", marginTop: 4, fontStyle: "italic" }}>"{item.nota}"</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                  <button onClick={() => empezarEdicion(item, esPesas)} style={{ background: "transparent", border: "none", color: "#B7ADA0", cursor: "pointer", padding: 6 }}>✏️</button>
                  <button onClick={() => borrar(esPesas ? "pesas" : "marcas", item.id)} style={{ background: "transparent", border: "none", color: "#B7ADA0", cursor: "pointer", padding: 6 }}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
