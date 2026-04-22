// Shared data + helpers for Gastos module — v2
// Modelo: concepto → categoría auto; cuenta → moneda fija

// Catálogo de CATEGORÍAS contables
const GASTO_CATEGORIAS = [
  {id:'fijos',       label:'Fijos',       tone:'blue',  desc:'Gastos recurrentes estables'},
  {id:'variables',   label:'Variables',   tone:'amber', desc:'Comisiones, servicios por uso'},
  {id:'operativos',  label:'Operativos',  tone:'moss',  desc:'Día a día del spa'},
  {id:'impuestos',   label:'Impuestos',   tone:'rose',  desc:'Obligaciones fiscales'},
  {id:'generico',    label:'Genérico',    tone:'neutral',desc:'Sin clasificar'},
];

// Catálogo de CONCEPTOS — cada uno ligado a una categoría fija
// El usuario elige concepto; la categoría es derivada.
const GASTO_CONCEPTOS = [
  // Fijos
  {id:'nomina_spa',  label:'NOMINA_SPA',     categoria:'fijos',      activo:true},
  {id:'renta',       label:'RENTA',          categoria:'fijos',      activo:true},
  {id:'luz',         label:'LUZ',            categoria:'fijos',      activo:true},
  {id:'agua',        label:'AGUA',           categoria:'fijos',      activo:true},
  {id:'internet',    label:'INTERNET',       categoria:'fijos',      activo:true},
  // Operativos
  {id:'lavanderia',  label:'LAVANDERIA',     categoria:'operativos', activo:true},
  {id:'4_nomina',    label:'4% NOMINA',      categoria:'operativos', activo:true},
  {id:'insumos',     label:'INSUMOS',        categoria:'operativos', activo:true},
  {id:'mantenimiento',label:'MANTENIMIENTO', categoria:'operativos', activo:true},
  {id:'otros_spa',   label:'OTROS_SPA',      categoria:'operativos', activo:true},
  // Variables
  {id:'comision_clip',label:'COMISION CLIP', categoria:'variables',  activo:true},
  {id:'comision_laura',label:'COMISION LAURA',categoria:'variables', activo:true},
  {id:'marketing',   label:'MARKETING',      categoria:'variables',  activo:true},
  // Impuestos
  {id:'isr',         label:'ISR',            categoria:'impuestos',  activo:true},
  {id:'imss',        label:'IMSS',           categoria:'impuestos',  activo:true},
];

// Proveedores — libres con autocomplete (histórico)
const GASTO_PROVEDORES = [
  'GOBIERNO ESTATAL','GENERICO','CLIP','LAURA','LAVANDERIA XCALACOCO',
  'CFE','TELMEX','AMAZON','HOME DEPOT','SAMS CLUB'
];

// Catálogo de CUENTAS — cada una con moneda fija
const GASTO_CUENTAS = [
  {id:'hsbc',       label:'HSBC',            tipo:'Banco',    moneda:'MXN', saldo: 148320, activo:true},
  {id:'santander',  label:'Santander',       tipo:'Banco',    moneda:'MXN', saldo:  92450, activo:true},
  {id:'efectivo_mx',label:'Efectivo MXN',    tipo:'Efectivo', moneda:'MXN', saldo:  15800, activo:true},
  {id:'efectivo_us',label:'Efectivo USD',    tipo:'Efectivo', moneda:'USD', saldo:    420, activo:true},
  {id:'efectivo_ca',label:'Efectivo CAD',    tipo:'Efectivo', moneda:'CAD', saldo:    180, activo:true},
  {id:'clip',       label:'CLIP',            tipo:'Terminal', moneda:'MXN', saldo:  24100, activo:true},
  {id:'laura',      label:'LAURA',           tipo:'Terceros', moneda:'MXN', saldo:      0, activo:true},
];

// Tipos de cambio actuales (dummy, en producción vendrán de la app)
const TC = {MXN:1, USD:23.00, CAD:17.00};

// Helper: obtener categoría de un concepto
const getCat = (conceptoId) => {
  const c = GASTO_CONCEPTOS.find(x=>x.id===conceptoId);
  return c ? GASTO_CATEGORIAS.find(k=>k.id===c.categoria) : GASTO_CATEGORIAS[4];
};
const getConcepto = (id) => GASTO_CONCEPTOS.find(x=>x.id===id);
const getCuenta = (id) => GASTO_CUENTAS.find(x=>x.id===id);

// Mock data — misma base, ahora con conceptoId y cuentaId
const GASTOS_DATA = [
  {id:1, fecha:'2026-02-28', conceptoId:'nomina_spa',    provedor:'LAURA',            cuentaId:'laura',        monto:1180,   nota:'Complemento de nómina Laura', comprobante:true},
  {id:2, fecha:'2026-02-28', conceptoId:'comision_clip', provedor:'CLIP',             cuentaId:'clip',         monto:3400,   nota:'Comisiones mes de febrero',   comprobante:true},
  {id:3, fecha:'2026-02-28', conceptoId:'comision_laura',provedor:'LAURA',            cuentaId:'laura',        monto:8848,   nota:'Comisión por venta del 4%',    comprobante:false},
  {id:4, fecha:'2026-02-24', conceptoId:'lavanderia',    provedor:'LAVANDERIA XCALACOCO',cuentaId:'hsbc',      monto:950,    nota:'Lavandería nota 900 + 50 tip', comprobante:true},
  {id:5, fecha:'2026-02-09', conceptoId:'4_nomina',      provedor:'GOBIERNO ESTATAL', cuentaId:'hsbc',         monto:887,    nota:'4% nómina',                    comprobante:true},
  {id:6, fecha:'2026-01-31', conceptoId:'comision_laura',provedor:'LAURA',            cuentaId:'laura',        monto:12400,  nota:'Comisión venta Laura',         comprobante:false},
  {id:7, fecha:'2026-01-31', conceptoId:'comision_clip', provedor:'CLIP',             cuentaId:'clip',         monto:7115,   nota:'5% comisión CLIP',             comprobante:true},
  {id:8, fecha:'2026-01-28', conceptoId:'lavanderia',    provedor:'LAVANDERIA XCALACOCO',cuentaId:'hsbc',      monto:900,    nota:'830 nota + 70 propina',        comprobante:true},
  {id:9, fecha:'2026-01-28', conceptoId:'lavanderia',    provedor:'LAVANDERIA XCALACOCO',cuentaId:'hsbc',      monto:1000,   nota:'940 lavado + 60 propina',      comprobante:true},
  {id:10,fecha:'2026-01-11', conceptoId:'4_nomina',      provedor:'GOBIERNO ESTATAL', cuentaId:'hsbc',         monto:1065,   nota:'4% nómina',                    comprobante:true},
  {id:11,fecha:'2026-01-05', conceptoId:'nomina_spa',    provedor:'LAURA',            cuentaId:'laura',        monto:234,    nota:'Complemento de sueldo',        comprobante:false},
  {id:12,fecha:'2025-12-31', conceptoId:'comision_laura',provedor:'LAURA',            cuentaId:'laura',        monto:10640,  nota:'Comisiones venta Laura dic',   comprobante:false},
  {id:13,fecha:'2025-12-31', conceptoId:'nomina_spa',    provedor:'LAURA',            cuentaId:'laura',        monto:2650,   nota:'Complemento de nómina',        comprobante:true},
  {id:14,fecha:'2025-12-26', conceptoId:'lavanderia',    provedor:'LAVANDERIA XCALACOCO',cuentaId:'hsbc',      monto:930,    nota:'',                             comprobante:true},
  {id:15,fecha:'2025-12-11', conceptoId:'lavanderia',    provedor:'LAVANDERIA XCALACOCO',cuentaId:'hsbc',      monto:650,    nota:'',                             comprobante:true},
  {id:16,fecha:'2025-12-05', conceptoId:'otros_spa',     provedor:'GENERICO',         cuentaId:'efectivo_mx',  monto:1925,   nota:'Alimentos y bebidas',          comprobante:false},
  {id:17,fecha:'2025-11-30', conceptoId:'otros_spa',     provedor:'GENERICO',         cuentaId:'efectivo_mx',  monto:2300,   nota:'',                             comprobante:false},
  {id:18,fecha:'2025-11-30', conceptoId:'nomina_spa',    provedor:'LAURA',            cuentaId:'laura',        monto:1950,   nota:'Complemento de nómina',        comprobante:true},
  {id:19,fecha:'2025-11-30', conceptoId:'nomina_spa',    provedor:'LAURA',            cuentaId:'laura',        monto:7000,   nota:'',                             comprobante:true},
  {id:20,fecha:'2025-11-14', conceptoId:'lavanderia',    provedor:'LAVANDERIA XCALACOCO',cuentaId:'hsbc',      monto:720,    nota:'670 + 50 tip',                 comprobante:true},
  {id:21,fecha:'2025-11-07', conceptoId:'4_nomina',      provedor:'GOBIERNO ESTATAL', cuentaId:'hsbc',         monto:718,    nota:'4% nómina',                    comprobante:true},
  {id:22,fecha:'2025-11-03', conceptoId:'lavanderia',    provedor:'LAVANDERIA XCALACOCO',cuentaId:'hsbc',      monto:570,    nota:'570 + 50 tip',                 comprobante:true},
  {id:23,fecha:'2025-10-31', conceptoId:'comision_clip', provedor:'CLIP',             cuentaId:'clip',         monto:5215,   nota:'Comisiones venta Laura',       comprobante:true},
  {id:24,fecha:'2025-10-31', conceptoId:'comision_clip', provedor:'CLIP',             cuentaId:'clip',         monto:2608,   nota:'',                             comprobante:true},
  {id:25,fecha:'2025-10-15', conceptoId:'lavanderia',    provedor:'LAVANDERIA XCALACOCO',cuentaId:'hsbc',      monto:800,    nota:'760 + 40 tip',                 comprobante:true},
  {id:26,fecha:'2025-10-12', conceptoId:'4_nomina',      provedor:'GOBIERNO ESTATAL', cuentaId:'hsbc',         monto:695,    nota:'4% nómina',                    comprobante:true},
];

// Derive for mock: moneda y total MXN a partir de cuenta
GASTOS_DATA.forEach(g=>{
  const c = getCuenta(g.cuentaId);
  g.moneda = c.moneda;
  g.tc = TC[c.moneda];
  g.totalMXN = g.monto * g.tc;
});

// Category color map (para gráficas)
const CAT_COLORS = {
  fijos:'var(--ink-blue)',
  variables:'var(--amber)',
  operativos:'var(--moss)',
  impuestos:'var(--rose)',
  generico:'var(--ink-4)'
};

const formatFecha = (iso) => {
  if(!iso) return '—';
  const [y,m,d] = iso.split('-');
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${parseInt(d)} ${meses[parseInt(m)-1]} ${y.slice(2)}`;
};
const formatFechaLarga = (iso) => {
  if(!iso) return '—';
  const [y,m,d] = iso.split('-');
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${parseInt(d)} de ${meses[parseInt(m)-1]} de ${y}`;
};

Object.assign(window,{GASTO_CATEGORIAS,GASTO_CONCEPTOS,GASTO_PROVEDORES,GASTO_CUENTAS,GASTOS_DATA,TC,CAT_COLORS,getCat,getConcepto,getCuenta,formatFecha,formatFechaLarga});
