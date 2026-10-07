import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import { EVENTOS, eventosDisponibles } from "./eventos";
import { parseMarca, formatValor, fechaLegible, hoyISO } from "./utils";
import PistaBuscador from "./PistaBuscador";

export default function Registrar({ userId, pistaDefecto }) {
  const [categoria, setCategoria] = useState("pista");
  const [tipo, setTipo] = useState("competencia");
  const [eventoId, setEventoId] = useState(EVENTOS.pista[5].id); // 100 m
  const [marca, setMarca] = useState("");
  const [viento, setViento] = useState("");
  const [peso, setPeso] = useState("");
  const [potencia, setPotencia] = useState("");
  const [pistaTexto, setPistaTexto] = useState(pistaDefecto ? `${pistaDefecto.nombre} — ${pistaDefecto.ciudad}` : "");
  const [pistaElegida, setPistaElegida] = useState(pistaDefecto || null);
  const [fecha, setFecha] = useState(hoyISO());
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [marcas, setMarcas] = useState([]);
  const [pesas, setPesas] = useState([]);
  const [cargado, setCargado] = useState(false);

  async function cargarTodo() {
    const [resMarcas, resPesas] = await Promise.all([
      supabase.from("marcas").select("*").eq("user_id", userId),
      supabase.from("pesas").select("*").eq("user_id", userId),
    ]);
    if (resMarcas.data) setMarcas(resMarcas.data);
    if (resPesas.data) setPesas(resPesas.data);
    setCargado(true);
  }

  useEffect(() => {
    cargarTodo();
  }, [userId]);

  const eventoActual = useMemo(() => {
    const lista = eventosDisponibles(categoria);
    return lista.find((e) => e.id === eventoId) || lista[0];
  }, [categoria, eventoId]);

  function cambiarCategoria(cat) {
    setCategoria(cat);
    setEventoId(eventosDisponibles(cat)[0].id);
  }

  async function guardar() {
    setError("");
    if (categoria === "pesas") {
      if (!peso.trim() || !fecha) {
        setError("Peso y fecha son obligatorios.");
        return;
      }
      setGuardando(true);
      const ejercicio = EVENTOS.pesas.find((e) => e.id === eventoId) || EVENTOS.pesas[0];
      const { error: err } = await supabase.from("pesas").insert({
        user_id: userId,
        evento_id: ejercicio.id,
        evento_nombre: ejercicio.nombre,
        peso: parseFloat(peso.replace(",", ".")),
        potencia: potencia.trim() ? parseFloat(potencia.replace(",", ".")) : null,
        fecha,
        nota: nota.trim() || null,
      });
      setGuardando(false);
      if (err) {
        setError("No se pudo guardar. Probá de nuevo.");
        return;
      }
      setPeso("");
      setPotencia("");
      setNota("");
      cargarTodo();
      return;
    }

    if (!marca.trim() || !pistaTexto.trim() || !fecha) {
      setError("Marca, pista y fecha son obligatorias.");
      return;
    }
    setGuardando(true);
    const { error: err } = await supabase.from("marcas").insert({
      user_id: userId,
      categoria,
      tipo,
      evento_id: eventoActual.id,
      evento_nombre: eventoActual.nombre,
      marca: marca.trim(),
      viento: eventoActual.viento ? viento.trim() || null : null,
      pista_id: pistaElegida ? pistaElegida.id : null,
      pista_texto: pistaTexto.trim(),
      fecha,
      nota: nota.trim() || null,
    });
    setGuardando(false);
    if (err) {
      setError("No se pudo guardar. Probá de nuevo.");
      return;
    }
    setMarca("");
    setViento("");
    setNota("");
    if (pistaDefecto) {
      setPistaElegida(pistaDefecto);
      setPistaTexto(`${pistaDefecto.nombre} — ${pistaDefecto.ciudad}`);
    } else {
      setPistaTexto("");
      setPistaElegida(null);
    }
    cargarTodo();
  }

  // Resumen: mejor marca por prueba (o por ejercicio, en pesas)
  const mejoresDeCategoria = useMemo(() => {
    if (categoria === "pesas") {
      const mejores = {};
      pesas.forEach((p) => {
        const actual = mejores[p.evento_id];
        if (!actual || Number(p.peso) > Number(actual.peso)) mejores[p.evento_id] = p;
      });
      return EVENTOS.pesas
        .filter((ej) => mejores[ej.id])
        .map((ej) => ({ eventoNombre: ej.nombre, dato: mejores[ej.id] }));
    }
    const vistos = new Map();
    marcas
      .filter((m) => m.categoria === categoria)
      .forEach((m) => {
        if (!vistos.has(m.evento_id)) vistos.set(m.evento_id, m.evento_nombre);
      });
    return Array.from(vistos.entries())
      .sort((a, b) => a[1].localeCompare(b[1], "es"))
      .map(([eventoId, eventoNombre]) => {
        const deEsePrueba = marcas.filter((m) => m.categoria === categoria && m.evento_id === eventoId);
        const calcular = (tipoBuscado) => {
          const delTipo = deEsePrueba.filter((m) => m.tipo === tipoBuscado);
          let mejor = null;
          delTipo.forEach((m) => {
            const valor = parseMarca(categoria, m.marca);
            if (Number.isNaN(valor)) return;
            if (!mejor || (categoria === "pista" ? valor < mejor.valor : valor > mejor.valor)) {
              mejor = { valor, fecha: m.fecha };
            }
          });
          return mejor;
        };
        return { eventoNombre, competencia: calcular("competencia"), entrenamiento: calcular("entrenamiento") };
      });
  }, [marcas, pesas, categoria]);

  return (
    <div style={{ padding: "16px 16px 40px", maxWidth: 480, margin: "0 auto" }}>
      {/* Formulario */}
      <div style={{ background: "var(--card-bg)", borderRadius: 14, padding: 18, border: "1px solid var(--card-border)", marginBottom: 20 }}>
        <div style={{ display: "flex", background: "var(--seg-bg)", borderRadius: 10, padding: 3, marginBottom: 16 }}>
          {[
            { id: "pista", label: "Pista" },
            { id: "campo", label: "Campo" },
            { id: "pesas", label: "Pesas" },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => cambiarCategoria(c.id)}
              style={{
                flex: 1,
                border: "none",
                borderRadius: 8,
                padding: "9px 0",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                background: categoria === c.id ? "#14304A" : "transparent",
                color: categoria === c.id ? "#FFFFFF" : "var(--text-secondary)",
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {categoria !== "pesas" && (
          <div style={{ display: "flex", background: "var(--seg-bg)", borderRadius: 10, padding: 3, marginBottom: 16 }}>
            {[
              { id: "entrenamiento", label: "Entrenamiento" },
              { id: "competencia", label: "Competencia" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTipo(t.id)}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 0",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  background: tipo === t.id ? "#E8601C" : "transparent",
                  color: tipo === t.id ? "#FFFFFF" : "var(--text-secondary)",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <label style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginBottom: 5 }}>
          {categoria === "pesas" ? "Ejercicio" : "Prueba"}
        </label>
        <select
          value={eventoId}
          onChange={(e) => setEventoId(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)", fontSize: 15, marginBottom: 14 }}
        >
          {eventosDisponibles(categoria).map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>

        {categoria === "pesas" ? (
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginBottom: 5 }}>Peso (kg) *</label>
              <input value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="ej. 60" style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)", fontSize: 15 }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginBottom: 5 }}>Potencia (W)</label>
              <input value={potencia} onChange={(e) => setPotencia(e.target.value)} placeholder="opcional" style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)", fontSize: 15 }} />
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: eventoActual.viento ? 1.3 : 1 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginBottom: 5 }}>Marca *</label>
                <input
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  placeholder={categoria === "pista" ? "ej. 10.85 o 2:05.34" : "ej. 7.85 m"}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)", fontSize: 15 }}
                />
              </div>
              {eventoActual.viento && (
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginBottom: 5 }}>Viento</label>
                  <input value={viento} onChange={(e) => setViento(e.target.value)} placeholder="+1.2" style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)", fontSize: 15 }} />
                </div>
              )}
            </div>

            <label style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginBottom: 5 }}>Pista o ciudad *</label>
            <div style={{ marginBottom: 14 }}>
              <PistaBuscador
                valorTexto={pistaTexto}
                onCambiar={(v) => {
                  setPistaTexto(v);
                  setPistaElegida(null);
                }}
                onElegir={(p) => {
                  setPistaElegida(p);
                  setPistaTexto(`${p.nombre} — ${p.ciudad}`);
                }}
              />
            </div>
          </>
        )}

        <label style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginBottom: 5 }}>Fecha *</label>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)", fontSize: 14, marginBottom: 14 }}
        />

        <label style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginBottom: 5 }}>Nota (opcional)</label>
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Sensaciones del día…"
          rows={2}
          style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1px solid var(--input-border)", fontSize: 14, marginBottom: 14, fontFamily: "inherit", resize: "vertical" }}
        />

        {error && <div style={{ color: "#B23A2E", fontSize: 13, marginBottom: 10 }}>{error}</div>}

        <button
          onClick={guardar}
          disabled={guardando}
          style={{ width: "100%", background: "#E8601C", color: "#FFFFFF", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 15, fontWeight: 600, cursor: guardando ? "default" : "pointer", opacity: guardando ? 0.7 : 1 }}
        >
          {guardando ? "Guardando…" : "Guardar marca"}
        </button>
      </div>

      {/* Mejores marcas */}
      <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, fontWeight: 600, color: "#14304A", margin: "0 0 10px" }}>
        {categoria === "pista" ? "Mejores marcas de pista" : categoria === "campo" ? "Mejores marcas de campo" : "Mejores pesas"}
      </h2>

      {!cargado ? (
        <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>Cargando…</div>
      ) : mejoresDeCategoria.length === 0 ? (
        <div style={{ background: "var(--card-bg)", border: "1px dashed var(--input-border)", borderRadius: 12, padding: "22px 16px", textAlign: "center", color: "var(--text-secondary)", fontSize: 14 }}>
          Todavía no registraste ninguna marca acá. Agregá la primera arriba.
        </div>
      ) : categoria === "pesas" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {mejoresDeCategoria.map((p) => (
            <div key={p.eventoNombre} style={{ background: "var(--card-bg)", borderRadius: 12, padding: "12px 14px", border: "1px solid var(--card-border)", borderLeft: "4px solid #6B4FA0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)" }}>{p.eventoNombre}</div>
                <div style={{ fontSize: 11.5, color: "var(--text-secondary)", marginTop: 2 }}>{fechaLegible(p.dato.fecha)}</div>
              </div>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, fontWeight: 700, color: "var(--mejor-text)" }}>{p.dato.peso} kg</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {mejoresDeCategoria.map((ev) => (
            <div key={ev.eventoNombre} style={{ background: "var(--card-bg)", borderRadius: 12, padding: "12px 14px", border: "1px solid var(--card-border)", borderLeft: `4px solid ${categoria === "pista" ? "#14304A" : "#E8601C"}` }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>{ev.eventoNombre}</div>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { label: "Competencia", dato: ev.competencia, color: "#E8601C" },
                  { label: "Entrenamiento", dato: ev.entrenamiento, color: "var(--text-secondary)" },
                ].map(({ label, dato, color }) => (
                  <div key={label} style={{ flex: 1, background: "var(--seg-bg)", borderRadius: 9, padding: "8px 10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color }}>{label}</span>
                      {dato && <span style={{ fontSize: 9.5, color: "var(--text-secondary)" }}>{fechaLegible(dato.fecha)}</span>}
                    </div>
                    <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 17, fontWeight: 700, color: dato ? "var(--mejor-text)" : "var(--text-secondary)" }}>
                      {dato ? formatValor(categoria, dato.valor) : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
