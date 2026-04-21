// Screen 3 — Arqueo: Venta efectivo − Comisiones = Neto en gaveta por moneda
const Arqueo = () => {
  const bloques=[
    {monId:'mxn',nombre:'Peso mexicano',codigo:'MXN',base:true,color:'#3d6fb8',tc:1,venta:0,com:0},
    {monId:'usd',nombre:'Dólar estadounidense',codigo:'USD',color:'#2f8a5e',tc:23.00,venta:500,com:200},
    {monId:'cad',nombre:'dolar canadiense',codigo:'CAD',color:'#b86b28',tc:19.00,venta:0,com:0},
  ];
  const totalSysMXN = bloques.reduce((a,b)=>a+(b.venta-b.com)*b.tc,0);

  return (
    <div style={{width:'100%',height:'100%',display:'flex',fontFamily:'var(--sans)',background:'var(--paper)'}}>
      <Sidebar active="turnos"/>
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        <div style={{padding:'16px 32px',borderBottom:'1px solid var(--line-1)',background:'var(--paper-raised)',display:'flex',alignItems:'center',gap:16}}>
          <button style={{background:'transparent',border:'none',display:'flex',alignItems:'center',gap:5,color:'var(--ink-2)',fontSize:13,cursor:'pointer',fontWeight:500,fontFamily:'inherit'}}>
            <Icon name="arrow-left" size={15}/> Turno
          </button>
          <div style={{width:1,height:22,background:'var(--line-1)'}}/>
          <div style={{flex:1}}>
            <div style={{display:'flex',alignItems:'baseline',gap:10}}>
              <div style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:500,letterSpacing:-.4,color:'var(--ink-0)',lineHeight:1}}>Arqueo de caja</div>
              <Chip tone="amber"><Icon name="lock" size={10}/>A ciegas</Chip>
            </div>
            <div style={{fontSize:11,color:'var(--ink-3)',marginTop:4}}>Cuenta solo el neto que queda en gaveta por moneda</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:10,color:'var(--ink-3)',fontWeight:700,letterSpacing:.6,textTransform:'uppercase',marginBottom:3}}>Esperado · MXN equiv.</div>
            <Money amount={totalSysMXN} size={22} weight={600}/>
          </div>
        </div>

        <div style={{display:'flex',padding:'0 32px',borderBottom:'1px solid var(--line-1)',background:'var(--paper-raised)',gap:4}}>
          {['Punto de venta','Dashboard','Arqueo'].map((t,i)=>(
            <button key={t} style={{padding:'12px 16px',fontSize:13,fontWeight:i===2?600:500,color:i===2?'var(--clay)':'var(--ink-2)',background:'transparent',border:'none',borderBottom:i===2?'2px solid var(--clay)':'2px solid transparent',cursor:'pointer',marginBottom:-1,fontFamily:'inherit'}}>{t}</button>
          ))}
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'22px 40px 40px'}}>
          <div style={{background:'#f0e9df',border:'1px solid #d9c9b2',borderRadius:10,padding:'11px 14px',fontSize:12,color:'#6a4a28',display:'flex',gap:10,marginBottom:22,lineHeight:1.5,alignItems:'flex-start'}}>
            <Icon name="lock" size={15} stroke={1.8}/>
            <div><strong>Cuenta a ciegas.</strong> Solo captura el neto físico por moneda. La diferencia respecto al esperado se revela al enviar.</div>
          </div>

          {/* Column headers top-right */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 130px 130px 110px',gap:16,padding:'0 0 6px',marginBottom:2}}>
            <div/>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:.5,color:'var(--ink-3)',textTransform:'uppercase',textAlign:'right'}}>Sistema</div>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:.5,color:'var(--ink-3)',textTransform:'uppercase',textAlign:'right'}}>Reportado</div>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:.5,color:'var(--ink-3)',textTransform:'uppercase',textAlign:'right'}}>Diferencia</div>
          </div>

          {bloques.map(b=>(<ArqBlock key={b.monId} b={b}/>))}

          <button style={{width:'100%',marginTop:20,padding:'16px',fontSize:15,fontWeight:600,background:'var(--moss)',color:'#fff',border:'none',borderRadius:12,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            Enviar corte y cerrar turno <Icon name="arrow-right" size={16} stroke={2}/>
          </button>
          <div style={{textAlign:'center',fontSize:11,color:'var(--ink-3)',marginTop:8}}>Al enviar verás diferencias por moneda y el turno quedará cerrado</div>
        </div>
      </div>
    </div>
  );
};

const ArqBlock = ({b}) => {
  const neto = b.venta - b.com;
  return (
    <div style={{padding:'16px 0 6px',borderTop:'1px solid var(--line-1)'}}>
      {/* header moneda */}
      <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:6}}>
        <span style={{width:9,height:9,borderRadius:999,background:b.color}}/>
        <span style={{fontSize:15,fontWeight:600,color:'var(--ink-0)'}}>{b.nombre} ({b.codigo})</span>
        {!b.base && <span style={{fontSize:11,color:'var(--ink-3)',fontWeight:500}}>TC {b.tc.toFixed(2)} MXN</span>}
        {b.base && <Chip tone="moss" style={{fontSize:9}}>Base</Chip>}
      </div>

      {/* venta efectivo / comisiones rows */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 130px 130px 110px',gap:16,alignItems:'center',padding:'5px 0'}}>
        <div style={{fontSize:12.5,color:'var(--ink-2)'}}>Venta efectivo</div>
        <div className="mono num" style={{fontSize:13,color:'var(--ink-1)',textAlign:'right',fontWeight:600}}>{b.codigo} {b.venta.toFixed(2)}</div>
        <div/><div/>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 130px 130px 110px',gap:16,alignItems:'center',padding:'5px 0'}}>
        <div style={{fontSize:12.5,color:'var(--ink-2)'}}>− Comisiones</div>
        <div className="mono num" style={{fontSize:13,color:'#a0445e',textAlign:'right',fontWeight:500}}>-{b.codigo} {b.com.toFixed(2)}</div>
        <div/><div/>
      </div>

      {/* neto row with input */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 130px 130px 110px',gap:16,alignItems:'center',padding:'10px 0 2px',borderTop:'1px solid var(--line-2)',marginTop:6}}>
        <div style={{fontSize:13,color:'var(--ink-0)',fontWeight:600}}>Neto en gaveta</div>
        <div className="mono num" style={{fontSize:14,color:'var(--ink-0)',textAlign:'right',fontWeight:700}}>{b.codigo} {neto.toFixed(2)}</div>
        <input placeholder="0" className="num mono" style={{width:'100%',padding:'9px 12px',fontSize:14,fontWeight:600,textAlign:'right',border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontFamily:'var(--mono)',color:'var(--ink-0)'}}/>
        <div className="mono num" style={{fontSize:12,color:'var(--ink-3)',textAlign:'right'}}>—</div>
      </div>
    </div>
  );
};

Object.assign(window,{Arqueo});
