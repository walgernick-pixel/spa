// Screen 1 — Lista de turnos (hub PV)
const ShellFrame = ({active='turnos', children, title, subtitle, right}) => (
  <div style={{width:'100%',height:'100%',display:'flex',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)'}}>
    {!window.__EMBEDDED__ && <Sidebar active={active}/>}
    <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
      {title && (
        <div style={{padding:'28px 36px 0',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16}}>
          <div>
            <div style={{fontFamily:'var(--serif)',fontSize:34,fontWeight:500,letterSpacing:-.8,color:'var(--ink-0)',lineHeight:1}}>{title}</div>
            {subtitle && <div style={{fontSize:13,color:'var(--ink-2)',marginTop:6}}>{subtitle}</div>}
          </div>
          {right}
        </div>
      )}
      <div style={{flex:1,overflowY:'auto'}}>{children}</div>
    </div>
  </div>
);

const TurnosList = () => {
  const turnos=[
    {id:1,fecha:'Hoy · 20 abr',dia:'Sábado',apertura:'09:12',cierre:null,quien:'Carmen',total:24850,svcs:14,status:'abierto',tick:1775},
    {id:2,fecha:'Vie · 19 abr',dia:'Viernes',apertura:'09:05',cierre:'19:42',quien:'Lupita',total:31200,svcs:18,status:'completo',tick:1733},
    {id:3,fecha:'Jue · 18 abr',dia:'Jueves',apertura:'09:18',cierre:'18:55',quien:'Carmen',total:19780,svcs:11,status:'parcial',tick:1798,pendiente:1},
    {id:4,fecha:'Mié · 17 abr',dia:'Miércoles',apertura:'09:01',cierre:'19:10',quien:'Lupita',total:26430,svcs:15,status:'completo',tick:1762},
    {id:5,fecha:'Mar · 16 abr',dia:'Martes',apertura:'09:22',cierre:'19:05',quien:'Carmen',total:22190,svcs:13,status:'completo',tick:1707},
    {id:6,fecha:'Lun · 15 abr',dia:'Lunes',apertura:'09:08',cierre:'18:40',quien:'Carmen',total:17640,svcs:10,status:'completo',tick:1764},
    {id:7,fecha:'Dom · 14 abr',dia:'Domingo',apertura:'09:15',cierre:'19:20',quien:'Lupita',total:29350,svcs:17,status:'completo',tick:1726},
  ];
  const semana={total:171440,svcs:98,tick:1749,vs:+8.4};
  return (
    <ShellFrame active="turnos" title="Turnos" subtitle="Operación diaria · punto de venta"
      right={<Btn variant="clay" icon="plus" size="lg">Abrir turno</Btn>}>
      <div style={{padding:'24px 36px 40px'}}>
        {/* Week ribbon — metric strip */}
        <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr 1fr 1fr',gap:1,background:'var(--line-1)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden',marginBottom:28}}>
          <MetricCell lbl="Semana actual" value={<Money amount={semana.total} size={28}/>} sub={`vs semana pasada`} delta={semana.vs}/>
          <MetricCell lbl="Servicios" value={<span style={{fontFamily:'var(--serif)',fontSize:28,fontWeight:500,letterSpacing:-.5}} className="num">{semana.svcs}</span>} sub="realizados"/>
          <MetricCell lbl="Ticket promedio" value={<Money amount={semana.tick} size={28}/>} sub="por servicio" delta={+3.1}/>
          <MetricCell lbl="Turnos abiertos" value={<span style={{fontFamily:'var(--serif)',fontSize:28,fontWeight:500,color:'var(--clay)'}} className="num">1</span>} sub="pendiente de cerrar"/>
        </div>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)'}}>Últimos 7 días</div>
          <div style={{display:'flex',gap:6}}>
            <Btn variant="secondary" size="sm" icon="download">Exportar</Btn>
          </div>
        </div>

        {/* Turno rows */}
        <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden'}}>
          {turnos.map((t,i)=>(<TurnoRow key={t.id} t={t} first={i===0}/>))}
        </div>
      </div>
    </ShellFrame>
  );
};

const MetricCell = ({lbl,value,sub,delta})=>(
  <div style={{background:'var(--paper-raised)',padding:'16px 20px'}}>
    <div style={{fontSize:10,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:10}}>{lbl}</div>
    <div style={{marginBottom:4}}>{value}</div>
    <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'var(--ink-3)'}}>
      {delta!==undefined && (
        <span style={{color:delta>=0?'var(--moss-700)':'var(--clay-700)',fontWeight:600,display:'inline-flex',alignItems:'center',gap:2}}>
          <Icon name={delta>=0?'arrow-up':'arrow-down'} size={11} stroke={2}/>
          {Math.abs(delta)}%
        </span>
      )}
      <span>{sub}</span>
    </div>
  </div>
);

const TurnoRow = ({t,first}) => {
  const statusMap={
    abierto:{tone:'moss',label:'ABIERTO',dot:'var(--moss)'},
    completo:{tone:'neutral',label:'Completo',dot:'var(--ink-4)'},
    parcial:{tone:'amber',label:'Parcial',dot:'var(--amber)'},
  };
  const s=statusMap[t.status];
  return (
    <div style={{display:'grid',gridTemplateColumns:'auto 1fr auto auto auto auto',alignItems:'center',gap:24,padding:'18px 22px',borderTop:first?'none':'1px solid var(--line-1)',background:t.status==='abierto'?'linear-gradient(90deg, rgba(227,236,210,.5) 0%, transparent 40%)':'transparent',cursor:'pointer'}}>
      {/* Status dot with date */}
      <div style={{display:'flex',alignItems:'center',gap:12,minWidth:160}}>
        <div style={{width:8,height:8,borderRadius:999,background:s.dot,boxShadow:t.status==='abierto'?'0 0 0 4px rgba(79,107,58,.18)':'none'}}/>
        <div>
          <div style={{fontSize:14,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.1}}>{t.fecha}</div>
          <div style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>{t.apertura} – {t.cierre||'en curso'}</div>
        </div>
      </div>
      {/* Timeline bar visualizing open span */}
      <div style={{position:'relative',height:6,background:'var(--paper-sunk)',borderRadius:3,overflow:'hidden'}}>
        <TimelineBar apertura={t.apertura} cierre={t.cierre}/>
      </div>
      {/* who */}
      <div style={{display:'flex',alignItems:'center',gap:7,minWidth:110}}>
        <Av name={t.quien} tone={t.quien==='Carmen'?'clay':'moss'} size={22}/>
        <span style={{fontSize:12,color:'var(--ink-2)'}}>{t.quien}</span>
      </div>
      {/* services */}
      <div className="num" style={{fontSize:13,color:'var(--ink-2)',minWidth:70,textAlign:'right'}}>
        <span style={{fontWeight:600,color:'var(--ink-0)'}}>{t.svcs}</span> svc
      </div>
      {/* total */}
      <div style={{minWidth:120,textAlign:'right'}}>
        <Money amount={t.total} size={18} weight={600}/>
      </div>
      {/* status */}
      <div style={{minWidth:92,textAlign:'right'}}>
        <Chip tone={s.tone}>{s.label}</Chip>
        {t.pendiente && <div style={{fontSize:10,color:'var(--amber)',fontWeight:600,marginTop:4}}>{t.pendiente} pago pendiente</div>}
      </div>
    </div>
  );
};

const TimelineBar = ({apertura,cierre})=>{
  const toMin=(t)=>{if(!t)return null;const [h,m]=t.split(':').map(Number);return h*60+m};
  const open=toMin(apertura), close=cierre?toMin(cierre):toMin('16:30');
  const dayStart=8*60, dayEnd=20*60;
  const left=((open-dayStart)/(dayEnd-dayStart))*100;
  const width=((close-open)/(dayEnd-dayStart))*100;
  const active=!cierre;
  return <>
    <div style={{position:'absolute',left:left+'%',width:width+'%',top:0,bottom:0,background:active?'var(--moss)':'var(--ink-4)',borderRadius:3}}/>
    {active && <div style={{position:'absolute',left:`calc(${left+width}% - 3px)`,top:-2,width:10,height:10,borderRadius:999,background:'var(--moss)',boxShadow:'0 0 0 3px rgba(79,107,58,.25)'}}/>}
  </>;
};

Object.assign(window,{TurnosList,ShellFrame,MetricCell});
