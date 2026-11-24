"use strict";

const estadoApi = document.querySelector("#estadoApi");
const filaMonedas = $(".filaMonedas");
const informacionPagina = $(".informacionPagina");

window.miObjeto = window.miObjeto || { monedaa: {} };

function setEstado(mensaje, error = false) {
  if (!estadoApi) return;
  estadoApi.textContent = mensaje;
  estadoApi.dataset.error = String(error);
}

function limpiarPantalla() {
  filaMonedas.empty();
}

function ocultarInfo() {
  informacionPagina.addClass("oculto");
}

function mostrarCambios() {
  const valorSeleccionado = $("#selectMoneda").val();
  const valorCantidad = Number($("#numeroCalcular").val());

  if (!valorSeleccionado) {
    setEstado("Elige una moneda de origen.", true);
    return;
  }

  if (!Number.isFinite(valorCantidad) || valorCantidad <= 0) {
    setEstado("Ingresa una cantidad mayor que cero.", true);
    return;
  }

  setEstado("Convirtiendo…");

  const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(valorSeleccionado)}`;
  const formateador = new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  fetch(url)
    .then((respuesta) => {
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      return respuesta.json();
    })
    .then((datos) => {
      if (datos.result !== "success") {
        throw new Error(datos["error-type"] || "API error");
      }

      filaMonedas.empty();

      Object.keys(datos.rates).forEach((moneda) => {
        const cantidadConvertida = formateador.format(Number(datos.rates[moneda]) * valorCantidad);
        const nombre = window.miObjeto.monedaa[moneda] || moneda;
        const divMoneda = $("<div></div>")
          .addClass("col-6 col-md-2 elementoMoneda")
          .text(`${nombre} (${moneda}): ${cantidadConvertida}`);
        filaMonedas.append(divMoneda);
      });

      setEstado(`Conversión actualizada desde ${valorSeleccionado}.`);
    })
    .catch((error) => {
      console.error(error);
      setEstado("No se pudo obtener la conversión. Intenta de nuevo.", true);
    });
}

$("#botonCambiar").on("click", function () {
  limpiarPantalla();
  ocultarInfo();
  mostrarCambios();
});
