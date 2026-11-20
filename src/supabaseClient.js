// src/supabaseClient.js - Memoria local + Sincronización directa con tu Google Drive

const GOOGLE_CLIENT_ID = "769846582756-r1e0qdk241qrdn5npn2bmroa300an3gn.apps.googleusercontent.com";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DRIVE_FILE_NAME = "marcas_atletismo_db.json";

const KEYS = {
  marcas: "atletismo_marcas_v1",
  pesas: "atletismo_pesas_v1",
  pistas: "atletismo_pistas_v1",
};

const PISTAS_INICIALES = [
  { id: "pista-angol-parque-cmpc-junquillar", nombre: "Parque CMPC Junquillar", ciudad: "Angol" },
  { id: "pista-antofagasta-estadio-calvo-y-bascunan", nombre: "Estadio Calvo y Bascuñán", ciudad: "Antofagasta" },
  { id: "pista-arica-ciudad-de-arica", nombre: "Ciudad de Arica", ciudad: "Arica" },
  { id: "pista-buin-colegio-campanario", nombre: "Colegio Campanario", ciudad: "Buin" },
  { id: "pista-chillan-estadio-quilamapu", nombre: "Estadio Quilamapu", ciudad: "Chillán" },
  { id: "pista-coihueco-estadio-municipal-de-coihueco", nombre: "Estadio Municipal de Coihueco", ciudad: "Coihueco" },
  { id: "pista-concepcion-estadio-ester-roa-rebolledo", nombre: "Estadio Ester Roa Rebolledo", ciudad: "Concepción" },
  { id: "pista-concepcion-estadio-federico-schwager", nombre: "Estadio Federico Schwager", ciudad: "Concepción" },
  { id: "pista-concepcion-fundo-coihueco", nombre: "Fundo Coihueco", ciudad: "Concepción" },
  { id: "pista-concon-estadio-atletico-municipal", nombre: "Estadio Atlético Municipal", ciudad: "Concón" },
  { id: "pista-copiapo-pista-atletica-ramon-tapia", nombre: "Pista Atlética Ramón Tapia", ciudad: "Copiapó" },
  { id: "pista-curico-estadio-la-granja", nombre: "Estadio La Granja", ciudad: "Curicó" },
  { id: "pista-iquique-estadio-cavancha", nombre: "Estadio Cavancha", ciudad: "Iquique" },
  { id: "pista-iquique-estadio-tierra-de-campeones", nombre: "Estadio Tierra de Campeones", ciudad: "Iquique" },
  { id: "pista-la-serena-estadio-la-portada", nombre: "Estadio La Portada", ciudad: "La Serena" },
  { id: "pista-limache-estadio-municipal-de-limache", nombre: "Estadio Municipal de Limache", ciudad: "Limache" },
  { id: "pista-limache-estadio-angel-navarrete-candia", nombre: "Estadio Ángel Navarrete Candía", ciudad: "Limache" },
  { id: "pista-loncoche-parcela-municipal-loncoche", nombre: "Parcela Municipal Loncoche", ciudad: "Loncoche" },
  { id: "pista-los-angeles-estadio-de-los-angeles", nombre: "Estadio de Los Ángeles", ciudad: "Los Ángeles" },
  { id: "pista-osorno-pista-lycee-claude-gay", nombre: "Pista Lycée Claude Gay", ciudad: "Osorno" },
  { id: "pista-osorno-pista-villa-olimpica-osorno", nombre: "Pista Villa Olímpica Osorno", ciudad: "Osorno" },
  { id: "pista-ovalle-estadio-diaguita", nombre: "Estadio Diaguita", ciudad: "Ovalle" },
  { id: "pista-padre-hurtado-colegio-boston-academy", nombre: "Colegio Boston Academy", ciudad: "Padre Hurtado" },
  { id: "pista-parral-estadio-fiscal-de-parral", nombre: "Estadio Fiscal de Parral", ciudad: "Parral" },
  { id: "pista-pitrufquen-plaza-de-armas-pitrufquen", nombre: "Plaza de Armas Pitrufquén", ciudad: "Pitrufquén" },
  { id: "pista-puerto-montt-estadio-pichipelluco", nombre: "Estadio Pichipelluco", ciudad: "Puerto Montt" },
  { id: "pista-puerto-montt-pista-atletica-ind-puerto-montt", nombre: "Pista Atlética IND Puerto Montt", ciudad: "Puerto Montt" },
  { id: "pista-puerto-varas-colegio-puerto-varas", nombre: "Colegio Puerto Varas", ciudad: "Puerto Varas" },
  { id: "pista-quillota-instituto-rafael-ariztia", nombre: "Instituto Rafael Ariztía", ciudad: "Quillota" },
  { id: "pista-rancagua-colegio-la-cruz", nombre: "Colegio La Cruz", ciudad: "Rancagua" },
  { id: "pista-rancagua-estadio-marista", nombre: "Estadio Marista", ciudad: "Rancagua" },
  { id: "pista-rancagua-pista-atletica-patricio-mekis", nombre: "Pista Atlética Patricio Mekis", ciudad: "Rancagua" },
  { id: "pista-san-fernando-estadio-municipal-de-san-fernando", nombre: "Estadio Municipal de San Fernando", ciudad: "San Fernando" },
  { id: "pista-santiago-club-deportivo-manquehue", nombre: "Club Deportivo Manquehue", ciudad: "Santiago" },
  { id: "pista-santiago-colegio-aleman-de-santiago", nombre: "Colegio Alemán de Santiago", ciudad: "Santiago" },
  { id: "pista-santiago-colegio-nido-de-aguilas", nombre: "Colegio Nido de Águilas", ciudad: "Santiago" },
  { id: "pista-santiago-colegio-saint-george-s", nombre: "Colegio Saint George's", ciudad: "Santiago" },
  { id: "pista-santiago-colegio-san-ignacio-el-bosque", nombre: "Colegio San Ignacio El Bosque", ciudad: "Santiago" },
  { id: "pista-santiago-colegio-santa-ursula", nombre: "Colegio Santa Úrsula", ciudad: "Santiago" },
  { id: "pista-santiago-colegio-sscc-manquehue", nombre: "Colegio SSCC Manquehue", ciudad: "Santiago" },
  { id: "pista-santiago-colegio-tabancura", nombre: "Colegio Tabancura", ciudad: "Santiago" },
  { id: "pista-santiago-colegio-verbo-divino", nombre: "Colegio Verbo Divino", ciudad: "Santiago" },
  { id: "pista-santiago-escuela-de-policia-de-investigaciones", nombre: "Escuela de Policía de Investigaciones", ciudad: "Santiago" },
  { id: "pista-santiago-escuela-militar", nombre: "Escuela Militar", ciudad: "Santiago" },
  { id: "pista-santiago-estadio-bernardo-o-higgins", nombre: "Estadio Bernardo O'Higgins", ciudad: "Santiago" },
  { id: "pista-santiago-estadio-militar", nombre: "Estadio Militar", ciudad: "Santiago" },
  { id: "pista-santiago-estadio-nacional-julio-martinez-pradanos", nombre: "Estadio Nacional Julio Martínez Prádanos / Est. Nac. Mario Recordón", ciudad: "Santiago" },
  { id: "pista-santiago-polideportivo-nueva-alemania", nombre: "Polideportivo Nueva Alemania", ciudad: "Santiago" },
  { id: "pista-santiago-poligono-lo-aguirre", nombre: "Polígono Lo Aguirre", ciudad: "Santiago" },
  { id: "pista-santiago-san-carlos-de-apoquindo", nombre: "San Carlos de Apoquindo", ciudad: "Santiago" },
  { id: "pista-talagante-colegio-carampangue", nombre: "Colegio Carampangue", ciudad: "Talagante" },
  { id: "pista-talagante-estadio-lucas-pacheco", nombre: "Estadio Lucas Pacheco", ciudad: "Talagante" },
  { id: "pista-talca-estadio-fiscal-de-talca", nombre: "Estadio Fiscal de Talca", ciudad: "Talca" },
  { id: "pista-temuco-pista-atletica-lazaro-escobar", nombre: "Pista Atlética Lázaro Escobar", ciudad: "Temuco" },
  { id: "pista-valdivia-estadio-parque-municipal-de-valdivia", nombre: "Estadio Parque Municipal de Valdivia", ciudad: "Valdivia" },
  { id: "pista-valparaiso-escuela-naval", nombre: "Escuela Naval", ciudad: "Valparaíso" },
  { id: "pista-valparaiso-estadio-elias-figueroa", nombre: "Estadio Elías Figueroa", ciudad: "Valparaíso" },
  { id: "pista-vina-del-mar-colegio-sscc-padres-franceses", nombre: "Colegio SSCC Padres Franceses", ciudad: "Viña del Mar" },
];

let accessToken = null;
let driveFileId = null;
let tokenClient = null;
let listeners = new Set();

function notificarEstado() {
  const estado = getEstadoDrive();
  listeners.forEach((fn) => fn(estado));
}

export function suscribirEstadoDrive(fn) {
  listeners.add(fn);
  fn(getEstadoDrive());
  return () => listeners.delete(fn);
}

export function getEstadoDrive() {
  return {
    conectado: Boolean(accessToken),
    archivoId: driveFileId,
  };
}

function clavePista(p) {
  return `${(p.nombre || "").trim().toLowerCase()}|${(p.ciudad || "").trim().toLowerCase()}`;
}

function fusionarPistas(guardadas) {
  const listaGuardada = Array.isArray(guardadas) ? guardadas : [];
  const vistas = new Set(listaGuardada.map((p) => clavePista(p)));
  const idsVistos = new Set(listaGuardada.map((p) => p.id));
  const combinadas = [...listaGuardada];

  for (const base of PISTAS_INICIALES) {
    const clave = clavePista(base);
    if (!vistas.has(clave) && !idsVistos.has(base.id)) {
      combinadas.push(base);
      vistas.add(clave);
      idsVistos.add(base.id);
    }
  }
  return combinadas;
}

function leerTabla(tabla) {
  try {
    const raw = localStorage.getItem(KEYS[tabla]);
    if (tabla === "pistas") {
      const parseadas = raw ? JSON.parse(raw) : [];
      const combinadas = fusionarPistas(parseadas);
      if (combinadas.length !== parseadas.length) {
        localStorage.setItem(KEYS.pistas, JSON.stringify(combinadas));
      }
      return combinadas;
    }
    return raw ? JSON.parse(raw) : [];
  } catch {
    return tabla === "pistas" ? [...PISTAS_INICIALES] : [];
  }
}

function escribirTabla(tabla, datos, sincronizar = true) {
  localStorage.setItem(KEYS[tabla], JSON.stringify(datos));
  if (sincronizar && accessToken) {
    subirADrive().catch((err) => console.error("Error sincronizando Drive:", err));
  }
}

function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

function armarSnapshot() {
  return {
    version: 1,
    actualizadoEn: new Date().toISOString(),
    marcas: leerTabla("marcas"),
    pesas: leerTabla("pesas"),
    pistas: leerTabla("pistas"),
  };
}

async function buscarArchivoEnDrive() {
  const q = encodeURIComponent(`name='${DRIVE_FILE_NAME}' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("No se pudo consultar Google Drive");
  const data = await res.json();
  return data.files && data.files.length > 0 ? data.files[0] : null;
}

async function descargarArchivoDrive(fileId) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("No se pudo descargar el archivo desde Drive");
  return await res.json();
}

export async function subirADrive() {
  if (!accessToken) throw new Error("Primero conecta tu cuenta de Google.");

  if (!driveFileId) {
    const existente = await buscarArchivoEnDrive();
    if (existente) driveFileId = existente.id;
  }

  const contenido = JSON.stringify(armarSnapshot(), null, 2);

  if (!driveFileId) {
    const metadata = { name: DRIVE_FILE_NAME, mimeType: "application/json" };
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    form.append("file", new Blob([contenido], { type: "application/json" }));

    const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });
    if (!res.ok) throw new Error("Error al crear el archivo en Google Drive");
    const creado = await res.json();
    driveFileId = creado.id;
  } else {
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${driveFileId}?uploadType=media`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: contenido,
    });
    if (!res.ok) throw new Error("Error al actualizar el archivo en Google Drive");
  }

  notificarEstado();
}

export async function sincronizarDesdeDrive() {
  if (!accessToken) throw new Error("Primero conecta tu cuenta de Google.");

  const archivo = await buscarArchivoEnDrive();
  if (!archivo) {
    await subirADrive();
    return { accion: "creado" };
  }

  driveFileId = archivo.id;
  const datosNube = await descargarArchivoDrive(archivo.id);

  if (Array.isArray(datosNube.marcas)) escribirTabla("marcas", datosNube.marcas, false);
  if (Array.isArray(datosNube.pesas)) escribirTabla("pesas", datosNube.pesas, false);
  const pistasFusionadas = fusionarPistas(datosNube.pistas);
  escribirTabla("pistas", pistasFusionadas, false);
  await subirADrive();

  notificarEstado();
  return { accion: "descargado" };
}

export function conectarGoogleDrive() {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      reject(new Error("Aún está cargando el servicio de Google. Espera 2 segundos y reintenta."));
      return;
    }

    if (!tokenClient) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: DRIVE_SCOPE,
        callback: async (resp) => {
          if (resp.error) {
            reject(new Error(resp.error));
            return;
          }
          accessToken = resp.access_token;
          notificarEstado();
          try {
            await sincronizarDesdeDrive();
            resolve(getEstadoDrive());
          } catch (err) {
            reject(err);
          }
        },
      });
    }

    tokenClient.requestAccessToken({ prompt: accessToken ? "" : "consent" });
  });
}

export function desconectarGoogleDrive() {
  if (accessToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(accessToken, () => {});
  }
  accessToken = null;
  driveFileId = null;
  notificarEstado();
}

// Simulador local con sincronización automática cuando estás conectado a Drive
export const supabase = {
  from(tabla) {
    return {
      select() {
        let datos = leerTabla(tabla);
        const query = {
          eq() {
            return query;
          },
          order(campo, { ascending = true } = {}) {
            datos.sort((a, b) => {
              const valA = a[campo] || "";
              const valB = b[campo] || "";
              if (valA < valB) return ascending ? -1 : 1;
              if (valA > valB) return ascending ? 1 : -1;
              return 0;
            });
            return Promise.resolve({ data: datos, error: null });
          },
          then(resolve) {
            resolve({ data: datos, error: null });
          },
        };
        return query;
      },

      insert(entrada) {
        let itemsCreados = [];
        let errorOcurrido = null;

        try {
          const datos = leerTabla(tabla);
          const listaAInsertar = Array.isArray(entrada) ? entrada : [entrada];

          itemsCreados = listaAInsertar.map((reg) => ({
            id: generarId(),
            created_at: new Date().toISOString(),
            ...reg,
          }));

          datos.push(...itemsCreados);
          escribirTabla(tabla, datos, true);
        } catch (err) {
          errorOcurrido = err;
        }

        const resultado = { data: itemsCreados, error: errorOcurrido };

        return {
          select() {
            return {
              single() {
                return Promise.resolve({
                  data: itemsCreados[0] || null,
                  error: errorOcurrido,
                });
              },
              then(resolve) {
                resolve(resultado);
              },
            };
          },
          then(resolve) {
            resolve(resultado);
          },
        };
      },

      update(cambios) {
        return {
          eq(campo, valor) {
            try {
              const datos = leerTabla(tabla);
              const actualizados = datos.map((item) =>
                item[campo] === valor ? { ...item, ...cambios } : item
              );
              escribirTabla(tabla, actualizados, true);
              return Promise.resolve({ error: null });
            } catch (err) {
              return Promise.resolve({ error: err });
            }
          },
        };
      },

      delete() {
        return {
          eq(campo, valor) {
            try {
              const datos = leerTabla(tabla);
              const filtrados = datos.filter((item) => item[campo] !== valor);
              escribirTabla(tabla, filtrados, true);
              return Promise.resolve({ error: null });
            } catch (err) {
              return Promise.resolve({ error: err });
            }
          },
        };
      },
    };
  },
};