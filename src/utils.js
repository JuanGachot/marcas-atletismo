export function normalizar(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Convierte una marca de texto a un número comparable.
// Pista: tiempo en segundos (admite "10.85" o "2:05.34" o "1:02:15").
// Campo: distancia en metros (admite "7.85" o "7.85 m").
export function parseMarca(categoria, texto) {
  const limpio = (texto || "").replace(",", ".").trim();
  if (!limpio) return NaN;
  if (categoria === "pista") {
    const partes = limpio.split(":").map((p) => parseFloat(p));
    if (partes.some((p) => Number.isNaN(p))) return NaN;
    return partes.reduce((total, parte) => total * 60 + parte, 0);
  }
  const match = limpio.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : NaN;
}

export function formatValor(categoria, valor) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  if (categoria === "pista") {
    const minutos = Math.floor(valor / 60);
    const segundos = valor - minutos * 60;
    return minutos > 0 ? `${minutos}:${segundos.toFixed(2).padStart(5, "0")}` : segundos.toFixed(2);
  }
  return `${valor.toFixed(2)} m`;
}

export function fechaLegible(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function hoyISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
