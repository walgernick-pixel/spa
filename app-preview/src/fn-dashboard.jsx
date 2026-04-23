// ──────────────────────────────────────────
// Dashboard / Reportes — VERSIÓN FUNCIONAL
// Solo para gerencia (permission ver_dashboard)
// Filtros de periodo · KPIs · flujo de caja por cuenta · gráficas
// ──────────────────────────────────────────

// ─── Helpers de fecha ───
const _pad2 = n => String(n).padStart(2, '0');
const _ISO = (d) => `${d.getFullYear()}-${_pad2(d.getMonth()+1)}-${_pad2(d.getDate())}`;

const rangoPreset = (preset) => {
  const hoy = new Date();
  const y = hoy.getFullYear(), m = hoy.getMonth(), d = hoy.getDate();
  const H = _ISO(hoy);
  switch(preset) {
    case 'hoy':   return {desde: H, hasta: H, label:'Hoy'};
    case 'ayer':  { const a = new Date(y,m,d-1); return {desde:_ISO(a), hasta:_ISO(a), label:'Ayer'}; }
    case 'semana': {
      // Semana ISO: lunes-domingo
      const dia = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1;
      const lun = new Date(y, m, d - dia);
      const dom = new Date(y, m, d - dia + 6);
      return {desde:_ISO(lun), hasta:_ISO(dom), label:'Esta semana'};
    }
    case 'mes_actual': {
      const ini = new Date(y, m, 1);
      const fin = new Date(y, m+1, 0);
      return {desde:_ISO(ini), hasta:_ISO(fin), label:'Mes actual'};
    }
    case 'mes_anterior': {
      const ini = new Date(y, m-1, 1);
      const fin = new Date(y, m, 0);
      return {desde:_ISO(ini), hasta:_ISO(fin), label:'Mes anterior'};
    }
    case 'ult_3m': {
      const ini = new Date(y, m-2, 1);
      const fin = new Date(y, m+1, 0);
      return {desde:_ISO(ini), hasta:_ISO(fin), label:'Últimos 3 meses'};
    }
    case 'anio':
      return {desde: `${y}-01-01`, hasta: `${y}-12-31`, label:`Año ${y}`};
    default:
      return rangoPreset('mes_actual');
  }
};

// ─── Componente del dashboard ───
const DashboardFn = () => {
  const [preset, setPreset]     = React.useState('mes_actual');
  const [customDesde, setCD]    = React.useState('');
  const [customHasta, setCH]    = React.useState('');
  const [loading, setLoading]   = React.useState(true);
  const [data, setData]         = React.useState(null);
  const [dataPrev, setDataPrev] = React.useState(null);
  const [tendencia, setTendencia] = React.useState(null);
  const [cfgFiscal, setCfgFiscal] = React.useState(null);

  // Determinar rango efectivo
  const rango = React.useMemo(() => {
    if (preset === 'custom' && customDesde && customHasta) {
      return {desde: customDesde, hasta: customHasta, label: `Del ${customDesde} al ${customHasta}`};
    }
    return rangoPreset(preset);
  }, [preset, customDesde, customHasta]);

  // Rango del periodo anterior (misma duración)
  const rangoPrev = React.useMemo(() => {
    const dD = new Date(rango.desde + 'T00:00:00');
    const dH = new Date(rango.hasta + 'T00:00:00');
    const dur = Math.round((dH - dD) / 86400000) + 1;
    const prevH = new Date(dD); prevH.setDate(prevH.getDate() - 1);
    const prevD = new Date(prevH); prevD.setDate(prevD.getDate() - dur + 1);
    return {desde: _ISO(prevD), hasta: _ISO(prevH)};
  }, [rango]);

  // Cargar datos del periodo actual
  React.useEffect(() => {
    let vivo = true;
    (async () => {
      setLoading(true);
      const {desde, hasta} = rango;
      const [ventasQ, gastosQ, turnosQ, cuentasQ, monedasQ, cfgQ] = await Promise.all([
        sb.from('v_ventas').select('*').gte('fecha', desde).lte('fecha', hasta),
        sb.from('v_gastos').select('*').gte('fecha', desde).lte('fecha', hasta),
        sb.from('v_turnos_resumen').select('*').gte('fecha', desde).lte('fecha', hasta),
        sb.from('cuentas').select('*').order('orden'),
        sb.from('monedas').select('*'),
        sb.from('config_fiscal').select('*').eq('id',1).maybeSingle(),
      ]);
      if (!vivo) return;
      const turnoIds = (turnosQ.data||[]).map(t => t.id);
      let arqueos = [];
      if (turnoIds.length > 0) {
        const ar = await sb.from('arqueos').select('*').in('turno_id', turnoIds);
        arqueos = ar.data || [];
      }
      const monedasMap = {};
      (monedasQ.data||[]).forEach(m => monedasMap[m.codigo] = m);
      setCfgFiscal(cfgQ.data || null);
      setData({
        ventas: ventasQ.data || [], gastos: gastosQ.data || [],
        turnos: turnosQ.data || [], cuentas: cuentasQ.data || [],
        monedas: monedasMap, arqueos,
      });
      setLoading(false);
    })();
    return () => { vivo = false; };
  }, [rango]);

  // Cargar datos del periodo ANTERIOR (para deltas)
  React.useEffect(() => {
    let vivo = true;
    (async () => {
      const {desde, hasta} = rangoPrev;
      const [v,g] = await Promise.all([
        sb.from('v_ventas').select('precio_mxn,comision_mxn,comision_venta_mxn').gte('fecha',desde).lte('fecha',hasta),
        sb.from('v_gastos').select('monto_mxn').gte('fecha',desde).lte('fecha',hasta),
      ]);
      if (!vivo) return;
      const ventas  = v.data || [];
      const gastos  = g.data || [];
      const totalVentas = ventas.reduce((a,x)=>a+Number(x.precio_mxn||0),0);
      const totalComis  = ventas.reduce((a,x)=>a+Number(x.comision_mxn||0)+Number(x.comision_venta_mxn||0),0);
      const totalGastos = gastos.reduce((a,x)=>a+Number(x.monto_mxn||0),0);
      setDataPrev({
        totalVentas, totalComis, totalGastos,
        netoSpa: totalVentas - totalComis - totalGastos,
        nVentas: ventas.length,
      });
    })();
    return () => { vivo = false; };
  }, [rangoPrev]);

  // Cargar tendencia últimos 6 meses (independiente del filtro)
  React.useEffect(() => {
    let vivo = true;
    (async () => {
      const now = new Date();
      const ini = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const [v,g] = await Promise.all([
        sb.from('v_ventas').select('fecha,precio_mxn,comision_mxn,comision_venta_mxn').gte('fecha',_ISO(ini)).lte('fecha',_ISO(fin)),
        sb.from('v_gastos').select('fecha,monto_mxn').gte('fecha',_ISO(ini)).lte('fecha',_ISO(fin)),
      ]);
      if (!vivo) return;
      // Agrupar por YYYY-MM
      const meses = {};
      for (let m = 0; m < 6; m++) {
        const d = new Date(now.getFullYear(), now.getMonth()-5+m, 1);
        const k = `${d.getFullYear()}-${_pad2(d.getMonth()+1)}`;
        meses[k] = {mes:k, ventas:0, comisiones:0, gastos:0, neto:0};
      }
      (v.data||[]).forEach(x => {
        const k = x.fecha.slice(0,7);
        if (!meses[k]) return;
        meses[k].ventas += Number(x.precio_mxn||0);
        meses[k].comisiones += Number(x.comision_mxn||0) + Number(x.comision_venta_mxn||0);
      });
      (g.data||[]).forEach(x => {
        const k = x.fecha.slice(0,7);
        if (!meses[k]) return;
        meses[k].gastos += Number(x.monto_mxn||0);
      });
      Object.values(meses).forEach(m => {
        m.neto = m.ventas - m.comisiones - m.gastos;
      });
      setTendencia(Object.values(meses));
    })();
    return () => { vivo = false; };
  }, []);

  // Cálculos derivados
  const derivado = React.useMemo(() => {
    if (!data) return null;
    const {ventas, gastos, turnos, cuentas, monedas, arqueos} = data;

    // KPIs (todo en MXN equivalente)
    const totalVentas   = ventas.reduce((a,v) => a + Number(v.precio_mxn || 0), 0);
    const totalComis    = ventas.reduce((a,v) => a + Number(v.comision_mxn || 0) + Number(v.comision_venta_mxn || 0), 0);
    const totalPropinas = ventas.reduce((a,v) => a + Number(v.propina_mxn || 0), 0);
    const totalGastos   = gastos.reduce((a,g) => a + Number(g.monto_mxn || 0), 0);
    // Neto spa = Ventas - Comisiones - Gastos (propinas no son del spa)
    const netoSpa       = totalVentas - totalComis - totalGastos;
    const nTurnos       = turnos.length;
    const nServicios    = ventas.length;
    const tickProm      = nServicios > 0 ? totalVentas / nServicios : 0;
    // Diferencia arqueos (suma de dif en MXN)
    const difArqueos = arqueos.reduce((a,x) => {
      if (x.diferencia === null || x.diferencia === undefined) return a;
      const tc = Number(monedas[x.moneda]?.tc_a_mxn || 1);
      return a + (Number(x.diferencia) * tc);
    }, 0);

    // Flujo de caja por cuenta
    const cuentaMap = {};
    cuentas.forEach(c => cuentaMap[c.id] = {
      id: c.id, label: c.label, tipo: c.tipo, moneda: c.moneda,
      ingresos: 0, comisiones: 0, gastos: 0, n_ventas: 0, n_gastos: 0,
    });
    ventas.forEach(v => {
      if (!cuentaMap[v.cuenta_id]) return;
      cuentaMap[v.cuenta_id].ingresos += Number(v.precio || 0);
      cuentaMap[v.cuenta_id].n_ventas += 1;
      // Comisiones solo salen de cuentas efectivo
      if (cuentaMap[v.cuenta_id].tipo === 'efectivo') {
        cuentaMap[v.cuenta_id].comisiones += Number(v.comision_monto || 0) + Number(v.propina || 0) + Number(v.comision_venta_monto || 0);
      }
    });
    gastos.forEach(g => {
      // Nota: gastos con n_pagos>1 tendrían split. Por simplicidad aquí lo cargamos al cuenta_id
      // principal. TODO: considerar splits en PR-2.
      if (!cuentaMap[g.cuenta_id]) return;
      cuentaMap[g.cuenta_id].gastos += Number(g.monto || 0);
      cuentaMap[g.cuenta_id].n_gastos += 1;
    });
    const flujoPorCuenta = Object.values(cuentaMap)
      .map(c => ({...c, balance: c.ingresos - c.comisiones - c.gastos}))
      .filter(c => c.ingresos > 0 || c.gastos > 0)
      .sort((a,b) => {
        // Efectivo MXN primero, luego tipo alfabético, luego moneda
        if (a.tipo === 'efectivo' && b.tipo !== 'efectivo') return -1;
        if (b.tipo === 'efectivo' && a.tipo !== 'efectivo') return 1;
        if (a.moneda === 'MXN' && b.moneda !== 'MXN') return -1;
        if (b.moneda === 'MXN' && a.moneda !== 'MXN') return 1;
        return a.label.localeCompare(b.label);
      });

    // Serie diaria: ventas vs gastos — rellena TODOS los días del periodo
    // (incluso los días con $0 para detectar huecos de captura)
    const serieDiaria = {};
    const dI = new Date(rango.desde + 'T00:00:00');
    const dF = new Date(rango.hasta + 'T00:00:00');
    for (let d = new Date(dI); d <= dF; d.setDate(d.getDate() + 1)) {
      serieDiaria[_ISO(d)] = {ventas: 0, gastos: 0};
    }
    ventas.forEach(v => {
      if (serieDiaria[v.fecha]) serieDiaria[v.fecha].ventas += Number(v.precio_mxn || 0);
    });
    gastos.forEach(g => {
      if (serieDiaria[g.fecha]) serieDiaria[g.fecha].gastos += Number(g.monto_mxn || 0);
    });
    const fechasOrdenadas = Object.keys(serieDiaria).sort();
    const serieChart = {
      labels: fechasOrdenadas,
      ventas: fechasOrdenadas.map(f => serieDiaria[f].ventas),
      gastos: fechasOrdenadas.map(f => serieDiaria[f].gastos),
    };

    // Top canales
    const porCanal = {};
    ventas.forEach(v => {
      const k = v.canal || '—';
      if (!porCanal[k]) porCanal[k] = {label: k, tone: v.canal_tone, total: 0, n: 0};
      porCanal[k].total += Number(v.precio_mxn || 0);
      porCanal[k].n += 1;
    });
    const canalesOrd = Object.values(porCanal).sort((a,b) => b.total - a.total);

    // Top categorías de gasto
    const porCategoria = {};
    gastos.forEach(g => {
      const k = g.categoria || '—';
      if (!porCategoria[k]) porCategoria[k] = {label: k, tone: g.categoria_tone, total: 0, n: 0};
      porCategoria[k].total += Number(g.monto_mxn || 0);
      porCategoria[k].n += 1;
    });
    const categoriasOrd = Object.values(porCategoria).sort((a,b) => b.total - a.total);

    // Top colaboradoras (por ventas ejecutadas)
    const porColab = {};
    ventas.forEach(v => {
      const k = v.colaboradora_id;
      if (!k) return;
      if (!porColab[k]) porColab[k] = {
        id: k, nombre: v.colaboradora_nombre || 'Sin nombre',
        alias: v.colaboradora_alias,
        ventas: 0, comision: 0, propina: 0, n: 0,
      };
      porColab[k].ventas += Number(v.precio_mxn || 0);
      porColab[k].comision += Number(v.comision_mxn || 0);
      porColab[k].propina += Number(v.propina_mxn || 0);
      porColab[k].n += 1;
      // Comisión venta también va al vendedor
      if (v.vendedora_id && v.vendedora_id !== v.colaboradora_id) {
        if (!porColab[v.vendedora_id]) porColab[v.vendedora_id] = {
          id: v.vendedora_id, nombre: v.vendedora_nombre || 'Sin nombre',
          alias: v.vendedora_alias,
          ventas: 0, comision: 0, propina: 0, n: 0, ventasHechas: 0,
        };
        porColab[v.vendedora_id].comision += Number(v.comision_venta_mxn || 0);
        porColab[v.vendedora_id].ventasHechas = (porColab[v.vendedora_id].ventasHechas || 0) + 1;
      }
    });
    const colabsOrd = Object.values(porColab).sort((a,b) => (b.ventas + b.comision) - (a.ventas + a.comision));

    // Top servicios
    const porServicio = {};
    ventas.forEach(v => {
      const k = v.servicio || '—';
      if (!porServicio[k]) porServicio[k] = {label: k, total: 0, n: 0};
      porServicio[k].total += Number(v.precio_mxn || 0);
      porServicio[k].n += 1;
    });
    const serviciosOrd = Object.values(porServicio)
      .map(s => ({...s, ticketProm: s.n > 0 ? s.total / s.n : 0}))
      .sort((a,b) => b.total - a.total);

    // Top proveedores de gasto
    const porProveedor = {};
    gastos.forEach(g => {
      const k = g.proveedor || '(Sin proveedor)';
      if (!porProveedor[k]) porProveedor[k] = {label: k, total: 0, n: 0};
      porProveedor[k].total += Number(g.monto_mxn || 0);
      porProveedor[k].n += 1;
    });
    const proveedoresOrd = Object.values(porProveedor).sort((a,b) => b.total - a.total);

    // Turnos del periodo — tabla detallada
    const turnosOrd = [...turnos].sort((a,b) => {
      if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
      return (b.hora_inicio||'').localeCompare(a.hora_inicio||'');
    });

    // Ranking por encargada (quién vendió más)
    const porEncargada = {};
    turnos.forEach(t => {
      const k = t.encargada_id || '_sin';
      const nombre = t.encargada_nombre || 'Sin encargado';
      if (!porEncargada[k]) porEncargada[k] = {id:k, nombre, nTurnos:0, ventas:0, comisiones:0, comisionesVenta:0, gastos:0, neto:0, nServicios:0};
      porEncargada[k].nTurnos += 1;
      porEncargada[k].ventas += Number(t.total_mxn || 0);
      porEncargada[k].comisiones += Number(t.comisiones_mxn || 0);
      porEncargada[k].comisionesVenta += Number(t.comisiones_venta_mxn || 0);
      porEncargada[k].nServicios += Number(t.n_servicios || 0);
    });
    // Los gastos no se asocian directo a encargada (por ahora). Dejamos 0.
    Object.values(porEncargada).forEach(e => {
      e.neto = e.ventas - e.comisiones - e.comisionesVenta;
      e.promedioPorTurno = e.nTurnos > 0 ? e.ventas / e.nTurnos : 0;
    });
    const encargadasOrd = Object.values(porEncargada).sort((a,b) => b.ventas - a.ventas);

    // ─── Cálculo fiscal (si config_fiscal.activo) ───
    let fiscal = null;
    if (cfgFiscal?.activo) {
      const cuentasFiscalesIds = new Set(cuentas.filter(c => c.es_fiscal).map(c => c.id));
      const ivaPctDefault = Number(cfgFiscal.iva_pct_default || 16);
      const isrPct = Number(cfgFiscal.isr_pct || 0);

      // Ventas en cuentas fiscales (se asume precio incluye IVA)
      const ventasFiscales = ventas.filter(v => cuentasFiscalesIds.has(v.cuenta_id));
      const ventasNoFiscales = ventas.filter(v => !cuentasFiscalesIds.has(v.cuenta_id));
      const ventasGravadasMxn = ventasFiscales.reduce((a,v) => a + Number(v.precio_mxn||0), 0);
      const ventasNoFiscalesMxn = ventasNoFiscales.reduce((a,v) => a + Number(v.precio_mxn||0), 0);
      const ivaCobrado = ventasGravadasMxn * (ivaPctDefault / (100 + ivaPctDefault));
      const ventasGravadasSinIva = ventasGravadasMxn - ivaCobrado;

      // Gastos facturables (IVA acreditable + base deducible)
      const gastosFacturables = gastos.filter(g => g.es_facturable);
      const gastosNoFacturables = gastos.filter(g => !g.es_facturable);
      const gastosFactMxn = gastosFacturables.reduce((a,g) => a + Number(g.monto_mxn||0), 0);
      const gastosNoFactMxn = gastosNoFacturables.reduce((a,g) => a + Number(g.monto_mxn||0), 0);
      // IVA acreditable: usar iva_importe (la vista ya resuelve iva_monto vs iva_pct × tc_momento)
      const ivaAcreditable = gastosFacturables.reduce((a,g) => {
        const imp = Number(g.iva_importe||0);
        const tc = Number(g.tc_momento||1);
        return a + imp * tc;
      }, 0);
      const gastosFactSinIva = gastosFactMxn - ivaAcreditable;

      const ivaAPagar = ivaCobrado - ivaAcreditable; // puede ser negativo si tienes saldo a favor

      const utilidadFiscal = ventasGravadasSinIva - gastosFactSinIva;
      const isrEstimado = Math.max(0, utilidadFiscal * isrPct / 100);

      // Utilidad real del dueño: neto contable completo − IVA a pagar − ISR
      const netoContable = totalVentas - totalComis - totalGastos;
      const utilidadReal = netoContable - Math.max(0, ivaAPagar) - isrEstimado;

      fiscal = {
        cfg: cfgFiscal,
        ventasGravadasMxn, ventasNoFiscalesMxn,
        ivaCobrado, ventasGravadasSinIva,
        gastosFactMxn, gastosNoFactMxn,
        ivaAcreditable, gastosFactSinIva,
        ivaAPagar,
        utilidadFiscal, isrEstimado, isrPct,
        netoContable, utilidadReal,
      };
    }

    return {
      totalVentas, totalComis, totalPropinas, totalGastos, netoSpa,
      nTurnos, nServicios, tickProm, difArqueos,
      flujoPorCuenta, serieChart, canalesOrd, categoriasOrd,
      colabsOrd, serviciosOrd, proveedoresOrd,
      turnosOrd, encargadasOrd,
      fiscal,
    };
  }, [data, rango, cfgFiscal]);

  // Drill-down modal state
  const [drillDown, setDrillDown] = React.useState(null);

  const abrirDrill = (tipo, filtro, titulo) => {
    if (!data) return;
    let items = [];
    let columnas = [];
    if (tipo === 'colab') {
      items = data.ventas.filter(v => v.colaboradora_id === filtro || v.vendedora_id === filtro);
      columnas = 'ventas';
    } else if (tipo === 'servicio') {
      items = data.ventas.filter(v => v.servicio === filtro);
      columnas = 'ventas';
    } else if (tipo === 'canal') {
      items = data.ventas.filter(v => v.canal === filtro);
      columnas = 'ventas';
    } else if (tipo === 'categoria') {
      items = data.gastos.filter(g => g.categoria === filtro);
      columnas = 'gastos';
    } else if (tipo === 'proveedor') {
      items = data.gastos.filter(g => (g.proveedor || '(Sin proveedor)') === filtro);
      columnas = 'gastos';
    } else if (tipo === 'cuenta-ingresos') {
      items = data.ventas.filter(v => v.cuenta_id === filtro);
      columnas = 'ventas';
    } else if (tipo === 'cuenta-gastos') {
      items = data.gastos.filter(g => g.cuenta_id === filtro);
      columnas = 'gastos';
    }
    setDrillDown({tipo, filtro, titulo, items, columnas});
  };

  // Exportar a Excel (xlsx con varias hojas)
  const exportarExcel = () => {
    if (!window.XLSX || !derivado) return notify('XLSX no disponible','err');
    const XLSX = window.XLSX;
    const wb = XLSX.utils.book_new();
    const periodo = `${rango.desde}_${rango.hasta}`;

    // Hoja 1: Resumen
    const resumen = [
      ['REPORTE CASHFLOW SPA'],
      [`Periodo: ${rango.label}`, `Del ${rango.desde} al ${rango.hasta}`],
      [`Generado: ${new Date().toLocaleString('es-MX')}`],
      [],
      ['MÉTRICA', 'VALOR (MXN)'],
      ['Ventas totales', derivado.totalVentas],
      ['Comisiones (terapeutas + venta)', derivado.totalComis],
      ['Propinas', derivado.totalPropinas],
      ['Gastos', derivado.totalGastos],
      ['Neto al spa', derivado.netoSpa],
      ['Ticket promedio', Math.round(derivado.tickProm)],
      ['Número de turnos', derivado.nTurnos],
      ['Número de servicios', derivado.nServicios],
      ['Diferencia arqueos', derivado.difArqueos],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), 'Resumen');

    // Hoja 2: Ventas detalle
    const ventasAoA = [['Fecha','Servicio','Ejecutó','Canal','Cuenta','Precio','Moneda','% Com','Comisión','Propina','Vendió','% Venta','Com. Venta','Monto MXN eq']];
    data.ventas.forEach(v => {
      ventasAoA.push([
        v.fecha, v.servicio, v.colaboradora_nombre || '', v.canal || '', v.cuenta || '',
        Number(v.precio || 0), v.moneda, Number(v.comision_pct || 0), Number(v.comision_monto || 0),
        Number(v.propina || 0), v.vendedora_nombre || '',
        Number(v.comision_venta_pct || 0), Number(v.comision_venta_monto || 0),
        Number(v.precio_mxn || 0),
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ventasAoA), 'Ventas');

    // Hoja 3: Gastos detalle
    const gastosAoA = [['Fecha','Concepto','Categoría','Proveedor','Cuenta','Monto','Moneda','Monto MXN','Notas']];
    data.gastos.forEach(g => {
      gastosAoA.push([
        g.fecha, g.concepto || '', g.categoria || '', g.proveedor || '', g.cuenta || '',
        Number(g.monto || 0), g.moneda, Number(g.monto_mxn || 0), g.notas || '',
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(gastosAoA), 'Gastos');

    // Hoja 4: Flujo de caja por cuenta
    const flujoAoA = [['Cuenta','Tipo','Moneda','Ingresos','Comisiones','Gastos','Balance','Ventas #','Gastos #']];
    derivado.flujoPorCuenta.forEach(c => {
      flujoAoA.push([c.label, c.tipo, c.moneda, c.ingresos, c.comisiones, c.gastos, c.balance, c.n_ventas, c.n_gastos]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(flujoAoA), 'Flujo de caja');

    // Hoja 5: Top colaboradoras
    const colabsAoA = [['Nombre','Alias','# Servicios','Ventas MXN','Comisión MXN','Propinas MXN','Ventas a otros']];
    derivado.colabsOrd.forEach(c => {
      colabsAoA.push([c.nombre, c.alias || '', c.n, Math.round(c.ventas), Math.round(c.comision), Math.round(c.propina), c.ventasHechas || 0]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(colabsAoA), 'Equipo');

    // Hoja 6: Top servicios
    const svcAoA = [['Servicio','Veces','Ticket promedio','Total MXN']];
    derivado.serviciosOrd.forEach(s => {
      svcAoA.push([s.label, s.n, Math.round(s.ticketProm), Math.round(s.total)]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(svcAoA), 'Servicios');

    // Hoja 7: Arqueos
    const arqAoA = [['Turno ID','Cuenta ID','Moneda','Venta efectivo','Comisiones pagadas','Neto esperado','Neto reportado','Diferencia','Notas']];
    data.arqueos.forEach(a => {
      arqAoA.push([
        a.turno_id, a.cuenta_id || '', a.moneda,
        Number(a.venta_efectivo || 0), Number(a.comisiones_pagadas || 0),
        Number(a.neto_esperado || 0), a.neto_reportado === null ? '' : Number(a.neto_reportado),
        a.diferencia === null ? '' : Number(a.diferencia),
        a.notas || '',
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(arqAoA), 'Arqueos');

    XLSX.writeFile(wb, `dashboard_${periodo}.xlsx`);
    notify('Excel descargado ✓');
  };

  // Exportar a PDF (usa window.print con CSS print)
  const exportarPDF = () => {
    setTimeout(() => window.print(), 50);
  };

  // Deltas vs periodo anterior
  const deltas = React.useMemo(() => {
    if (!derivado || !dataPrev) return null;
    const pct = (now, prev) => {
      if (!prev || prev === 0) return null;
      return ((now - prev) / Math.abs(prev)) * 100;
    };
    return {
      ventas:   pct(derivado.totalVentas, dataPrev.totalVentas),
      comis:    pct(derivado.totalComis, dataPrev.totalComis),
      gastos:   pct(derivado.totalGastos, dataPrev.totalGastos),
      neto:     pct(derivado.netoSpa, dataPrev.netoSpa),
      servicios:pct(derivado.nServicios, dataPrev.nVentas),
    };
  }, [derivado, dataPrev]);

  if (!window.can || !window.can('dashboard_ver')) {
    return (
      <div style={{padding:60,textAlign:'center'}}>
        <div style={{fontFamily:'var(--serif)',fontSize:22,color:'var(--ink-1)',marginBottom:10}}>Sin acceso</div>
        <div style={{fontSize:13,color:'var(--ink-3)'}}>El dashboard solo está disponible para gerencia.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-root" style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',fontFamily:'var(--sans)',background:'var(--paper)',overflowY:'auto',WebkitOverflowScrolling:'touch'}}>
      <style>{`
        @media (max-width: 900px) {
          .cf-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 520px) {
          .cf-kpi-grid { grid-template-columns: 1fr !important; }
        }
        @media print {
          @page { size: letter; margin: 0.7cm; }
          body * { visibility: hidden; }
          .dashboard-root, .dashboard-root * { visibility: visible; }
          .dashboard-root { position: absolute !important; left: 0; top: 0; width: 100%; overflow: visible !important; }
          .dashboard-no-print { display: none !important; }
          .dashboard-root canvas { max-width: 100%; height: auto !important; }
          /* Evitar cortes feos en medio de secciones */
          .dashboard-section { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
      {/* Header */}
      <div className="dashboard-no-print" style={{position:'sticky',top:0,zIndex:5,padding:'18px 24px',borderBottom:'1px solid var(--line-1)',background:'var(--paper-raised)',display:'flex',alignItems:'flex-end',gap:16,flexWrap:'wrap'}}>
        <div>
          <div style={{fontFamily:'var(--serif)',fontSize:28,fontWeight:500,letterSpacing:-.6,color:'var(--ink-0)',lineHeight:1}}>Dashboard</div>
          <div style={{fontSize:12,color:'var(--ink-3)',marginTop:4}}>{rango.label} · {rango.desde} → {rango.hasta}</div>
        </div>
        <div style={{flex:1}}/>
        {/* Filtro */}
        <select value={preset} onChange={e=>setPreset(e.target.value)} style={{padding:'9px 32px 9px 14px',border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontSize:13,fontFamily:'inherit',color:'var(--ink-1)',cursor:'pointer'}}>
          <option value="hoy">Hoy</option>
          <option value="ayer">Ayer</option>
          <option value="semana">Esta semana</option>
          <option value="mes_actual">Mes actual</option>
          <option value="mes_anterior">Mes anterior</option>
          <option value="ult_3m">Últimos 3 meses</option>
          <option value="anio">Año actual</option>
          <option value="custom">Rango personalizado…</option>
        </select>
        {preset === 'custom' && (
          <>
            <input type="date" value={customDesde} onChange={e=>setCD(e.target.value)} style={{padding:'9px 12px',border:'1px solid var(--line-1)',borderRadius:8,fontSize:13,fontFamily:'inherit'}}/>
            <span style={{color:'var(--ink-3)'}}>→</span>
            <input type="date" value={customHasta} onChange={e=>setCH(e.target.value)} style={{padding:'9px 12px',border:'1px solid var(--line-1)',borderRadius:8,fontSize:13,fontFamily:'inherit'}}/>
          </>
        )}
        {/* Botones de exportar */}
        {!loading && derivado && (
          <div style={{display:'flex',gap:6,marginLeft:'auto'}}>
            <Btn variant="ghost" size="md" icon="download" onClick={exportarExcel}>Excel</Btn>
            <Btn variant="secondary" size="md" icon="receipt" onClick={exportarPDF}>PDF</Btn>
          </div>
        )}
      </div>

      <div style={{padding:'20px 24px 60px',maxWidth:1200,margin:'0 auto',width:'100%',boxSizing:'border-box'}}>
        {loading && <div style={{padding:60,textAlign:'center',color:'var(--ink-3)',fontSize:13}}>Cargando datos…</div>}

        {!loading && derivado && (
          <>
            {/* KPIs — 3 cols siempre en desktop para evitar huecos */}
            <div className="cf-kpi-grid" style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:12,marginBottom:20}}>
              <KpiCard label="Ventas" value={derivado.totalVentas} color="var(--ink-0)" sub={`${derivado.nServicios} servicios`} delta={deltas?.ventas}/>
              <KpiCard label="Gastos" value={derivado.totalGastos} color="#b73f5e" sub={`${data.gastos.length} gastos`} delta={deltas?.gastos} deltaInverted/>
              <KpiCard label="Neto al spa" value={derivado.netoSpa} color={derivado.netoSpa >= 0 ? 'var(--moss)' : '#b73f5e'} sub="ventas − com. − gastos" delta={deltas?.neto} big/>
              <KpiCard label="Comisiones" value={derivado.totalComis} color="var(--clay)" sub="a terapeutas" delta={deltas?.comis} deltaInverted/>
              <KpiCard label="Ticket promedio" value={derivado.tickProm} color="var(--ink-0)" sub={`${derivado.nTurnos} turnos`}/>
              <KpiCard label="Dif. arqueos" value={derivado.difArqueos} color={Math.abs(derivado.difArqueos) < 1 ? 'var(--moss)' : (derivado.difArqueos > 0 ? 'var(--moss)' : '#b73f5e')} sub={Math.abs(derivado.difArqueos) < 1 ? 'cuadra' : (derivado.difArqueos > 0 ? 'sobrante' : 'faltante')} signed/>
            </div>

            {/* Sección Fiscal (solo si config_fiscal.activo) */}
            {derivado.fiscal && <FiscalSection f={derivado.fiscal}/>}

            {/* Chart: Ventas vs Gastos */}
            <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:20,marginBottom:20}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <div>
                  <div style={{fontFamily:'var(--serif)',fontSize:17,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2}}>Ventas vs Gastos</div>
                  <div style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>Día por día · MXN equivalente</div>
                </div>
              </div>
              {derivado.serieChart.labels.length > 0 ? (
                <div style={{height:280,position:'relative'}}>
                  <ChartDaily serie={derivado.serieChart}/>
                </div>
              ) : (
                <div style={{padding:40,textAlign:'center',color:'var(--ink-3)',fontSize:12}}>Sin datos en este periodo</div>
              )}
            </div>

            {/* Flujo de caja por cuenta */}
            <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:20,marginBottom:20}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <div>
                  <div style={{fontFamily:'var(--serif)',fontSize:17,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2}}>Flujo de caja por cuenta</div>
                  <div style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>Ingresos − comisiones efectivo − gastos = balance</div>
                </div>
              </div>
              <FlujoCuentaTable cuentas={derivado.flujoPorCuenta} monedas={data.monedas} onDrill={(cuenta, tipo) => abrirDrill(tipo==='ingresos'?'cuenta-ingresos':'cuenta-gastos', cuenta.id, `${tipo==='ingresos'?'Ingresos':'Gastos'} de ${cuenta.label}`)}/>
            </div>

            {/* Breakdowns lado a lado */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))',gap:16,marginBottom:20}}>
              <BreakdownCard titulo="Ventas por canal" items={derivado.canalesOrd} total={derivado.totalVentas} variant="canal" onItemClick={(it)=>abrirDrill('canal', it.label, `Ventas del canal "${it.label}"`)}/>
              <BreakdownCard titulo="Gastos por categoría" items={derivado.categoriasOrd} total={derivado.totalGastos} variant="cat" onItemClick={(it)=>abrirDrill('categoria', it.label, `Gastos de categoría "${it.label}"`)}/>
            </div>

            {/* Top colaboradoras + Top servicios */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(360px, 1fr))',gap:16,marginBottom:20}}>
              {/* Top colabs */}
              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:18}}>
                <div style={{fontFamily:'var(--serif)',fontSize:15,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2,marginBottom:12}}>Top colaboradoras</div>
                {derivado.colabsOrd.length === 0 ? (
                  <div style={{padding:20,textAlign:'center',color:'var(--ink-3)',fontSize:12}}>Sin colaboradoras con ventas</div>
                ) : (
                  <TopColabsTable colabs={derivado.colabsOrd.slice(0,10)} onColabClick={(c)=>abrirDrill('colab', c.id, `Ventas de ${c.nombre}`)}/>
                )}
              </div>
              {/* Top servicios */}
              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:18}}>
                <div style={{fontFamily:'var(--serif)',fontSize:15,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2,marginBottom:12}}>Top servicios</div>
                {derivado.serviciosOrd.length === 0 ? (
                  <div style={{padding:20,textAlign:'center',color:'var(--ink-3)',fontSize:12}}>Sin servicios vendidos</div>
                ) : (
                  <TopServiciosTable servicios={derivado.serviciosOrd.slice(0,10)} onServicioClick={(s)=>abrirDrill('servicio', s.label, `Ventas de "${s.label}"`)}/>
                )}
              </div>
            </div>

            {/* Top proveedores */}
            <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:18,marginBottom:20}}>
              <div style={{fontFamily:'var(--serif)',fontSize:15,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2,marginBottom:12}}>Top proveedores (gastos)</div>
              {derivado.proveedoresOrd.length === 0 ? (
                <div style={{padding:20,textAlign:'center',color:'var(--ink-3)',fontSize:12}}>Sin gastos en este periodo</div>
              ) : (
                <BreakdownCard titulo={null} items={derivado.proveedoresOrd.slice(0,8)} total={derivado.totalGastos} variant="cat" flush onItemClick={(it)=>abrirDrill('proveedor', it.label, `Gastos de proveedor "${it.label}"`)}/>
              )}
            </div>

            {/* Ranking por encargada + Turnos del periodo */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(360px, 1fr))',gap:16,marginBottom:20}}>
              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:18}}>
                <div style={{fontFamily:'var(--serif)',fontSize:15,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2,marginBottom:3}}>Ranking por encargada</div>
                <div style={{fontSize:11,color:'var(--ink-3)',marginBottom:12}}>Quién abrió los turnos y cuánto vendió</div>
                {derivado.encargadasOrd.length === 0 ? (
                  <div style={{padding:20,textAlign:'center',color:'var(--ink-3)',fontSize:12}}>Sin turnos en este periodo</div>
                ) : (
                  <RankingEncargadas encargadas={derivado.encargadasOrd}/>
                )}
              </div>
              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:18}}>
                <div style={{fontFamily:'var(--serif)',fontSize:15,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2,marginBottom:3}}>Turnos del periodo</div>
                <div style={{fontSize:11,color:'var(--ink-3)',marginBottom:12}}>{derivado.turnosOrd.length} turnos · click para ver detalle</div>
                {derivado.turnosOrd.length === 0 ? (
                  <div style={{padding:20,textAlign:'center',color:'var(--ink-3)',fontSize:12}}>Sin turnos en este periodo</div>
                ) : (
                  <TurnosTable turnos={derivado.turnosOrd} arqueos={data.arqueos} monedas={data.monedas}/>
                )}
              </div>
            </div>

            {/* Tendencia 6 meses (independiente del filtro) */}
            <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:18}}>
              <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:12,gap:10,flexWrap:'wrap'}}>
                <div>
                  <div style={{fontFamily:'var(--serif)',fontSize:15,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2}}>Tendencia 6 meses</div>
                  <div style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>Ventas vs Gastos vs Neto · independiente del filtro de periodo</div>
                </div>
              </div>
              {tendencia && tendencia.length > 0 ? (
                <div style={{height:260,position:'relative'}}><ChartTendencia datos={tendencia}/></div>
              ) : (
                <div style={{padding:30,textAlign:'center',color:'var(--ink-3)',fontSize:12}}>Cargando tendencia…</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Drill-down modal */}
      {drillDown && <DrillDownModal data={drillDown} monedas={data?.monedas || {}} onClose={()=>setDrillDown(null)}/>}
    </div>
  );
};

// ─── Tabla top colaboradoras ───
const TopColabsTable = ({colabs, onColabClick}) => {
  const max = Math.max(...colabs.map(c => c.ventas + c.comision));
  return (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {colabs.map((c,i) => {
        const recibido = c.comision + c.propina;
        const pct = max > 0 ? ((c.ventas + c.comision) / max) * 100 : 0;
        const clickable = typeof onColabClick === 'function';
        return (
          <div key={c.id} onClick={clickable ? () => onColabClick(c) : undefined} style={{cursor: clickable?'pointer':'default',padding: clickable?'4px 6px':0,margin:clickable?'-4px -6px':0,borderRadius:4,transition:'background .12s'}}
            onMouseEnter={clickable ? (e)=>e.currentTarget.style.background='var(--paper-sunk)' : undefined}
            onMouseLeave={clickable ? (e)=>e.currentTarget.style.background='transparent' : undefined}
          >
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:3,fontSize:11.5,gap:8}}>
              <span style={{color:'var(--ink-1)',fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                <span style={{color:'var(--ink-3)',fontWeight:700,marginRight:6}}>{i+1}.</span>
                {c.nombre}{c.alias?` (${c.alias})`:''}
              </span>
              <span className="num" style={{color:'var(--ink-2)',whiteSpace:'nowrap'}}>
                <strong style={{color:'var(--ink-0)'}}>${Math.round(c.ventas).toLocaleString('es-MX')}</strong>
                <span style={{fontSize:10,color:'var(--ink-3)',marginLeft:6}}>{c.n} svc</span>
              </span>
            </div>
            <div style={{height:5,background:'var(--paper-sunk)',borderRadius:3,overflow:'hidden',marginBottom:2}}>
              <div style={{height:'100%',width:`${pct}%`,background:'var(--clay)',transition:'width .3s'}}/>
            </div>
            <div style={{fontSize:10,color:'var(--ink-3)',display:'flex',gap:10}} className="num">
              <span>Recibió ${Math.round(recibido).toLocaleString('es-MX')}</span>
              {c.ventasHechas > 0 && <span style={{color:'var(--ink-blue)'}}>+ {c.ventasHechas} ventas a otras</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Tabla top servicios ───
const TopServiciosTable = ({servicios, onServicioClick}) => {
  const clickable = typeof onServicioClick === 'function';
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 70px 90px 110px',gap:10,padding:'6px 8px',fontSize:10,fontWeight:700,color:'var(--ink-3)',letterSpacing:.4,textTransform:'uppercase',borderBottom:'1px solid var(--line-2)'}}>
        <div>Servicio</div>
        <div className="num" style={{textAlign:'right'}}>Veces</div>
        <div className="num" style={{textAlign:'right'}}>Ticket</div>
        <div className="num" style={{textAlign:'right'}}>Total</div>
      </div>
      {servicios.map(s => (
        <div key={s.label} onClick={clickable ? () => onServicioClick(s) : undefined} style={{display:'grid',gridTemplateColumns:'1fr 70px 90px 110px',gap:10,padding:'8px 8px',fontSize:12,alignItems:'center',borderBottom:'1px solid var(--line-2)',cursor:clickable?'pointer':'default',transition:'background .12s'}}
          onMouseEnter={clickable ? (e)=>e.currentTarget.style.background='var(--paper-sunk)' : undefined}
          onMouseLeave={clickable ? (e)=>e.currentTarget.style.background='transparent' : undefined}
        >
          <div style={{color:'var(--ink-0)',fontWeight:500}}>{s.label}</div>
          <div className="num" style={{textAlign:'right',color:'var(--ink-1)',fontWeight:600}}>{s.n}</div>
          <div className="num" style={{textAlign:'right',color:'var(--ink-2)'}}>${Math.round(s.ticketProm).toLocaleString('es-MX')}</div>
          <div className="num" style={{textAlign:'right',fontWeight:700,color:'var(--ink-0)',fontFamily:'var(--serif)',fontSize:13}}>${Math.round(s.total).toLocaleString('es-MX')}</div>
        </div>
      ))}
    </div>
  );
};

// ─── Drill-down modal: muestra detalle filtrado ───
const DrillDownModal = ({data, monedas, onClose}) => {
  if (!data) return null;
  const {titulo, items, columnas} = data;
  const fmt = (n) => '$' + Math.round(Number(n)||0).toLocaleString('es-MX');
  const esVentas = columnas === 'ventas';

  // Totales
  const totalMxn = items.reduce((a,x) => a + Number(esVentas ? x.precio_mxn : x.monto_mxn)||0, 0);

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'var(--paper)',borderRadius:14,width:'100%',maxWidth:980,maxHeight:'85vh',display:'flex',flexDirection:'column',overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{padding:'16px 20px',borderBottom:'1px solid var(--line-1)',display:'flex',alignItems:'center',gap:12}}>
          <div style={{flex:1}}>
            <div style={{fontFamily:'var(--serif)',fontSize:18,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.3}}>{titulo}</div>
            <div style={{fontSize:11.5,color:'var(--ink-3)',marginTop:2}}>{items.length} {items.length===1?'registro':'registros'} · Total: <strong>{fmt(totalMxn)}</strong> MXN</div>
          </div>
          <button onClick={onClose} style={{background:'transparent',border:'none',cursor:'pointer',width:32,height:32,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--ink-2)'}}>
            <Icon name="x" size={16}/>
          </button>
        </div>
        {/* Body: tabla */}
        <div style={{flex:1,overflowY:'auto',padding:12}}>
          {items.length === 0 ? (
            <div style={{padding:40,textAlign:'center',color:'var(--ink-3)',fontSize:13}}>Sin registros que mostrar</div>
          ) : esVentas ? (
            <DrillVentasTable items={items} monedas={monedas}/>
          ) : (
            <DrillGastosTable items={items} monedas={monedas}/>
          )}
        </div>
      </div>
    </div>
  );
};

const DrillVentasTable = ({items, monedas}) => {
  const symOf = (m) => monedas[m]?.simbolo || '$';
  return (
    <div style={{display:'flex',flexDirection:'column',gap:2}}>
      <div style={{display:'grid',gridTemplateColumns:'80px 1fr 130px 110px 100px 90px 100px',gap:10,padding:'6px 10px',fontSize:10,fontWeight:700,color:'var(--ink-3)',letterSpacing:.4,textTransform:'uppercase',borderBottom:'1px solid var(--line-2)',background:'var(--paper-sunk)'}}>
        <div>Fecha</div><div>Servicio</div><div>Colaboradora</div><div>Canal</div><div>Cuenta</div><div className="num" style={{textAlign:'right'}}>Precio</div><div className="num" style={{textAlign:'right'}}>Comisión</div>
      </div>
      {items.map(v => (
        <div key={v.id} style={{display:'grid',gridTemplateColumns:'80px 1fr 130px 110px 100px 90px 100px',gap:10,padding:'8px 10px',fontSize:12,alignItems:'center',borderBottom:'1px solid var(--line-2)'}}>
          <div className="num" style={{fontSize:11,color:'var(--ink-3)'}}>{v.fecha}</div>
          <div style={{color:'var(--ink-0)',fontWeight:600}}>{v.servicio}</div>
          <div style={{color:'var(--ink-1)'}}>{v.colaboradora_nombre}</div>
          <div style={{color:'var(--ink-2)'}}>{v.canal}</div>
          <div style={{color:'var(--ink-3)',fontSize:11}}>{v.cuenta} {v.moneda!=='MXN'?`(${v.moneda})`:''}</div>
          <div className="num" style={{textAlign:'right',color:'var(--ink-0)',fontWeight:600}}>{symOf(v.moneda)}{Number(v.precio).toLocaleString('es-MX')}</div>
          <div className="num" style={{textAlign:'right',color:'var(--clay)'}}>{symOf(v.moneda)}{Math.round(Number(v.comision_monto||0)+Number(v.comision_venta_monto||0)).toLocaleString('es-MX')}</div>
        </div>
      ))}
    </div>
  );
};

const DrillGastosTable = ({items, monedas}) => {
  const symOf = (m) => monedas[m]?.simbolo || '$';
  return (
    <div style={{display:'flex',flexDirection:'column',gap:2}}>
      <div style={{display:'grid',gridTemplateColumns:'80px 1fr 140px 120px 110px 100px',gap:10,padding:'6px 10px',fontSize:10,fontWeight:700,color:'var(--ink-3)',letterSpacing:.4,textTransform:'uppercase',borderBottom:'1px solid var(--line-2)',background:'var(--paper-sunk)'}}>
        <div>Fecha</div><div>Concepto</div><div>Categoría</div><div>Proveedor</div><div>Cuenta</div><div className="num" style={{textAlign:'right'}}>Monto</div>
      </div>
      {items.map(g => (
        <div key={g.id} style={{display:'grid',gridTemplateColumns:'80px 1fr 140px 120px 110px 100px',gap:10,padding:'8px 10px',fontSize:12,alignItems:'center',borderBottom:'1px solid var(--line-2)'}}>
          <div className="num" style={{fontSize:11,color:'var(--ink-3)'}}>{g.fecha}</div>
          <div style={{color:'var(--ink-0)',fontWeight:600}}>{g.concepto}</div>
          <div style={{color:'var(--ink-2)'}}>{g.categoria}</div>
          <div style={{color:'var(--ink-2)'}}>{g.proveedor || '—'}</div>
          <div style={{color:'var(--ink-3)',fontSize:11}}>{g.cuenta} {g.moneda!=='MXN'?`(${g.moneda})`:''}</div>
          <div className="num" style={{textAlign:'right',color:'#b73f5e',fontWeight:600}}>{symOf(g.moneda)}{Number(g.monto).toLocaleString('es-MX')}</div>
        </div>
      ))}
    </div>
  );
};

// ─── Ranking por encargada ───
const RankingEncargadas = ({encargadas}) => {
  const max = Math.max(...encargadas.map(e => e.ventas));
  return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      {encargadas.map((e, i) => {
        const pct = max > 0 ? (e.ventas / max) * 100 : 0;
        const colors = ['var(--clay)','var(--moss)','var(--ink-blue)','#d4537e','#534ab7','#b07228'];
        const color = colors[i % colors.length];
        return (
          <div key={e.id}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:3,gap:8,fontSize:12}}>
              <span style={{color:'var(--ink-1)',fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                <span style={{color:'var(--ink-3)',fontWeight:700,marginRight:6}}>{i+1}.</span>
                {e.nombre}
              </span>
              <span className="num" style={{whiteSpace:'nowrap'}}>
                <strong style={{color:'var(--ink-0)'}}>${Math.round(e.ventas).toLocaleString('es-MX')}</strong>
                <span style={{fontSize:10.5,color:'var(--ink-3)',marginLeft:6}}>{e.nTurnos} turnos</span>
              </span>
            </div>
            <div style={{height:6,background:'var(--paper-sunk)',borderRadius:3,overflow:'hidden',marginBottom:3}}>
              <div style={{height:'100%',width:`${pct}%`,background:color,transition:'width .3s'}}/>
            </div>
            <div style={{fontSize:10.5,color:'var(--ink-3)',display:'flex',justifyContent:'space-between',gap:10}} className="num">
              <span>Prom/turno <strong style={{color:'var(--ink-2)'}}>${Math.round(e.promedioPorTurno).toLocaleString('es-MX')}</strong></span>
              <span>{e.nServicios} servicios · Neto spa <strong style={{color:'var(--moss)'}}>${Math.round(e.neto).toLocaleString('es-MX')}</strong></span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Tabla turnos del periodo ───
const TurnosTable = ({turnos, arqueos, monedas}) => {
  // Mapear arqueos por turno_id
  const arqByTurno = React.useMemo(() => {
    const m = {};
    arqueos.forEach(a => {
      if (!m[a.turno_id]) m[a.turno_id] = [];
      m[a.turno_id].push(a);
    });
    return m;
  }, [arqueos]);

  const formatFecha = (iso) => {
    const d = new Date(iso + 'T00:00:00');
    const dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]}`;
  };

  const difEnMxn = (arqs) => {
    if (!arqs || arqs.length === 0) return null;
    const reps = arqs.filter(a => a.neto_reportado !== null);
    if (reps.length === 0) return {status:'parcial', monto:0};
    const suma = reps.reduce((s,a) => {
      const tc = Number(monedas[a.moneda]?.tc_a_mxn || 1);
      return s + Number(a.diferencia || 0) * tc;
    }, 0);
    if (Math.abs(suma) < 0.5) return {status:'cuadra', monto:0};
    return {status: suma > 0 ? 'sobra' : 'falta', monto: suma};
  };

  return (
    <div style={{maxHeight:360,overflowY:'auto'}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 100px 100px 80px',gap:8,padding:'6px 8px',fontSize:10,fontWeight:700,color:'var(--ink-3)',letterSpacing:.3,textTransform:'uppercase',borderBottom:'1px solid var(--line-2)',position:'sticky',top:0,background:'var(--paper-raised)'}}>
        <div>Fecha · encargada</div>
        <div className="num" style={{textAlign:'right'}}>Ventas</div>
        <div className="num" style={{textAlign:'right'}}>Neto</div>
        <div style={{textAlign:'right'}}>Arqueo</div>
      </div>
      {turnos.map(t => {
        const v = Number(t.total_mxn || 0);
        const c = Number(t.comisiones_mxn || 0) + Number(t.comisiones_venta_mxn || 0);
        const neto = v - c;
        const dif = difEnMxn(arqByTurno[t.id]);
        return (
          <div key={t.id} onClick={()=>navigate('turnos/pv/'+t.id)} style={{display:'grid',gridTemplateColumns:'1fr 100px 100px 80px',gap:8,padding:'9px 8px',fontSize:11.5,alignItems:'center',borderBottom:'1px solid var(--line-2)',cursor:'pointer'}}
            onMouseEnter={e=>e.currentTarget.style.background='var(--paper-sunk)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}
          >
            <div style={{minWidth:0}}>
              <div style={{color:'var(--ink-0)',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{formatFecha(t.fecha)} · {t.hora_inicio || '—'}</div>
              <div style={{fontSize:10,color:'var(--ink-3)',marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                {t.encargada_nombre || 'Sin encargado'} · {t.n_servicios || 0} svc · {t.estado}
              </div>
            </div>
            <div className="num" style={{textAlign:'right',color:'var(--ink-1)',fontWeight:600}}>${Math.round(v).toLocaleString('es-MX')}</div>
            <div className="num" style={{textAlign:'right',color:'var(--moss)',fontWeight:600}}>${Math.round(neto).toLocaleString('es-MX')}</div>
            <div style={{textAlign:'right',fontSize:10}}>
              {dif === null ? <span style={{color:'var(--ink-3)',fontStyle:'italic'}}>—</span>
                : dif.status==='parcial' ? <span style={{color:'var(--ink-3)',fontStyle:'italic'}}>parcial</span>
                : dif.status==='cuadra' ? <span style={{color:'var(--moss)',fontWeight:700}}>✓</span>
                : dif.status==='sobra' ? <span style={{color:'var(--moss)',fontWeight:700}}>+${Math.round(dif.monto).toLocaleString('es-MX')}</span>
                : <span style={{color:'#b73f5e',fontWeight:700}}>−${Math.round(Math.abs(dif.monto)).toLocaleString('es-MX')}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Chart: Tendencia 6 meses (3 líneas) ───
const ChartTendencia = ({datos}) => {
  const canvasRef = React.useRef(null);
  const chartRef = React.useRef(null);
  React.useEffect(() => {
    if (!window.Chart || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (chartRef.current) chartRef.current.destroy();
    const labels = datos.map(m => {
      const [y, mes] = m.mes.split('-');
      const nombres = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
      return `${nombres[parseInt(mes)-1]} ${y.slice(2)}`;
    });
    chartRef.current = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {label:'Ventas',    data: datos.map(m=>m.ventas),   borderColor:'rgb(107,125,74)',   backgroundColor:'rgba(107,125,74,.08)',  tension:.3, fill:true, borderWidth:2.5, pointRadius:4, pointHoverRadius:6},
          {label:'Gastos',    data: datos.map(m=>m.gastos),   borderColor:'rgb(183,63,94)',    backgroundColor:'rgba(183,63,94,.08)',   tension:.3, fill:true, borderWidth:2.5, pointRadius:4, pointHoverRadius:6},
          {label:'Neto spa',  data: datos.map(m=>m.neto),     borderColor:'rgb(212,131,74)',   backgroundColor:'transparent',           tension:.3, fill:false, borderWidth:2.5, pointRadius:4, pointHoverRadius:6, borderDash:[6,3]},
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: {position:'top',align:'end',labels:{font:{family:'Geist',size:11},boxWidth:12,boxHeight:12,usePointStyle:true}},
          tooltip: {callbacks:{label:(c)=>`${c.dataset.label}: $${c.parsed.y.toLocaleString('es-MX',{maximumFractionDigits:0})}`}},
        },
        scales: {
          x: {grid:{display:false},ticks:{font:{family:'Geist',size:10},color:'#8a857e'}},
          y: {grid:{color:'#ece7df'},ticks:{font:{family:'Geist',size:10},color:'#8a857e',callback:v=>'$'+Number(v).toLocaleString('es-MX',{maximumFractionDigits:0})}},
        },
      },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [datos]);
  return <canvas ref={canvasRef}/>;
};

// ─── KPI card con delta opcional ───
const KpiCard = ({label, value, color, sub, big, signed, delta, deltaInverted}) => {
  const fmt = (n) => {
    const abs = Math.abs(n);
    const prefix = signed && n < 0 ? '−' : (signed && n > 0 ? '+' : '');
    return `${prefix}$${Math.round(abs).toLocaleString('es-MX')}`;
  };
  // Delta: si deltaInverted, bajar es bueno (gastos menores)
  let deltaNode = null;
  if (delta !== null && delta !== undefined && !isNaN(delta)) {
    const positivo = delta >= 0;
    const esBueno = deltaInverted ? !positivo : positivo;
    const color = esBueno ? 'var(--moss)' : '#b73f5e';
    const arrow = positivo ? '▲' : '▼';
    deltaNode = (
      <span style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:10.5,color,fontWeight:600}}>
        {arrow} {Math.abs(delta).toFixed(1)}%
      </span>
    );
  }
  return (
    <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,padding:'14px 16px'}}>
      <div style={{fontSize:10.5,fontWeight:700,letterSpacing:.5,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:6,display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
        <span>{label}</span>
        {deltaNode}
      </div>
      <div className="num" style={{fontFamily:'var(--serif)',fontSize:big?26:22,fontWeight:600,color,letterSpacing:-.4,lineHeight:1.1}}>
        {fmt(value)}
      </div>
      {sub && <div style={{fontSize:10.5,color:'var(--ink-3)',marginTop:4}}>{sub}</div>}
    </div>
  );
};

// ─── Tabla flujo de caja por cuenta ───
const FlujoCuentaTable = ({cuentas, monedas, onDrill}) => {
  if (cuentas.length === 0) return <div style={{padding:20,textAlign:'center',color:'var(--ink-3)',fontSize:12}}>Sin movimientos en este periodo</div>;
  const symOf = (m) => monedas[m]?.simbolo || '$';
  return (
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      <div style={{display:'grid',gridTemplateColumns:'1.5fr 80px 1fr 1fr 1fr 1fr',gap:10,padding:'6px 10px',fontSize:10,fontWeight:700,color:'var(--ink-3)',letterSpacing:.4,textTransform:'uppercase',borderBottom:'1px solid var(--line-2)'}}>
        <div>Cuenta</div><div>Mon</div><div className="num" style={{textAlign:'right'}}>Ingresos</div><div className="num" style={{textAlign:'right'}}>Comisiones</div><div className="num" style={{textAlign:'right'}}>Gastos</div><div className="num" style={{textAlign:'right'}}>Balance</div>
      </div>
      {cuentas.map(c => {
        const sym = symOf(c.moneda);
        const fmt = (n) => sym + Math.round(Math.abs(n)).toLocaleString('es-MX');
        const clickable = typeof onDrill === 'function';
        const cellClickStyle = (hasData) => clickable && hasData ? {cursor:'pointer',textDecoration:'underline dotted var(--ink-3)',textUnderlineOffset:2} : {};
        return (
          <div key={c.id} style={{display:'grid',gridTemplateColumns:'1.5fr 80px 1fr 1fr 1fr 1fr',gap:10,padding:'8px 10px',fontSize:12,alignItems:'center',borderRadius:6,background:'var(--paper)'}}>
            <div>
              <div style={{fontWeight:600,color:'var(--ink-0)'}}>{c.label}</div>
              <div style={{fontSize:10,color:'var(--ink-3)',textTransform:'capitalize'}}>{c.tipo}</div>
            </div>
            <div style={{fontSize:10,fontFamily:'var(--mono)',color:'var(--ink-3)',letterSpacing:.3}}>{c.moneda}</div>
            <div className="num" onClick={clickable && c.n_ventas > 0 ? ()=>onDrill(c, 'ingresos') : undefined} style={{textAlign:'right',color:'var(--ink-1)',fontWeight:600,...cellClickStyle(c.n_ventas > 0)}} title={c.n_ventas > 0 ? `${c.n_ventas} ventas — click para ver detalle` : ''}>{c.n_ventas > 0 ? '+' + fmt(c.ingresos) : '—'}</div>
            <div className="num" style={{textAlign:'right',color:c.comisiones > 0 ? 'var(--clay)' : 'var(--ink-3)'}}>{c.comisiones > 0 ? '−' + fmt(c.comisiones) : '—'}</div>
            <div className="num" onClick={clickable && c.n_gastos > 0 ? ()=>onDrill(c, 'gastos') : undefined} style={{textAlign:'right',color:c.gastos > 0 ? '#b73f5e' : 'var(--ink-3)',...cellClickStyle(c.n_gastos > 0)}} title={c.n_gastos > 0 ? `${c.n_gastos} gastos — click para ver detalle` : ''}>{c.gastos > 0 ? '−' + fmt(c.gastos) : '—'}</div>
            <div className="num" style={{textAlign:'right',fontWeight:700,color:c.balance >= 0 ? 'var(--moss)' : '#b73f5e',fontFamily:'var(--serif)',fontSize:13}}>{c.balance >= 0 ? '' : '−'}{fmt(c.balance)}</div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Breakdown card con barras horizontales ───
const BreakdownCard = ({titulo, items, total, variant, flush, onItemClick}) => {
  const COLORS = {
    canal: ['#d4834a','#6b7d4a','#378add','#d4537e','#534ab7','#b07228'],
    cat:   ['#d4537e','#d4834a','#b07228','#6b7d4a','#534ab7','#378add'],
  };
  const colors = COLORS[variant] || COLORS.canal;
  return (
    <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:18}}>
      <div style={{fontFamily:'var(--serif)',fontSize:15,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2,marginBottom:12}}>{titulo}</div>
      {items.length === 0 ? (
        <div style={{padding:20,textAlign:'center',color:'var(--ink-3)',fontSize:12}}>Sin datos en este periodo</div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {items.slice(0,8).map((it, i) => {
            const pct = total > 0 ? (it.total / total) * 100 : 0;
            const color = colors[i % colors.length];
            const clickable = typeof onItemClick === 'function';
            return (
              <div key={it.label} onClick={clickable ? () => onItemClick(it) : undefined} style={{cursor: clickable ? 'pointer' : 'default', padding: clickable ? '2px 4px' : 0, margin: clickable ? '-2px -4px' : 0, borderRadius: 4, transition: 'background .12s'}}
                onMouseEnter={clickable ? (e)=>e.currentTarget.style.background='var(--paper-sunk)' : undefined}
                onMouseLeave={clickable ? (e)=>e.currentTarget.style.background='transparent' : undefined}
              >
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:3,fontSize:11.5}}>
                  <span style={{color:'var(--ink-1)',fontWeight:500}}>{it.label}</span>
                  <span className="num" style={{color:'var(--ink-2)'}}>
                    <strong style={{color:'var(--ink-0)'}}>${Math.round(it.total).toLocaleString('es-MX')}</strong>
                    <span style={{color:'var(--ink-3)',fontSize:10.5,marginLeft:6}}>{pct.toFixed(1)}%</span>
                  </span>
                </div>
                <div style={{height:6,background:'var(--paper-sunk)',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pct}%`,background:color,transition:'width .3s'}}/>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Chart: Ventas vs Gastos diarios ───
const ChartDaily = ({serie}) => {
  const canvasRef = React.useRef(null);
  const chartRef  = React.useRef(null);

  React.useEffect(() => {
    if (!window.Chart || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    // Destruir chart previo
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels: serie.labels.map(f => {
          const d = new Date(f + 'T00:00:00');
          return d.toLocaleDateString('es-MX',{day:'numeric',month:'short'});
        }),
        datasets: [
          {label:'Ventas', data: serie.ventas, backgroundColor:'rgba(107, 125, 74, .85)', borderRadius:4},
          {label:'Gastos', data: serie.gastos, backgroundColor:'rgba(183, 63, 94, .85)', borderRadius:4},
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {position:'top',align:'end',labels:{font:{family:'Geist',size:11},boxWidth:12,boxHeight:12,usePointStyle:true,pointStyle:'rectRounded'}},
          tooltip: {callbacks:{label:(ctx)=>`${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString('es-MX',{maximumFractionDigits:0})}`}},
        },
        scales: {
          x: {grid:{display:false},ticks:{font:{family:'Geist',size:10},color:'#8a857e'}},
          y: {grid:{color:'#ece7df'},ticks:{font:{family:'Geist',size:10},color:'#8a857e',callback:v=>'$'+Number(v).toLocaleString('es-MX',{maximumFractionDigits:0})}},
        },
      },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [serie]);

  return <canvas ref={canvasRef}/>;
};

// ─── Sección Cálculo Fiscal Estimado ───
const FiscalSection = ({f}) => {
  const fmt = (n, signed = false) => {
    const abs = Math.abs(n);
    const prefix = signed && n < 0 ? '−' : (signed && n > 0 ? '+' : '');
    return `${prefix}$${Math.round(abs).toLocaleString('es-MX')}`;
  };
  const regimenLabel = {
    resico_pm: 'RESICO PM', rgl: 'Régimen General', resico_pf: 'RESICO PF',
    pfae: 'PF Actividad Empresarial', custom: 'Custom',
  }[f.cfg.regimen] || 'Sin régimen';

  return (
    <div style={{background:'linear-gradient(135deg, #fef9ef 0%, #fcecd9 100%)',border:'1px solid #ecd49a',borderRadius:14,padding:20,marginBottom:20}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14,gap:10,flexWrap:'wrap'}}>
        <div>
          <div style={{fontFamily:'var(--serif)',fontSize:17,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2,display:'flex',alignItems:'center',gap:10}}>
            <Icon name="shield" size={16} color="var(--clay)"/>
            Cálculo fiscal estimado
          </div>
          <div style={{fontSize:11,color:'#7a4e10',marginTop:4}}>{regimenLabel} · ISR {f.isrPct}% · {f.cfg.nombre_empresa || f.cfg.rfc || 'Sin nombre'}</div>
        </div>
        <div style={{fontSize:10,color:'#7a4e10',fontStyle:'italic',maxWidth:280,textAlign:'right'}}>⚠ Estimado · no reemplaza asesoría contable</div>
      </div>

      {/* Grid: IVA + ISR lado a lado */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',gap:14,marginBottom:14}}>
        {/* Cuadro IVA */}
        <div style={{background:'rgba(254,253,249,.85)',borderRadius:10,padding:'14px 16px',border:'1px solid #ecd49a'}}>
          <div style={{fontSize:10.5,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--clay)',marginBottom:10}}>IVA</div>
          <FilaFiscal label="Ventas gravadas (fiscales)" val={`+${fmt(f.ventasGravadasMxn)}`} muted/>
          <FilaFiscal label={`IVA cobrado (${f.cfg.iva_pct_default}%)`} val={`+${fmt(f.ivaCobrado)}`} color="var(--moss)"/>
          <FilaFiscal label="IVA acreditable (gastos fact.)" val={`−${fmt(f.ivaAcreditable)}`} color="var(--clay)"/>
          <div style={{borderTop:'1.5px solid #ecd49a',marginTop:8,paddingTop:8,display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
            <span style={{fontSize:11,fontWeight:700,letterSpacing:.4,textTransform:'uppercase',color:'var(--ink-1)'}}>{f.ivaAPagar >= 0 ? 'IVA a pagar al SAT' : 'IVA a favor'}</span>
            <span className="num" style={{fontFamily:'var(--serif)',fontSize:20,fontWeight:700,color: f.ivaAPagar >= 0 ? '#b73f5e' : 'var(--moss)'}}>{fmt(Math.abs(f.ivaAPagar))}</span>
          </div>
        </div>

        {/* Cuadro ISR */}
        <div style={{background:'rgba(254,253,249,.85)',borderRadius:10,padding:'14px 16px',border:'1px solid #ecd49a'}}>
          <div style={{fontSize:10.5,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--clay)',marginBottom:10}}>ISR</div>
          <FilaFiscal label="Base gravable (ventas − IVA)" val={`+${fmt(f.ventasGravadasSinIva)}`} muted/>
          <FilaFiscal label="Gastos deducibles (sin IVA)" val={`−${fmt(f.gastosFactSinIva)}`} color="var(--clay)"/>
          <FilaFiscal label="Utilidad fiscal" val={fmt(f.utilidadFiscal)} bold/>
          <div style={{borderTop:'1.5px solid #ecd49a',marginTop:8,paddingTop:8,display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
            <span style={{fontSize:11,fontWeight:700,letterSpacing:.4,textTransform:'uppercase',color:'var(--ink-1)'}}>ISR estimado ({f.isrPct}%)</span>
            <span className="num" style={{fontFamily:'var(--serif)',fontSize:20,fontWeight:700,color:'#b73f5e'}}>{fmt(f.isrEstimado)}</span>
          </div>
        </div>
      </div>

      {/* Utilidad real */}
      <div style={{background:'rgba(107,125,74,.1)',border:'1.5px solid var(--moss)',borderRadius:10,padding:'14px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:.5,textTransform:'uppercase',color:'var(--moss)'}}>Utilidad real después de impuestos</div>
          <div style={{fontSize:11,color:'var(--ink-3)',marginTop:3}}>Neto contable {fmt(f.netoContable)} − IVA a pagar {fmt(Math.max(0,f.ivaAPagar))} − ISR {fmt(f.isrEstimado)}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div className="num" style={{fontFamily:'var(--serif)',fontSize:28,fontWeight:700,color:'var(--moss)',letterSpacing:-.6,lineHeight:1}}>{fmt(f.utilidadReal)}</div>
          {f.netoContable > 0 && (
            <div style={{fontSize:11,color:'var(--ink-3)',marginTop:4}}>
              {Math.round(f.utilidadReal / f.netoContable * 100)}% del neto contable · el resto se va en impuestos
            </div>
          )}
        </div>
      </div>

      {/* Comparativa rápida */}
      {f.ventasNoFiscalesMxn > 0 && (
        <div style={{marginTop:10,padding:'8px 12px',background:'rgba(255,255,255,.5)',borderRadius:6,fontSize:11,color:'#7a4e10',display:'flex',gap:14,flexWrap:'wrap'}}>
          <span>Ventas NO fiscales: <strong>{fmt(f.ventasNoFiscalesMxn)}</strong> (no se declaran)</span>
          {f.gastosNoFactMxn > 0 && <span>Gastos NO facturables: <strong>{fmt(f.gastosNoFactMxn)}</strong> (no deducibles)</span>}
        </div>
      )}
    </div>
  );
};

// Fila simple dentro de los cuadros fiscales
const FilaFiscal = ({label, val, color, muted, bold}) => (
  <div style={{display:'flex',justifyContent:'space-between',padding:'3px 0',fontSize:12.5}}>
    <span style={{color: muted ? 'var(--ink-3)' : 'var(--ink-2)'}}>{label}</span>
    <span className="num" style={{fontWeight:bold ? 700 : 600,color: color || (muted ? 'var(--ink-2)' : 'var(--ink-1)')}}>{val}</span>
  </div>
);

Object.assign(window, { Dashboard: DashboardFn, KpiCard, FlujoCuentaTable, BreakdownCard, ChartDaily, TopColabsTable, TopServiciosTable, ChartTendencia, DrillDownModal, DrillVentasTable, DrillGastosTable, RankingEncargadas, TurnosTable, FiscalSection, FilaFiscal });
