import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient";
import { EVENTOS, eventosDisponibles } from "./eventos";
import { normalizar } from "./utils";

export default function Ajustes({
  userId,
  tema,
  setTema,
  pistaDefecto,
  setPistaDefecto,
  pruebaDefecto,
  setPruebaDefecto,
  onCerrar,
}) {
  const [pistas, setPistas] = useState([]);
  const [importando, setImportando] = useState(false);
  const [resultadoImport, setResultadoImport] = useState(null);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    supabase
      .from("pistas")
      .select("id, nombre, ciudad")
      .order("ciudad")
      .then(({ data }) => data && setPistas(data));
  }, []);

  function cambiarPistaDefecto(id) {
    if (!id) {
      setPistaDefecto(null);
      localStorage.removeItem("pista-defecto");
      return;
    }
    const p = pistas.find((x) => x.id === id);
    if (p) {
      setPistaDefecto(p);
      localStorage.setItem("pista-defecto", JSON.stringify(p));
    }
  }

  function cambiarPruebaDefecto(categoria, eventoId) {
    const nueva = { categoria, eventoId };
    setPruebaDefecto(nueva);
    localStorage.setItem("prueba-defecto", JSON.stringify(nueva));
  }

  function cambiarTema(t) {
    setTema(t);
    localStorage.setItem("tema", t);
  }

  async function exportarExcel() {
    const [resMarcas, resPesas] = await Promise.all([
      supabase.from("marcas").select("*").eq("user_id", userId),
      supabase.from("pesas").select("*").eq("user_id", userId),
    ]);
    const marcas = resMarcas.data || [];
    const pesas = resPesas.data || [];

    const fechaDDMMAAAA = (iso) => {
      if (!iso) return "";
      const [a, m, d] = iso.split("-");
      return `${d}-${m}-${a}`;
    };

    if (marcas.length === 0 && pesas.length === 0) {
      descargarPlantilla();
      return;
    }

    const filasMarcas = marcas.map((m) => ({
      Categoria: m.categoria === "pista" ? "Pista" : "Campo",
      Tipo: m.tipo === "competencia" ? "Competencia" : "Entrenamiento",
      Prueba: m.evento_nombre,
      Marca: m.marca,
      Viento: m.viento || "",
      Pista: m.pista_texto || "",
      Fecha: fechaDDMMAAAA(m.fecha),
      Nota: m.nota || "",
    }));
    const filasPesas = pesas.map((p) => ({
      Ejercicio: p.evento_nombre,
      "Peso (kg)": p.peso,
      "Potencia (W)": p.potencia || "",
      Fecha: fechaDDMMAAAA(p.fecha),
      Nota: p.nota || "",
    }));

    const wb = XLSX.utils.book_new();
    const wsMarcas = XLSX.utils.json_to_sheet(filasMarcas.length ? filasMarcas : [{ Categoria: "", Tipo: "", Prueba: "", Marca: "", Viento: "", Pista: "", Fecha: "", Nota: "" }]);
    wsMarcas["!autofilter"] = { ref: wsMarcas["!ref"] };
    XLSX.utils.book_append_sheet(wb, wsMarcas, "Marcas");
    if (filasPesas.length > 0) {
      const wsPesas = XLSX.utils.json_to_sheet(filasPesas);
      wsPesas["!autofilter"] = { ref: wsPesas["!ref"] };
      XLSX.utils.book_append_sheet(wb, wsPesas, "Pesas");
    }
    XLSX.writeFile(wb, `mis-marcas-atletismo-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function descargarPlantilla() {
    const wb = XLSX.utils.book_new();
    const headers = [["Categoria", "Tipo", "Prueba", "Marca", "Viento", "Pista", "Fecha", "Nota"]];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws["!autofilter"] = { ref: "A1:H1" };
    XLSX.utils.book_append_sheet(wb, ws, "Marcas");
    XLSX.writeFile(wb, "plantilla_marcas_atletismo.xlsx");
  }

  async function onCambioArchivo(ev) {
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!file) return;
    setImportando(true);
    setResultadoImport(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const hoja = workbook.Sheets["Marcas"] || workbook.Sheets[workbook.SheetNames[0]];
      const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, raw: false, defval: "" });

      let iHeader = filas.findIndex((f) => normalizar(f[0] || "") === "categoria");
      if (iHeader === -1) iHeader = 0;
      const headers = filas[iHeader].map((h) => normalizar(h || ""));
      const idx = (n) => headers.indexOf(n);
      const iCategoria = idx("categoria");
      const iTipo = idx("tipo");
      const iPrueba = idx("prueba");
      const iMarca = idx("marca");
      const iViento = idx("viento");
      const iPista = idx("pista");
      const iCiudad = idx("ciudad");
      const iFecha = idx("fecha");
      const iNota = idx("nota");

      if ([iCategoria, iTipo, iPrueba, iMarca, iFecha].some((i) => i === -1)) {
        setResultadoImport({ importadas: 0, errores: [{ fila: "-", motivo: "No se encontraron las columnas necesarias. Usá la plantilla." }] });
        setImportando(false);
        return;
      }

      const catalogoPistas = [...pistas];
      const nuevasMarcas = [];
      const errores = [];

      for (let f = iHeader + 1; f < filas.length; f++) {
        const fila = filas[f];
        if (!fila || fila.every((c) => !String(c).trim())) continue;
        const numeroFila = f + 1;

        const catTexto = normalizar(fila[iCategoria]);
        const tipoTexto = normalizar(fila[iTipo]);
        const pruebaTexto = String(fila[iPrueba] || "").trim();
        const marcaTexto = String(fila[iMarca] || "").trim().replace(",", ".");
        const vientoTexto = iViento >= 0 ? String(fila[iViento] || "").trim() : "";
        let nombrePista = iPista >= 0 ? String(fila[iPista] || "").trim() : "";
        let ciudadPista = iCiudad >= 0 ? String(fila[iCiudad] || "").trim() : "";
        const fechaTexto = String(fila[iFecha] || "").trim();
        const notaTexto = iNota >= 0 ? String(fila[iNota] || "").trim() : "";

        if (!catTexto || !tipoTexto || !pruebaTexto || !marcaTexto || !fechaTexto) {
          errores.push({ fila: numeroFila, motivo: "Faltan datos obligatorios." });
          continue;
        }
        const categoriaDetectada = catTexto === "pista" ? "pista" : catTexto === "campo" ? "campo" : null;
        if (!categoriaDetectada) {
          errores.push({ fila: numeroFila, motivo: `Categoría "${fila[iCategoria]}" no reconocida.` });
          continue;
        }
        const tipoDetectado = tipoTexto === "entrenamiento" ? "entrenamiento" : tipoTexto === "competencia" ? "competencia" : null;
        if (!tipoDetectado) {
          errores.push({ fila: numeroFila, motivo: `Tipo "${fila[iTipo]}" no reconocido.` });
          continue;
        }
        const listaEventos = categoriaDetectada === "pista" ? EVENTOS.pista : EVENTOS.campo;
        const evento = listaEventos.find((e) => normalizar(e.nombre) === normalizar(pruebaTexto));
        if (!evento) {
          errores.push({ fila: numeroFila, motivo: `Prueba "${pruebaTexto}" no reconocida.` });
          continue;
        }
        const partesFecha = fechaTexto.split(/[-/]/);
        let fechaISO = null;
        if (partesFecha.length === 3) {
          const [d, m, a] = partesFecha;
          if (a && a.length === 4 && d && m) fechaISO = `${a}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        }
        if (!fechaISO) {
          errores.push({ fila: numeroFila, motivo: `Fecha "${fechaTexto}" no tiene formato dd-mm-aaaa.` });
          continue;
        }

        if (!ciudadPista && nombrePista.includes(" — ")) {
          const partes = nombrePista.split(" — ");
          nombrePista = partes[0].trim();
          ciudadPista = partes.slice(1).join(" — ").trim();
        }

        let pistaFinal = null;
        if (nombrePista) {
          pistaFinal = catalogoPistas.find(
            (p) => normalizar(p.nombre) === normalizar(nombrePista) && normalizar(p.ciudad) === normalizar(ciudadPista)
          );
          if (!pistaFinal) {
            const { data, error } = await supabase
              .from("pistas")
              .insert({ nombre: nombrePista, ciudad: ciudadPista || "Sin especificar" })
              .select()
              .single();
            if (!error && data) {
              pistaFinal = data;
              catalogoPistas.push(data);
            }
          }
        }

        nuevasMarcas.push({
          user_id: userId,
          categoria: categoriaDetectada,
          tipo: tipoDetectado,
          evento_id: evento.id,
          evento_nombre: evento.nombre,
          marca: marcaTexto,
          viento: evento.viento ? vientoTexto || null : null,
          pista_id: pistaFinal ? pistaFinal.id : null,
          pista_texto: pistaFinal ? `${pistaFinal.nombre} — ${pistaFinal.ciudad}` : nombrePista || null,
          fecha: fechaISO,
          nota: notaTexto || null,
        });
      }

      if (nuevasMarcas.length > 0) {
        const { error } = await supabase.from("marcas").insert(nuevasMarcas);
        if (error) {
          errores.push({ fila: "-", motivo: "Se armaron las filas pero hubo un error al guardarlas en la base de datos." });
        }
      }
      setPistas(catalogoPistas);
      setResultadoImport({ importadas: nuevasMarcas.length, errores });
    } catch (e) {
      setResultadoImport({ importadas: 0, errores: [{ fila: "-", motivo: "No se pudo leer el archivo." }] });
    } finally {
      setImportando(false);
    }
  }

  async function borrarTodo() {
    await supabase.from("marcas").delete().eq("user_id", userId);
    await supabase.from("pesas").delete().eq("user_id", userId);
    setConfirmarBorrar(false);
    onCerrar(true);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,35,44,0.45)",
        zIndex: 50,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "60px 16px",
        overflowY: "auto",
      }}
      onClick={() => onCerrar(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card-bg)",
          borderRadius: 14,
          width: "100%",
          maxWidth: 380,
          border: "1px solid var(--card-border)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--soft-border)" }}>
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Ajustes</span>
          <button onClick={() => onCerrar(false)} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        {/* Apariencia */}
        <div style={{ padding: 16, borderBottom: "1px solid var(--soft-border)" }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 7 }}>Apariencia</div>
          <div style={{ display: "flex", background: "var(--seg-bg)", borderRadius: 9, padding: 3 }}>
            {[{ id: "claro", label: "☀️ Claro" }, { id: "oscuro", label: "🌙 Oscuro" }].map((o) => (
              <button
                key={o.id}
                onClick={() => cambiarTema(o.id)}
                style={{ flex: 1, border: "none", borderRadius: 7, padding: "8px 0", fontWeight: 600, fontSize: 12.5, cursor: "pointer", background: tema === o.id ? "#E8601C" : "transparent", color: tema === o.id ? "#FFFFFF" : "var(--text-secondary)" }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pista por defecto */}
        <div style={{ padding: 16, borderBottom: "1px solid var(--soft-border)" }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 7 }}>Pista por defecto</div>
          <select
            value={pistaDefecto ? pistaDefecto.id : ""}
            onChange={(e) => cambiarPistaDefecto(e.target.value)}
            style={{ width: "100%", padding: "8px 9px", borderRadius: 8, border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)", fontSize: 12.5 }}
          >
            <option value="">Sin pista por defecto</option>
            {pistas.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre} — {p.ciudad}</option>
            ))}
          </select>
        </div>

        {/* Prueba a analizar por defecto */}
        <div style={{ padding: 16, borderBottom: "1px solid var(--soft-border)" }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 7 }}>Prueba a analizar por defecto</div>
          <div style={{ display: "flex", background: "var(--seg-bg)", borderRadius: 9, padding: 3, marginBottom: 8 }}>
            {["pista", "campo"].map((c) => (
              <button
                key={c}
                onClick={() => cambiarPruebaDefecto(c, eventosDisponibles(c)[0].id)}
                style={{ flex: 1, border: "none", borderRadius: 7, padding: "7px 0", fontWeight: 600, fontSize: 12.5, cursor: "pointer", background: pruebaDefecto.categoria === c ? "#14304A" : "transparent", color: pruebaDefecto.categoria === c ? "#FFFFFF" : "var(--text-secondary)" }}
              >
                {c === "pista" ? "Pista" : "Campo"}
              </button>
            ))}
          </div>
          <select
            value={pruebaDefecto.eventoId}
            onChange={(e) => cambiarPruebaDefecto(pruebaDefecto.categoria, e.target.value)}
            style={{ width: "100%", padding: "8px 9px", borderRadius: 8, border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text-primary)", fontSize: 12.5 }}
          >
            {eventosDisponibles(pruebaDefecto.categoria).map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.nombre}</option>
            ))}
          </select>
        </div>

        {/* Exportar / Importar */}
        <div style={{ padding: 16, borderBottom: "1px solid var(--soft-border)" }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 7 }}>Datos</div>
          <button onClick={exportarExcel} style={{ width: "100%", background: "var(--seg-bg)", border: "none", borderRadius: 9, padding: "9px 0", fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)", cursor: "pointer", marginBottom: 8 }}>
            ⬇️ Exportar / Descargar plantilla Excel
          </button>
          <button onClick={() => inputRef.current && inputRef.current.click()} disabled={importando} style={{ width: "100%", background: "var(--seg-bg)", border: "none", borderRadius: 9, padding: "9px 0", fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)", cursor: "pointer" }}>
            {importando ? "Importando…" : "⬆️ Importar desde Excel"}
          </button>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={onCambioArchivo} style={{ display: "none" }} />
          {resultadoImport && (
            <div style={{ marginTop: 8, fontSize: 11.5 }}>
              <div style={{ color: resultadoImport.importadas > 0 ? "#2E7D5B" : "var(--text-secondary)", fontWeight: 600 }}>
                {resultadoImport.importadas} marca(s) importada(s).
              </div>
              {resultadoImport.errores.length > 0 && (
                <div style={{ marginTop: 4, maxHeight: 100, overflowY: "auto", color: "#B23A2E" }}>
                  {resultadoImport.errores.map((e, i) => (
                    <div key={i} style={{ marginBottom: 3 }}>Fila {e.fila}: {e.motivo}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Zona de riesgo */}
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 7 }}>Zona de riesgo</div>
          {!confirmarBorrar ? (
            <button onClick={() => setConfirmarBorrar(true)} style={{ width: "100%", background: "transparent", border: "1px solid #B23A2E", borderRadius: 9, padding: "9px 0", fontSize: 12.5, fontWeight: 600, color: "#B23A2E", cursor: "pointer" }}>
              🗑️ Borrar todas mis marcas
            </button>
          ) : (
            <div>
              <div style={{ fontSize: 12, color: "#B23A2E", marginBottom: 8 }}>¿Seguro? No se puede deshacer.</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={borrarTodo} style={{ flex: 1, background: "#B23A2E", color: "#FFF", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Sí, borrar todo</button>
                <button onClick={() => setConfirmarBorrar(false)} style={{ flex: 1, background: "transparent", border: "1px solid var(--input-border)", borderRadius: 8, padding: "8px 0", fontSize: 12.5, color: "var(--text-secondary)", cursor: "pointer" }}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
