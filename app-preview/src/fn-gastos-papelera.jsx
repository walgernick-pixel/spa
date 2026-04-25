// ──────────────────────────────────────────
// Gastos · Papelera — gastos archivados (eliminado is not null)
// Acciones por fila: Restaurar · Eliminar definitivamente
// Lee de la vista v_gastos_eliminados (mig 23).
// ──────────────────────────────────────────

const GastosPapeleraFn = ({onBack}) => {
  const [items, setItems]       = React.useState([]);
  const [loading, setLoading]   = React.useState(true);
  const [search, setSearch]     = React.useState('');
  const [busy, setBusy]         = React.useState(null); // id en proceso
  const [eliminadores, setElim] = React.useState({});   // {uid: {nombre_display, username}}

  const cargar = React.useCallback(async () => {
    setLoading(true);
    const {data, error} = await sb.from('v_gastos_eliminados').select('*').order('eliminado',{ascending:false});
    if (error) { notify('Error cargando papelera: '+error.message,'err'); setLoading(false); return; }
    const rows = data || [];
    setItems(rows);

    // Resolver nombres de quien archivó (1 query por uid único)
    const uids = [...new Set(rows.map(r => r.eliminado_por).filter(Boolean))];
    if (uids.length) {
      const {data: pf} = await sb.from('perfiles').select('id, nombre_display, username').in('id', uids);
      const map = {};
      (pf || []).forEach(p => { map[p.id] = p; });
      setElim(map);
    } else {
      setElim({});
    }
    setLoading(false);
  },[]);

  React.useEffect(()=>{ cargar(); },[cargar]);

  const restaurar = async (g) => {
    if (!confirmar(`¿Restaurar el gasto "${g.concepto}"?\n\nVolverá a aparecer en la lista principal.`)) return;
    setBusy(g.id);
    const {error} = await sb.from('gastos').update({eliminado: null, eliminado_por: null}).eq('id', g.id);
    if (error) { setBusy(null); return notify('Error: '+error.message,'err'); }
    await sb.from('gastos_historial').insert({gasto_id: g.id, accion:'restaurado'});
    setBusy(null);
    notify('Gasto restaurado');
    cargar();
  };

  const eliminarDef = async (g) => {
    if (!confirmar(`⚠️ ¿ELIMINAR DEFINITIVAMENTE el gasto "${g.concepto}"?\n\nSe borrará de la base de datos sin posibilidad de recuperarlo.\nEsta acción no se puede deshacer.`)) return;
    setBusy(g.id);
    if (g.comprobante_url) {
      await sb.storage.from('comprobantes').remove([g.comprobante_url]);
    }
    const {error} = await sb.from('gastos').delete().eq('id', g.id);
    if (error) { setBusy(null); return notify('Error: '+error.message,'err'); }
    setBusy(null);
    notify('Gasto eliminado definitivamente');
    cargar();
  };

  // Filtro por búsqueda (client-side)
  const filtrados = React.useMemo(()=>{
    if (!search.trim()) return items;
    const s = search.toLowerCase();
    return items.filter(g =>
      (g.concepto||'').toLowerCase().includes(s) ||
      (g.proveedor||'').toLowerCase().includes(s) ||
      (g.notas||'').toLowerCase().includes(s) ||
      (g.categoria||'').toLowerCase().includes(s) ||
      (g.cuenta||'').toLowerCase().includes(s) ||
      String(g.folio||'').includes(s)
    );
  },[items, search]);

  const fmtFecha = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'});
  };
  const fmtArchivado = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  };

  return (
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)'}}>
      {/* Header */}
      <div style={{padding:'28px 36px 18px',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16}}>
        <div>
          <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:600,letterSpacing:.5,textTransform:'uppercase',marginBottom:6}}>Gastos</div>
          <div style={{fontFamily:'var(--serif)',fontSize:34,fontWeight:500,letterSpacing:-.8,color:'var(--ink-0)',lineHeight:1}}>Papelera</div>
          <div style={{fontSize:13,color:'var(--ink-2)',marginTop:6}}>Gastos archivados · puedes restaurarlos o eliminarlos definitivamente</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <Btn variant="secondary" size="md" icon="arrow-left" onClick={()=>navigate('gastos/lista')}>Volver a la lista</Btn>
        </div>
      </div>

      {/* Buscador */}
      <div style={{padding:'0 36px 14px',display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{position:'relative',flex:'0 1 320px'}}>
          <Icon name="search" size={14} style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--ink-3)'}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar concepto, proveedor, nota..." style={{width:'100%',padding:'9px 12px 9px 32px',fontSize:13,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontFamily:'inherit',color:'var(--ink-1)',boxSizing:'border-box'}}/>
        </div>
        <div style={{marginLeft:'auto',fontSize:12,color:'var(--ink-3)'}}>
          {loading ? '…' : `${filtrados.length} ${filtrados.length===1?'gasto archivado':'gastos archivados'}`}
        </div>
      </div>

      {/* Header tabla */}
      <div style={{padding:'0 36px'}}>
        <div style={{display:'grid',gridTemplateColumns:'92px 1fr 160px 130px 160px 130px 220px',gap:14,padding:'10px 18px',fontSize:10,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)',borderBottom:'1px solid var(--line-1)'}}>
          <div>Fecha</div>
          <div>Concepto / Nota</div>
          <div>Proveedor</div>
          <div>Categoría</div>
          <div>Archivado</div>
          <div style={{textAlign:'right'}}>Monto</div>
          <div style={{textAlign:'right'}}>Acciones</div>
        </div>
      </div>

      {/* Lista */}
      <div style={{flex:1,overflowY:'auto',padding:'0 36px 40px'}}>
        {loading ? (
          <div style={{padding:'48px 18px',textAlign:'center',color:'var(--ink-3)',fontSize:13}}>Cargando…</div>
        ) : filtrados.length === 0 ? (
          <div style={{background:'var(--paper-raised)',border:'1px dashed var(--line-1)',borderRadius:12,padding:'56px 24px',textAlign:'center',marginTop:20}}>
            <div style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:600,color:'var(--ink-0)',marginBottom:6}}>
              {search ? 'No hay coincidencias' : 'La papelera está vacía'}
            </div>
            <div style={{fontSize:13,color:'var(--ink-2)',maxWidth:420,margin:'8px auto 0'}}>
              {search
                ? 'Prueba con otro término de búsqueda.'
                : 'Cuando archives un gasto desde su detalle, aparecerá aquí.'}
            </div>
          </div>
        ) : (
          <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:10,overflow:'hidden',marginTop:8}}>
            {filtrados.map((g, i) => {
              const esMXN = g.moneda === 'MXN';
              const elim = g.eliminado_por ? eliminadores[g.eliminado_por] : null;
              const procesando = busy === g.id;
              return (
                <div key={g.id} style={{display:'grid',gridTemplateColumns:'92px 1fr 160px 130px 160px 130px 220px',gap:14,alignItems:'center',padding:'12px 18px',borderTop:i===0?'none':'1px solid var(--line-1)',opacity:procesando?.5:1}}>
                  <div className="num" style={{fontSize:12,color:'var(--ink-2)'}}>{fmtFecha(g.fecha)}</div>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:13.5,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                      {g.concepto}
                    </div>
                    <div style={{fontSize:11,color:'var(--ink-3)',marginTop:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                      {g.cuenta}{g.notas ? ` · ${g.notas}` : ''}
                    </div>
                  </div>
                  <div style={{fontSize:12,color:'var(--ink-2)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                    {g.proveedor || <span style={{color:'var(--ink-3)',fontStyle:'italic'}}>—</span>}
                  </div>
                  <div><Chip tone={g.categoria_tone || 'neutral'}>{g.categoria}</Chip></div>
                  <div style={{fontSize:11,color:'var(--ink-2)',lineHeight:1.4,minWidth:0}}>
                    <div className="num">{fmtArchivado(g.eliminado)}</div>
                    {elim && <div style={{color:'var(--ink-3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>por {elim.nombre_display || elim.username}</div>}
                  </div>
                  <div style={{textAlign:'right'}}>
                    <Money amount={Number(g.monto)} currency={g.moneda} size={15} weight={600}/>
                    {!esMXN && <div style={{fontSize:10,color:'var(--ink-3)',marginTop:1}} className="num">≈ ${Number(g.monto_mxn).toLocaleString('es-MX',{maximumFractionDigits:0})} MXN</div>}
                  </div>
                  <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                    <Btn variant="secondary" size="sm" icon="check" onClick={()=>!procesando && restaurar(g)}>Restaurar</Btn>
                    <Btn variant="danger" size="sm" icon="trash" onClick={()=>!procesando && eliminarDef(g)}>Eliminar</Btn>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { GastosPapelera: GastosPapeleraFn });
