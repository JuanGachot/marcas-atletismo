import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, ComposedChart, Line, Scatter, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from "recharts";
import { supabase } from "./supabaseClient";
import { EVENTOS, eventosDisponibles } from "./eventos";
import { parseMarca, formatValor, fechaLegible } from "./utils";

export default function Progreso({ userId, pruebaDefecto, tema }) {
  const [marcas, setMarcas] = useState([]);
  const [cargado, setCargado] = useState(false);

  const [categoria, setCategoria] = useState(pruebaDefecto.categoria);
  const [eventoId, setEventoId] = useState(pruebaDefecto.eventoId);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");
  const [anio, setAnio] = useState("");

  useEffect(() => {
    supabase.from("marcas").select("*").eq("user_id", userId).then(({ data }) => {
      if (data) setMarcas(data);
      setCargado(true);
    });
  }, [userId]);

  const eventoActual = useMemo(() => {
    const lista = eventosDisponibles(categoria);
    return lista.find((e) => e.id === eventoId) || lista[0];
  }, [categoria, eventoId]);

  function dentroDeRango(fecha) {
    if (filtroDesde && fecha < filtroDesde) return false;
    if (filtroHasta && fecha > filtroHasta) return false;
    return true;
  }

  const entradasEvento = useMemo(
    () => marcas.filter((m) => m.categoria === categoria && m.evento_id === eventoId),
    [marcas, categoria, eventoId]
  );
  const entradasFiltradas = useMemo(
    () => entradasEvento.filter((m) => (filtroTipo === "todos" || m.tipo === filtroTipo) && dentroDeRango(m.fecha)),
    [entradasEvento, filtroTipo, filtroDesde, filtroHasta]
  );

  function construirSerie(arr) {
    const mejoresPorDia = new Map();
    arr.forEach((m) => {
      const valor = parseMarca(m.categoria, m.marca);
      if (Number.isNaN(valor)) return;
      const actual = mejoresPorDia.get(m.fecha);
      const esMejor = !actual || (categoria === "pista" ? valor < actual.valor : valor > actual.valor);
      if (esMejor) mejoresPorDia.set(m.fecha, { fecha: m.fecha, valor });
    });
    return Array.from(mejoresPorDia.values())
      .map((p) => ({ ts: new Date(p.fecha).getTime(), fecha: p.fecha, valor: p.valor }))
      .sort((a, b) => a.ts - b.ts);
  }
  function construirSerieCompleta(arr) {
    return arr
      .map((m) => ({ ts: new Date(m.fecha).getTime(), fecha: m.fecha, valor: parseMarca(m.categoria, m.marca) }))
      .filter((p) => !Number.isNaN(p.valor))
      .sort((a, b) => a.ts - b.ts);
  }

  const serieEnt = useMemo(() => construirSerie(entradasFiltradas.filter((m) => m.tipo === "entrenamiento")), [entradasFiltradas]);
  const serieComp = useMemo(() => construirSerie(entradasFiltradas.filter((m) => m.tipo === "competencia")), [entradasFiltradas]);
  const serieEntTodas = useMemo(() => construirSerieCompleta(entradasFiltradas.filter((m) => m.tipo === "entrenamiento")), [entradasFiltradas]);
  const serieCompTodas = useMemo(() => construirSerieCompleta(entradasFiltradas.filter((m) => m.tipo === "competencia")), [entradasFiltradas]);

  const datosLinea = useMemo(() => {
    const mapa = new Map();
    serieEnt.forEach((p) => {
      const fila = mapa.get(p.fecha) || { ts: p.ts, fecha: p.fecha };
      fila.entrenamiento = p.valor;
      mapa.set(p.fecha, fila);
    });
    serieComp.forEach((p) => {
      const fila = mapa.get(p.fecha) || { ts: p.ts, fecha: p.fecha };
      fila.competencia = p.valor;
      mapa.set(p.fecha, fila);
    });
    return Array.from(mapa.values()).sort((a, b) => a.ts - b.ts);
  }, [serieEnt, serieComp]);

  const dominioY = useMemo(() => {
    const valores = [...serieEntTodas, ...serieCompTodas].map((p) => p.valor);
    if (valores.length === 0) return [0, 1];
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const rango = max - min;
    const margen = rango > 0 ? rango * 0.15 : Math.max(min * 0.05, 0.3);
    return [Number((min - margen).toFixed(2)), Number((max + margen).toFixed(2))];
  }, [serieEntTodas, serieCompTodas]);

  const colorGrafico = tema === "oscuro"
    ? { grid: "#2B3A45", texto: "#93A4AF", tooltipBg: "#1B2731", tooltipBorder: "#2B3A45" }
    : { grid: "#E7E2D8", texto: "#5B6B76", tooltipBg: "#FFFFFF", tooltipBorder: "#E7E2D8" };
  const colorEntreno = tema === "oscuro" ? "#6FA8DC" : "#14304A";

  function TooltipEvolucion({ active, label }) {
    if (!active || label === undefined) return null;
    const fila = datosLinea.find((d) => d.ts === label);
    if (!fila) return null;
    const delDia = entradasFiltradas
      .filter((m) => m.fecha === fila.fecha)
      .slice()
      .sort((a, b) => {
        if (a.tipo !== b.tipo) return a.tipo === "competencia" ? -1 : 1;
        const va = parseMarca(a.categoria, a.marca), vb = parseMarca(b.categoria, b.marca);
        return categoria === "pista" ? va - vb : vb - va;
      });
    if (delDia.length === 0) return null;
    return (
      <div style={{ background: colorGrafico.tooltipBg, border: `1px solid ${colorGrafico.tooltipBorder}`, borderRadius: 8, padding: "8px 10px", fontSize: 12.5 }}>
        <div style={{ fontWeight: 600, color: colorGrafico.texto, marginBottom: 4 }}>{fechaLegible(fila.fecha)}</div>
        {delDia.map((m) => (
          <div key={m.id} style={{ marginBottom: 3 }}>
            <div style={{ color: m.tipo === "competencia" ? "#E8601C" : colorEntreno }}>
              {m.tipo === "competencia" ? "Competencia" : "Entrenamiento"}: {formatValor(categoria, parseMarca(m.categoria, m.marca))}
            </div>
            {m.nota && <div style={{ fontSize: 11.5, color: colorGrafico.texto, fontStyle: "italic" }}>"{m.nota}"</div>}
          </div>
        ))}
      </div>
    );
  }

  const aniosDisponibles = useMemo(() => {
    const anios = new Set(entradasEvento.map((m) => m.fecha.slice(0, 4)));
    return Array.from(anios).sort().reverse();
  }, [entradasEvento]);

  useEffect(() => {
    if (aniosDisponibles.length > 0 && !aniosDisponibles.includes(anio)) setAnio(aniosDisponibles[0]);
    else if (aniosDisponibles.length === 0 && anio !== "") setAnio("");
    // eslint-disable-next-line
  }, [aniosDisponibles]);

  const mejoresTemporada = useMemo(() => {
    if (!anio) return { entrenamiento: null, competencia: null };
    const delAnio = entradasEvento.filter((m) => m.fecha.startsWith(anio) && (filtroTipo === "todos" || m.tipo === filtroTipo));
    const calcular = (t) => {
      let mejor = null;
      delAnio.filter((m) => m.tipo === t).forEach((m) => {
        const valor = parseMarca(m.categoria, m.marca);
        if (Number.isNaN(valor)) return;
        if (!mejor || (categoria === "pista" ? valor < mejor.valor : valor > mejor.valor)) mejor = { valor, fecha: m.fecha };
      });
      return mejor;
    };
    return { entrenamiento: calcular("entrenamiento"), competencia: calcular("competencia") };
  }, [entradasEvento, anio, filtroTipo, categoria]);

  const estadisticasPorPista = useMemo(() => {
    const grupos = {};
    entradasFiltradas.forEach((m) => {
      const valor = parseMarca(m.categoria, m.marca);
      if (Number.isNaN(valor) || !m.pista_texto) return;
      if (!grupos[m.pista_texto]) grupos[m.pista_texto] = [];
      grupos[m.pista_texto].push(valor);
    });
    return Object.entries(grupos)
      .map(([pista, valores]) => {
        const mejor = categoria === "pista" ? Math.min(...valores) : Math.max(...valores);
        const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
        const desviacion = valores.length > 1 ? Math.sqrt(valores.reduce((acc, v) => acc + (v - promedio) ** 2, 0) / (valores.length - 1)) : 0;
        return { pista, cantidad: valores.length, mejor, promedio, desviacion };
      })
      .sort((a, b) => (categoria === "pista" ? a.mejor - b.mejor : b.mejor - a.mejor));
  }, [entradasFiltradas, categoria]);

  const cardStyle = { background: "var(--card-bg)", borderRadius: 14, padding: 18, border: "1px solid var(--card-border)" };

  return (
    <div style={{ padding: "16px 16px 40px", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={cardStyle}>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 600 }}>Prueba a analizar</div>
        <div style={{ display: "flex", background: "var(--seg-bg)", borderRadius: 10, padding: 3, marginBottom: 12 }}>
          {["pista", "campo"].map((c) => (
            <button key={c} onClick={() => { setCategoria(c); setEventoId(eventosDisponibles(c)[0].id); }}
              style={{ flex: 1, border: "none", borderRadius: 8, padding: "9px 0", fontWeight: 600, fontSize: 14, cursor: "pointer", background: categoria === c ? "#14304A" : "transparent", color: categoria === c ? "#FFFFFF" : "var(--text-secondary)" }}>
              {c === "pista" ? "Pista" : "Campo"}
            </button>
          ))}
        </div>
        <select value={eventoId} onChange={(e) => setEventoId(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)", fontSize: 15 }}>
          {eventosDisponibles(categoria).map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600, marginBottom: 10 }}>Filtros</div>
        <div style={{ display: "flex", background: "var(--seg-bg)", borderRadius: 10, padding: 3, marginBottom: 12 }}>
          {[{ id: "todos", label: "Todos" }, { id: "entrenamiento", label: "Entreno" }, { id: "competencia", label: "Competencia" }].map((t) => (
            <button key={t.id} onClick={() => setFiltroTipo(t.id)} style={{ flex: 1, border: "none", borderRadius: 8, padding: "8px 0", fontWeight: 600, fontSize: 13, cursor: "pointer", background: filtroTipo === t.id ? "#E8601C" : "transparent", color: filtroTipo === t.id ? "#FFFFFF" : "var(--text-secondary)" }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 5 }}>Desde</label>
            <input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)", fontSize: 13.5 }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 5 }}>Hasta</label>
            <input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)", fontSize: 13.5 }} />
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Mejor marca de la temporada</div>
          {aniosDisponibles.length > 0 && (
            <select value={anio} onChange={(e) => setAnio(e.target.value)} style={{ padding: "6px 9px", borderRadius: 7, border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)", fontSize: 13 }}>
              {aniosDisponibles.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
        </div>
        {aniosDisponibles.length === 0 ? (
          <div style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>Todavía no hay marcas para {eventoActual.nombre}.</div>
        ) : (
          <div style={{ display: "flex", gap: 10 }}>
            {["entrenamiento", "competencia"].map((t) => {
              const dato = mejoresTemporada[t];
              return (
                <div key={t} style={{ flex: 1, background: "var(--seg-bg)", borderRadius: 10, padding: "12px 12px" }}>
                  <div style={{ fontSize: 11.5, color: t === "competencia" ? "#E8601C" : "var(--text-secondary)", fontWeight: 700, marginBottom: 4 }}>
                    {t === "competencia" ? "Competencia" : "Entrenamiento"}
                  </div>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
                    {dato ? formatValor(categoria, dato.valor) : "Sin marcas"}
                  </div>
                  {dato && <div style={{ fontSize: 11.5, color: "var(--text-secondary)", marginTop: 2 }}>{fechaLegible(dato.fecha)}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
          Evolución — {eventoActual.nombre}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--text-secondary)", marginBottom: 12 }}>
          {categoria === "pista" ? "Más arriba = tiempo más bajo = mejor." : "Más arriba = mayor distancia = mejor."}
        </div>
        {!cargado ? (
          <div style={{ fontSize: 13.5, color: "var(--text-secondary)", textAlign: "center", padding: "20px 0" }}>Cargando…</div>
        ) : serieEnt.length === 0 && serieComp.length === 0 ? (
          <div style={{ fontSize: 13.5, color: "var(--text-secondary)", textAlign: "center", padding: "20px 0" }}>No hay marcas para graficar con estos filtros.</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={datosLinea} margin={{ top: 6, right: 10, bottom: 6, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colorGrafico.grid} />
              <XAxis dataKey="ts" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(ts) => new Date(ts).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" })} tick={{ fontSize: 11, fill: colorGrafico.texto }} stroke={colorGrafico.grid} />
              <YAxis reversed={categoria === "pista"} domain={dominioY} tickFormatter={(v) => formatValor(categoria, v)} tick={{ fontSize: 11, fill: colorGrafico.texto }} stroke={colorGrafico.grid} width={60} />
              <Tooltip content={<TooltipEvolucion />} />
              <Legend wrapperStyle={{ fontSize: 12.5 }} />
              <Scatter data={serieEntTodas} dataKey="valor" name="Entrenamiento" fill={colorEntreno} fillOpacity={0.35} legendType="none" isAnimationActive={false} tooltipType="none" />
              <Scatter data={serieCompTodas} dataKey="valor" name="Competencia" fill="#E8601C" fillOpacity={0.35} legendType="none" isAnimationActive={false} tooltipType="none" />
              <Line data={datosLinea} dataKey="entrenamiento" name="Entrenamiento" stroke={colorEntreno} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line data={datosLinea} dataKey="competencia" name="Competencia" stroke="#E8601C" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={cardStyle}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>
          Estadísticas por pista — {eventoActual.nombre}
        </div>
        {estadisticasPorPista.length === 0 ? (
          <div style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>Todavía no hay marcas con pista para esta prueba.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {estadisticasPorPista.map((row) => (
              <div key={row.pista} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--seg-bg)", borderRadius: 10, padding: "10px 12px", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.pista}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                    {row.cantidad} {row.cantidad === 1 ? "marca" : "marcas"} · promedio {formatValor(categoria, row.promedio)} · DE {row.cantidad > 1 ? formatValor(categoria, row.desviacion) : "—"}
                  </div>
                </div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 16, fontWeight: 700, color: "var(--mejor-text)", flexShrink: 0 }}>
                  {formatValor(categoria, row.mejor)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
