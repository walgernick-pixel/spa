// Screen — Gastos · Resumen — v2 (usa getCat y totalMXN)
const GastosResumen = () => {
  const dataMes = GASTOS_DATA.filter(g=>g.fecha.startsWith('2026-02'));
  const totalMes = dataMes.reduce((a,b)=>a+b.totalMXN,0);
  const porCat = GASTO_CATEGORIAS.map(c=>{
    const items = dataMes.filter(g=>getCat(g.conceptoId).id===c.id);
    const total = items.reduce((a,b)=>a+b.totalMXN,0);
    return {...c, total, count:items.length, pct: totalMes?total/totalMes*100:0};
  }).sort((a,b)=>b.total-a.total);

  const meses = ['2025-10','2025-11','2025-12','2026-01','2026-02'];
  const porMes = meses.map(m=>{
    const items = GASTOS_DATA.filter(g=>g.fecha.startsWith(m));
    const total = items.reduce((a,b)=>a+b.totalMXN,0);
    const stack = GASTO_CATEGORIAS.map(c=>({
      cat:c, total:items.filter(g=>getCat(g.conceptoId).id===c.id).reduce((a,b)=>a+b.totalMXN,0)
    }));
    return {m, total, count:items.length, stack};
  });
  const maxMes = Math.max(...porMes.map(p=>p.total));

  const provAgg = {};
  dataMes.forEach(g=>{ provAgg[g.provedor]=(provAgg[g.provedor]||0)+g.totalMXN; });
  const topProv = Object.entries(provAgg).sort((a,b)=>b[1]-a[1]).slice(0,5);

  const nombreMes = (m)=>{const mm=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];const [y,n]=m.split('-');return `${mm[parseInt(n)-1]} ${y.slice(2)}`;};

  return (
    <div style={{width:'100%',height:'100%',display:'flex',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)'}}>
      {!window.__EMBEDDED__ && <Sidebar active="gastos"/>}
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        <div style={{padding:'28px 36px 20px',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16}}>
          <div>
            <div style={{fontFamily:'var(--serif)',fontSize:34,fontWeight:500,letterSpacing:-.8,color:'var(--ink-0)',lineHeight:1}}>Gastos</div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:6}}>Resumen · análisis por categoría y periodo</div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <Btn variant="secondary" size="md" icon="download">Exportar PDF</Btn>
            <Btn variant="secondary" size="md" icon="download">Excel</Btn>
          </div>
        </div>

        <div style={{display:'flex',padding:'0 36px',borderBottom:'1px solid var(--line-1)',gap:4}}>
          {[['Lista',false],['Resumen',true]].map(([t,active])=>(
            <button key={t} style={{padding:'12px 16px',fontSize:13,fontWeight:active?600:500,color:active?'var(--clay)':'var(--ink-2)',background:'transparent',border:'none',borderBottom:active?'2px solid var(--clay)':'2px solid transparent',cursor:'pointer',marginBottom:-1,fontFamily:'inherit'}}>{t}</button>
          ))}
        </div>

        <div style={{flex:1,overflowY:'auto',padding:'24px 36px 60px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
            <div style={{display:'flex',gap:4,background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:10,padding:4}}>
              {['Este mes','Mes pasado','Últimos 3m','Últimos 6m','Año','Personalizado'].map((t,i)=>(
                <button key={t} style={{padding:'7px 14px',fontSize:12,fontWeight:i===0?700:500,border:'none',borderRadius:7,background:i===0?'var(--ink-0)':'transparent',color:i===0?'var(--paper)':'var(--ink-2)',cursor:'pointer',fontFamily:'inherit'}}>{t}</button>
              ))}
            </div>
            <div style={{fontSize:12,color:'var(--ink-3)'}}>
              <span style={{fontWeight:600,color:'var(--ink-1)'}}>1 – 28 feb 2026</span> · {dataMes.length} registros
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:14,marginBottom:24}}>
            <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:'24px 28px'}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:10}}>Total egresos · febrero 2026</div>
              <div style={{display:'flex',alignItems:'flex-end',gap:16}}>
                <Money amount={totalMes} size={48} weight={500}/>
              </div>
              <div style={{display:'flex',gap:4,marginTop:18,height:8,borderRadius:999,overflow:'hidden',background:'var(--paper-sunk)'}}>
                {porCat.filter(c=>c.total>0).map(c=>(
                  <div key={c.id} style={{width:`${c.pct}%`,background:CAT_COLORS[c.id]}}/>
                ))}
              </div>
              <div style={{display:'flex',gap:14,marginTop:10,flexWrap:'wrap'}}>
                {porCat.filter(c=>c.total>0).map(c=>(
                  <div key={c.id} style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:11,color:'var(--ink-2)'}}>
                    <span style={{width:8,height:8,borderRadius:2,background:CAT_COLORS[c.id]}}/>
                    <span style={{fontWeight:600}}>{c.label}</span>
                    <span style={{color:'var(--ink-3)'}}>{c.pct.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:'20px 24px'}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:10}}>Ticket promedio</div>
              <Money amount={totalMes/dataMes.length} size={26} weight={500}/>
              <div style={{fontSize:11,color:'var(--ink-3)',marginTop:6}}>{dataMes.length} gastos del mes</div>
            </div>
            <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:'20px 24px'}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:10}}>Gasto más grande</div>
              <Money amount={Math.max(...dataMes.map(g=>g.totalMXN))} size={26} weight={500}/>
              <div style={{fontSize:11,color:'var(--ink-3)',marginTop:6}}>Comisión Laura · 28 feb</div>
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:20}}>
            <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:'22px 24px'}}>
              <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:22}}>
                <div>
                  <div style={{fontFamily:'var(--serif)',fontSize:18,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.3}}>Evolución mensual</div>
                  <div style={{fontSize:11.5,color:'var(--ink-3)',marginTop:2}}>Últimos 5 meses · apilado por categoría</div>
                </div>
                <div style={{fontSize:11,color:'var(--ink-3)'}}>MXN</div>
              </div>
              <div style={{display:'flex',alignItems:'flex-end',gap:16,height:220,padding:'0 4px'}}>
                {porMes.map(p=>{
                  const h = maxMes?(p.total/maxMes)*180:0;
                  return (
                    <div key={p.m} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                      <div style={{fontSize:11.5,color:'var(--ink-1)',fontWeight:600,fontFamily:'var(--serif)'}} className="num">${(p.total/1000).toFixed(1)}k</div>
                      <div style={{width:'100%',height:h,display:'flex',flexDirection:'column-reverse',borderRadius:6,overflow:'hidden',background:'var(--paper-sunk)'}}>
                        {p.stack.filter(s=>s.total>0).map(s=>(
                          <div key={s.cat.id} style={{height:`${(s.total/p.total)*100}%`,background:CAT_COLORS[s.cat.id]}}/>
                        ))}
                      </div>
                      <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:500}}>{nombreMes(p.m)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:'22px 24px'}}>
              <div style={{fontFamily:'var(--serif)',fontSize:18,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.3,marginBottom:4}}>Por categoría</div>
              <div style={{fontSize:11.5,color:'var(--ink-3)',marginBottom:18}}>Desglose del mes actual</div>
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                {porCat.filter(c=>c.total>0).map(c=>(
                  <div key={c.id}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:6}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{width:10,height:10,borderRadius:3,background:CAT_COLORS[c.id]}}/>
                        <span style={{fontSize:13,fontWeight:600,color:'var(--ink-0)'}}>{c.label}</span>
                        <span style={{fontSize:11,color:'var(--ink-3)'}}>· {c.count} {c.count===1?'gasto':'gastos'}</span>
                      </div>
                      <Money amount={c.total} size={14} weight={600}/>
                    </div>
                    <div style={{height:6,background:'var(--paper-sunk)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{width:`${c.pct}%`,height:'100%',background:CAT_COLORS[c.id],borderRadius:3}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:'22px 28px',marginTop:20}}>
            <div style={{fontFamily:'var(--serif)',fontSize:18,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.3,marginBottom:18}}>Top proveedores del mes</div>
            <div style={{display:'grid',gridTemplateColumns:'auto 1fr auto auto',gap:'10px 20px',alignItems:'center'}}>
              {topProv.map(([name,val],i)=>(
                <React.Fragment key={name}>
                  <div style={{fontFamily:'var(--serif)',fontSize:16,fontWeight:500,color:'var(--ink-3)',width:24,textAlign:'center'}}>{i+1}</div>
                  <div>
                    <div style={{fontSize:13.5,fontWeight:600,color:'var(--ink-0)'}}>{name}</div>
                    <div style={{height:4,background:'var(--paper-sunk)',borderRadius:2,marginTop:6,overflow:'hidden',width:'100%'}}>
                      <div style={{width:`${val/topProv[0][1]*100}%`,height:'100%',background:'var(--clay)',borderRadius:2}}/>
                    </div>
                  </div>
                  <div style={{fontSize:11,color:'var(--ink-3)'}} className="num">{(val/totalMes*100).toFixed(1)}%</div>
                  <Money amount={val} size={14} weight={600}/>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window,{GastosResumen});
