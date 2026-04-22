// Screen 2 — PV dentro del turno (desglose por moneda en FILAS, no columnas)
const MON = {
  mxn:{codigo:'MXN',nombre:'Peso mexicano',sym:'$',tc:1,color:'#8a5540'},
  usd:{codigo:'USD',nombre:'Dólar estadounidense',sym:'US$',tc:17.20,color:'#3d6b4a'},
  cad:{codigo:'CAD',nombre:'Dólar canadiense',sym:'C$',tc:12.40,color:'#b86b28'},
  td:{codigo:'TARJETA',nombre:'Tarjeta',sym:'$',tc:1,color:'#534AB7'},
};

const fmon = (n,m) => `${m.codigo} ${Math.round(n).toLocaleString()}.00`;
const fmonShort = (n,m) => `${m.sym}${Math.round(n).toLocaleString()}`;

const PVTurno = () => {
  const ters=[
    {id:1,name:'Lupita Rangel',tone:'clay',paid:false,role:'Masajista',svcs:[
      {tipo:'Masaje relajante 60m',monto:1200,monId:'mxn',pct:40,tip:150,dir:false},
      {tipo:'Exfoliación',monto:850,monId:'mxn',pct:35,tip:0,dir:false},
    ]},
    {id:2,name:'Tomi García',tone:'moss',paid:false,role:'Terapeuta',svcs:[
      {tipo:'Masaje',monto:500,monId:'usd',pct:40,tip:0,dir:false},
      {tipo:'Trenzas',monto:1000,monId:'cad',pct:40,tip:0,dir:false},
    ]},
    {id:3,name:'Carmen Díaz',tone:'sand',paid:true,role:'Facialista',svcs:[
      {tipo:'Facial hidratante',monto:1400,monId:'mxn',pct:40,tip:100,dir:false},
    ]},
  ];
  const turnoTotal=ters.reduce((a,t)=>a+t.svcs.reduce((s,sv)=>s+sv.monto*MON[sv.monId].tc+sv.tip,0),0);

  return (
    <div style={{width:'100%',height:'100%',display:'flex',fontFamily:'var(--sans)',background:'var(--paper)'}}>
      {!window.__EMBEDDED__ && <Sidebar active="turnos"/>}
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        <div style={{padding:'16px 32px',borderBottom:'1px solid var(--line-1)',background:'var(--paper-raised)',display:'flex',alignItems:'center',gap:16}}>
          <button style={{background:'transparent',border:'none',display:'flex',alignItems:'center',gap:5,color:'var(--ink-2)',fontSize:13,cursor:'pointer',fontWeight:500,fontFamily:'inherit'}}>
            <Icon name="arrow-left" size={15}/> Turnos
          </button>
          <div style={{width:1,height:22,background:'var(--line-1)'}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'baseline',gap:10}}>
              <div style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:500,letterSpacing:-.4,color:'var(--ink-0)',lineHeight:1}}>Sábado 20 abril</div>
              <Chip tone="moss"><span style={{width:5,height:5,borderRadius:999,background:'var(--moss)'}}/>Abierto · 09:12</Chip>
            </div>
            <div style={{fontSize:11,color:'var(--ink-3)',marginTop:4}}>Abrió Carmen · llevan 7h 18m · 3 colaboradoras</div>
          </div>
          <div style={{display:'flex',gap:6,marginRight:12}}>
            <button style={exportBtn}><Icon name="file-text" size={13}/>Recibo PDF</button>
            <button style={exportBtn}><Icon name="download" size={13}/>Excel</button>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:10,color:'var(--ink-3)',fontWeight:700,letterSpacing:.6,textTransform:'uppercase',marginBottom:4}}>Total turno</div>
            <Money amount={turnoTotal} size={24} weight={600}/>
          </div>
        </div>

        <div style={{display:'flex',padding:'0 32px',borderBottom:'1px solid var(--line-1)',background:'var(--paper-raised)',gap:4}}>
          {['Punto de venta','Dashboard','Arqueo'].map((t,i)=>(
            <button key={t} style={{padding:'12px 16px',fontSize:13,fontWeight:i===0?600:500,color:i===0?'var(--clay)':'var(--ink-2)',background:'transparent',border:'none',borderBottom:i===0?'2px solid var(--clay)':'2px solid transparent',cursor:'pointer',marginBottom:-1,fontFamily:'inherit'}}>
              {t}{i===2 && <span style={{marginLeft:6,fontSize:10,padding:'1px 5px',background:'var(--paper-sunk)',borderRadius:4,color:'var(--ink-3)'}}>bloqueado</span>}
            </button>
          ))}
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'18px 32px 40px'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',border:'1px dashed var(--line-1)',borderRadius:10,background:'var(--paper-raised)',fontSize:13,color:'var(--ink-3)',marginBottom:14}}>
            <Icon name="plus" size={14}/> Agregar colaboradora al turno…
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {ters.map((t,i)=>(<TerBlock key={t.id} t={t} expanded={i===1}/>))}
          </div>

          <div style={{marginTop:20,padding:16,background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:'var(--ink-0)',marginBottom:2}}>¿Listas para cerrar el turno?</div>
              <div style={{fontSize:12,color:'var(--ink-2)'}}>Paga comisiones pendientes, luego pasa al arqueo.</div>
            </div>
            <Btn variant="moss" icon="arrow-right" size="lg">Ir a arqueo</Btn>
          </div>
        </div>
      </div>
    </div>
  );
};

const exportBtn = {
  display:'flex',alignItems:'center',gap:5,padding:'7px 11px',fontSize:11,fontWeight:600,
  background:'var(--paper-raised)',color:'var(--ink-1)',border:'1px solid var(--line-1)',
  borderRadius:7,cursor:'pointer',fontFamily:'inherit'
};

const groupByMon = (svcs) => {
  const acc = {};
  svcs.forEach(s => {
    const m = MON[s.monId];
    if (!acc[s.monId]) acc[s.monId] = {mon:m, venta:0, com:0, cv:0, tip:0};
    const g = acc[s.monId];
    g.venta += s.monto;
    if (s.dir) g.cv += s.monto;
    else g.com += Math.round(s.monto * s.pct/100);
    g.tip += s.tip;
  });
  return acc;
};

const TerBlock = ({t,expanded}) => {
  const grouped = groupByMon(t.svcs);
  const totalMXN = Object.values(grouped).reduce((a,g)=>a+(g.venta+g.tip)*g.mon.tc,0);

  return (
    <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden',opacity:t.paid?0.82:1}}>
      <div style={{display:'flex',alignItems:'center',gap:14,padding:'12px 18px',borderBottom:expanded?'1px solid var(--line-1)':'none'}}>
        <Av name={t.name} tone={t.tone} size={36}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{fontSize:14,fontWeight:600,color:'var(--ink-0)'}}>{t.name}</div>
            {t.paid && <Chip tone="moss"><Icon name="check" size={10} stroke={2.5}/>Pagado</Chip>}
          </div>
          <div style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>{t.svcs.length} servicio{t.svcs.length!==1?'s':''}</div>
        </div>
        <div style={{textAlign:'right',marginRight:8}}>
          <Money amount={totalMXN} size={15} weight={600}/>
        </div>
        <button style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--ink-3)',padding:4}}>
          <Icon name="x" size={16}/>
        </button>
        <button style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--ink-3)',padding:4}}>
          <Icon name={expanded?'chev-up':'chev-down'} size={16}/>
        </button>
      </div>

      {expanded && <>
        {/* DESGLOSE POR MONEDA — en FILAS */}
        <div style={{background:'#f6f2e8',borderBottom:'1px solid var(--line-1)'}}>
          {Object.entries(grouped).map(([id,g],i)=>(
            <CurRows key={id} g={g} isLast={i===Object.entries(grouped).length-1}/>
          ))}
        </div>

        {/* Pago */}
        {!t.paid ? (
          <div style={{padding:'12px 18px',background:'#fdecec',borderBottom:'1px solid var(--line-1)'}}>
            <button style={{width:'100%',padding:'11px',fontSize:13,fontWeight:600,background:'transparent',color:'#a0445e',border:'1px dashed #d4a5b3',borderRadius:8,cursor:'pointer',fontFamily:'inherit'}}>
              Marcar como pagado
            </button>
          </div>
        ) : (
          <div style={{padding:'11px 18px',background:'var(--moss-100)',borderBottom:'1px solid var(--line-1)',fontSize:12,color:'var(--moss-700)',textAlign:'center',fontWeight:500,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            <Icon name="check" size={13} stroke={2.5}/> Comisiones pagadas · 14:23
          </div>
        )}

        {/* Services editor */}
        <div style={{padding:'14px 18px'}}>
          <div style={{display:'grid',gridTemplateColumns:'2fr 120px 100px 90px 120px 28px',gap:8,paddingBottom:6,marginBottom:8}}>
            {['Tipo de servicio','Monto','Moneda','% Ter','Propina',''].map(h=>(
              <div key={h} style={{fontSize:9,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--ink-3)'}}>{h}</div>
            ))}
          </div>
          {t.svcs.map((s,i)=>(<SvcRow key={i} s={s}/>))}
          <button style={{background:'transparent',border:'none',color:'var(--clay)',fontSize:12,fontWeight:600,padding:'8px 0 0',cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontFamily:'inherit'}}>
            <Icon name="plus" size={12} stroke={2}/> Agregar servicio
          </button>
        </div>
      </>}
    </div>
  );
};

const CurRows = ({g,isLast}) => {
  const total = g.com + g.cv + g.tip;
  return (
    <div style={{borderBottom:isLast?'none':'1px solid #e8dfce'}}>
      {/* header moneda */}
      <div style={{padding:'9px 18px 4px',display:'flex',alignItems:'center',gap:7}}>
        <span style={{width:7,height:7,borderRadius:999,background:g.mon.color}}/>
        <span style={{fontSize:11,fontWeight:700,letterSpacing:.5,color:g.mon.color,textTransform:'uppercase'}}>{g.mon.nombre} ({g.mon.codigo})</span>
      </div>
      {/* rows */}
      <div style={{padding:'0 18px 2px'}}>
        <CurRow label="Venta" value={`${g.mon.codigo} ${g.venta.toLocaleString()}.00`} color="var(--ink-1)"/>
        {g.com>0 && <CurRow label="Comisión" value={`-${g.mon.codigo} ${g.com.toLocaleString()}.00`} color="#a0445e"/>}
        {g.cv>0 && <CurRow label="Com. directa" value={`${g.mon.codigo} ${g.cv.toLocaleString()}.00`} color="#534AB7"/>}
        {g.tip>0 && <CurRow label="Propinas" value={`${g.mon.codigo} ${g.tip.toLocaleString()}.00`} color="var(--amber)"/>}
      </div>
      {/* total */}
      <div style={{padding:'7px 18px',background:`${g.mon.color}15`,display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:4}}>
        <span style={{fontSize:12,fontWeight:500,color:g.mon.color}}>Total {g.mon.codigo}</span>
        <span className="mono num" style={{fontSize:13,fontWeight:600,color:g.mon.color}}>{g.mon.codigo} {total.toLocaleString()}.00</span>
      </div>
    </div>
  );
};

const CurRow = ({label,value,color}) => (
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'3px 0'}}>
    <span style={{fontSize:12,color:'var(--ink-2)'}}>{label}</span>
    <span className="mono num" style={{fontSize:12.5,color,fontWeight:500}}>{value}</span>
  </div>
);

const SvcRow = ({s})=>{
  const m = MON[s.monId];
  const ter = s.dir?s.monto:Math.round(s.monto*s.pct/100);
  const spa = s.monto-ter;
  return (
    <div style={{marginBottom:4}}>
      <div style={{display:'grid',gridTemplateColumns:'2fr 120px 100px 90px 120px 28px',gap:8,alignItems:'center'}}>
        <Sel value={s.tipo}/>
        <InputN value={s.monto}/>
        <Sel value={m.codigo} small color={m.color}/>
        <Sel value={`${s.pct}%`} small/>
        <Sel value="Prop." placeholder/>
        <button style={{background:'transparent',border:'none',cursor:'pointer',color:'var(--ink-3)',padding:4}}><Icon name="x" size={13}/></button>
      </div>
      <div style={{display:'flex',gap:14,padding:'4px 0 2px 6px',fontSize:11}}>
        <span style={{color:'var(--moss-700)'}}><span style={{fontWeight:600}}>Spa:</span> {m.codigo} {spa.toLocaleString()}.00</span>
        <span style={{color:'#a0445e'}}><span style={{fontWeight:600}}>Ter:</span> {m.codigo} {ter.toLocaleString()}.00</span>
      </div>
    </div>
  );
};

const Sel = ({value,small,color,placeholder}) => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:small?'7px 9px':'8px 11px',fontSize:12,background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:7,color:placeholder?'var(--ink-3)':(color||'var(--ink-1)'),fontWeight:color?600:500}}>
    <span>{value}</span>
    <Icon name="chev-down" size={11} color="var(--ink-3)"/>
  </div>
);

const InputN = ({value}) => (
  <input defaultValue={value} className="num mono" style={{width:'100%',padding:'8px 11px',fontSize:12,textAlign:'right',background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:7,fontFamily:'var(--mono)',fontWeight:500}}/>
);

Object.assign(window,{PVTurno});
