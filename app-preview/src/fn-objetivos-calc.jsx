// ──────────────────────────────────────────
// Objetivos · Cálculos compartidos
// Usado por la pantalla Objetivos y por el dashboard (widget inline)
// ──────────────────────────────────────────

// ─── Helpers de fecha y periodo ───
const _objPad2 = n => String(n).padStart(2, '0');
const _objISO = (d) => `${d.getFullYear()}-${_objPad2(d.getMonth()+1)}-${_objPad2(d.getDate())}`;

// Dado un periodo + fecha base, calcular su rango (desde/hasta)
const rangoPeriodoObj = (periodo, fechaISO) => {
  const d = new Date(fechaISO + 'T00:00:00');
  const y = d.getFullYear();
  const m = d.getMonth();
  if (periodo === 'mes') {
    const ini = new Date(y, m, 1);
    const fin = new Date(y, m+1, 0);
    return {desde: _objISO(ini), hasta: _objISO(fin)};
  }
  if (periodo === 'trimestre') {
    const qStart = Math.floor(m / 3) * 3;
    const ini = new Date(y, qStart, 1);
    const fin = new Date(y, qStart+3, 0);
    return {desde: _objISO(ini), hasta: _objISO(fin)};
  }
  if (periodo === 'anio') {
    return {desde: `${y}-01-01`, hasta: `${y}-12-31`};
  }
  return null;
};

// Formato legible del periodo
const labelPeriodoObj = (periodo, fechaISO) => {
  const d = new Date(fechaISO + 'T00:00:00');
  const y = d.getFullYear();
  const m = d.getMonth();
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  if (periodo === 'mes') return `${meses[m]} ${y}`;
  if (periodo === 'trimestre') return `Q${Math.floor(m/3)+1} ${y}`;
  if (periodo === 'anio') return `Año ${y}`;
  return fechaISO;
};

// Default ventana histórica según periodo del objetivo
const ventanaDefaultObj = (periodo) => {
  if (periodo === 'mes') return 3;        // 3 meses atrás
  if (periodo === 'trimestre') return 6;  // 2 trimestres
  if (periodo === 'anio') return 12;      // año completo
  return 3;
};

// Calcular fecha N meses atrás (primer día de ese mes)
const restarMeses = (fechaISO, n) => {
  const d = new Date(fechaISO + 'T00:00:00');
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  return _objISO(d);
};

// Calcular fecha mismo periodo año anterior
const periodoYoY = (periodo, fechaISO) => {
  const d = new Date(fechaISO + 'T00:00:00');
  d.setFullYear(d.getFullYear() - 1);
  return _objISO(d);
};

// ─── Cálculo de progreso por tipo ───

// venta_spa: ¿cuánto se vendió en el periodo? Meta = monto fijo o % vs YoY
const calcVentaSpa = (obj, ventas, ventasYoY) => {
  const totalActual = ventas.reduce((a,v) => a + Number(v.precio_mxn || 0), 0);
  let meta = Number(obj.meta_valor) || 0;
  let extra = null;
  if (obj.meta_modalidad === 'pct_yoy') {
    const baseYoY = (ventasYoY || []).reduce((a,v) => a + Number(v.precio_mxn || 0), 0);
    meta = baseYoY * (1 + (Number(obj.meta_valor)||0) / 100);
    extra = `Base año anterior: $${Math.round(baseYoY).toLocaleString('es-MX')} · meta = +${obj.meta_valor}%`;
  }
  const pct = meta > 0 ? (totalActual / meta) * 100 : 0;
  return {
    actual: totalActual,
    meta,
    pct,
    alcanzado: totalActual >= meta && meta > 0,
    extra,
  };
};

// ticket_spa: ticket promedio del spa en el periodo (sum precio / N servicios)
const calcTicketSpa = (obj, ventas) => {
  const totalActual = ventas.reduce((a,v) => a + Number(v.precio_mxn || 0), 0);
  const n = ventas.length;
  const ticketProm = n > 0 ? totalActual / n : 0;
  const meta = Number(obj.meta_valor) || 0;
  const pct = meta > 0 ? (ticketProm / meta) * 100 : 0;
  return {
    actual: ticketProm,
    meta,
    pct,
    alcanzado: ticketProm >= meta && meta > 0,
    nServicios: n,
  };
};

// bono_individual: por cada terapeuta, evaluar condiciones combinadas
const calcBonoIndividual = (obj, ventas, ventasHistoricas, colabs) => {
  // Promedio del spa (si alguna condición lo usa)
  let avgTicketSpa = null;
  if (obj.cond_ticket_modalidad === 'promedio_spa') {
    const total = (ventasHistoricas || []).reduce((a,v) => a + Number(v.precio_mxn || 0), 0);
    const n = (ventasHistoricas || []).length;
    avgTicketSpa = n > 0 ? total / n : 0;
  }
  // Agrupar ventas del periodo por colab (ejecutor) + comisiones para venta neta
  const porColab = {};
  ventas.forEach(v => {
    const id = v.colaboradora_id;
    if (!id) return;
    if (!porColab[id]) porColab[id] = {ventas:0, comisiones:0, n:0};
    porColab[id].ventas += Number(v.precio_mxn || 0);
    porColab[id].comisiones += Number(v.comision_mxn || 0);
    porColab[id].n += 1;
  });
  // Evaluar cada colab activa que haya tenido ventas
  const resultados = [];
  Object.entries(porColab).forEach(([id, d]) => {
    const colab = (colabs || []).find(c => c.id === id);
    if (!colab) return;
    const ticket = d.n > 0 ? d.ventas / d.n : 0;
    const neta = d.ventas - d.comisiones;

    const okVentas = obj.cond_ventas_min == null || d.ventas >= Number(obj.cond_ventas_min);

    let ticketMeta = null;
    if (obj.cond_ticket_modalidad === 'monto') ticketMeta = Number(obj.cond_ticket_valor) || 0;
    if (obj.cond_ticket_modalidad === 'promedio_spa') ticketMeta = avgTicketSpa;
    const okTicket = ticketMeta == null || ticket >= ticketMeta;

    const okSvc = obj.cond_servicios_min == null || d.n >= Number(obj.cond_servicios_min);

    const cumple = okVentas && okTicket && okSvc;

    const bono = cumple ? calcBonoMonto(obj, {total: d.ventas, exceso: d.ventas - (Number(obj.cond_ventas_min) || 0), neta}) : 0;

    resultados.push({
      colab_id: id,
      nombre: colab.nombre + (colab.apellidos ? ' '+colab.apellidos : ''),
      alias: colab.alias,
      ventas: d.ventas,
      neta,
      ticket,
      n: d.n,
      cumple,
      bono,
      ticketMeta,
      okVentas, okTicket, okSvc,
    });
  });
  resultados.sort((a,b) => b.ventas - a.ventas);
  const ganadoras = resultados.filter(r => r.cumple);
  const cerca = resultados.filter(r => !r.cumple).slice(0, 5);
  const totalBono = ganadoras.reduce((a,g) => a + g.bono, 0);
  return {
    ganadoras, cerca,
    avgTicketSpa,
    totalBonoSugerido: totalBono,
  };
};

// Helper compartido: calcula el monto del bono según modalidad
const calcBonoMonto = (obj, bases) => {
  // bases: {total, exceso, neta}
  if (obj.bono_modalidad === 'monto_fijo') {
    return Number(obj.bono_monto_fijo) || 0;
  }
  // Porcentaje (default si no está definido)
  const pct = (Number(obj.bono_pct) || 0) / 100;
  if (obj.bono_base === 'total') return Math.max(0, bases.total) * pct;
  if (obj.bono_base === 'neta')  return Math.max(0, bases.neta) * pct;
  return Math.max(0, bases.exceso) * pct; // default 'exceso'
};

// bono_encargada: por cada colaboradora que abrió ≥ N turnos, calcular
// bono sobre las VENTAS TOTALES de esos turnos (todos los terapeutas que ejecutaron)
const calcBonoEncargada = (obj, ventas, turnos, colabs) => {
  // Agrupar turnos por encargada_id
  const porEnc = {};
  turnos.forEach(t => {
    const id = t.encargada_id;
    if (!id) return;
    if (!porEnc[id]) porEnc[id] = {turnos:[], turnoIds:new Set(), nTurnos:0, ventas:0, comisiones:0, nServicios:0};
    porEnc[id].turnoIds.add(t.id);
    porEnc[id].nTurnos += 1;
  });
  // Sumar ventas de los turnos que abrió cada encargada
  ventas.forEach(v => {
    if (!v.turno_id) return;
    Object.values(porEnc).forEach(e => {
      if (e.turnoIds.has(v.turno_id)) {
        e.ventas += Number(v.precio_mxn || 0);
        e.comisiones += Number(v.comision_mxn || 0) + Number(v.comision_venta_mxn || 0);
        e.nServicios += 1;
      }
    });
  });
  // Evaluar cada encargada
  const resultados = [];
  Object.entries(porEnc).forEach(([id, d]) => {
    const colab = (colabs || []).find(c => c.id === id);
    const neta = d.ventas - d.comisiones;

    const okTurnos  = obj.cond_turnos_min  == null || d.nTurnos >= Number(obj.cond_turnos_min);
    const okVentas  = obj.cond_ventas_min  == null || d.ventas >= Number(obj.cond_ventas_min);
    const cumple = okTurnos && okVentas;

    const bono = cumple ? calcBonoMonto(obj, {total: d.ventas, exceso: d.ventas - (Number(obj.cond_ventas_min) || 0), neta}) : 0;

    resultados.push({
      colab_id: id,
      nombre: colab ? colab.nombre + (colab.apellidos ? ' '+colab.apellidos : '') : 'Encargada desconocida',
      alias: colab?.alias,
      nTurnos: d.nTurnos,
      ventas: d.ventas,
      neta,
      nServicios: d.nServicios,
      cumple,
      bono,
      okTurnos, okVentas,
    });
  });
  resultados.sort((a,b) => b.ventas - a.ventas);
  const ganadoras = resultados.filter(r => r.cumple);
  const cerca = resultados.filter(r => !r.cumple).slice(0, 5);
  const totalBono = ganadoras.reduce((a,g) => a + g.bono, 0);
  return {ganadoras, cerca, totalBonoSugerido: totalBono};
};

Object.assign(window, {
  rangoPeriodoObj, labelPeriodoObj, ventanaDefaultObj,
  restarMeses, periodoYoY,
  calcVentaSpa, calcTicketSpa, calcBonoIndividual, calcBonoEncargada, calcBonoMonto,
});
