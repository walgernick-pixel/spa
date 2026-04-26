// ──────────────────────────────────────────
// Wrappers: pantallas reales + AppShell con navegación activa
// ──────────────────────────────────────────

// ───── GASTOS — las 5 pantallas del módulo ─────

const GastosHome = () => {
  // Menú del módulo. Hash: #gastos/<sub>[/<id>]
  const parts = (window.location.hash || '#gastos/lista').replace(/^#\/?/,'').split('/');
  const sub = parts[1] || 'lista';
  const id  = parts[2] || null;

  // El "Resumen" se eliminó: ahora el Dashboard general lo cubre (gastos integrados con ventas)
  const tabs = [
    {id:'lista',   label:'Lista',   icon:'receipt'},
    ...(can('gastos_papelera') ? [{id:'papelera', label:'Papelera', icon:'trash'}] : []),
  ];

  return (
    <AppShell active="gastos">
      {/* Tab bar local del módulo */}
      <div style={{display:'flex',gap:0,padding:'0 36px',background:'var(--paper-raised)',borderBottom:'1px solid var(--line-1)'}}>
        {tabs.map(t=>{
          const active = sub===t.id;
          return (
            <button
              key={t.id}
              onClick={()=>navigate('gastos/'+t.id)}
              style={{display:'flex',alignItems:'center',gap:8,padding:'14px 18px',background:'transparent',border:'none',borderBottom:active?'2px solid var(--clay)':'2px solid transparent',fontSize:13,fontWeight:active?600:500,color:active?'var(--ink-0)':'var(--ink-2)',cursor:'pointer',fontFamily:'inherit',letterSpacing:-.1,marginBottom:-1}}
            >
              <Icon name={t.icon} size={15} color={active?'var(--clay)':'var(--ink-2)'} stroke={active?1.9:1.6}/>
              {t.label}
            </button>
          );
        })}
        <div style={{flex:1}}/>
      </div>

      {/* Contenido del tab */}
      <div style={{flex:1,overflow:'auto'}}>
        {sub==='lista'   && <GastosList onRowClick={(gid)=>navigate('gastos/detalle/'+gid)} onNew={()=>navigate('gastos/nuevo')}/>}
        {sub==='papelera'&& (can('gastos_papelera') ? <GastosPapelera/> : <PapeleraSinPermiso/>)}
        {sub==='resumen' && <GastosResumen/>}
        {sub==='nuevo'   && <GastosForm onCancel={()=>navigate('gastos/lista')} onSave={(gid)=>navigate(gid?'gastos/detalle/'+gid:'gastos/lista')}/>}
        {sub==='detalle' && id && <GastosDetalle gastoId={id} onBack={()=>navigate('gastos/lista')} onEdit={()=>navigate('gastos/editar/'+id)}/>}
        {sub==='detalle' && !id && <DetalleSinId/>}
        {sub==='editar'  && id && <GastosForm gastoId={id} onCancel={()=>navigate('gastos/detalle/'+id)} onSave={(gid)=>navigate('gastos/detalle/'+(gid||id))}/>}
      </div>
    </AppShell>
  );
};

// Placeholder cuando entran a /detalle sin id (p.ej. link viejo)
const DetalleSinId = () => (
  <div style={{padding:60,textAlign:'center',color:'var(--ink-3)',fontSize:13,fontFamily:'var(--sans)'}}>
    <div style={{fontFamily:'var(--serif)',fontSize:20,color:'var(--ink-1)',marginBottom:8}}>Selecciona un gasto</div>
    <div>Vuelve a la lista y toca cualquier fila.</div>
    <div style={{marginTop:16}}><Btn variant="secondary" onClick={()=>navigate('gastos/lista')}>← Ir a la lista</Btn></div>
  </div>
);

const PapeleraSinPermiso = () => (
  <div style={{padding:60,textAlign:'center',color:'var(--ink-3)',fontSize:13,fontFamily:'var(--sans)'}}>
    <div style={{fontFamily:'var(--serif)',fontSize:20,color:'var(--ink-1)',marginBottom:8}}>Sin acceso a la papelera</div>
    <div>Tu rol no tiene el permiso <code>gastos_papelera</code>.</div>
    <div style={{marginTop:16}}><Btn variant="secondary" onClick={()=>navigate('gastos/lista')}>← Volver a la lista</Btn></div>
  </div>
);

// ───── CONFIG — reusa screens existentes ─────

const ConfigCuentasPage = () => (
  <AppShell active="cuentas"><div style={{flex:1,overflow:'auto'}}><CuentasMonedas/></div></AppShell>
);
const ConfigCatalogoPage = () => (
  <AppShell active="conceptos"><div style={{flex:1,overflow:'auto'}}><CatalogoGastos/></div></AppShell>
);
const ConfigServiciosPage = () => (
  <AppShell active="servicios"><div style={{flex:1,overflow:'auto'}}><ServiciosComisiones/></div></AppShell>
);
const ConfigPerfilesPage = () => (
  <AppShell active="perm"><div style={{flex:1,overflow:'auto'}}><PerfilesPermisos/></div></AppShell>
);
const ConfigRespaldoPage = () => (
  <AppShell active="respaldo"><div style={{flex:1,overflow:'auto'}}><RespaldoPanel/></div></AppShell>
);

Object.assign(window, { GastosHome, ConfigCuentasPage, ConfigCatalogoPage, ConfigServiciosPage, ConfigPerfilesPage, ConfigRespaldoPage });
