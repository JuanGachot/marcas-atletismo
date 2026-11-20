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
  { id: "pista-curico", nombre: "Estadio La Granja", ciudad: "Curicó" },
  { id: "pista-talca", nombre: "Estadio Fiscal", ciudad: "Talca" },
  { id: "pista-nacional", nombre: "Coliseo Estadio Nacional", ciudad: "Santiago" },
  { id: "pista-san-carlos", nombre: "Pista San Carlos de Apoquindo", ciudad: "Santiago" },
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

function leerTabla(tabla) {
  try {
    const raw = localStorage.getItem(KEYS[tabla]);
    if (!raw && tabla === "pistas") {
      escribirTabla("pistas", PISTAS_INICIALES);
      return PISTAS_INICIALES;
    }
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
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
  if (Array.isArray(datosNube.pistas) && datosNube.pistas.length > 0) {
    escribirTabla("pistas", datosNube.pistas, false);
  }

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