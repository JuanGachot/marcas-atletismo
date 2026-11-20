// src/supabaseClient.js - Almacenamiento 100% local (sin internet)

const KEYS = {
  marcas: "atletismo_marcas_v1",
  pesas: "atletismo_pesas_v1",
};

function leerTabla(tabla) {
  try {
    const raw = localStorage.getItem(KEYS[tabla]);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function escribirTabla(tabla, datos) {
  localStorage.setItem(KEYS[tabla], JSON.stringify(datos));
}

function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

// Simulador compatible con las consultas que ya usan tus componentes
export const supabase = {
  from(tabla) {
    return {
      select() {
        let datos = leerTabla(tabla);
        const query = {
          eq() {
            // Como es local para un solo usuario, devolvemos todo
            return query;
          },
          order(campo, { ascending = true } = {}) {
            datos.sort((a, b) => {
              if (a[campo] < b[campo]) return ascending ? -1 : 1;
              if (a[campo] > b[campo]) return ascending ? 1 : -1;
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

      insert(nuevoRegistro) {
        try {
          const datos = leerTabla(tabla);
          const item = {
            id: generarId(),
            created_at: new Date().toISOString(),
            ...nuevoRegistro,
          };
          datos.push(item);
          escribirTabla(tabla, datos);
          return Promise.resolve({ data: [item], error: null });
        } catch (err) {
          return Promise.resolve({ data: null, error: err });
        }
      },

      update(cambios) {
        return {
          eq(campo, valor) {
            try {
              const datos = leerTabla(tabla);
              const actualizados = datos.map((item) =>
                item[campo] === valor ? { ...item, ...cambios } : item
              );
              escribirTabla(tabla, actualizados);
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
              escribirTabla(tabla, filtrados);
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

// Funciones extra para exportar e importar respaldos en Ajustes.jsx
export function exportarRespaldoJSON() {
  return JSON.stringify(
    {
      version: 1,
      fechaExportacion: new Date().toISOString(),
      marcas: leerTabla("marcas"),
      pesas: leerTabla("pesas"),
    },
    null,
    2
  );
}

export function importarRespaldoJSON(textoJson) {
  const parsed = JSON.parse(textoJson);
  if (Array.isArray(parsed.marcas)) escribirTabla("marcas", parsed.marcas);
  if (Array.isArray(parsed.pesas)) escribirTabla("pesas", parsed.pesas);
}