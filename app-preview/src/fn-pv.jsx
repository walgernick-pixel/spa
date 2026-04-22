// ──────────────────────────────────────────
// PV · Punto de Venta dentro del turno — VERSIÓN FUNCIONAL
// Reemplaza PVTurno mock. Lee turno_id del hash (turnos/pv/:id).
// ──────────────────────────────────────────

const PVTurnoFn = () => {
  // turno_id sale del hash: #turnos/pv/<id>
  const parts = (window.location.hash || '').replace(/^#\/?/, '').split('/');
  const turnoId = parts[2] || null;

  const [turno, setTurno]           = React.useState(null);
  const [ventas, setVentas]         = React.useState([]);
  const [servicios, setServicios]   = React.useState([]);
  const [canales, setCanales]       = React.useState([]);
  const [colabs, setColabs]         = React.useState([]);
  const [cuentas, setCuentas]       = React.useState([]);
  const [monedas, setMonedas]       = React.useState({});
  const [turnoColabs, setTurnoCol]  = React.useState([]);
  const [loading, setLoading]       = React.useState(true);
  const [modal, setModal]           = React.useState(null); // {tipo, data?}
  const [allBlocksOpen, setAllOpen] = React.useState(true);

  // Carga inicial
  const cargar = React.useCallback(async () => {
    if (!turnoId) { setLoading(false); return; }
    setLoading(true);
    const [t, v, s, ca, co, cu, mo, tc] = await Promise.all([
      sb.from('turnos').select('*').eq('id', turnoId).single(),
      sb.from('v_ventas').select('*').eq('turno_id', turnoId).order('creado',{ascending:false}),
      sb.from('servicios').select('*').eq('activo',true).order('orden').order('label'),
      sb.from('canales_venta').select('*').eq('activo',true).order('orden'),
      sb.from('colaboradoras').select('*').eq('activo',true).order('nombre'),
      sb.from('cuentas').select('*').eq('activo',true).order('orden'),
      sb.from('monedas').select('*'),
      sb.from('turno_colaboradoras').select('*').eq('turno_id', turnoId),
    ]);
    if (t.error) { notify('No se encontró el turno: '+t.error.message, 'err'); setLoading(false); return; }
    setTurno(t.data);
    setVentas(v.data || []);
    setServicios(s.data || []);
    setCanales(ca.data || []);
    setColabs(co.data || []);
    setCuentas(cu.data || []);
    const monMap = {}; (mo.data||[]).forEach(m => monMap[m.codigo] = m);
    setMonedas(monMap);
    setTurnoCol(tc.data || []);
    setLoading(false);
  }, [turnoId]);

  React.useEffect(()=>{ cargar(); }, [cargar]);

  // Borrar venta
  const borrarVenta = async (v) => {
    if (!confirmar(`¿Borrar el servicio de ${v.colaboradora_nombre} por $${Number(v.precio).toLocaleString('es-MX')}?`)) return;
    const {error} = await sb.from('ventas').update({eliminado: new Date().toISOString()}).eq('id', v.id);
    if (error) return notify('Error: '+error.message,'err');
    notify('Servicio borrado');
    cargar();
  };

  // Marcar/desmarcar pago de comisión (sin firma — la firma es acción aparte)
  const togglePago = async (colabId) => {
    const existing = turnoColabs.find(tc => tc.colaboradora_id === colabId);
    if (existing && existing.comision_pagada_at) {
      // DESMARCAR: borra pago Y firma (tendrá que volver a firmar)
      if (existing.firma_data_url) {
        if (!confirmar('Al desmarcar el pago también se borrará la firma. ¿Continuar?')) return;
      }
      const {error} = await sb.from('turno_colaboradoras').update({comision_pagada_at: null, firma_data_url: null, firmado_at: null}).eq('id', existing.id);
      if (error) return notify('Error: '+error.message,'err');
    } else if (existing) {
      const {error} = await sb.from('turno_colaboradoras').update({comision_pagada_at: new Date().toISOString()}).eq('id', existing.id);
      if (error) return notify('Error: '+error.message,'err');
    } else {
      const {error} = await sb.from('turno_colaboradoras').insert({turno_id: turnoId, colaboradora_id: colabId, comision_pagada_at: new Date().toISOString()});
      if (error) return notify('Error: '+error.message,'err');
    }
    cargar();
  };

  // Guardar la firma digital de una colaboradora
  const guardarFirma = async (colabId, dataUrl) => {
    const existing = turnoColabs.find(tc => tc.colaboradora_id === colabId);
    if (!existing) return notify('Primero marca como pagado','err');
    const {error} = await sb.from('turno_colaboradoras').update({
      firma_data_url: dataUrl,
      firmado_at: new Date().toISOString(),
    }).eq('id', existing.id);
    if (error) return notify('Error: '+error.message,'err');
    notify('Firma guardada ✓');
    cargar();
  };

  // Ir al arqueo (NO cierra el turno, solo navega)
  const irAArqueo = () => {
    navigate('turnos/arqueo/' + turnoId);
  };

  // Reabrir turno cerrado (solo admin — por ahora confirma con texto)
  const reabrirTurno = async () => {
    const pass = window.prompt('⚠️ REABRIR turno cerrado\n\nEsto permitirá agregar, editar o borrar servicios del turno nuevamente.\nSolo administradores deberían hacer esto.\n\nEscribe REABRIR (mayúsculas) para confirmar:');
    if (pass === null) return;
    if (pass.trim().toUpperCase() !== 'REABRIR') { notify('Confirmación incorrecta','err'); return; }
    const nuevaCuenta = (Number(turno.reaperturas)||0) + 1;
    const {error} = await sb.from('turnos').update({
      estado:'abierto', hora_fin:null, cerrado:null,
      reaperturas: nuevaCuenta, reabierto_at: new Date().toISOString(),
    }).eq('id', turnoId);
    if (error) return notify('Error: '+error.message,'err');
    notify('Turno reabierto');
    cargar();
  };

  // Agrupar ventas por colaboradora (como ejecutor O como vendedora)
  const ventasPorColab = React.useMemo(()=>{
    const map = {};
    const ensure = (id, nombre, alias) => {
      if (!map[id]) map[id] = {
        colaboradora_id: id,
        nombre: nombre || 'Sin nombre',
        alias: alias,
        ventasEjecutadas: [],
        ventasVendidas: [],
        totalMxn: 0,
        comisionEjecucionMxn: 0,
        comisionVentaMxn: 0,
        propinaMxn: 0,
      };
    };
    ventas.forEach(v => {
      // Como ejecutor
      ensure(v.colaboradora_id, v.colaboradora_nombre, v.colaboradora_alias);
      map[v.colaboradora_id].ventasEjecutadas.push(v);
      map[v.colaboradora_id].totalMxn              += Number(v.precio_mxn || 0);
      map[v.colaboradora_id].comisionEjecucionMxn  += Number(v.comision_mxn || 0);
      map[v.colaboradora_id].propinaMxn            += Number(v.propina_mxn || 0);
      // Como vendedor (solo si hay vendedora_id y es distinta al ejecutor)
      if (v.vendedora_id && v.vendedora_id !== v.colaboradora_id) {
        ensure(v.vendedora_id, v.vendedora_nombre, v.vendedora_alias);
        map[v.vendedora_id].ventasVendidas.push(v);
        map[v.vendedora_id].comisionVentaMxn += Number(v.comision_venta_mxn || 0);
      }
    });
    const list = Object.values(map);
    list.forEach(c => {
      const tc = turnoColabs.find(x => x.colaboradora_id === c.colaboradora_id);
      c.pagado = !!(tc && tc.comision_pagada_at);
      c.firmaDataUrl = tc?.firma_data_url || null;
      c.firmadoAt    = tc?.firmado_at || null;
      c.comisionMxn = c.comisionEjecucionMxn + c.comisionVentaMxn; // legacy alias para ColabBlock
    });
    return list.sort((a,b)=>a.nombre.localeCompare(b.nombre));
  },[ventas, turnoColabs]);

  // Set de ids de colabs ya pagadas — para bloquear modificaciones
  const colabsPagadasIds = React.useMemo(()=>
    turnoColabs.filter(tc => tc.comision_pagada_at).map(tc => tc.colaboradora_id),
  [turnoColabs]);

  // Totales del turno
  const totalVentasMxn      = ventas.reduce((a,v)=>a+Number(v.precio_mxn||0), 0);
  const totalComisionesMxn  = ventas.reduce((a,v)=>a+Number(v.comision_mxn||0), 0);
  const totalComVentaMxn    = ventas.reduce((a,v)=>a+Number(v.comision_venta_mxn||0), 0);
  const totalPropinasMxn    = ventas.reduce((a,v)=>a+Number(v.propina_mxn||0), 0);
  const netoSpaMxn          = totalVentasMxn - totalComisionesMxn - totalComVentaMxn;

  if (loading) return <div style={{padding:60,textAlign:'center',color:'var(--ink-3)',fontSize:13}}>Cargando turno…</div>;
  if (!turnoId || !turno) return (
    <div style={{padding:60,textAlign:'center'}}>
      <div style={{fontFamily:'var(--serif)',fontSize:22,color:'var(--ink-1)',marginBottom:10}}>Turno no encontrado</div>
      <Btn variant="secondary" onClick={()=>navigate('turnos')}>← Ir a la lista de turnos</Btn>
    </div>
  );

  const estadoTone = {abierto:'moss', cerrado:'neutral', parcial:'amber'}[turno.estado] || 'neutral';
  const estadoLabel= {abierto:'Abierto', cerrado:'Cerrado', parcial:'Parcial'}[turno.estado] || turno.estado;

  const fechaFmt = (() => {
    const d = new Date(turno.fecha + 'T00:00:00');
    return d.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'short',year:'numeric'});
  })();

  // Retroactivo: creado después de la fecha del turno
  const retro = turno.creado && turno.fecha && (new Date(turno.creado).toISOString().slice(0,10) > turno.fecha);
  const creadoFmt = turno.creado ? new Date(turno.creado).toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'}) : '';

  return (
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',fontFamily:'var(--sans)',background:'var(--paper)',overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'16px 32px',borderBottom:'1px solid var(--line-1)',background:'var(--paper-raised)',display:'flex',alignItems:'center',gap:16}}>
        <button onClick={()=>navigate('turnos')} style={{background:'transparent',border:'none',display:'flex',alignItems:'center',gap:5,color:'var(--ink-2)',fontSize:13,cursor:'pointer',fontWeight:500,fontFamily:'inherit'}}>
          <Icon name="arrow-left" size={15}/> Turnos
        </button>
        <div style={{width:1,height:22,background:'var(--line-1)'}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'baseline',gap:10,flexWrap:'wrap'}}>
            <div style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:500,letterSpacing:-.4,color:'var(--ink-0)',lineHeight:1,textTransform:'capitalize'}}>{fechaFmt}</div>
            <Chip tone={estadoTone}>
              <span style={{width:5,height:5,borderRadius:999,background:turno.estado==='abierto'?'var(--moss)':'var(--ink-3)'}}/>
              {estadoLabel} · {turno.hora_inicio || '—'}{turno.hora_fin ? ` → ${turno.hora_fin}` : ''}
            </Chip>
            {retro && <Chip tone="amber" title={`Creado el ${creadoFmt}`}><Icon name="calendar" size={9} stroke={2}/>Retroactivo · creado {creadoFmt}</Chip>}
            {turno.folio && <span style={{fontSize:11,color:'var(--ink-3)',fontFamily:'var(--mono)'}}>#{String(turno.folio).padStart(4,'0')}</span>}
          </div>
          <div style={{fontSize:11,color:'var(--ink-3)',marginTop:4}}>{ventas.length} {ventas.length===1?'servicio':'servicios'} · {ventasPorColab.length} {ventasPorColab.length===1?'colaboradora':'colaboradoras'}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:10,color:'var(--ink-3)',fontWeight:700,letterSpacing:.6,textTransform:'uppercase',marginBottom:4}}>Total turno</div>
          <Money amount={totalVentasMxn} size={24} weight={600}/>
        </div>
      </div>

      {/* Métricas rápidas */}
      <div style={{padding:'12px 32px',borderBottom:'1px solid var(--line-1)',background:'var(--paper-sunk)',display:'grid',gridTemplateColumns:`repeat(${totalComVentaMxn>0?5:4}, 1fr)`,gap:1}}>
        <QuickMetric lbl="Ventas" val={<Money amount={totalVentasMxn} size={15} weight={600}/>}/>
        <QuickMetric lbl="A terapeutas" val={<Money amount={totalComisionesMxn} size={15} weight={600} color="var(--clay)"/>}/>
        {totalComVentaMxn > 0 && <QuickMetric lbl="Comisión por venta" val={<Money amount={totalComVentaMxn} size={15} weight={600} color="var(--ink-blue)"/>}/>}
        <QuickMetric lbl="Propinas" val={<Money amount={totalPropinasMxn} size={15} weight={600} color="var(--ink-2)"/>} note="100% al terapeuta"/>
        <QuickMetric lbl="Neto al spa" val={<Money amount={netoSpaMxn} size={15} weight={700} color="var(--moss)"/>}/>
      </div>

      {/* Body */}
      <div style={{flex:1,overflowY:'auto',padding:'18px 32px 40px'}}>
        {/* Barra acción */}
        {turno.estado === 'abierto' && (
          <button onClick={()=>setModal({tipo:'venta-nueva'})} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'14px 16px',border:'1.5px dashed var(--clay)',borderRadius:10,background:'rgba(212,131,74,.08)',fontSize:14,color:'var(--clay)',cursor:'pointer',fontFamily:'inherit',fontWeight:600,marginBottom:14}}>
            <Icon name="plus" size={16} stroke={2}/> Agregar servicio vendido
          </button>
        )}

        {/* Toggle colapsar/expandir todos los bloques */}
        {ventasPorColab.length > 1 && (
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:8}}>
            <button onClick={()=>setAllOpen(!allBlocksOpen)} style={{background:'transparent',border:'1px solid var(--line-1)',borderRadius:6,padding:'5px 10px',fontSize:11,color:'var(--ink-2)',cursor:'pointer',fontFamily:'inherit',fontWeight:500,display:'flex',alignItems:'center',gap:6}}>
              <Icon name={allBlocksOpen?'chev-down':'chev-right'} size={11} color="var(--ink-3)"/>
              {allBlocksOpen ? 'Contraer todos' : 'Expandir todos'}
            </button>
          </div>
        )}

        {ventasPorColab.length === 0 ? (
          <div style={{background:'var(--paper-raised)',border:'1px dashed var(--line-1)',borderRadius:12,padding:'48px 24px',textAlign:'center'}}>
            <div style={{fontFamily:'var(--serif)',fontSize:18,fontWeight:600,color:'var(--ink-1)',marginBottom:6}}>Turno sin servicios aún</div>
            <div style={{fontSize:13,color:'var(--ink-3)'}}>Registra el primer servicio vendido con el botón de arriba.</div>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {ventasPorColab.map(c => (
              <ColabBlockFn key={c.colaboradora_id} c={c} canales={canales} monedas={monedas} cuentas={cuentas}
                turnoAbierto={turno.estado==='abierto'}
                globalOpen={allBlocksOpen}
                onTogglePago={()=>togglePago(c.colaboradora_id)}
                onFirmar={()=>setModal({tipo:'firmar',data:c})}
                onDelVenta={borrarVenta}
                onEditVenta={(v)=>setModal({tipo:'venta-editar',data:v})}
              />
            ))}
          </div>
        )}

        {/* Ir al arqueo */}
        {turno.estado === 'abierto' && ventasPorColab.length > 0 && (
          <div style={{marginTop:20,padding:16,background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:'var(--ink-0)',marginBottom:2}}>Cuando estén listas, pasa al arqueo</div>
              <div style={{fontSize:12,color:'var(--ink-2)'}}>Revisa el efectivo. Desde ahí cierras el turno definitivamente (puedes volver antes).</div>
            </div>
            <Btn variant="moss" icon="arrow-right" size="lg" onClick={irAArqueo}>Ir a arqueo</Btn>
          </div>
        )}

        {turno.estado === 'cerrado' && (
          <div style={{marginTop:20,padding:16,background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <Icon name="lock" size={14} color="var(--ink-3)"/>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:'var(--ink-0)',marginBottom:2}}>Turno cerrado · modo consulta</div>
                <div style={{fontSize:12,color:'var(--ink-2)'}}>Solo visualización. Para modificar algún dato, reábrelo (requiere admin).</div>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <Btn variant="ghost" size="md" icon="lock" onClick={reabrirTurno}>Reabrir turno</Btn>
              <Btn variant="secondary" onClick={()=>navigate('turnos/arqueo/'+turnoId)}>Ver arqueo</Btn>
            </div>
          </div>
        )}
      </div>

      {/* Modal firma digital */}
      {modal?.tipo==='firmar' && (
        <FirmaModal
          colab={modal.data}
          monedas={monedas}
          onCancel={()=>setModal(null)}
          onSave={async (dataUrl) => {
            await guardarFirma(modal.data.colaboradora_id, dataUrl);
            setModal(null);
          }}
        />
      )}

      {/* Modal nueva/editar venta */}
      {(modal?.tipo==='venta-nueva' || modal?.tipo==='venta-editar') && (
        <Modal title={modal.tipo==='venta-nueva' ? 'Registrar servicio vendido' : 'Editar servicio'} onClose={()=>setModal(null)} wide>
          <FormVenta
            venta={modal.data}
            turnoId={turnoId}
            servicios={servicios}
            canales={canales}
            colabs={colabs}
            cuentas={cuentas}
            monedas={monedas}
            colabsPagadasIds={colabsPagadasIds}
            onSave={()=>{setModal(null); cargar();}}
            onCancel={()=>setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
};

const QuickMetric = ({lbl, val, note}) => (
  <div style={{padding:'8px 16px',background:'var(--paper-raised)'}}>
    <div style={{fontSize:9.5,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:3}}>{lbl}</div>
    <div>{val}</div>
    {note && <div style={{fontSize:10,color:'var(--ink-3)',marginTop:2}}>{note}</div>}
  </div>
);

Object.assign(window, { PVTurno: PVTurnoFn, QuickMetric });
