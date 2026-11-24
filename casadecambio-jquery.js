"use strict";

const API_BASE = "https://open.er-api.com/v6";

function nombreMoneda(codigo, displayNames) {
  try {
    return displayNames.of(codigo) || codigo;
  } catch {
    return codigo;
  }
}

fetch(`${API_BASE}/latest/USD`)
  .then((respuesta) => {
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    return respuesta.json();
  })
  .then((datos) => {
    if (datos.result !== "success") {
      throw new Error(datos["error-type"] || "API error");
    }

    const displayNames = new Intl.DisplayNames(["es"], { type: "currency" });
    const codigos = Object.keys(datos.rates).sort();
    const $select = $("#selectMoneda");

    $select.empty();

    codigos.forEach((codigo) => {
      const nombre = nombreMoneda(codigo, displayNames);
      window.miObjeto.monedaa[codigo] = nombre;
      $select.append(
        $("<option></option>")
          .attr("value", codigo)
          .text(`${codigo} — ${nombre}`)
      );
    });

    $select.val("USD");
    setEstado(`Monedas cargadas: ${codigos.length}. Listo para convertir.`);
  })
  .catch((error) => {
    console.error(error);
    setEstado("No se pudieron cargar las monedas. Revisa tu conexión e intenta de nuevo.", true);
  });
