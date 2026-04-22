// ──────────────────────────────────────────
// Recibo imprimible — componente oculto en pantalla, visible solo al imprimir
// Usado por fn-arqueo al click "Imprimir recibo"
// Diseño: carta vertical, 8pt body, firmas inline, cabe ~1 hoja
// ──────────────────────────────────────────

// Agrupa ventas por colaboradora (ejecutor + vendedora)
// Devuelve lista con: nombre, ejecutadas, vendidas, porMoneda {MXN: monto, ...}, firma, firmadoAt
const computeColabsPrint = (ventas, turnoColabs) => {
  const map = {};
  const ensure = (id, nombre, alias) => {
    if (!map[id]) map[id] = {
      id, nombre: nombre || 'Sin nombre', alias,
      ejecutadas: [], vendidas: [],
      porMoneda: {},
      firma: null, firmadoAt: null, pagado: false,
    };
  };
  ventas.forEach(v => {
    ensure(v.colaboradora_id, v.colaboradora_nombre, v.colaboradora_alias);
    map[v.colaboradora_id].ejecutadas.push(v);
    const m = v.moneda;
    map[v.colaboradora_id].porMoneda[m] = (map[v.colaboradora_id].porMoneda[m] || 0) + Number(v.comision_monto||0) + Number(v.propina||0);

    if (v.vendedora_id && v.vendedora_id !== v.colaboradora_id) {
      ensure(v.vendedora_id, v.vendedora_nombre, v.vendedora_alias);
      map[v.vendedora_id].vendidas.push(v);
      map[v.vendedora_id].porMoneda[m] = (map[v.vendedora_id].porMoneda[m] || 0) + Number(v.comision_venta_monto||0);
    }
  });
  turnoColabs.forEach(tc => {
    if (map[tc.colaboradora_id]) {
      map[tc.colaboradora_id].firma     = tc.firma_data_url;
      map[tc.colaboradora_id].firmadoAt = tc.firmado_at;
      map[tc.colaboradora_id].pagado    = !!tc.comision_pagada_at;
    }
  });
  return Object.values(map).sort((a,b) => a.nombre.localeCompare(b.nombre));
};

const ReciboPrintable = ({turno, ventas, porCuenta, turnoColabs, monedas, reportados, notas, totales}) => {
  const colabsInfo = computeColabsPrint(ventas, turnoColabs);
  const symOf = (m) => monedas[m]?.simbolo || '$';
  const fmt   = (n, dec=0) => Number(n).toLocaleString('es-MX', {minimumFractionDigits:dec, maximumFractionDigits:dec});
  const fmt2  = (n) => fmt(n, 2);

  const fechaFmt = (() => {
    const d = new Date(turno.fecha + 'T00:00:00');
    return d.toLocaleDateString('es-MX', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  })();
  const nowFmt = new Date().toLocaleString('es-MX', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});

  return (
    <>
      <style>{`
        @media screen {
          .print-recibo-root { display: none !important; }
        }
        @media print {
          @page { size: letter; margin: 0.5cm; }
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden; }
          .print-recibo-root, .print-recibo-root * { visibility: visible; }
          .print-recibo-root { position: absolute; left: 0; top: 0; width: 100%; padding: 0 8pt; box-sizing: border-box; }
        }
        .print-recibo-root { font-family: Georgia, 'Times New Roman', serif; font-size: 8pt; line-height: 1.3; color: #000; }
        .pr-head { text-align: center; margin-bottom: 6pt; padding-bottom: 4pt; border-bottom: 1.5pt solid #000; }
        .pr-head h1 { margin: 0 0 2pt; font-size: 13pt; letter-spacing: 0.5pt; font-family: Georgia, serif; }
        .pr-head .pr-sub { font-size: 8pt; color: #000; }
        .pr-head .pr-meta { font-size: 7.5pt; color: #333; margin-top: 2pt; }
        .pr-section { margin-top: 5pt; }
        .pr-section > h2 { font-size: 8.5pt; margin: 0 0 2pt; font-family: 'Arial Narrow', sans-serif; font-weight: bold; letter-spacing: 0.4pt; border-bottom: 0.5pt solid #666; padding-bottom: 1pt; }
        .pr-table { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
        .pr-table td, .pr-table th { padding: 1.5pt 4pt; text-align: left; vertical-align: top; }
        .pr-table th { font-weight: bold; background: #f0f0f0; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.3pt; }
        .pr-table .num { text-align: right; font-variant-numeric: tabular-nums; }
        .pr-table .total-row td { font-weight: bold; border-top: 1pt solid #000; }
        .pr-colab-row { border-bottom: 0.5pt solid #ccc; padding: 3pt 0; display: grid; grid-template-columns: 1.2fr 2fr 0.8fr 0.8fr; gap: 6pt; align-items: center; }
        .pr-colab-row:last-child { border-bottom: none; }
        .pr-colab-nombre { font-weight: bold; font-size: 8pt; }
        .pr-colab-alias { font-weight: normal; color: #555; font-size: 7pt; }
        .pr-colab-svcs { font-size: 7pt; color: #333; line-height: 1.35; }
        .pr-colab-recibe { font-size: 7.5pt; font-weight: bold; text-align: right; }
        .pr-firma-cell { text-align: center; }
        .pr-firma-img { max-height: 18pt; max-width: 100%; display: block; margin: 0 auto; border-bottom: 0.5pt solid #666; }
        .pr-firma-sin { font-size: 7pt; color: #999; font-style: italic; border-bottom: 0.5pt solid #999; padding-bottom: 1pt; }
        .pr-firma-meta { font-size: 6pt; color: #666; margin-top: 1pt; }
        .pr-notas { padding: 3pt 4pt; background: #fafafa; border: 0.5pt solid #ccc; font-size: 7.5pt; }
        .pr-firmas-manuales { margin-top: 14pt; display: grid; grid-template-columns: 1fr 1fr; gap: 20pt; padding: 0 10pt; }
        .pr-firma-block { text-align: center; }
        .pr-firma-line { border-bottom: 0.5pt solid #000; margin-bottom: 2pt; padding-top: 26pt; }
        .pr-firma-label { font-size: 7.5pt; font-weight: bold; }
        .pr-firma-hint { font-size: 6.5pt; color: #666; margin-top: 1pt; }
        .pr-footer { text-align: center; margin-top: 8pt; font-size: 6.5pt; color: #666; }
      `}</style>

      <div className="print-recibo-root">
        {/* Encabezado */}
        <div className="pr-head">
          <h1>XCALACOCO SPA</h1>
          <div className="pr-sub">Recibo de cierre de turno · #{String(turno.folio || '').padStart(4,'0')}</div>
          <div className="pr-meta" style={{textTransform:'capitalize'}}>{fechaFmt} · {turno.hora_inicio || '—'} {turno.hora_fin ? `→ ${turno.hora_fin}` : '(abierto)'} · Aperturó: {turno.encargada_nombre || '—'}</div>
        </div>

        {/* Totales */}
        <div className="pr-section">
          <h2>Totales (MXN equivalente)</h2>
          <table className="pr-table">
            <tbody>
              <tr><td>Ventas brutas</td><td className="num">${fmt2(totales.ventas)}</td></tr>
              <tr><td>Comisiones pagadas (terapeutas)</td><td className="num">− ${fmt2(totales.comisiones)}</td></tr>
              {totales.comVenta > 0 && <tr><td>Comisiones por venta (vendedoras)</td><td className="num">− ${fmt2(totales.comVenta)}</td></tr>}
              <tr><td>Propinas (100% al terapeuta)</td><td className="num">− ${fmt2(totales.propinas)}</td></tr>
              <tr className="total-row"><td>Neto al spa</td><td className="num">${fmt2(totales.neto)}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Arqueo por cuenta */}
        <div className="pr-section">
          <h2>Arqueo por cuenta</h2>
          <table className="pr-table">
            <thead>
              <tr>
                <th>Cuenta</th><th>Tipo</th><th>Mon</th>
                <th className="num">Esperado</th><th className="num">Reportado</th><th className="num">Dif</th>
              </tr>
            </thead>
            <tbody>
              {porCuenta.map(b => {
                const rep = reportados[b.cuenta_id];
                const repNum = rep !== '' && rep !== undefined && rep !== null ? parseFloat(rep) : null;
                const dif = repNum !== null && !isNaN(repNum) ? (repNum - b.netoEsperado) : null;
                const difFmt = dif === null ? '—' : (Math.abs(dif) < 0.01 ? '✓' : `${dif > 0 ? '+' : ''}${symOf(b.moneda)}${fmt2(Math.abs(dif))}`);
                return (
                  <tr key={b.cuenta_id}>
                    <td>{b.label}</td>
                    <td style={{textTransform:'capitalize'}}>{b.tipo}</td>
                    <td>{b.moneda}</td>
                    <td className="num">{symOf(b.moneda)}{fmt2(b.netoEsperado)}</td>
                    <td className="num">{repNum !== null && !isNaN(repNum) ? `${symOf(b.moneda)}${fmt2(repNum)}` : '—'}</td>
                    <td className="num" style={{color: dif === null ? '#999' : (Math.abs(dif) < 0.01 ? '#006400' : (dif > 0 ? '#006400' : '#8b0000'))}}>{difFmt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Por colaboradora (una fila cada una) */}
        <div className="pr-section">
          <h2>Desglose por colaboradora y recibo de comisión</h2>
          <div style={{border:'0.5pt solid #ccc',borderRadius:'1pt'}}>
            <div style={{display:'grid',gridTemplateColumns:'1.2fr 2fr 0.8fr 0.8fr',gap:'6pt',padding:'2pt 4pt',background:'#f0f0f0',fontSize:'6.5pt',fontWeight:'bold',textTransform:'uppercase',letterSpacing:'0.3pt'}}>
              <div>Colaboradora</div><div>Servicios</div><div style={{textAlign:'right'}}>Recibió</div><div style={{textAlign:'center'}}>Firma</div>
            </div>
            {colabsInfo.map(c => (
              <div key={c.id} className="pr-colab-row" style={{padding:'3pt 4pt'}}>
                <div>
                  <div className="pr-colab-nombre">{c.nombre}</div>
                  {c.alias && <div className="pr-colab-alias">{c.alias}</div>}
                  {c.pagado ? <div style={{fontSize:'6pt',color:'#006400'}}>✓ Pagada</div> : <div style={{fontSize:'6pt',color:'#8b0000'}}>Pendiente</div>}
                </div>
                <div className="pr-colab-svcs">
                  {c.ejecutadas.length > 0 && (
                    <div>
                      <b>Ejecutó:</b> {c.ejecutadas.map(v => `${v.servicio} ${v.canal?`(${v.canal})`:''} ${symOf(v.moneda)}${fmt(v.precio)}·${v.comision_pct}%`).join(' · ')}
                    </div>
                  )}
                  {c.vendidas.length > 0 && (
                    <div style={{marginTop:'1pt'}}>
                      <b>Vendió a otras:</b> {c.vendidas.map(v => `${v.servicio} → ${v.colaboradora_alias || v.colaboradora_nombre} ${symOf(v.moneda)}${fmt(v.precio)}·${v.comision_venta_pct}%`).join(' · ')}
                    </div>
                  )}
                </div>
                <div className="pr-colab-recibe">
                  {Object.entries(c.porMoneda).map(([m, total]) => (
                    <div key={m}>{m} {symOf(m)}{fmt2(total)}</div>
                  ))}
                </div>
                <div className="pr-firma-cell">
                  {c.firma ? (
                    <img className="pr-firma-img" src={c.firma} alt="firma"/>
                  ) : (
                    <div className="pr-firma-sin">Sin firmar</div>
                  )}
                  <div className="pr-firma-meta">
                    {c.firmadoAt ? new Date(c.firmadoAt).toLocaleString('es-MX',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notas si hay */}
        {notas && notas.trim() && (
          <div className="pr-section">
            <h2>Notas del turno</h2>
            <div className="pr-notas">{notas}</div>
          </div>
        )}

        {/* Firmas manuales al final */}
        <div className="pr-firmas-manuales">
          <div className="pr-firma-block">
            <div className="pr-firma-line"/>
            <div className="pr-firma-label">Encargada del turno</div>
            <div className="pr-firma-hint">Nombre y firma</div>
          </div>
          <div className="pr-firma-block">
            <div className="pr-firma-line"/>
            <div className="pr-firma-label">Recibió</div>
            <div className="pr-firma-hint">Nombre y firma</div>
          </div>
        </div>

        <div className="pr-footer">
          Impreso el {nowFmt} · CashFlow Spa
        </div>
      </div>
    </>
  );
};

Object.assign(window, { ReciboPrintable, computeColabsPrint });
