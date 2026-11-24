'use strict'

;(function () {
  const TIMEOUT_MS = 12000
  const $estadoApi = $('#estadoApi')
  const $selectMoneda = $('#selectMoneda')
  const $numeroCalcular = $('#numeroCalcular')
  const $botonCambiar = $('#botonCambiar')
  const $botonReintentar = $('#reintentarMonedas')
  const $filaMonedas = $('.filaMonedas')
  const $informacionPagina = $('.informacionPagina')
  const formulario = document.querySelector('#formConversion')

  const formateador = new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  const estado = {
    monedasListas: false,
    convirtiendo: false
  }

  let controladorConversion = null

  window.miObjeto = window.miObjeto || { monedaa: {} }

  function setEstado (mensaje, error = false) {
    if (!$estadoApi.length) return
    $estadoApi.text(mensaje)
    $estadoApi.attr('data-error', String(error))
  }

  function setBotonReintentar (visible) {
    $botonReintentar.toggleClass('oculto', !visible)
  }

  function actualizarControles () {
    const bloqueado = !estado.monedasListas || estado.convirtiendo
    $selectMoneda.prop('disabled', bloqueado)
    $botonCambiar
      .prop('disabled', bloqueado)
      .attr('aria-busy', String(estado.convirtiendo))
    $numeroCalcular.prop('disabled', !estado.monedasListas)
  }

  function setMonedasListas (listo, total = 0) {
    estado.monedasListas = listo

    if (!listo) {
      estado.convirtiendo = false
      if (controladorConversion) {
        controladorConversion.abort()
        controladorConversion = null
      }
      $filaMonedas.empty().attr('aria-busy', 'false')
    }

    actualizarControles()

    if (listo) {
      setEstado(`Monedas cargadas: ${total}. Listo para convertir.`)
    }
  }

  function fetchJson (url, { timeout = TIMEOUT_MS, signal } = {}) {
    const controlador = new AbortController()
    let agotado = false

    const abortar = () => controlador.abort()
    if (signal) {
      if (signal.aborted) controlador.abort()
      else signal.addEventListener('abort', abortar, { once: true })
    }

    const temporizador = window.setTimeout(() => {
      agotado = true
      controlador.abort()
    }, timeout)

    return window.fetch(url, { signal: controlador.signal, cache: 'no-store' })
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
        return respuesta.json()
      })
      .catch((error) => {
        if (agotado) {
          const errorTimeout = new Error('La solicitud tardó demasiado')
          errorTimeout.name = 'TimeoutError'
          throw errorTimeout
        }
        throw error
      })
      .finally(() => {
        window.clearTimeout(temporizador)
        if (signal) signal.removeEventListener('abort', abortar)
      })
  }

  function renderizar (datos, cantidad) {
    const fragmento = document.createDocumentFragment()

    Object.keys(datos.rates).forEach((codigo) => {
      const tasa = Number(datos.rates[codigo])
      if (!Number.isFinite(tasa)) return

      const nombre = window.miObjeto.monedaa[codigo] || codigo
      const monto = formateador.format(tasa * cantidad)

      const columna = document.createElement('div')
      columna.className = 'col-6 col-md-4 col-lg-3 col-xl-2'
      columna.setAttribute('role', 'listitem')

      const tarjeta = document.createElement('div')
      tarjeta.className = 'elementoMoneda'
      tarjeta.textContent = `${nombre} (${codigo}): ${monto}`

      columna.appendChild(tarjeta)
      fragmento.appendChild(columna)
    })

    $filaMonedas.empty().append(fragmento)
  }

  function mensajeDeError (error) {
    if (error.name === 'TimeoutError') {
      return 'La API tardó demasiado en responder. Intenta de nuevo.'
    }
    return 'No se pudo obtener la conversión. Intenta de nuevo.'
  }

  function mostrarCambios () {
    if (estado.convirtiendo) return

    const codigoOrigen = $selectMoneda.val()
    const textoCantidad = String($numeroCalcular.val() || '').trim()
    const cantidad = Number(textoCantidad)

    if (!estado.monedasListas) {
      setEstado('Espera a que se carguen las monedas.', true)
      return
    }

    if (!codigoOrigen) {
      setEstado('Elige una moneda de origen.', true)
      $selectMoneda.trigger('focus')
      return
    }

    if (!textoCantidad || !Number.isFinite(cantidad) || cantidad <= 0) {
      setEstado('Ingresa una cantidad mayor que cero.', true)
      $numeroCalcular.trigger('focus')
      return
    }

    if (controladorConversion) controladorConversion.abort()

    const controlador = new AbortController()
    controladorConversion = controlador
    estado.convirtiendo = true
    actualizarControles()
    $filaMonedas.empty().attr('aria-busy', 'true')
    setEstado('Convirtiendo…')

    const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(codigoOrigen)}`

    fetchJson(url, { signal: controlador.signal })
      .then((datos) => {
        if (datos.result !== 'success') {
          throw new Error(datos['error-type'] || 'API error')
        }
        if (controlador.signal.aborted) return
        renderizar(datos, cantidad)
        setEstado(`Conversión actualizada desde ${codigoOrigen}.`)
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        console.warn('[casa-cambio] Error al convertir:', error)
        setEstado(mensajeDeError(error), true)
      })
      .finally(() => {
        if (controladorConversion !== controlador) return
        controladorConversion = null
        estado.convirtiendo = false
        actualizarControles()
        $filaMonedas.attr('aria-busy', 'false')
      })
  }

  if (formulario) {
    formulario.addEventListener('submit', (evento) => {
      evento.preventDefault()
      $informacionPagina.addClass('oculto')
      mostrarCambios()
    })
  }

  $numeroCalcular.on('input', () => {
    if ($estadoApi.attr('data-error') === 'true') setEstado('')
  })

  actualizarControles()

  window.casaCambio = {
    estado,
    fetchJson,
    setEstado,
    setMonedasListas,
    setBotonReintentar
  }
})()
