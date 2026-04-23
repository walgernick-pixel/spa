// ──────────────────────────────────────────
// Gastos · Nuevo / Editar — VERSIÓN FUNCIONAL conectada a Supabase
// Soporta: IVA opcional, split de pagos multi-cuenta, upload de comprobante
// Reemplaza GastosForm mock al cargarse después.
// ──────────────────────────────────────────

const GastosFormFn = ({gastoId, onCancel, onSave}) => {
  const editando = !!gastoId;

  // ── Catálogos ──
  const [catalogos, setCatalogos] = React.useState({conceptos:[], categorias:[], cuentas:[], monedas:{}, ivaTasas:[]});
  const [loadingCat, setLoadingCat] = React.useState(true);

  // ── Estado del form ──
  const [fecha, setFecha]         = React.useState(hoyISO());
  const [conceptoId, setConcepto] = React.useState('');
  const [proveedor, setProveedor] = React.useState('');
  const [cuentaId, setCuenta]     = React.useState('');
  const [monto, setMonto]         = React.useState('');
  const [esFacturable, setEF]     = React.useState(false);  // fiscal: si tiene factura
  const [ivaTasaId, setIvaTasa]   = React.useState('');  // id de iva_tasas, o 'custom', o 'manual', o ''
  const [ivaCustom, setIvaCustom] = React.useState('');  // si eligió custom, % escrito
  const [ivaManual, setIvaManual] = React.useState('');  // si eligió 'manual', monto directo en $
  const [descripcion, setDesc]    = React.useState('');
  const [notas, setNotas]         = React.useState('');
  const [file, setFile]           = React.useState(null);
  const [filePreview, setFilePrev]= React.useState(null);
  const [splits, setSplits]       = React.useState([]); // [{cuentaId, monto}, ...]
  const [showSplit, setShowSplit] = React.useState(false);

  // ── UI ──
  const [saving, setSaving]     = React.useState(false);
  const [proveedores, setProvs] = React.useState([]);

  // Cargar catálogos
  React.useEffect(()=>{
    (async () => {
      const [cc, ck, cu, cm, ci, cp] = await Promise.all([
        sb.from('conceptos_gasto').select('id,label,categoria,activo').eq('activo',true).order('label'),
        sb.from('categorias_gasto').select('id,label,tone,orden').order('orden'),
        sb.from('cuentas').select('id,label,tipo,moneda,activo,orden').eq('activo',true).order('orden'),
        sb.from('monedas').select('codigo,tc_a_mxn,simbolo'),
        sb.from('iva_tasas').select('*').eq('activo',true).order('orden'),
        // Proveedores únicos del histórico
        sb.from('v_gastos').select('proveedor').not('proveedor','is',null).limit(500),
      ]);
      const monedas = {};
      (cm.data||[]).forEach(m => monedas[m.codigo] = m);

      setCatalogos({
        conceptos: cc.data || [],
        categorias: ck.data || [],
        cuentas: cu.data || [],
        monedas,
        ivaTasas: ci.data || [],
      });

      // Proveedores únicos
      const unq = [...new Set((cp.data||[]).map(r=>r.proveedor).filter(Boolean))];
      setProvs(unq);

      // Defaults solo en modo nuevo
      if (!editando) {
        if (cc.data?.[0]) setConcepto(cc.data[0].id);
        if (cu.data?.[0]) setCuenta(cu.data[0].id);
        const def = (ci.data||[]).find(t=>t.es_default);
        if (def) setIvaTasa(def.id);
      }
      setLoadingCat(false);
    })();
  },[editando]);

  // Si edita, cargar el gasto existente
  React.useEffect(()=>{
    if (!editando || loadingCat) return;
    (async () => {
      const {data, error} = await sb.from('gastos').select('*').eq('id', gastoId).single();
      if (error) return notify('No se pudo cargar el gasto: '+error.message, 'err');
      setFecha(data.fecha);
      setConcepto(data.concepto_id);
      setProveedor(data.proveedor || '');
      setCuenta(data.cuenta_id);
      setMonto(String(data.monto));
      setDesc(data.descripcion || '');
      setNotas(data.notas || '');
      setEF(data.es_facturable ?? false);
      // IVA: preferir monto manual si existe
      if (data.iva_monto !== null && data.iva_monto !== undefined) {
        setIvaTasa('manual');
        setIvaManual(String(data.iva_monto));
      } else if (data.iva_pct !== null && data.iva_pct !== undefined) {
        const match = catalogos.ivaTasas.find(t => Number(t.porcentaje) === Number(data.iva_pct));
        if (match) setIvaTasa(match.id);
        else { setIvaTasa('custom'); setIvaCustom(String(data.iva_pct)); }
      }
      // Splits
      const {data: splitsData} = await sb.from('gasto_pagos').select('*').eq('gasto_id', gastoId).order('orden');
      if (splitsData && splitsData.length > 1) {
        setShowSplit(true);
        setSplits(splitsData.map(s => ({cuentaId: s.cuenta_id, monto: String(s.monto)})));
      }
    })();
    // eslint-disable-next-line
  },[editando, gastoId, loadingCat]);

  // Derivados
  const concepto  = catalogos.conceptos.find(c=>c.id===conceptoId);
  const categoria = concepto && catalogos.categorias.find(k=>k.id===concepto.categoria);
  const cuenta    = catalogos.cuentas.find(c=>c.id===cuentaId);
  const moneda    = cuenta && catalogos.monedas[cuenta.moneda];
  const tc        = moneda ? Number(moneda.tc_a_mxn) : 1;
  const montoNum  = parseFloat(monto) || 0;
  const montoMXN  = montoNum * tc;

  // IVA derivado
  const isManualIva = ivaTasaId === 'manual';
  const ivaManualNum = parseFloat(ivaManual) || 0;
  const ivaPctSelect = React.useMemo(()=>{
    if (!ivaTasaId || ivaTasaId === 'manual') return 0;
    if (ivaTasaId === 'custom') return parseFloat(ivaCustom) || 0;
    const t = catalogos.ivaTasas.find(x=>x.id===ivaTasaId);
    return t ? Number(t.porcentaje) : 0;
  },[ivaTasaId, ivaCustom, catalogos.ivaTasas]);

  // Si es manual, IVA importe = monto ingresado; si no, se deriva del %
  const ivaImporte = isManualIva
    ? Math.min(ivaManualNum, montoNum) // no puede ser mayor al monto
    : (ivaPctSelect > 0 ? montoNum - montoNum/(1+ivaPctSelect/100) : 0);
  const subtotal   = montoNum - ivaImporte;
  // % efectivo (para guardar en BD y reportar)
  const ivaPct = isManualIva
    ? (subtotal > 0 ? (ivaImporte / subtotal) * 100 : 0)
    : ivaPctSelect;

  // Sumas de splits
  const splitSum = splits.reduce((a,s)=>a+(parseFloat(s.monto)||0), 0);
  const splitDiff = montoNum - splitSum;

  // Preview del archivo
  const onFile = (f) => {
    setFile(f);
    if (!f) return setFilePrev(null);
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f);
      setFilePrev({type:'image', url, name:f.name});
    } else {
      setFilePrev({type:'file', name:f.name, size:f.size});
    }
  };

  // Gestión de splits
  const agregarSplit = () => {
    if (splits.length === 0) {
      // Primer split: convertir el gasto normal en split de 2 líneas
      setSplits([
        {cuentaId: cuentaId, monto: String(montoNum/2)},
        {cuentaId: catalogos.cuentas.find(c=>c.id!==cuentaId)?.id || cuentaId, monto: String(montoNum/2)},
      ]);
    } else {
      setSplits([...splits, {cuentaId: catalogos.cuentas[0]?.id, monto: ''}]);
    }
    setShowSplit(true);
  };
  const quitarSplit = (idx) => {
    const nuevos = splits.filter((_,i)=>i!==idx);
    if (nuevos.length <= 1) { setSplits([]); setShowSplit(false); }
    else setSplits(nuevos);
  };
  const updateSplit = (idx, field, val) => {
    const nuevos = [...splits];
    nuevos[idx] = {...nuevos[idx], [field]: val};
    setSplits(nuevos);
  };

  // ── Guardar ──
  const guardar = async (andNuevo=false) => {
    if (!conceptoId) return notify('Falta el concepto','err');
    if (!cuentaId)   return notify('Falta la cuenta','err');
    if (montoNum <= 0) return notify('El monto debe ser mayor a 0','err');
    if (showSplit && splits.length >= 2) {
      // Validar splits
      for (let i=0;i<splits.length;i++){
        if (!splits[i].cuentaId) return notify(`Falta cuenta en la línea ${i+1}`, 'err');
        if (!(parseFloat(splits[i].monto)>0)) return notify(`Monto inválido en la línea ${i+1}`, 'err');
      }
      if (Math.abs(splitDiff) > 0.01) return notify(`Los pagos no suman el total (${splitDiff>0?'faltan':'sobran'} $${Math.abs(splitDiff).toFixed(2)})`, 'err');
    }

    setSaving(true);

    // Upload comprobante si hay nuevo
    let comprobante_url = null;
    if (file) {
      const ext = file.name.split('.').pop();
      const path = `gastos/${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
      const {error: upErr} = await sb.storage.from('comprobantes').upload(path, file);
      if (upErr) {
        setSaving(false);
        return notify('Error subiendo comprobante: '+upErr.message,'err');
      }
      comprobante_url = path;
    }

    const payload = {
      fecha,
      concepto_id: conceptoId,
      proveedor: proveedor.trim() || null,
      cuenta_id: (showSplit && splits.length>0) ? splits[0].cuentaId : cuentaId,
      monto: montoNum,
      moneda: (showSplit && splits.length>0)
        ? catalogos.cuentas.find(c=>c.id===splits[0].cuentaId)?.moneda || cuenta.moneda
        : cuenta.moneda,
      tc_momento: tc,
      es_facturable: esFacturable,
      iva_pct:   (esFacturable && ivaPct > 0) ? Number(ivaPct.toFixed(2)) : null,
      iva_monto: (esFacturable && isManualIva && ivaImporte > 0) ? Number(ivaImporte.toFixed(2)) : null,
      notas: notas.trim() || null,
      ...(comprobante_url ? {comprobante_url} : {}),
    };

    let gastoIdFinal;
    if (editando) {
      const {error} = await sb.from('gastos').update(payload).eq('id', gastoId);
      if (error) { setSaving(false); return notify('Error: '+error.message,'err'); }
      gastoIdFinal = gastoId;
      // Borrar splits viejos (se re-crean abajo)
      await sb.from('gasto_pagos').delete().eq('gasto_id', gastoId);
    } else {
      // Al crear nuevo, guardar quién lo capturó (perfil del admin/encargado logueado)
      const creadorId = window.__auth?.perfil?.id || null;
      const payloadCreate = { ...payload, ...(creadorId ? { creado_por: creadorId } : {}) };
      const {data, error} = await sb.from('gastos').insert(payloadCreate).select('id').single();
      if (error) { setSaving(false); return notify('Error: '+error.message,'err'); }
      gastoIdFinal = data.id;
    }

    // Insertar splits (solo si hay más de 1 línea)
    if (showSplit && splits.length >= 2) {
      const filas = splits.map((s,i)=>({
        gasto_id: gastoIdFinal,
        cuenta_id: s.cuentaId,
        monto: parseFloat(s.monto),
        orden: i,
      }));
      const {error: sErr} = await sb.from('gasto_pagos').insert(filas);
      if (sErr) notify('Gasto guardado pero falló el split: '+sErr.message, 'err');
    }

    // Historial
    await sb.from('gastos_historial').insert({
      gasto_id: gastoIdFinal,
      accion: editando ? 'editado' : 'creado',
      cambios: null,
    });

    setSaving(false);
    notify(editando ? 'Gasto actualizado' : 'Gasto registrado');

    if (andNuevo && !editando) {
      // Reset parcial
      setMonto(''); setDesc(''); setNotas(''); setProveedor('');
      setFile(null); setFilePrev(null); setSplits([]); setShowSplit(false);
    } else {
      onSave && onSave(gastoIdFinal);
    }
  };

  if (loadingCat) {
    return <div style={{padding:60,textAlign:'center',color:'var(--ink-3)',fontSize:13}}>Cargando…</div>;
  }

  // Validación: sin cuentas o sin conceptos
  if (catalogos.cuentas.length === 0 || catalogos.conceptos.length === 0) {
    return (
      <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',padding:40}}>
        <div style={{background:'var(--paper-raised)',border:'1px dashed var(--line-1)',borderRadius:12,padding:'40px 30px',textAlign:'center',maxWidth:480}}>
          <div style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:600,color:'var(--ink-0)',marginBottom:10}}>Falta configuración</div>
          <div style={{fontSize:13,color:'var(--ink-2)',marginBottom:18,lineHeight:1.5}}>
            {catalogos.cuentas.length===0 && <>No hay <strong>cuentas</strong> dadas de alta. </>}
            {catalogos.conceptos.length===0 && <>No hay <strong>conceptos</strong> dados de alta. </>}
            Configúralos antes de capturar el primer gasto.
          </div>
          <div style={{display:'flex',gap:10,justifyContent:'center'}}>
            {catalogos.cuentas.length===0 && <Btn variant="clay" size="md" onClick={()=>navigate('config/cuentas')}>Configurar cuentas</Btn>}
            {catalogos.conceptos.length===0 && <Btn variant="clay" size="md" onClick={()=>navigate('config/catalogo')}>Configurar conceptos</Btn>}
            <Btn variant="ghost" size="md" onClick={onCancel}>Cancelar</Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{width:'100%',height:'100%',display:'flex',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)'}}>
      {!window.__EMBEDDED__ && <Sidebar active="gastos"/>}
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        {/* Header */}
        <div style={{padding:'18px 36px',borderBottom:'1px solid var(--line-1)',background:'var(--paper-raised)',display:'flex',alignItems:'center',gap:14}}>
          <button onClick={onCancel} style={{background:'transparent',border:'none',display:'flex',alignItems:'center',gap:5,color:'var(--ink-2)',fontSize:13,cursor:'pointer',fontWeight:500,fontFamily:'inherit'}}>
            <Icon name="arrow-left" size={15}/> Gastos
          </button>
          <div style={{width:1,height:22,background:'var(--line-1)'}}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:500,letterSpacing:-.4,color:'var(--ink-0)',lineHeight:1}}>{editando?'Editar gasto':'Nuevo gasto'}</div>
            <div style={{fontSize:11,color:'var(--ink-3)',marginTop:4}}>Concepto define categoría · cuenta define moneda</div>
          </div>
          <Btn variant="ghost" size="md" onClick={onCancel} disabled={saving}>Cancelar</Btn>
          {!editando && <Btn variant="secondary" size="md" onClick={()=>guardar(true)} disabled={saving}>Guardar y nuevo</Btn>}
          <Btn variant="clay" size="md" icon="check" onClick={()=>guardar(false)} disabled={saving}>{saving?'Guardando…':(editando?'Guardar cambios':'Guardar gasto')}</Btn>
        </div>

        <div style={{flex:1,overflowY:'auto',background:'var(--paper)'}}>
          <div style={{maxWidth:1000,margin:'0 auto',padding:'32px 36px 80px',display:'grid',gridTemplateColumns:'1fr 320px',gap:24}}>
            <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:'26px 28px'}}>

              {/* Fecha + Concepto */}
              <div style={{display:'grid',gridTemplateColumns:'170px 1fr',gap:18,marginBottom:18}}>
                <F label="Fecha">
                  <div style={{position:'relative'}}>
                    <Icon name="calendar" size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--ink-3)',pointerEvents:'none'}}/>
                    <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} className="cf-input" style={{paddingLeft:34}}/>
                  </div>
                </F>
                <F label="Concepto" hint="La categoría se asigna automáticamente">
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <select className="cf-input" value={conceptoId} onChange={e=>setConcepto(e.target.value)} style={{flex:1}}>
                      {catalogos.categorias.map(kat=>{
                        const items = catalogos.conceptos.filter(c=>c.categoria===kat.id);
                        if (items.length===0) return null;
                        return (
                          <optgroup key={kat.id} label={kat.label}>
                            {items.map(c=>(<option key={c.id} value={c.id}>{c.label}</option>))}
                          </optgroup>
                        );
                      })}
                    </select>
                    {categoria && (
                      <Chip tone={categoria.tone} style={{fontSize:10,padding:'5px 10px'}}>
                        <Icon name="check" size={9} stroke={2.4}/>
                        {categoria.label}
                      </Chip>
                    )}
                  </div>
                </F>
              </div>

              {/* Proveedor + Cuenta */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,marginBottom:18}}>
                <F label="Proveedor" hint="Libre · con sugerencias">
                  <input list="provedores-fn" value={proveedor} onChange={e=>setProveedor(e.target.value)} placeholder="A quién se le paga" className="cf-input"/>
                  <datalist id="provedores-fn">
                    {proveedores.map(p=><option key={p} value={p}/>)}
                  </datalist>
                </F>
                <F label={showSplit ? 'Cuenta (ver división abajo)' : 'Cuenta'} hint="La moneda se deriva de la cuenta">
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <select className="cf-input" value={cuentaId} onChange={e=>setCuenta(e.target.value)} style={{flex:1,opacity:showSplit?.6:1}} disabled={showSplit}>
                      {catalogos.cuentas.map(c=>(
                        <option key={c.id} value={c.id}>{c.label} · {c.tipo} · {c.moneda}</option>
                      ))}
                    </select>
                    {cuenta && (
                      <Chip tone="neutral" style={{fontSize:10,padding:'5px 10px',fontFamily:'var(--mono)',letterSpacing:.5}}>
                        {cuenta.moneda}
                      </Chip>
                    )}
                  </div>
                </F>
              </div>

              {/* Monto + equivalente */}
              <div style={{display:'grid',gridTemplateColumns:(cuenta && cuenta.moneda==='MXN')?'1fr':'1fr 200px',gap:18,marginBottom:18,padding:'18px',background:'var(--paper-sunk)',borderRadius:10,border:'1px solid var(--line-2)'}}>
                <F label={`Monto total${cuenta?' en '+cuenta.moneda:''}`}>
                  <div style={{position:'relative'}}>
                    <span style={{position:'absolute',left:16,top:'50%',transform:'translateY(-50%)',fontFamily:'var(--serif)',fontSize:26,color:'var(--ink-3)',fontWeight:500}}>$</span>
                    <input type="number" step="0.01" min="0" value={monto} onChange={e=>setMonto(e.target.value)} placeholder="0.00" className="num" style={{width:'100%',padding:'14px 16px 14px 36px',fontSize:26,fontWeight:500,fontFamily:'var(--serif)',letterSpacing:-.3,border:'1px solid var(--line-1)',borderRadius:10,background:'var(--paper-raised)',color:'var(--ink-0)',textAlign:'right',boxSizing:'border-box'}}/>
                  </div>
                </F>
                {cuenta && cuenta.moneda!=='MXN' && (
                  <F label="Equivalente MXN" hint={`TC ${tc.toFixed(2)}`}>
                    <div className="num" style={{padding:'14px 16px',fontSize:18,fontFamily:'var(--serif)',fontWeight:500,color:'var(--ink-2)',background:'var(--paper-raised)',borderRadius:10,border:'1px solid var(--line-1)',textAlign:'right'}}>
                      ${montoMXN.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})}
                    </div>
                  </F>
                )}
              </div>

              {/* Facturable toggle */}
              <div style={{marginBottom:esFacturable?10:18,padding:'12px 14px',background:esFacturable?'var(--sand-100)':'var(--paper-sunk)',border:'1px solid '+(esFacturable?'#ecd49a':'var(--line-2)'),borderRadius:10}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  {typeof Toggle !== 'undefined' ? (
                    <Toggle checked={esFacturable} onChange={(v)=>{setEF(v); if(!v){setIvaTasa(''); setIvaCustom('');}}} size="sm"/>
                  ) : (
                    <input type="checkbox" checked={esFacturable} onChange={e=>{setEF(e.target.checked); if(!e.target.checked){setIvaTasa(''); setIvaCustom('');}}}/>
                  )}
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--ink-0)'}}>{esFacturable ? 'Gasto facturable' : 'Gasto no facturable'}</div>
                    <div style={{fontSize:11,color:'var(--ink-3)',marginTop:1}}>{esFacturable ? 'Captura el IVA — cuenta como IVA acreditable y deducible del ISR' : 'Sin factura · no aplica IVA acreditable'}</div>
                  </div>
                </div>
              </div>

              {/* IVA — solo cuando es facturable */}
              {esFacturable && (
              <div style={{marginBottom:18,padding:'14px 16px',background:'var(--paper-sunk)',border:'1px solid var(--line-2)',borderRadius:10}}>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:ivaPct>0?12:0,flexWrap:'wrap'}}>
                  <div style={{fontSize:11,fontWeight:600,color:'var(--ink-2)',letterSpacing:.2,textTransform:'uppercase'}}>IVA</div>
                  <select className="cf-input" value={ivaTasaId} onChange={e=>setIvaTasa(e.target.value)} style={{flex:'0 1 220px'}}>
                    <option value="">Sin IVA</option>
                    {catalogos.ivaTasas.map(t=>(<option key={t.id} value={t.id}>{t.label} ({t.porcentaje}%)</option>))}
                    <option value="custom">Otro porcentaje…</option>
                    <option value="manual">Monto manual…</option>
                  </select>
                  {ivaTasaId === 'custom' && (
                    <div style={{position:'relative',width:120}}>
                      <input type="number" step="0.01" min="0" max="100" value={ivaCustom} onChange={e=>setIvaCustom(e.target.value)} placeholder="0" className="cf-input" style={{paddingRight:24,textAlign:'right'}}/>
                      <span style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',fontSize:12,color:'var(--ink-3)'}}>%</span>
                    </div>
                  )}
                  {ivaTasaId === 'manual' && (
                    <div style={{position:'relative',width:140}}>
                      <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:12,color:'var(--ink-3)'}}>$</span>
                      <input type="number" step="0.01" min="0" value={ivaManual} onChange={e=>setIvaManual(e.target.value)} placeholder="0.00" className="cf-input num" style={{paddingLeft:22,textAlign:'right'}}/>
                    </div>
                  )}
                  <div style={{fontSize:11,color:'var(--ink-3)',marginLeft:'auto'}}>{ivaTasaId === 'manual' ? 'IVA exacto según factura' : 'Opcional · para factura'}</div>
                </div>
                {ivaPct > 0 && montoNum > 0 && (
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,paddingTop:12,borderTop:'1px dashed var(--line-1)'}}>
                    <div>
                      <div style={{fontSize:10,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:.3,marginBottom:3}}>Subtotal</div>
                      <div className="num" style={{fontSize:14,fontWeight:600,color:'var(--ink-1)'}}>${subtotal.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                    </div>
                    <div>
                      <div style={{fontSize:10,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:.3,marginBottom:3}}>IVA ({ivaPct}%)</div>
                      <div className="num" style={{fontSize:14,fontWeight:600,color:'var(--ink-1)'}}>${ivaImporte.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                    </div>
                    <div>
                      <div style={{fontSize:10,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:.3,marginBottom:3}}>Total</div>
                      <div className="num" style={{fontSize:14,fontWeight:700,color:'var(--ink-0)'}}>${montoNum.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* Split de pagos */}
              <div style={{marginBottom:18,padding:'14px 16px',background:showSplit?'var(--sand-100)':'var(--paper-sunk)',border:'1px solid '+(showSplit?'#ecd49a':'var(--line-2)'),borderRadius:10}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:showSplit?12:0}}>
                  <div style={{fontSize:11,fontWeight:600,color:'var(--ink-2)',letterSpacing:.2,textTransform:'uppercase'}}>División del pago</div>
                  <div style={{fontSize:11,color:'var(--ink-3)'}}>¿Pagaste con varias cuentas?</div>
                  <div style={{flex:1}}/>
                  {!showSplit ? (
                    <Btn variant="ghost" size="sm" icon="plus" onClick={agregarSplit}>Dividir pago</Btn>
                  ) : (
                    <button onClick={()=>{setShowSplit(false);setSplits([]);}} style={{background:'transparent',border:'none',fontSize:11,color:'var(--ink-3)',cursor:'pointer',fontFamily:'inherit',textDecoration:'underline',textUnderlineOffset:2}}>Quitar división</button>
                  )}
                </div>
                {showSplit && splits.map((s,i)=>(
                  <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 160px 34px',gap:10,alignItems:'center',marginBottom:8}}>
                    <select className="cf-input" value={s.cuentaId} onChange={e=>updateSplit(i,'cuentaId',e.target.value)}>
                      {catalogos.cuentas.map(c=>(<option key={c.id} value={c.id}>{c.label} · {c.moneda}</option>))}
                    </select>
                    <div style={{position:'relative'}}>
                      <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:12,color:'var(--ink-3)'}}>$</span>
                      <input type="number" step="0.01" min="0" value={s.monto} onChange={e=>updateSplit(i,'monto',e.target.value)} placeholder="0.00" className="cf-input num" style={{paddingLeft:22,textAlign:'right'}}/>
                    </div>
                    <button onClick={()=>quitarSplit(i)} style={{background:'transparent',border:'1px solid var(--line-1)',borderRadius:6,cursor:'pointer',width:32,height:32,color:'var(--ink-3)',display:'flex',alignItems:'center',justifyContent:'center'}} title="Quitar línea"><Icon name="trash" size={12}/></button>
                  </div>
                ))}
                {showSplit && (
                  <div style={{display:'flex',gap:14,alignItems:'center',paddingTop:10,marginTop:4,borderTop:'1px dashed var(--line-1)'}}>
                    <button onClick={()=>setSplits([...splits,{cuentaId: catalogos.cuentas[0]?.id,monto:''}])} style={{background:'transparent',border:'none',fontSize:11.5,color:'var(--clay)',cursor:'pointer',fontFamily:'inherit',fontWeight:600,display:'inline-flex',alignItems:'center',gap:4}}>
                      <Icon name="plus" size={11} stroke={2}/> Agregar otra cuenta
                    </button>
                    <div style={{flex:1}}/>
                    <div style={{fontSize:11,color:'var(--ink-3)'}}>
                      Suma pagos: <span className="num" style={{fontWeight:600,color:'var(--ink-1)'}}>${splitSum.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                      {' · Total gasto: '}
                      <span className="num" style={{fontWeight:600,color:'var(--ink-1)'}}>${montoNum.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                    </div>
                    <Chip tone={Math.abs(splitDiff)<0.01?'moss':'rose'} style={{fontSize:10}}>
                      {Math.abs(splitDiff)<0.01 ? '✓ Cuadra' : (splitDiff>0?`Faltan $${splitDiff.toFixed(2)}`:`Sobran $${Math.abs(splitDiff).toFixed(2)}`)}
                    </Chip>
                  </div>
                )}
              </div>

              {/* Notas */}
              <F label="Notas internas" hint="Referencia privada, no se exporta">
                <textarea value={notas} onChange={e=>setNotas(e.target.value)} rows={2} placeholder="Detalles adicionales, número de factura, etc." className="cf-input" style={{resize:'vertical',minHeight:58}}/>
              </F>
            </div>

            {/* Comprobante */}
            <div>
              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:18,position:'sticky',top:24}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                  <div style={{fontFamily:'var(--serif)',fontSize:15,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2}}>Comprobante</div>
                  <Chip tone="amber" style={{fontSize:9}}>Recomendado</Chip>
                </div>
                <div style={{fontSize:11,color:'var(--ink-3)',marginBottom:14,lineHeight:1.45}}>Foto del ticket, factura o PDF.</div>

                {!filePreview ? (
                  <label style={{display:'block',border:'1.5px dashed var(--line-1)',borderRadius:10,padding:'22px 14px',textAlign:'center',background:'var(--paper-sunk)',cursor:'pointer'}}>
                    <input type="file" accept="image/*,application/pdf" onChange={e=>onFile(e.target.files?.[0])} style={{display:'none'}}/>
                    <div style={{width:38,height:38,borderRadius:10,background:'var(--paper-raised)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px',color:'var(--clay)',border:'1px solid var(--line-1)'}}>
                      <Icon name="receipt" size={18} stroke={1.7}/>
                    </div>
                    <div style={{fontSize:12.5,fontWeight:600,color:'var(--ink-1)',marginBottom:2}}>Toca para adjuntar</div>
                    <div style={{fontSize:10.5,color:'var(--ink-3)'}}>imagen o PDF · máx 10MB</div>
                  </label>
                ) : filePreview.type==='image' ? (
                  <div style={{position:'relative',borderRadius:10,overflow:'hidden',border:'1px solid var(--line-1)'}}>
                    <img src={filePreview.url} alt="preview" style={{width:'100%',display:'block'}}/>
                    <button onClick={()=>onFile(null)} style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,.6)',color:'#fff',border:'none',borderRadius:6,padding:'4px 8px',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>Quitar</button>
                    <div style={{padding:'8px 10px',fontSize:11,color:'var(--ink-3)',borderTop:'1px solid var(--line-1)',background:'var(--paper-sunk)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{filePreview.name}</div>
                  </div>
                ) : (
                  <div style={{padding:'14px',border:'1px solid var(--line-1)',borderRadius:10,background:'var(--paper-sunk)',display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:36,height:36,borderRadius:8,background:'var(--paper-raised)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--ink-blue)'}}>
                      <Icon name="receipt" size={18}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:'var(--ink-1)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{filePreview.name}</div>
                      <div style={{fontSize:10,color:'var(--ink-3)'}}>{(filePreview.size/1024).toFixed(0)} KB</div>
                    </div>
                    <button onClick={()=>onFile(null)} style={{background:'transparent',border:'none',color:'var(--ink-3)',cursor:'pointer',fontSize:11,fontFamily:'inherit',textDecoration:'underline'}}>Quitar</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .cf-input{width:100%;padding:10px 12px;font-size:13px;border:1px solid var(--line-1);border-radius:8px;background:var(--paper-raised);color:var(--ink-1);font-family:inherit;letter-spacing:-.1px;box-sizing:border-box}
        .cf-input:focus{outline:none;border-color:var(--ink-2);box-shadow:0 0 0 3px rgba(32,28,22,.06)}
        select.cf-input{appearance:none;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238a857e' stroke-width='2' stroke-linecap='round'><path d='M6 9l6 6 6-6'/></svg>");background-repeat:no-repeat;background-position:right 10px center;padding-right:30px}
      `}</style>
    </div>
  );
};

Object.assign(window, { GastosForm: GastosFormFn });
