'use strict'

;(function () {
  const API_BASE = 'https://open.er-api.com/v6'
  const app = window.casaCambio
  const $selectMoneda = $('#selectMoneda')
  const $botonReintentar = $('#reintentarMonedas')

  let controlador = null
  let cargando = false

  function nombreMoneda (codigo, displayNames) {
    try {
      return displayNames.of(codigo) || codigo
    } catch {
      return codigo
    }
  }

  function mostrarReintentar (visible) {
    app.setBotonReintentar(visible)
  }

  async function cargarMonedas () {
    if (cargando) return

    cargando = true
    if (controlador) controlador.abort()
    controlador = new AbortController()
    const { signal } = controlador

    app.setMonedasListas(false)
    mostrarReintentar(false)
    app.setEstado('Cargando monedas…')

    try {
      const datos = await app.fetchJson(`${API_BASE}/latest/USD`, {
        timeout: 15000,
        signal
      })

      if (datos.result !== 'success') {
        throw new Error(datos['error-type'] || 'API error')
      }
      if (signal.aborted) return

      const displayNames = new Intl.DisplayNames(['es'], { type: 'currency' })
      const codigos = Object.keys(datos.rates).sort()
      const opciones = document.createDocumentFragment()

      codigos.forEach((codigo) => {
        const nombre = nombreMoneda(codigo, displayNames)
        window.miObjeto.monedaa[codigo] = nombre

        const opcion = document.createElement('option')
        opcion.value = codigo
        opcion.textContent = `${codigo} — ${nombre}`
        opciones.appendChild(opcion)
      })

      $selectMoneda.empty().append(opciones)
      $selectMoneda.val(codigos.includes('USD') ? 'USD' : codigos[0])
      app.setMonedasListas(true, codigos.length)
    } catch (error) {
      if (error.name === 'AbortError') return

      console.warn('[casa-cambio] Error al cargar monedas:', error)

      $selectMoneda.empty().append(
        $('<option></option>').attr('value', '').text('Sin monedas disponibles')
      )

      if (error.name === 'TimeoutError') {
        app.setEstado('La API tardó demasiado en cargar las monedas. Intenta de nuevo.', true)
      } else {
        app.setEstado('No se pudieron cargar las monedas. Revisa tu conexión e intenta de nuevo.', true)
      }

      mostrarReintentar(true)
      app.setMonedasListas(false)
    } finally {
      cargando = false
    }
  }

  $botonReintentar.on('click', cargarMonedas)

  app.cargarMonedas = cargarMonedas
  cargarMonedas()
})()
