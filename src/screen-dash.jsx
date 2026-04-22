// Screen 4 — Dashboard (histórico) con gráficas mejoradas + ticket promedio
const Dashboard = () => {
  // Synthetic series for last 14 days
  const days=[
    {d:'7 abr',v:18400},{d:'8',v:21100},{d:'9',v:19800},{d:'10',v:24300},
    {d:'11',v:26700},{d:'12',v:31400},{d:'13',v:29800},{d:'14',v:29350},
    {d:'15',v:17640},{d:'16',v:22190},{d:'17',v:26430},{d:'18',v:19780},
    {d:'19',v:31200},{d:'20',v:24850,today:true},
  ];
  const peak=Math.max(...days.map(d=>d.v));
  const total=342390;
  const utilidad=198240;
  const ticket=1749;
  const svcs=196;
  const colabs=[
    {name:'Lupita Rangel',tone:'clay',ventas:89400,svcs:52,tick:1719,pct:26.1},
    {name:'Carmen Díaz',tone:'moss',ventas:76800,svcs:44,tick:1745,pct:22.4},
    {name:'Sofía Méndez',tone:'sand',ventas:62300,svcs:38,tick:1639,pct:18.2},
    {name:'Andrea Paz',tone:'blue',ventas:58100,svcs:32,tick:1816,pct:16.9},
    {name:'Rosa Linares',tone:'ink',ventas:55790,svcs:30,tick:1860,pct:16.3},
  ];
  const tipos=[
    {n:'Masaje relajante',v:98400,c:'var(--c1)'},
    {n:'Masaje profundo',v:74200,c:'var(--c2)'},
    {n:'Facial',v:58900,c:'var(--c3)'},
    {n:'Exfoliación',v:41200,c:'var(--c4)'},
    {n:'Reflexología',v:32400,c:'var(--c5)'},
    {n:'Otros',v:37290,c:'var(--c6)'},
  ];

  return (
    <ShellFrame active="dash" title="Dashboard" subtitle="Últimos 14 días · todas las colaboradoras"
      right={<div style={{display:'flex',gap:8}}>
        <div style={{display:'flex',gap:2,padding:2,background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:8}}>
          {['Hoy','Semana','14 días','Mes','Rango'].map((p,i)=>(
            <button key={p} style={{padding:'6px 11px',fontSize:12,fontWeight:600,border:'none',borderRadius:6,background:i===2?'var(--ink-0)':'transparent',color:i===2?'#faf7f1':'var(--ink-2)',cursor:'pointer',fontFamily:'inherit'}}>{p}</button>
          ))}
        </div>
        <Btn variant="secondary" size="md" icon="download">Exportar</Btn>
      </div>}>
      <div style={{padding:'24px 36px 48px'}}>
        {/* ============ TESORERÍA HERO (bloque nuevo) ============ */}
        <Tesoreria/>
        {/* ============ ======================================== */}

        {/* KPI hero row */}
        <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr 1fr 1fr',gap:14,marginBottom:20}}>
          <KPICard accent hero lbl="Ventas totales" value={<Money amount={total} size={40} weight={500}/>} sub="MXN equivalente · 14 días" delta={+12.4} spark={days}/>
          <KPICard lbl="Ticket promedio" value={<Money amount={ticket} size={28} weight={500}/>} sub="por servicio" delta={+4.2} icon="trend-up"/>
          <KPICard lbl="Utilidad estimada" value={<Money amount={utilidad} size={28} weight={500} color="var(--moss-700)"/>} sub="venta − comisiones" delta={+9.8}/>
          <KPICard lbl="Servicios" value={<span className="num serif" style={{fontSize:28,fontWeight:500,letterSpacing:-.5}}>{svcs}</span>} sub={`${Math.round(svcs/14)} por día (prom.)`} delta={+6.1}/>
        </div>

        {/* Main chart */}
        <Card title="Ventas por día" hint={<span style={{fontSize:11,color:'var(--ink-3)'}}>Pico: <b style={{color:'var(--ink-0)'}}>${peak.toLocaleString()}</b> · vie 19</span>}>
          <LineChart days={days} peak={peak}/>
        </Card>

        <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap:14,marginTop:14}}>
          <Card title="Top colaboradoras" hint="por ventas · 14 días">
            <div style={{marginTop:6}}>
              {colabs.map(c=>(<ColabBar key={c.name} c={c} max={colabs[0].ventas}/>))}
            </div>
          </Card>
          <Card title="Mix de servicios" hint="participación en ingresos">
            <DonutChart data={tipos} total={tipos.reduce((a,x)=>a+x.v,0)}/>
          </Card>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:14}}>
          <Card title="Ticket promedio por día" hint="tendencia">
            <TicketChart days={days}/>
          </Card>
          <Card title="Hora pico de servicios" hint="lun a dom · promedio">
            <HeatStrip/>
          </Card>
        </div>
      </div>
    </ShellFrame>
  );
};

const Card = ({title,hint,children,style={}}) => (
  <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,padding:20,...style}}>
    <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:14}}>
      <div style={{fontFamily:'var(--serif)',fontSize:16,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2}}>{title}</div>
      {hint && <div style={{fontSize:11,color:'var(--ink-3)'}}>{hint}</div>}
    </div>
    {children}
  </div>
);

const KPICard = ({lbl,value,sub,delta,accent,hero,spark,icon})=>(
  <div style={{background:accent?'linear-gradient(135deg, #201c16 0%, #2e281f 100%)':'var(--paper-raised)',color:accent?'#faf7f1':'inherit',border:accent?'none':'1px solid var(--line-1)',borderRadius:12,padding:'18px 20px',position:'relative',overflow:'hidden'}}>
    <div style={{fontSize:10,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:accent?'rgba(250,247,241,.6)':'var(--ink-3)',marginBottom:12}}>{lbl}</div>
    <div style={{marginBottom:hero?16:8}}>{value}</div>
    <div style={{display:'flex',alignItems:'center',gap:8,fontSize:11,color:accent?'rgba(250,247,241,.7)':'var(--ink-3)'}}>
      {delta!==undefined && (
        <span style={{color:delta>=0?(accent?'#b5d98f':'var(--moss-700)'):'var(--clay-700)',fontWeight:700,display:'inline-flex',alignItems:'center',gap:3}}>
          <Icon name={delta>=0?'arrow-up':'arrow-down'} size={11} stroke={2.2}/>{Math.abs(delta)}%
        </span>
      )}
      <span>{sub}</span>
    </div>
    {spark && hero && <div style={{marginTop:16,height:56}}><Sparkline days={spark}/></div>}
  </div>
);

const Sparkline = ({days})=>{
  const w=400,h=56,max=Math.max(...days.map(d=>d.v)),min=Math.min(...days.map(d=>d.v));
  const pts=days.map((d,i)=>{
    const x=(i/(days.length-1))*w;
    const y=h-((d.v-min)/(max-min))*h*0.9-4;
    return [x,y];
  });
  const path=pts.map(([x,y],i)=>(i===0?`M ${x} ${y}`:`L ${x} ${y}`)).join(' ');
  const area=`${path} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{width:'100%',height:'100%'}}>
      <defs><linearGradient id="sg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#c9a66b" stopOpacity=".7"/><stop offset="1" stopColor="#c9a66b" stopOpacity="0"/></linearGradient></defs>
      <path d={area} fill="url(#sg)"/>
      <path d={path} fill="none" stroke="#c9a66b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.slice(-1).map(([x,y],i)=>(<circle key={i} cx={x} cy={y} r="3" fill="#fff"/>))}
    </svg>
  );
};

const LineChart = ({days,peak})=>{
  const w=900,h=220,pad={l:48,r:20,t:20,b:30};
  const iw=w-pad.l-pad.r, ih=h-pad.t-pad.b;
  const max=Math.ceil(peak/10000)*10000;
  const bars=days.map((d,i)=>{
    const bw=iw/days.length*0.6;
    const x=pad.l+(i+0.2)*(iw/days.length);
    const bh=(d.v/max)*ih;
    const y=pad.t+ih-bh;
    return {x,y,bw,bh,d};
  });
  const yTicks=[0,max/4,max/2,3*max/4,max];
  return (
    <div style={{width:'100%',overflow:'hidden'}}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{width:'100%',height:'auto',display:'block'}}>
        {/* grid */}
        {yTicks.map((v,i)=>(
          <g key={i}>
            <line x1={pad.l} x2={w-pad.r} y1={pad.t+ih-(v/max)*ih} y2={pad.t+ih-(v/max)*ih} stroke={i===0?'#c9c3b4':'#ede6d6'} strokeWidth={i===0?1:0.8} strokeDasharray={i===0?'':'2 3'}/>
            <text x={pad.l-8} y={pad.t+ih-(v/max)*ih+3} fontSize="10" fill="#8a857e" textAnchor="end" fontFamily="Geist Mono, monospace">${(v/1000).toFixed(0)}k</text>
          </g>
        ))}
        {/* bars */}
        {bars.map(({x,y,bw,bh,d},i)=>(
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh} rx="2" fill={d.today?'var(--clay)':d.v===peak?'var(--moss)':'#c9a66b'} opacity={d.today||d.v===peak?1:0.75}/>
            <text x={x+bw/2} y={h-10} fontSize="10" fill={d.today?'var(--clay-700)':'#8a857e'} textAnchor="middle" fontWeight={d.today?700:400}>{d.d}</text>
            {d.v===peak && <text x={x+bw/2} y={y-6} fontSize="10" fill="var(--moss-700)" textAnchor="middle" fontWeight="700" fontFamily="Geist Mono, monospace">${(d.v/1000).toFixed(1)}k</text>}
          </g>
        ))}
      </svg>
    </div>
  );
};

const TicketChart = ({days})=>{
  const w=420,h=150,pad={l:42,r:10,t:14,b:24};
  const iw=w-pad.l-pad.r, ih=h-pad.t-pad.b;
  // synthetic ticket per day
  const data=days.map((d,i)=>({d:d.d, v:1600+Math.round(Math.sin(i*0.9)*180)+i*12}));
  const max=Math.max(...data.map(x=>x.v))*1.1, min=Math.min(...data.map(x=>x.v))*0.9;
  const pts=data.map((x,i)=>{
    const px=pad.l+(i/(data.length-1))*iw;
    const py=pad.t+ih-((x.v-min)/(max-min))*ih;
    return [px,py,x];
  });
  const path=pts.map(([x,y],i)=>i===0?`M ${x} ${y}`:`L ${x} ${y}`).join(' ');
  const avg=Math.round(data.reduce((a,x)=>a+x.v,0)/data.length);
  const avgY=pad.t+ih-((avg-min)/(max-min))*ih;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{width:'100%',height:'auto',display:'block'}}>
      <line x1={pad.l} x2={w-pad.r} y1={avgY} y2={avgY} stroke="var(--clay)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5"/>
      <text x={w-pad.r} y={avgY-4} fontSize="9" fill="var(--clay-700)" textAnchor="end" fontFamily="Geist Mono, monospace">prom ${avg}</text>
      <path d={path} fill="none" stroke="var(--moss)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map(([x,y],i)=>(<circle key={i} cx={x} cy={y} r={i===pts.length-1?3.5:2} fill={i===pts.length-1?'var(--clay)':'var(--moss)'} stroke="#fff" strokeWidth="1.5"/>))}
      {pts.filter((_,i)=>i%3===0||i===pts.length-1).map(([x,,d],i)=>(
        <text key={i} x={x} y={h-8} fontSize="9" fill="#8a857e" textAnchor="middle">{d.d}</text>
      ))}
    </svg>
  );
};

const ColabBar = ({c,max})=>(
  <div style={{display:'grid',gridTemplateColumns:'24px 1fr auto',gap:12,alignItems:'center',padding:'9px 0',borderBottom:'1px solid var(--line-2)'}}>
    <Av name={c.name} tone={c.tone} size={24}/>
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:5}}>
        <div style={{fontSize:12,fontWeight:500,color:'var(--ink-1)'}}>{c.name}</div>
        <div style={{fontSize:11,color:'var(--ink-3)'}}><span className="num mono">{c.svcs}</span> svc · tick <span className="num mono" style={{color:'var(--ink-1)'}}>${c.tick}</span></div>
      </div>
      <div style={{height:6,background:'var(--paper-sunk)',borderRadius:3,overflow:'hidden'}}>
        <div style={{width:(c.ventas/max*100)+'%',height:'100%',background:'linear-gradient(90deg, var(--clay) 0%, var(--sand) 100%)',borderRadius:3}}/>
      </div>
    </div>
    <div style={{textAlign:'right',minWidth:100}}>
      <Money amount={c.ventas} size={14} weight={600}/>
      <div style={{fontSize:10,color:'var(--ink-3)',fontWeight:600}}><span className="num mono">{c.pct}%</span> del total</div>
    </div>
  </div>
);

const DonutChart = ({data,total})=>{
  const size=150, r=62, cx=size/2, cy=size/2;
  let acc=0;
  const arcs=data.map(d=>{
    const frac=d.v/total;
    const start=acc*Math.PI*2-Math.PI/2;
    acc+=frac;
    const end=acc*Math.PI*2-Math.PI/2;
    const large=frac>0.5?1:0;
    const x1=cx+r*Math.cos(start), y1=cy+r*Math.sin(start);
    const x2=cx+r*Math.cos(end), y2=cy+r*Math.sin(end);
    return {...d,frac,path:`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`};
  });
  return (
    <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:16,alignItems:'center'}}>
      <div style={{position:'relative',width:size,height:size}}>
        <svg viewBox={`0 0 ${size} ${size}`} style={{width:'100%',height:'100%'}}>
          {arcs.map((a,i)=>(<path key={i} d={a.path} fill={a.c}/>))}
          <circle cx={cx} cy={cy} r="38" fill="var(--paper-raised)"/>
        </svg>
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--ink-3)'}}>Total</div>
          <div className="serif num" style={{fontSize:16,fontWeight:600,letterSpacing:-.3}}>${(total/1000).toFixed(0)}k</div>
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:7}}>
        {arcs.map(a=>(
          <div key={a.n} style={{display:'flex',alignItems:'center',gap:8,fontSize:12}}>
            <div style={{width:8,height:8,borderRadius:2,background:a.c,flexShrink:0}}/>
            <div style={{flex:1,color:'var(--ink-1)'}}>{a.n}</div>
            <div className="num mono" style={{color:'var(--ink-3)',fontSize:11,fontWeight:600}}>{(a.frac*100).toFixed(1)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const HeatStrip = ()=>{
  const hours=['9','10','11','12','13','14','15','16','17','18','19'];
  const days=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  // synth matrix
  const mx=days.map((_,di)=>hours.map((_,hi)=>{
    const peak=Math.exp(-Math.pow(hi-6,2)/14);
    const wk=(di===4||di===5)?1.35:(di===6?1.1:0.85);
    return Math.round(peak*wk*10+Math.random()*2);
  }));
  const max=Math.max(...mx.flat());
  return (
    <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:10}}>
      <div style={{display:'flex',flexDirection:'column',gap:4,paddingTop:18}}>
        {days.map(d=>(<div key={d} style={{fontSize:10,fontWeight:600,color:'var(--ink-3)',height:18,display:'flex',alignItems:'center'}}>{d}</div>))}
      </div>
      <div>
        <div style={{display:'grid',gridTemplateColumns:`repeat(${hours.length}, 1fr)`,gap:3,marginBottom:6}}>
          {hours.map(h=>(<div key={h} style={{fontSize:9,color:'var(--ink-3)',textAlign:'center',fontFamily:'Geist Mono, monospace'}}>{h}h</div>))}
        </div>
        <div style={{display:'grid',gridTemplateRows:`repeat(${days.length}, 1fr)`,gap:3}}>
          {mx.map((row,di)=>(
            <div key={di} style={{display:'grid',gridTemplateColumns:`repeat(${hours.length}, 1fr)`,gap:3}}>
              {row.map((v,hi)=>(
                <div key={hi} style={{height:18,borderRadius:3,background:`rgba(176,74,42,${0.08+(v/max)*0.85})`}}/>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// TESORERÍA · bloque hero del Dashboard
// Saldos por cuenta + ingresos vs egresos del periodo + balance neto
// ============================================================
const Tesoreria = () => {
  // Saldos simulados
  const cuentas = [
    {label:'HSBC',        tipo:'banco',    moneda:'MXN', saldo:142580, delta:+8200,  tono:'moss'},
    {label:'BBVA',        tipo:'banco',    moneda:'MXN', saldo: 68340, delta:-3400,  tono:'clay'},
    {label:'Efectivo MXN',tipo:'efectivo', moneda:'MXN', saldo: 28650, delta:+12100, tono:'sand'},
    {label:'Efectivo USD',tipo:'efectivo', moneda:'USD', saldo:   420, delta:+150,   tono:'ocean'},
    {label:'Efectivo CAD',tipo:'efectivo', moneda:'CAD', saldo:   180, delta:+60,    tono:'ocean'},
    {label:'Tarjeta HSBC',tipo:'tarjeta',  moneda:'MXN', saldo: 17000, delta:0,      tono:'ink'},
  ];
  const TC = {MXN:1, USD:20.5, CAD:15.2};
  const totalMXN = cuentas.reduce((a,c)=>a + c.saldo * (TC[c.moneda]||1), 0);
  const totalMXNPrev = totalMXN - cuentas.reduce((a,c)=>a + c.delta * (TC[c.moneda]||1), 0);
  const balanceDelta = totalMXN - totalMXNPrev;
  const balancePct = (balanceDelta/totalMXNPrev)*100;

  // Ingresos / egresos del periodo
  const ingresos = 342390;
  const egresos  = 144150;
  const neto     = ingresos - egresos;
  const margen   = (neto/ingresos)*100;

  return (
    <div style={{marginBottom:28}}>
      <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:12}}>
        <div style={{display:'flex',alignItems:'baseline',gap:10}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'var(--clay)'}}>Tesorería</div>
          <div style={{fontSize:11,color:'var(--ink-3)'}}>al día de hoy · TC USD ${TC.USD.toFixed(2)} · CAD ${TC.CAD.toFixed(2)}</div>
        </div>
        <button style={{background:'transparent',border:'none',fontSize:12,color:'var(--ink-3)',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:4}}>
          <Icon name="edit" size={12} stroke={1.8}/> Actualizar TC
        </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap:14}}>
        {/* IZQUIERDA: Saldo total + cuentas */}
        <div style={{background:'linear-gradient(135deg, #fef9ef 0%, #fcecd9 100%)',border:'1px solid #ecd49a',borderRadius:14,padding:'22px 24px'}}>
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:18}}>
            <div>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:6}}>Saldo total equivalente en MXN</div>
              <div style={{display:'flex',alignItems:'baseline',gap:12}}>
                <Money amount={Math.round(totalMXN)} size={40} weight={500}/>
                <span style={{color:balanceDelta>=0?'var(--moss-700)':'var(--clay-700)',fontWeight:700,display:'inline-flex',alignItems:'center',gap:3,fontSize:12}}>
                  <Icon name={balanceDelta>=0?'arrow-up':'arrow-down'} size={12} stroke={2.2}/>
                  ${Math.abs(Math.round(balanceDelta)).toLocaleString('es-MX')} · {balancePct>=0?'+':''}{balancePct.toFixed(1)}%
                </span>
              </div>
              <div style={{fontSize:11,color:'var(--ink-3)',marginTop:5}}>vs inicio del periodo</div>
            </div>
          </div>

          {/* Cuentas individuales */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:10}}>
            {cuentas.map(c=>{
              const eq = c.saldo * (TC[c.moneda]||1);
              return (
                <div key={c.label} style={{background:'rgba(254,253,249,.7)',border:'1px solid rgba(217,179,122,.35)',borderRadius:10,padding:'12px 14px'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                    <div style={{fontSize:12,fontWeight:600,color:'var(--ink-0)'}}>{c.label}</div>
                    <div style={{fontSize:9,fontWeight:700,color:'var(--ink-3)',background:'rgba(138,133,126,.12)',padding:'2px 6px',borderRadius:4,fontFamily:'var(--mono)',letterSpacing:.5}}>{c.moneda}</div>
                  </div>
                  <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:3}}>
                    <span className="num serif" style={{fontSize:17,fontWeight:600,letterSpacing:-.3,color:'var(--ink-0)'}}>${c.saldo.toLocaleString('es-MX')}</span>
                  </div>
                  {c.moneda!=='MXN' && (
                    <div className="num mono" style={{fontSize:10,color:'var(--ink-3)'}}>≈ ${Math.round(eq).toLocaleString('es-MX')} MXN</div>
                  )}
                  <div style={{fontSize:10,marginTop:3,color:c.delta>0?'var(--moss-700)':c.delta<0?'var(--clay-700)':'var(--ink-3)',fontWeight:600,display:'flex',alignItems:'center',gap:2}}>
                    {c.delta!==0 && <Icon name={c.delta>0?'arrow-up':'arrow-down'} size={9} stroke={2.4}/>}
                    {c.delta===0 ? 'sin cambio' : `${c.delta>0?'+':''}$${Math.abs(c.delta).toLocaleString('es-MX')}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DERECHA: Ingresos vs Egresos */}
        <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:'22px 24px',display:'flex',flexDirection:'column'}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:14}}>Flujo del periodo · 14 días</div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:18}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--moss-700)',fontWeight:600,marginBottom:4}}>
                <Icon name="arrow-down" size={11} stroke={2.4}/> INGRESOS
              </div>
              <Money amount={ingresos} size={22} weight={500} color="var(--moss-700)"/>
              <div style={{fontSize:10,color:'var(--ink-3)',marginTop:3}}>PV · <span className="num mono">196</span> servicios</div>
            </div>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--clay-700)',fontWeight:600,marginBottom:4}}>
                <Icon name="arrow-up" size={11} stroke={2.4}/> EGRESOS
              </div>
              <Money amount={egresos} size={22} weight={500} color="var(--clay-700)"/>
              <div style={{fontSize:10,color:'var(--ink-3)',marginTop:3}}>Gastos · <span className="num mono">38</span> movimientos</div>
            </div>
          </div>

          {/* Barra visual */}
          <div style={{marginBottom:16}}>
            <div style={{display:'flex',height:10,borderRadius:5,overflow:'hidden',background:'var(--paper-sunk)',border:'1px solid var(--line-2)'}}>
              <div style={{flex:ingresos,background:'var(--moss-700)'}}/>
              <div style={{flex:egresos,background:'var(--clay)'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:9.5,color:'var(--ink-3)',marginTop:4,fontFamily:'var(--mono)'}}>
              <span>{((ingresos/(ingresos+egresos))*100).toFixed(0)}% ingreso</span>
              <span>{((egresos/(ingresos+egresos))*100).toFixed(0)}% egreso</span>
            </div>
          </div>

          <div style={{marginTop:'auto',paddingTop:14,borderTop:'1px dashed var(--line-1)'}}>
            <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between'}}>
              <div style={{fontSize:11,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--ink-2)'}}>Balance neto</div>
              <div style={{fontSize:10,color:'var(--ink-3)',fontWeight:600,fontFamily:'var(--mono)'}}>margen <span style={{color:'var(--moss-700)'}}>{margen.toFixed(1)}%</span></div>
            </div>
            <Money amount={neto} size={28} weight={500} color={neto>=0?'var(--moss-700)':'var(--clay-700)'}/>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window,{Dashboard,KPICard,Card,Tesoreria});
