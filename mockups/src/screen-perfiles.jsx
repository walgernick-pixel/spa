// ──────────────────────────────────────────
// Pantalla: Perfiles y permisos
// Patrón: 2 secciones apiladas
//   1. Perfiles → lista de personas (usuario/contraseña/rol)
//   2. Permisos por rol → bloques apilados con toggles agrupados
// ──────────────────────────────────────────
const PerfilesPermisos = () => {

  // Solo 3 roles — las terapeutas NO se loguean al sistema, se gestionan
  // desde el módulo Colaboradoras (directorio del personal).
  const roles = [
    {id:'admin',     label:'Administrador', inicial:'A', tone:'#6b5d8a',         desc:'Acceso total al sistema'},
    {id:'encargada', label:'Encargada',     inicial:'E', tone:'var(--clay)',     desc:'Operación diaria · captura de gastos y turnos'},
    {id:'contador',  label:'Contador',      inicial:'C', tone:'var(--ink-blue)', desc:'Solo lectura · exportar reportes'},
  ];

  // Usuarios con acceso al sistema administrativo.
  // Las terapeutas NO aparecen aquí — su info vive en Colaboradoras.
  const usuarios = [
    {nombre:'Ivania Ramírez',    usuario:'ivania',   rol:'admin',     activo:true,  ultimoAcceso:'Hoy · 08:42',  tone:'clay'},
    {nombre:'Carmen Jiménez',    usuario:'carmen',   rol:'encargada', activo:true,  ultimoAcceso:'Hoy · 09:15',  tone:'clay'},
    {nombre:'Malena Pérez',      usuario:'malena',   rol:'encargada', activo:true,  ultimoAcceso:'Ayer · 20:30', tone:'moss'},
    {nombre:'Jorge Navarro',     usuario:'jorge',    rol:'contador',  activo:true,  ultimoAcceso:'Lun · 15:20',  tone:'blue'},
  ];

  // Permisos agrupados por categoría. Cada permiso se activa/desactiva por rol.
  // admin siempre todo en true; "gestionar perfiles" solo admin.
  const grupos = [
    {
      id:'vistas', label:'Vistas', permisos:[
        {id:'dashboard',    label:'Ver Dashboard histórico'},
        {id:'reportes',     label:'Ver reportes de ventas'},
        {id:'config',       label:'Acceder a Configuraciones'},
      ],
    },
    {
      id:'turnos', label:'Turnos y ventas', permisos:[
        {id:'abrir_turno',   label:'Abrir nuevos turnos'},
        {id:'cerrar_turno',  label:'Cerrar turno'},
        {id:'ver_cerrados',  label:'Ver turnos cerrados'},
        {id:'editar_cerrados',label:'Editar turnos cerrados'},
        {id:'registrar_venta',label:'Registrar venta'},
      ],
    },
    {
      id:'gastos', label:'Gastos', permisos:[
        {id:'ver_gastos',    label:'Ver gastos'},
        {id:'crear_gasto',   label:'Capturar gastos'},
        {id:'editar_gasto',  label:'Editar gastos existentes'},
        {id:'borrar_gasto',  label:'Borrar gastos'},
      ],
    },
    {
      id:'operaciones', label:'Operaciones', permisos:[
        {id:'pagar_comis',   label:'Pagar comisiones a terapeutas'},
        {id:'exportar',      label:'Exportar PDF / Excel'},
        {id:'gestionar_perm',label:'Gestionar perfiles y permisos'},
      ],
    },
  ];

  // Matriz: qué rol tiene qué permiso (true/false)
  const matrizInicial = {
    admin:     {}, // admin = todo true
    encargada: {
      dashboard:true, reportes:true, config:true,
      abrir_turno:true, cerrar_turno:true, ver_cerrados:true, editar_cerrados:false, registrar_venta:true,
      ver_gastos:true, crear_gasto:true, editar_gasto:true, borrar_gasto:false,
      pagar_comis:true, exportar:true, gestionar_perm:false,
    },
    contador: {
      dashboard:true, reportes:true, config:false,
      abrir_turno:false, cerrar_turno:false, ver_cerrados:true, editar_cerrados:false, registrar_venta:false,
      ver_gastos:true, crear_gasto:false, editar_gasto:false, borrar_gasto:false,
      pagar_comis:false, exportar:true, gestionar_perm:false,
    },
  };
  const [matriz, setMatriz] = React.useState(matrizInicial);

  const toggle = (rolId, permId) => {
    if (rolId === 'admin') return; // admin protegido
    setMatriz(prev => ({
      ...prev,
      [rolId]: { ...prev[rolId], [permId]: !prev[rolId][permId] },
    }));
  };

  const tienePermiso = (rolId, permId) => {
    if (rolId === 'admin') return true;
    return !!matriz[rolId]?.[permId];
  };

  const countPermisos = rolId => {
    if (rolId === 'admin') return grupos.reduce((a,g)=>a+g.permisos.length,0);
    return grupos.reduce((a,g)=>a+g.permisos.filter(p=>matriz[rolId]?.[p.id]).length,0);
  };
  const totalPermisos = grupos.reduce((a,g)=>a+g.permisos.length,0);

  // Estado: rol abierto (solo uno a la vez, tipo acordeón).
  // Arranca con "encargada" abierto para que se vea contenido al cargar.
  const [rolAbierto, setRolAbierto] = React.useState('encargada');
  const toggleRol = id => setRolAbierto(prev => prev === id ? null : id);

  return (
    <div style={{width:'100%',height:'100%',display:'flex',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)'}}>
      {!window.__EMBEDDED__ && <Sidebar active="perm"/>}
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        {/* Header */}
        <div style={{padding:'28px 36px 18px',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16}}>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:600,letterSpacing:.5,textTransform:'uppercase',marginBottom:6}}>Configuración</div>
            <div style={{fontFamily:'var(--serif)',fontSize:34,fontWeight:500,letterSpacing:-.8,color:'var(--ink-0)',lineHeight:1}}>Perfiles y permisos</div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:6}}>Define qué puede hacer cada perfil. Los cambios aplican en el siguiente inicio de sesión.</div>
          </div>
          <Btn variant="clay" size="md" icon="plus">Nuevo perfil</Btn>
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'24px 36px 60px'}}>

          {/* ═══════════ Sección 1 · PERFILES (usuarios) ═══════════ */}
          <SectionHdr
            title="Perfiles"
            subtitle="Personas con acceso al sistema · usuario, contraseña y rol asignado"
            count={usuarios.filter(u=>u.activo).length}
            countLabel={`de ${usuarios.length} activos`}
          />
          <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden',marginBottom:36}}>
            <div style={{display:'grid',gridTemplateColumns:'44px 1.4fr 1fr 140px 150px 80px 50px',gap:14,padding:'11px 20px',background:'var(--paper-sunk)',borderBottom:'1px solid var(--line-1)'}}>
              {['','Nombre','Usuario','Rol','Último acceso','Estado',''].map((h,i)=>(
                <div key={i} style={{fontSize:10,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--ink-3)'}}>{h}</div>
              ))}
            </div>
            {usuarios.map((u,i)=>{
              const r = roles.find(x=>x.id===u.rol);
              return (
                <div key={u.usuario} style={{display:'grid',gridTemplateColumns:'44px 1.4fr 1fr 140px 150px 80px 50px',gap:14,alignItems:'center',padding:'12px 20px',borderTop:i===0?'none':'1px solid var(--line-1)',opacity:u.activo?1:.5}}>
                  <Av name={u.nombre} tone={u.tone} size={28}/>
                  <div style={{fontSize:14,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.1}}>{u.nombre}</div>
                  <div style={{fontSize:12,color:'var(--ink-2)',fontFamily:'var(--mono)'}}>@{u.usuario}</div>
                  <div style={{display:'flex',alignItems:'center',gap:7}}>
                    <div style={{width:7,height:7,borderRadius:999,background:r.tone}}/>
                    <span style={{fontSize:12.5,fontWeight:600,color:'var(--ink-1)'}}>{r.label}</span>
                  </div>
                  <div style={{fontSize:12,color:'var(--ink-3)'}} className="num">{u.ultimoAcceso}</div>
                  <div><Chip tone={u.activo?'moss':'neutral'}>{u.activo?'Activo':'Inactivo'}</Chip></div>
                  <div style={{display:'flex',gap:2,justifyContent:'flex-end'}}>
                    <button title="Editar" style={{background:'transparent',border:'none',cursor:'pointer',padding:6,color:'var(--ink-3)',borderRadius:6}}><Icon name="edit" size={14}/></button>
                  </div>
                </div>
              );
            })}
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'14px 20px',borderTop:'1px dashed var(--line-1)',fontSize:12.5,color:'var(--ink-3)',cursor:'pointer',background:'var(--paper-sunk)'}}>
              <Icon name="plus" size={13} stroke={2}/> Agregar perfil
            </div>
          </div>

          {/* ═══════════ Sección 2 · PERMISOS POR ROL ═══════════ */}
          <SectionHdr
            title="Permisos por rol"
            subtitle="Activa o desactiva acciones por perfil · el rol Administrador está protegido"
            action={<Btn variant="ghost" size="sm" icon="plus">Nuevo rol</Btn>}
          />

          {roles.map(rol => {
            const abierto = rolAbierto === rol.id;
            return (
            <div key={rol.id} style={{marginBottom:10,background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden'}}>
              {/* Encabezado del rol — clickeable para expandir/colapsar */}
              <button
                onClick={()=>toggleRol(rol.id)}
                style={{width:'100%',display:'flex',alignItems:'center',gap:14,padding:'14px 22px',background:abierto?'var(--paper-sunk)':'transparent',borderBottom:abierto?'1px solid var(--line-1)':'none',border:'none',cursor:'pointer',textAlign:'left',fontFamily:'inherit',color:'inherit',transition:'background .12s ease'}}
              >
                <div style={{width:34,height:34,borderRadius:999,background:rol.tone,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--serif)',fontSize:15,fontWeight:600,letterSpacing:-.3,flexShrink:0}}>
                  {rol.inicial}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:15,fontWeight:700,color:'var(--ink-0)',letterSpacing:-.2,lineHeight:1.1}}>{rol.label}</div>
                  <div style={{fontSize:12,color:'var(--ink-3)',marginTop:3}}>{rol.desc}</div>
                </div>
                <div style={{fontSize:12,color:'var(--ink-3)',display:'flex',alignItems:'center',gap:14}}>
                  <span><span className="num" style={{fontWeight:700,color:'var(--ink-1)'}}>{countPermisos(rol.id)}</span> / {totalPermisos} permisos</span>
                  {rol.id==='admin' && (
                    <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,color:'var(--ink-3)'}}>
                      <Icon name="lock" size={11} stroke={1.8}/> protegido
                    </span>
                  )}
                  <Icon name={abierto?'chev-down':'chev-right'} size={15} color="var(--ink-3)" stroke={1.8}/>
                </div>
              </button>

              {/* Lista de permisos (solo si está abierto) */}
              {abierto && (
                <div>
                  {grupos.map((g,gi)=>(
                    <div key={g.id}>
                      <div style={{padding:'10px 22px 6px',fontSize:10.5,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)',background:'var(--paper)',borderTop:gi===0?'none':'1px solid var(--line-1)'}}>
                        {g.label}
                      </div>
                      {g.permisos.map((p,pi)=>{
                        const activo = tienePermiso(rol.id, p.id);
                        const disabled = rol.id === 'admin';
                        return (
                          <div key={p.id} style={{display:'flex',alignItems:'center',gap:14,padding:'11px 22px',borderTop:'1px solid var(--line-1)',background:'var(--paper-raised)'}}>
                            <div style={{flex:1,fontSize:13.5,color:'var(--ink-1)',letterSpacing:-.1}}>{p.label}</div>
                            <Toggle checked={activo} disabled={disabled} onClick={()=>toggle(rol.id, p.id)}/>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );})}
        </div>
      </div>
    </div>
  );
};

// ── Header de sección dentro de la misma pantalla
const SectionHdr = ({title, subtitle, count, countLabel, action}) => (
  <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:12,marginBottom:12,paddingBottom:10,borderBottom:'1px solid var(--line-1)'}}>
    <div style={{display:'flex',alignItems:'baseline',gap:10,flexWrap:'wrap'}}>
      <h2 style={{fontFamily:'var(--serif)',fontSize:20,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.4,margin:0,lineHeight:1}}>{title}</h2>
      {count!==undefined && (
        <span style={{fontSize:12,color:'var(--ink-3)'}}>
          <span className="num" style={{fontWeight:700,color:'var(--ink-1)'}}>{count}</span> {countLabel}
        </span>
      )}
      {subtitle && <span style={{fontSize:12.5,color:'var(--ink-3)'}}>· {subtitle}</span>}
    </div>
    {action}
  </div>
);

// ── Toggle estilo iOS, verde moss
const Toggle = ({checked, disabled, onClick}) => (
  <button
    onClick={disabled ? undefined : onClick}
    aria-pressed={checked}
    style={{
      width:40, height:22, borderRadius:999,
      background: checked ? 'var(--moss)' : '#d7d1c3',
      border:'none', padding:2, cursor: disabled ? 'not-allowed' : 'pointer',
      display:'inline-flex', alignItems:'center',
      transition:'background .15s ease',
      opacity: disabled ? .5 : 1,
      position:'relative',
    }}
  >
    <span style={{
      width:18, height:18, borderRadius:999, background:'#fff',
      transform: `translateX(${checked ? 18 : 0}px)`,
      transition:'transform .15s ease',
      boxShadow:'0 1px 3px rgba(0,0,0,.2)',
    }}/>
  </button>
);

Object.assign(window,{PerfilesPermisos});
