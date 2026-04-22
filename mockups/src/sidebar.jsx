// Sidebar — versión con item "Gastos" agregado
const Sidebar = ({active='gastos', user={name:'Carmen',role:'Encargada',tone:'clay'}}) => {
  const items=[
    {id:'turnos',label:'Punto de venta',icon:'receipt'},
    {id:'gastos',label:'Gastos',icon:'wallet'},
    {id:'dash',label:'Dashboard',icon:'chart'},
  ];
  const cfg=[
    {id:'cuentas',label:'Cuentas y monedas',icon:'coins'},
    {id:'conceptos',label:'Catálogo de gastos',icon:'wallet'},
    {id:'servicios',label:'Servicios y comisiones',icon:'sparkles'},
    {id:'colab',label:'Colaboradoras',icon:'users'},
    {id:'perm',label:'Perfiles y permisos',icon:'shield'},
  ];
  return (
    <aside style={{width:248,height:'100%',background:'var(--paper-raised)',borderRight:'1px solid var(--line-1)',display:'flex',flexDirection:'column',fontFamily:'var(--sans)'}}>
      <div style={{padding:'22px 20px 18px',borderBottom:'1px solid var(--line-1)',display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:32,height:32,borderRadius:8,background:'#201c16',display:'flex',alignItems:'center',justifyContent:'center',color:'#faf7f1'}}>
          <Icon name="flower" size={18} color="#faf7f1" stroke={1.5}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:'var(--serif)',fontSize:17,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.3,lineHeight:1}}>CashFlow</div>
          <div style={{fontSize:10,color:'var(--ink-3)',fontWeight:500,letterSpacing:.4,textTransform:'uppercase',marginTop:3}}>Xcalacoco Spa</div>
        </div>
      </div>

      <nav style={{flex:1,padding:'12px 8px',overflowY:'auto'}}>
        {items.map(it=>(
          <SBItem key={it.id} {...it} active={active===it.id}/>
        ))}
        <div style={{height:1,background:'var(--line-1)',margin:'10px 12px'}}/>
        <div style={{fontSize:10,fontWeight:700,color:'var(--ink-3)',letterSpacing:.8,textTransform:'uppercase',padding:'10px 16px 6px'}}>Configuración</div>
        {cfg.map(it=>(
          <SBItem key={it.id} {...it} active={active===it.id} indent/>
        ))}
      </nav>

      <div style={{padding:'12px',borderTop:'1px solid var(--line-1)',display:'flex',alignItems:'center',gap:10}}>
        <Av name={user.name} tone={user.tone} size={36}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:600,color:'var(--ink-0)',lineHeight:1.1}}>{user.name}</div>
          <div style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>{user.role}</div>
        </div>
        <button style={{background:'transparent',border:'none',cursor:'pointer',width:28,height:28,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--ink-3)'}}>
          <Icon name="logout" size={15}/>
        </button>
      </div>
    </aside>
  );
};

const SBItem = ({label,icon,active,indent,badge})=>(
  <button style={{width:'100%',display:'flex',alignItems:'center',gap:11,padding:indent?'8px 14px 8px 16px':'9px 14px',fontSize:13,fontWeight:active?600:500,color:active?'var(--ink-0)':'var(--ink-2)',background:active?'var(--paper-sunk)':'transparent',border:'none',borderRadius:8,cursor:'pointer',textAlign:'left',marginBottom:1,fontFamily:'inherit',letterSpacing:-.1}}>
    <Icon name={icon} size={indent?15:17} color={active?'var(--clay)':'var(--ink-2)'} stroke={active?1.9:1.6}/>
    <span style={{flex:1}}>{label}</span>
    {badge && <span style={{fontSize:10,padding:'2px 7px',background:'var(--clay)',color:'#fff',borderRadius:999,fontWeight:700}}>{badge}</span>}
  </button>
);

Object.assign(window,{Sidebar,SBItem});
