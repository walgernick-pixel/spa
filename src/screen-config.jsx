// Screen 5 — Configuraciones (Colaboradoras) + Login
const ConfigColab = () => {
  const colabs=[
    {name:'Lupita Rangel',tone:'clay',role:'Masajista',tel:'998 123 4567',svcs:52,ventas:89400,estado:'activa',ingreso:'Mar 2022'},
    {name:'Carmen Díaz',tone:'moss',role:'Facialista · Encargada',tel:'998 234 5678',svcs:44,ventas:76800,estado:'activa',ingreso:'Ene 2021'},
    {name:'Sofía Méndez',tone:'sand',role:'Terapeuta',tel:'998 345 6789',svcs:38,ventas:62300,estado:'activa',ingreso:'Jul 2023'},
    {name:'Andrea Paz',tone:'blue',role:'Masajista',tel:'998 456 7890',svcs:32,ventas:58100,estado:'activa',ingreso:'Sep 2023'},
    {name:'Rosa Linares',tone:'ink',role:'Reflexóloga',tel:'998 567 8901',svcs:30,ventas:55790,estado:'activa',ingreso:'Feb 2024'},
  ];
  return (
    <ShellFrame active="colab" title="Colaboradoras" subtitle="5 activas · 2 archivadas"
      right={<Btn variant="clay" icon="plus">Nueva colaboradora</Btn>}>
      <div style={{padding:'20px 36px 48px'}}>
        <div style={{display:'flex',gap:8,marginBottom:18,alignItems:'center'}}>
          <div style={{display:'flex',gap:2,padding:2,background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:8}}>
            <button style={{padding:'6px 14px',fontSize:12,fontWeight:600,border:'none',borderRadius:6,background:'var(--ink-0)',color:'#faf7f1',cursor:'pointer',fontFamily:'inherit'}}>Activas · 5</button>
            <button style={{padding:'6px 14px',fontSize:12,fontWeight:500,border:'none',borderRadius:6,background:'transparent',color:'var(--ink-2)',cursor:'pointer',fontFamily:'inherit'}}>Archivadas · 2</button>
          </div>
          <div style={{flex:1,display:'flex',alignItems:'center',gap:8,padding:'7px 12px',border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)'}}>
            <Icon name="search" size={14} color="var(--ink-3)"/>
            <input placeholder="Buscar colaboradora…" style={{flex:1,border:'none',outline:'none',fontSize:13,background:'transparent',fontFamily:'inherit'}}/>
          </div>
        </div>
        <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden'}}>
          <div style={{display:'grid',gridTemplateColumns:'1.5fr 1.2fr 90px 120px 90px 40px',gap:16,padding:'10px 20px',borderBottom:'1px solid var(--line-1)',background:'var(--paper-sunk)'}}>
            {['Colaboradora','Rol · contacto','Svcs (14d)','Ventas (14d)','Desde',''].map(h=>(
              <div key={h} style={{fontSize:10,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--ink-3)'}}>{h}</div>
            ))}
          </div>
          {colabs.map((c,i)=>(
            <div key={i} style={{display:'grid',gridTemplateColumns:'1.5fr 1.2fr 90px 120px 90px 40px',gap:16,padding:'14px 20px',alignItems:'center',borderTop:i===0?'none':'1px solid var(--line-1)'}}>
              <div style={{display:'flex',alignItems:'center',gap:11}}>
                <Av name={c.name} tone={c.tone} size={34}/>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--ink-0)'}}>{c.name}</div>
                  <div style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>{c.estado}</div>
                </div>
              </div>
              <div>
                <div style={{fontSize:12,color:'var(--ink-1)',fontWeight:500}}>{c.role}</div>
                <div className="num mono" style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>{c.tel}</div>
              </div>
              <div className="num mono" style={{fontSize:13,color:'var(--ink-1)',fontWeight:600}}>{c.svcs}</div>
              <Money amount={c.ventas} size={13} weight={600}/>
              <div style={{fontSize:11,color:'var(--ink-3)'}}>{c.ingreso}</div>
              <button style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--ink-3)',padding:4}}><Icon name="more" size={16}/></button>
            </div>
          ))}
        </div>
      </div>
    </ShellFrame>
  );
};

const Login = () => {
  const [loading, setLoading] = React.useState(false);
  const ingresar = (e) => {
    if(e) e.preventDefault();
    setLoading(true);
    setTimeout(()=>{
      if(window.navigate) window.navigate('turnos');
      else window.location.hash = '#turnos';
    }, 600);
  };
  return (
  <div style={{width:'100%',height:'100%',display:'flex',fontFamily:'var(--sans)',background:'var(--paper)'}}>
    {/* left visual panel */}
    <div style={{flex:1,background:'linear-gradient(140deg, #2e281f 0%, #55382a 60%, #8a5540 100%)',padding:48,display:'flex',flexDirection:'column',justifyContent:'space-between',color:'#faf7f1',position:'relative',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,zIndex:2}}>
        <div style={{width:36,height:36,borderRadius:10,background:'rgba(250,247,241,.1)',border:'1px solid rgba(250,247,241,.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <Icon name="flower" size={20} color="#faf7f1" stroke={1.3}/>
        </div>
        <div>
          <div style={{fontFamily:'var(--serif)',fontSize:20,fontWeight:500,letterSpacing:-.4}}>CashFlow</div>
          <div style={{fontSize:10,opacity:.6,letterSpacing:.8,textTransform:'uppercase'}}>Xcalacoco Spa</div>
        </div>
      </div>
      <div style={{zIndex:2}}>
        <div className="serif" style={{fontSize:42,fontWeight:500,letterSpacing:-1,lineHeight:1.05,marginBottom:16,maxWidth:440}}>Administración del spa, sin Excel.</div>
        <div style={{fontSize:14,opacity:.72,lineHeight:1.55,maxWidth:400}}>Turnos, gastos, comisiones y tesorería — todo en un flujo silencioso, para administración de gerencia.</div>
      </div>
      {/* decorative arcs */}
      <svg viewBox="0 0 600 600" style={{position:'absolute',right:-180,top:-160,width:620,opacity:.13}}>
        <circle cx="300" cy="300" r="280" fill="none" stroke="#faf7f1" strokeWidth="1"/>
        <circle cx="300" cy="300" r="220" fill="none" stroke="#faf7f1" strokeWidth="1"/>
        <circle cx="300" cy="300" r="160" fill="none" stroke="#faf7f1" strokeWidth="1"/>
        <circle cx="300" cy="300" r="100" fill="none" stroke="#faf7f1" strokeWidth="1"/>
      </svg>
    </div>
    {/* right form */}
    <form onSubmit={ingresar} style={{width:440,background:'var(--paper-raised)',padding:56,display:'flex',flexDirection:'column',justifyContent:'center'}}>
      <div style={{fontFamily:'var(--serif)',fontSize:28,fontWeight:500,letterSpacing:-.6,color:'var(--ink-0)',marginBottom:6}}>Bienvenida</div>
      <div style={{fontSize:13,color:'var(--ink-2)',marginBottom:32}}>Sistema de administración · acceso restringido</div>
      <label style={{fontSize:11,fontWeight:600,color:'var(--ink-2)',letterSpacing:.3,marginBottom:6,display:'block'}}>Usuario</label>
      <input defaultValue="carmen" style={{width:'100%',padding:'11px 14px',fontSize:14,border:'1px solid var(--line-1)',borderRadius:8,marginBottom:18,outline:'none',fontFamily:'inherit',background:'var(--paper)'}}/>
      <label style={{fontSize:11,fontWeight:600,color:'var(--ink-2)',letterSpacing:.3,marginBottom:6,display:'block'}}>Contraseña</label>
      <input type="password" defaultValue="••••" style={{width:'100%',padding:'11px 14px',fontSize:14,border:'1px solid var(--line-1)',borderRadius:8,marginBottom:22,outline:'none',fontFamily:'inherit',background:'var(--paper)'}}/>
      <Btn variant="primary" size="lg" style={{width:'100%',justifyContent:'center'}} onClick={ingresar}>{loading?'Entrando…':'Ingresar'}</Btn>
      <div style={{textAlign:'center',fontSize:11,color:'var(--ink-3)',marginTop:22,lineHeight:1.7}}>Uso exclusivo de administración · Xcalacoco Spa</div>
    </form>
  </div>
  );
};

Object.assign(window,{ConfigColab,Login});
