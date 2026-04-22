// ──────────────────────────────────────────
// Config · Cuentas y Monedas — VERSIÓN FUNCIONAL conectada a Supabase
// Reemplaza la versión mock de screen-config-combined.jsx al cargarse después.
// ──────────────────────────────────────────

// ─── Modal reusable ───
const Modal = ({title, onClose, children, footer, wide}) => (
  <div style={{position:'fixed',inset:0,background:'rgba(32,28,22,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
    <div onClick={(e)=>e.stopPropagation()} style={{background:'var(--paper)',borderRadius:14,border:'1px solid var(--line-1)',boxShadow:'0 30px 80px rgba(0,0,0,.25)',width:'100%',maxWidth:wide?620:460,maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{padding:'20px 24px 12px',borderBottom:'1px solid var(--line-1)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontFamily:'var(--serif)',fontSize:20,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.3}}>{title}</div>
        <button onClick={onClose} style={{background:'transparent',border:'none',cursor:'pointer',padding:4,color:'var(--ink-3)',borderRadius:6}}><Icon name="x" size={18}/></button>
      </div>
      <div style={{padding:'18px 24px',overflowY:'auto',flex:1}}>{children}</div>
      {footer && <div style={{padding:'14px 24px',borderTop:'1px solid var(--line-1)',background:'var(--paper-sunk)',display:'flex',justifyContent:'flex-end',gap:10}}>{footer}</div>}
    </div>
  </div>
);

// ─── Formulario cuenta ───
const FormCuenta = ({cuenta, onSave, onCancel, monedas}) => {
  const [label,setLabel]     = React.useState(cuenta?.label || '');
  const [tipo,setTipo]       = React.useState(cuenta?.tipo || 'banco');
  const [moneda,setMoneda]   = React.useState(cuenta?.moneda || 'MXN');
  const [activo,setActivo]   = React.useState(cuenta?.activo ?? true);
  const [saving,setSaving]   = React.useState(false);
  const editando = !!cuenta;

  const fieldStyle = {width:'100%',padding:'9px 12px',fontSize:13,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontFamily:'inherit',color:'var(--ink-1)',boxSizing:'border-box'};
  const labelStyle = {display:'block',fontSize:11,fontWeight:600,letterSpacing:.4,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:6};

  const guardar = async () => {
    if (!label.trim()) return notify('Falta el nombre de la cuenta','err');
    setSaving(true);
    const payload = { label: label.trim(), tipo, moneda, activo };
    let error;
    if (editando) ({error} = await sb.from('cuentas').update(payload).eq('id', cuenta.id));
    else          ({error} = await sb.from('cuentas').insert(payload));
    setSaving(false);
    if (error) return notify('Error: '+error.message,'err');
    notify(editando ? 'Cuenta actualizada' : 'Cuenta creada');
    onSave();
  };

  return (
    <>
      <div style={{marginBottom:16}}>
        <label style={labelStyle}>Nombre de la cuenta</label>
        <input autoFocus value={label} onChange={e=>setLabel(e.target.value)} placeholder="HSBC, Efectivo caja, BBVA débito..." style={fieldStyle}/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
        <div>
          <label style={labelStyle}>Tipo</label>
          <select value={tipo} onChange={e=>setTipo(e.target.value)} style={fieldStyle}>
            <option value="banco">Banco</option>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Moneda {editando && <span style={{color:'var(--ink-3)',textTransform:'none',fontWeight:500}}>· no editable</span>}</label>
          <select value={moneda} disabled={editando} onChange={e=>setMoneda(e.target.value)} style={{...fieldStyle, opacity: editando ? .55 : 1, cursor: editando ? 'not-allowed' : 'pointer'}}>
            {monedas.map(m=> <option key={m.codigo} value={m.codigo}>{m.codigo} · {m.label}</option>)}
          </select>
        </div>
      </div>
      {editando && (
        <div style={{marginBottom:16}}>
          <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',fontSize:13,color:'var(--ink-1)'}}>
            <input type="checkbox" checked={activo} onChange={e=>setActivo(e.target.checked)}/>
            Cuenta activa (desmarca para archivar)
          </label>
        </div>
      )}
      {!editando && (
        <div style={{padding:'10px 14px',background:'var(--sand-100)',border:'1px solid #ecd49a',borderRadius:8,fontSize:12,color:'#7a4e10',lineHeight:1.5}}>
          La moneda se define ahora y <strong>no se puede cambiar después</strong>. Para cambiar moneda, archiva esta cuenta y crea una nueva.
        </div>
      )}
      <div style={{marginTop:20,display:'flex',justifyContent:'flex-end',gap:10}}>
        <Btn variant="ghost" size="md" onClick={onCancel} disabled={saving}>Cancelar</Btn>
        <Btn variant="clay" size="md" onClick={guardar} disabled={saving}>{saving?'Guardando…':(editando?'Guardar cambios':'Crear cuenta')}</Btn>
      </div>
    </>
  );
};

// ─── Formulario TC moneda ───
const FormTCMoneda = ({moneda, onSave, onCancel}) => {
  const [tc,setTc] = React.useState(moneda.tc_a_mxn);
  const [saving,setSaving] = React.useState(false);

  const guardar = async () => {
    const val = parseFloat(tc);
    if (!(val>0)) return notify('TC debe ser mayor a 0','err');
    setSaving(true);
    const {error} = await sb.from('monedas').update({tc_a_mxn: val, actualizado: new Date().toISOString()}).eq('codigo', moneda.codigo);
    setSaving(false);
    if (error) return notify('Error: '+error.message,'err');
    notify('Tipo de cambio actualizado');
    onSave();
  };

  return (
    <>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:13,color:'var(--ink-2)',marginBottom:14}}>
          <strong style={{color:'var(--ink-0)'}}>1 {moneda.codigo}</strong> equivale a <span style={{color:'var(--ink-0)'}}>?? MXN</span>
        </div>
        <label style={{display:'block',fontSize:11,fontWeight:600,letterSpacing:.4,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:6}}>Nuevo TC</label>
        <input autoFocus type="number" step="0.01" value={tc} onChange={e=>setTc(e.target.value)} style={{width:'100%',padding:'12px 14px',fontSize:20,fontFamily:'var(--serif)',border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',color:'var(--ink-0)',boxSizing:'border-box'}}/>
      </div>
      <div style={{padding:'10px 14px',background:'var(--ink-blue-100)',border:'1px solid #bccdec',borderRadius:8,fontSize:12,color:'var(--ink-blue)',lineHeight:1.5}}>
        Los gastos ya capturados <strong>no se recalculan</strong> con el nuevo TC. Solo aplica a los próximos.
      </div>
      <div style={{marginTop:20,display:'flex',justifyContent:'flex-end',gap:10}}>
        <Btn variant="ghost" size="md" onClick={onCancel} disabled={saving}>Cancelar</Btn>
        <Btn variant="clay" size="md" onClick={guardar} disabled={saving}>{saving?'Guardando…':'Actualizar TC'}</Btn>
      </div>
    </>
  );
};

// ─── Form Nueva/Editar moneda completa ───
const FormMoneda = ({moneda, monedas, onSave, onCancel}) => {
  const editando = !!moneda;
  const [codigo,setCodigo]  = React.useState(moneda?.codigo || '');
  const [label,setLabel]    = React.useState(moneda?.label || '');
  const [simbolo,setSimbolo]= React.useState(moneda?.simbolo || '$');
  const [tc,setTc]          = React.useState(moneda?.tc_a_mxn || 1);
  const [esBase,setEsBase]  = React.useState(moneda?.es_base || false);
  const [activo,setActivo]  = React.useState(moneda?.activo ?? true);
  const [saving,setSaving]  = React.useState(false);

  const fieldStyle = {width:'100%',padding:'9px 12px',fontSize:13,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontFamily:'inherit',color:'var(--ink-1)',boxSizing:'border-box'};
  const labelStyle = {display:'block',fontSize:11,fontWeight:600,letterSpacing:.4,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:6};

  const guardar = async () => {
    const cod = codigo.trim().toUpperCase();
    if (!cod) return notify('Falta el código (ej. EUR, GBP)','err');
    if (cod.length < 3 || cod.length > 4) return notify('El código debe tener 3 o 4 letras','err');
    if (!label.trim()) return notify('Falta el nombre','err');
    const tcNum = parseFloat(tc);
    if (!(tcNum>0)) return notify('TC debe ser mayor a 0','err');
    if (esBase && tcNum !== 1) {
      if (!confirmar('La moneda BASE debe tener TC = 1. ¿Corregir automáticamente?')) return;
    }

    setSaving(true);

    // Si ésta se marca como base, desmarcar la anterior base
    if (esBase) {
      const prevBase = monedas.find(m => m.es_base && m.codigo !== cod);
      if (prevBase) {
        const {error:e1} = await sb.from('monedas').update({es_base:false}).eq('codigo', prevBase.codigo);
        if (e1) { setSaving(false); return notify('Error quitando base anterior: '+e1.message,'err'); }
      }
    }

    const payload = {
      label: label.trim(),
      simbolo: simbolo.trim() || '$',
      tc_a_mxn: esBase ? 1 : tcNum,
      es_base: esBase,
      activo,
      actualizado: new Date().toISOString()
    };

    let error;
    if (editando) {
      ({error} = await sb.from('monedas').update(payload).eq('codigo', moneda.codigo));
    } else {
      ({error} = await sb.from('monedas').insert({...payload, codigo: cod}));
    }
    setSaving(false);
    if (error) {
      if (error.code === '23505') return notify('Ya existe una moneda con ese código','err');
      return notify('Error: '+error.message,'err');
    }
    notify(editando ? 'Moneda actualizada' : 'Moneda creada');
    onSave();
  };

  return (
    <>
      <div style={{display:'grid',gridTemplateColumns:'130px 1fr',gap:12,marginBottom:14}}>
        <div>
          <label style={labelStyle}>Código</label>
          <input autoFocus={!editando} disabled={editando} value={codigo} onChange={e=>setCodigo(e.target.value.toUpperCase().slice(0,4))} placeholder="EUR" style={{...fieldStyle,fontFamily:'var(--mono)',textTransform:'uppercase',opacity:editando?.55:1}}/>
          {editando && <div style={{fontSize:10,color:'var(--ink-3)',marginTop:4}}>No editable</div>}
        </div>
        <div>
          <label style={labelStyle}>Nombre</label>
          <input autoFocus={editando} value={label} onChange={e=>setLabel(e.target.value)} placeholder="Euro, Libra esterlina..." style={fieldStyle}/>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'130px 1fr',gap:12,marginBottom:14}}>
        <div>
          <label style={labelStyle}>Símbolo</label>
          <input value={simbolo} onChange={e=>setSimbolo(e.target.value.slice(0,4))} placeholder="€" style={fieldStyle}/>
        </div>
        <div>
          <label style={labelStyle}>{esBase ? 'TC (base · fijo en 1)' : 'TC inicial → moneda base'}</label>
          <input type="number" step="0.01" value={tc} disabled={esBase} onChange={e=>setTc(e.target.value)} style={{...fieldStyle,opacity:esBase?.55:1}}/>
        </div>
      </div>

      <div style={{padding:'12px 14px',background:'var(--paper-sunk)',border:'1px solid var(--line-1)',borderRadius:8,marginBottom:12}}>
        <label style={{display:'flex',alignItems:'flex-start',gap:10,cursor:'pointer'}}>
          <input type="checkbox" checked={esBase} onChange={e=>{setEsBase(e.target.checked); if(e.target.checked) setTc(1);}} style={{marginTop:3}}/>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:'var(--ink-0)'}}>Marcar como moneda base</div>
            <div style={{fontSize:11.5,color:'var(--ink-3)',marginTop:2,lineHeight:1.5}}>Todos los gastos se reportan contra esta moneda. Solo puede haber UNA base — si marcas esta, la actual base pierde su rol (pero su TC se mantiene).</div>
          </div>
        </label>
      </div>

      {editando && (
        <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',fontSize:13,color:'var(--ink-1)',marginBottom:8}}>
          <input type="checkbox" checked={activo} onChange={e=>setActivo(e.target.checked)}/>
          Moneda activa
        </label>
      )}

      <div style={{marginTop:20,display:'flex',justifyContent:'flex-end',gap:10}}>
        <Btn variant="ghost" size="md" onClick={onCancel} disabled={saving}>Cancelar</Btn>
        <Btn variant="clay" size="md" onClick={guardar} disabled={saving}>{saving?'Guardando…':(editando?'Guardar':'Crear moneda')}</Btn>
      </div>
    </>
  );
};

// ─── Pantalla principal ───
const CuentasMonedasFn = () => {
  const [tab,setTab] = React.useState('cuentas');
  const [cuentas,setCuentas]   = React.useState([]);
  const [monedas,setMonedas]   = React.useState([]);
  const [loading,setLoading]   = React.useState(true);
  const [modal,setModal]       = React.useState(null); // {tipo, data}

  const monedaColor={MXN:'var(--ink-blue)',USD:'var(--moss)',CAD:'var(--clay)'};

  const cargar = React.useCallback(async () => {
    setLoading(true);
    const [c,m] = await Promise.all([
      sb.from('cuentas').select('*').order('orden').order('creado'),
      sb.from('monedas').select('*').order('es_base',{ascending:false}).order('codigo'),
    ]);
    if (c.error) notify('Error cuentas: '+c.error.message,'err');
    if (m.error) notify('Error monedas: '+m.error.message,'err');
    setCuentas(c.data || []);
    setMonedas(m.data || []);
    setLoading(false);
  }, []);

  React.useEffect(()=>{ cargar(); }, [cargar]);

  const borrarCuenta = async (c) => {
    if (!confirmar(`¿Borrar la cuenta "${c.label}"?\n\nSi tiene gastos asociados no se podrá borrar; archívala.`)) return;
    const {error} = await sb.from('cuentas').delete().eq('id', c.id);
    if (error) return notify('No se pudo borrar. Tiene gastos asociados — archívala en su lugar.','err');
    notify('Cuenta borrada');
    cargar();
  };

  const borrarMoneda = async (m) => {
    if (m.es_base) return notify('No se puede borrar la moneda base','err');
    const usada = cuentas.some(c => c.moneda === m.codigo);
    if (usada) return notify('Esta moneda tiene cuentas asociadas. Borra las cuentas primero o desactiva la moneda.','err');
    if (!confirmar(`¿Borrar la moneda "${m.codigo} · ${m.label}"?`)) return;
    const {error} = await sb.from('monedas').delete().eq('codigo', m.codigo);
    if (error) return notify('No se pudo borrar: '+error.message,'err');
    notify('Moneda borrada');
    cargar();
  };

  const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})+' · '+d.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'});
  };

  return (
    <div style={{width:'100%',height:'100%',display:'flex',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)'}}>
      {!window.__EMBEDDED__ && <Sidebar active="cuentas"/>}
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        <div style={{padding:'28px 36px 18px',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16}}>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:600,letterSpacing:.5,textTransform:'uppercase',marginBottom:6}}>Configuración</div>
            <div style={{fontFamily:'var(--serif)',fontSize:34,fontWeight:500,letterSpacing:-.8,color:'var(--ink-0)',lineHeight:1}}>Cuentas y monedas</div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:6}}>Bancos, efectivo, terminales · tipos de cambio</div>
          </div>
          {tab==='cuentas' && (
            <Btn variant="clay" size="md" icon="plus" onClick={()=>setModal({tipo:'cuenta-nueva'})}>Nueva cuenta</Btn>
          )}
          {tab==='monedas' && (
            <Btn variant="clay" size="md" icon="plus" onClick={()=>setModal({tipo:'moneda-nueva'})}>Nueva moneda</Btn>
          )}
        </div>

        <TabHeader active={tab} onChange={setTab} tabs={[
          {id:'cuentas', label:'Cuentas', icon:'coins', count:cuentas.length},
          {id:'monedas', label:'Monedas y TC', icon:'percent', count:monedas.length},
        ]}/>

        <div style={{flex:1,overflowY:'auto',padding:'24px 36px 60px'}}>
          {loading && <div style={{textAlign:'center',padding:40,color:'var(--ink-3)',fontSize:13}}>Cargando…</div>}

          {!loading && tab==='cuentas' && (
            <>
              {cuentas.length===0 ? (
                <div style={{background:'var(--paper-raised)',border:'1px dashed var(--line-1)',borderRadius:12,padding:'48px 24px',textAlign:'center'}}>
                  <div style={{fontFamily:'var(--serif)',fontSize:20,fontWeight:600,color:'var(--ink-0)',marginBottom:6}}>Aún no hay cuentas</div>
                  <div style={{fontSize:13,color:'var(--ink-2)',marginBottom:18}}>Crea tu primera cuenta bancaria, de efectivo o tarjeta para empezar a registrar gastos.</div>
                  <Btn variant="clay" size="md" icon="plus" onClick={()=>setModal({tipo:'cuenta-nueva'})}>Crear primera cuenta</Btn>
                </div>
              ) : (
                <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 140px 100px 100px 80px',gap:14,padding:'12px 22px',fontSize:10,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)',borderBottom:'1px solid var(--line-1)',background:'var(--paper-sunk)'}}>
                    <div>Nombre</div>
                    <div>Tipo</div>
                    <div>Moneda</div>
                    <div>Estado</div>
                    <div/>
                  </div>
                  {cuentas.map((c,i)=>(
                    <div key={c.id} style={{display:'grid',gridTemplateColumns:'1fr 140px 100px 100px 80px',gap:14,alignItems:'center',padding:'14px 22px',borderTop:i===0?'none':'1px solid var(--line-1)',opacity:c.activo?1:.6}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <span style={{width:10,height:10,borderRadius:2,background:monedaColor[c.moneda]||'var(--ink-2)'}}/>
                        <span style={{fontSize:14,fontWeight:600,color:'var(--ink-0)'}}>{c.label}</span>
                      </div>
                      <div style={{fontSize:12,color:'var(--ink-2)',textTransform:'capitalize'}}>{c.tipo}</div>
                      <div><Chip tone="neutral" style={{fontSize:10,fontFamily:'var(--mono)',letterSpacing:.5}}>{c.moneda}</Chip></div>
                      <div><Chip tone={c.activo?'moss':'neutral'}>{c.activo?'Activa':'Archivada'}</Chip></div>
                      <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                        <button onClick={()=>setModal({tipo:'cuenta-editar',data:c})} title="Editar" style={{background:'transparent',border:'none',cursor:'pointer',padding:6,color:'var(--ink-3)',borderRadius:6}}><Icon name="edit" size={14}/></button>
                        <button onClick={()=>borrarCuenta(c)} title="Borrar" style={{background:'transparent',border:'none',cursor:'pointer',padding:6,color:'var(--ink-3)',borderRadius:6}}><Icon name="trash" size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{marginTop:14,padding:'12px 16px',background:'var(--sand-100)',border:'1px solid #ecd49a',borderRadius:8,display:'flex',gap:10,alignItems:'flex-start',fontSize:12,color:'#7a4e10',lineHeight:1.5}}>
                <Icon name="sparkles" size={14} stroke={1.8} style={{marginTop:2}}/>
                <div>La moneda se define al crear la cuenta y <strong>no se puede cambiar después</strong>. Para cambiar moneda, archiva la cuenta y crea una nueva.</div>
              </div>
            </>
          )}

          {!loading && tab==='monedas' && (
            <>
              {monedas.length===0 ? (
                <div style={{background:'var(--paper-raised)',border:'1px dashed var(--line-1)',borderRadius:12,padding:'48px 24px',textAlign:'center'}}>
                  <div style={{fontFamily:'var(--serif)',fontSize:20,fontWeight:600,color:'var(--ink-0)',marginBottom:6}}>Aún no hay monedas</div>
                  <div style={{fontSize:13,color:'var(--ink-2)',marginBottom:18}}>Crea al menos una moneda para poder registrar cuentas y gastos.</div>
                  <Btn variant="clay" size="md" icon="plus" onClick={()=>setModal({tipo:'moneda-nueva'})}>Crear primera moneda</Btn>
                </div>
              ) : (
              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 90px 90px 160px 180px 90px',gap:14,padding:'12px 22px',fontSize:10,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)',borderBottom:'1px solid var(--line-1)',background:'var(--paper-sunk)'}}>
                  <div>Moneda</div>
                  <div>Código</div>
                  <div>Símbolo</div>
                  <div style={{textAlign:'right'}}>TC (→ base)</div>
                  <div>Actualizado</div>
                  <div/>
                </div>
                {monedas.map((m,i)=>(
                  <div key={m.codigo} style={{display:'grid',gridTemplateColumns:'1fr 90px 90px 160px 180px 90px',gap:14,alignItems:'center',padding:'14px 22px',borderTop:i===0?'none':'1px solid var(--line-1)',opacity:m.activo?1:.55}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <span style={{width:10,height:10,borderRadius:2,background:monedaColor[m.codigo]||'var(--ink-2)'}}/>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:14,fontWeight:600,color:'var(--ink-0)'}}>{m.label}</span>
                          {m.es_base && <Chip tone="clay" style={{fontSize:9,padding:'2px 7px'}}>BASE</Chip>}
                        </div>
                      </div>
                    </div>
                    <div><Chip tone="neutral" style={{fontSize:10,fontFamily:'var(--mono)',letterSpacing:.5}}>{m.codigo}</Chip></div>
                    <div style={{fontSize:16,fontFamily:'var(--serif)',fontWeight:500,color:'var(--ink-1)'}}>{m.simbolo}</div>
                    <div style={{textAlign:'right'}}>
                      {m.es_base ? (
                        <span style={{fontSize:13,color:'var(--ink-3)',fontStyle:'italic'}}>1.00</span>
                      ) : (
                        <div className="num" style={{fontSize:18,fontFamily:'var(--serif)',fontWeight:500,color:'var(--ink-0)',letterSpacing:-.3}}>{Number(m.tc_a_mxn).toFixed(2)}</div>
                      )}
                    </div>
                    <div style={{fontSize:12,color:'var(--ink-3)'}}>{fmtDate(m.actualizado)}</div>
                    <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                      <button onClick={()=>setModal({tipo:'moneda-editar',data:m})} title="Editar" style={{background:'transparent',border:'none',cursor:'pointer',padding:6,color:'var(--clay)',borderRadius:6}}><Icon name="edit" size={14}/></button>
                      {!m.es_base && (
                        <button onClick={()=>borrarMoneda(m)} title="Borrar" style={{background:'transparent',border:'none',cursor:'pointer',padding:6,color:'var(--ink-3)',borderRadius:6}}><Icon name="trash" size={14}/></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              )}
              <div style={{marginTop:14,padding:'12px 16px',background:'var(--ink-blue-100)',border:'1px solid #bccdec',borderRadius:8,display:'flex',gap:10,alignItems:'flex-start',fontSize:12,color:'var(--ink-blue)',lineHeight:1.5}}>
                <Icon name="sparkles" size={14} stroke={1.8} style={{marginTop:2}}/>
                <div>El TC se ingresa manualmente. Cada gasto guarda el TC vigente al momento de capturar — si cambias el TC después no afecta gastos anteriores.</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modales */}
      {modal?.tipo==='cuenta-nueva' && (
        <Modal title="Nueva cuenta" onClose={()=>setModal(null)}>
          <FormCuenta monedas={monedas} onCancel={()=>setModal(null)} onSave={()=>{setModal(null);cargar();}}/>
        </Modal>
      )}
      {modal?.tipo==='cuenta-editar' && (
        <Modal title={`Editar · ${modal.data.label}`} onClose={()=>setModal(null)}>
          <FormCuenta cuenta={modal.data} monedas={monedas} onCancel={()=>setModal(null)} onSave={()=>{setModal(null);cargar();}}/>
        </Modal>
      )}
      {modal?.tipo==='tc-moneda' && (
        <Modal title={`TC · ${modal.data.label}`} onClose={()=>setModal(null)}>
          <FormTCMoneda moneda={modal.data} onCancel={()=>setModal(null)} onSave={()=>{setModal(null);cargar();}}/>
        </Modal>
      )}
      {modal?.tipo==='moneda-nueva' && (
        <Modal title="Nueva moneda" onClose={()=>setModal(null)}>
          <FormMoneda monedas={monedas} onCancel={()=>setModal(null)} onSave={()=>{setModal(null);cargar();}}/>
        </Modal>
      )}
      {modal?.tipo==='moneda-editar' && (
        <Modal title={`Editar · ${modal.data.codigo}`} onClose={()=>setModal(null)}>
          <FormMoneda moneda={modal.data} monedas={monedas} onCancel={()=>setModal(null)} onSave={()=>{setModal(null);cargar();}}/>
        </Modal>
      )}
    </div>
  );
};

// Sobreescribe la versión mock
Object.assign(window, { CuentasMonedas: CuentasMonedasFn, Modal, FormCuenta, FormTCMoneda, FormMoneda });
