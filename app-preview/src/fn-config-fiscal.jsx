// ──────────────────────────────────────────
// Config Fiscal · Tab dentro de Cuentas y monedas
// Singleton — una sola fila en config_fiscal
// ──────────────────────────────────────────

const REGIMENES_FISCALES = [
  {id:'resico_pm',     label:'RESICO Personas Morales',        isrDefault: 1.25},
  {id:'rgl',           label:'Régimen General (Personas Morales)', isrDefault: 30},
  {id:'resico_pf',     label:'RESICO Personas Físicas',        isrDefault: 1.25},
  {id:'pfae',          label:'PF Actividad Empresarial',       isrDefault: 30},
  {id:'custom',        label:'Otro / Custom',                  isrDefault: 0},
];

const ConfigFiscalTab = () => {
  const [cfg, setCfg]     = React.useState(null);
  const [loading, setL]   = React.useState(true);
  const [saving, setS]    = React.useState(false);

  const [activo, setAct]    = React.useState(false);
  const [nombre, setNom]    = React.useState('');
  const [rfc, setRfc]       = React.useState('');
  const [regimen, setReg]   = React.useState('');
  const [isrPct, setIsr]    = React.useState(0);
  const [ivaDef, setIva]    = React.useState(16);
  const [notas, setNotas]   = React.useState('');

  const cargar = React.useCallback(async () => {
    setL(true);
    const {data} = await sb.from('config_fiscal').select('*').eq('id', 1).maybeSingle();
    if (data) {
      setCfg(data);
      setAct(data.activo ?? false);
      setNom(data.nombre_empresa || '');
      setRfc(data.rfc || '');
      setReg(data.regimen || '');
      setIsr(data.isr_pct || 0);
      setIva(data.iva_pct_default ?? 16);
      setNotas(data.notas || '');
    }
    setL(false);
  }, []);
  React.useEffect(() => { cargar(); }, [cargar]);

  const cambiarRegimen = (id) => {
    setReg(id);
    const r = REGIMENES_FISCALES.find(x => x.id === id);
    if (r && r.id !== 'custom') setIsr(r.isrDefault);
  };

  const guardar = async () => {
    setS(true);
    const payload = {
      id: 1,
      activo,
      nombre_empresa: nombre.trim() || null,
      rfc: rfc.trim().toUpperCase() || null,
      regimen: regimen || null,
      isr_pct: Number(isrPct) || 0,
      iva_pct_default: Number(ivaDef) || 16,
      notas: notas.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const {error} = await sb.from('config_fiscal').upsert(payload, {onConflict: 'id'});
    setS(false);
    if (error) return notify('Error: '+error.message, 'err');
    notify('Configuración fiscal guardada');
    cargar();
  };

  const fieldStyle = {width:'100%',padding:'9px 12px',fontSize:13,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontFamily:'inherit',color:'var(--ink-1)',boxSizing:'border-box'};
  const labelStyle = {display:'block',fontSize:11,fontWeight:600,letterSpacing:.4,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:6};

  if (loading) return <div style={{textAlign:'center',padding:40,color:'var(--ink-3)',fontSize:13}}>Cargando…</div>;

  return (
    <div style={{maxWidth:720,margin:'0 auto'}}>
      {/* Info */}
      <div style={{padding:'14px 18px',background:'var(--sand-100)',border:'1px solid #ecd49a',borderRadius:10,marginBottom:20,fontSize:12.5,color:'#7a4e10',lineHeight:1.55,display:'flex',gap:12,alignItems:'flex-start'}}>
        <Icon name="shield" size={14} stroke={1.8} style={{marginTop:2,flexShrink:0}}/>
        <div>
          <strong>Configuración fiscal del negocio.</strong> El sistema usará estos datos para estimar IVA e ISR en el Dashboard, combinándolos con el flag <em>es_fiscal</em> de cada cuenta y <em>es_facturable</em> de cada gasto.<br/>
          <span style={{opacity:.7}}>Solo estimación — no reemplaza asesoría contable.</span>
        </div>
      </div>

      {/* Toggle activar cálculo fiscal */}
      <div style={{padding:'14px 18px',background:activo?'rgba(107,125,74,.08)':'var(--paper-sunk)',border:'1px solid '+(activo?'rgba(107,125,74,.3)':'var(--line-2)'),borderRadius:10,marginBottom:20,display:'flex',alignItems:'center',gap:12}}>
        {typeof Toggle !== 'undefined' ? (
          <Toggle checked={activo} onChange={setAct}/>
        ) : (
          <input type="checkbox" checked={activo} onChange={e=>setAct(e.target.checked)}/>
        )}
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:600,color:'var(--ink-0)'}}>{activo ? 'Cálculo fiscal activo' : 'Cálculo fiscal desactivado'}</div>
          <div style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>{activo ? 'El Dashboard mostrará IVA a pagar, ISR estimado y utilidad después de impuestos' : 'El Dashboard NO mostrará sección fiscal'}</div>
        </div>
      </div>

      {/* Datos empresa */}
      <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,padding:'20px 22px',marginBottom:18}}>
        <div style={{fontFamily:'var(--serif)',fontSize:15,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2,marginBottom:14}}>Datos de la empresa</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 180px',gap:12,marginBottom:14}}>
          <div>
            <label style={labelStyle}>Nombre / Razón social</label>
            <input value={nombre} onChange={e=>setNom(e.target.value)} placeholder="Xcalacoco Spa SA de CV" style={fieldStyle}/>
          </div>
          <div>
            <label style={labelStyle}>RFC</label>
            <input value={rfc} onChange={e=>setRfc(e.target.value.toUpperCase())} placeholder="XSP230101ABC" maxLength={13} style={{...fieldStyle,fontFamily:'var(--mono)',letterSpacing:.5}}/>
          </div>
        </div>
      </div>

      {/* Régimen e impuestos */}
      <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,padding:'20px 22px',marginBottom:18}}>
        <div style={{fontFamily:'var(--serif)',fontSize:15,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2,marginBottom:14}}>Régimen fiscal</div>
        <div style={{marginBottom:14}}>
          <label style={labelStyle}>Régimen</label>
          <select value={regimen} onChange={e=>cambiarRegimen(e.target.value)} style={fieldStyle}>
            <option value="">— Selecciona —</option>
            {REGIMENES_FISCALES.map(r => (
              <option key={r.id} value={r.id}>{r.label} ({r.isrDefault > 0 ? `ISR ${r.isrDefault}%` : 'ISR custom'})</option>
            ))}
          </select>
          <div style={{fontSize:11,color:'var(--ink-3)',marginTop:5}}>Al cambiar régimen, el % ISR se ajusta al default. Puedes sobrescribir manualmente abajo.</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div>
            <label style={labelStyle}>% ISR aplicable</label>
            <div style={{position:'relative'}}>
              <input type="number" step="0.01" min="0" max="100" value={isrPct} onChange={e=>setIsr(e.target.value)} className="num" style={{...fieldStyle,paddingRight:28,fontSize:16,fontFamily:'var(--serif)',fontWeight:600,textAlign:'right'}}/>
              <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',fontSize:13,color:'var(--ink-3)',fontWeight:600}}>%</span>
            </div>
            <div style={{fontSize:11,color:'var(--ink-3)',marginTop:5}}>Se aplica a la utilidad fiscal (ventas − gastos deducibles)</div>
          </div>
          <div>
            <label style={labelStyle}>% IVA default (al cobrar)</label>
            <div style={{position:'relative'}}>
              <input type="number" step="0.01" min="0" max="100" value={ivaDef} onChange={e=>setIva(e.target.value)} className="num" style={{...fieldStyle,paddingRight:28,fontSize:16,fontFamily:'var(--serif)',fontWeight:600,textAlign:'right'}}/>
              <span style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',fontSize:13,color:'var(--ink-3)',fontWeight:600}}>%</span>
            </div>
            <div style={{fontSize:11,color:'var(--ink-3)',marginTop:5}}>Tasa que cobras en las ventas fiscales (16% default, 8% frontera)</div>
          </div>
        </div>
      </div>

      {/* Notas */}
      <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,padding:'20px 22px',marginBottom:18}}>
        <label style={labelStyle}>Notas internas</label>
        <textarea value={notas} onChange={e=>setNotas(e.target.value)} rows={2} placeholder="Referencias del contador, detalles del régimen, etc." style={{...fieldStyle,resize:'vertical',minHeight:60}}/>
      </div>

      {/* Guardar */}
      <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
        <Btn variant="clay" size="md" icon="check" onClick={guardar} disabled={saving}>{saving?'Guardando…':'Guardar configuración'}</Btn>
      </div>

      {cfg?.updated_at && (
        <div style={{textAlign:'right',fontSize:11,color:'var(--ink-3)',marginTop:10}}>Última actualización: {new Date(cfg.updated_at).toLocaleString('es-MX',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
      )}
    </div>
  );
};

Object.assign(window, { ConfigFiscalTab, REGIMENES_FISCALES });
