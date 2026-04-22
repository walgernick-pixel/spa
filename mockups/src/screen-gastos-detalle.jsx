// Screen — Gastos · Detalle (ver/editar/borrar) — v2
const GastosDetalle = () => {
  const g = GASTOS_DATA.find(x=>x.id===4);
  const concepto = getConcepto(g.conceptoId);
  const cat = getCat(g.conceptoId);
  const cuenta = getCuenta(g.cuentaId);

  return (
    <div style={{width:'100%',height:'100%',display:'flex',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)'}}>
      {!window.__EMBEDDED__ && <Sidebar active="gastos"/>}
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        <div style={{padding:'18px 36px',borderBottom:'1px solid var(--line-1)',background:'var(--paper-raised)',display:'flex',alignItems:'center',gap:14}}>
          <button style={{background:'transparent',border:'none',display:'flex',alignItems:'center',gap:5,color:'var(--ink-2)',fontSize:13,cursor:'pointer',fontWeight:500,fontFamily:'inherit'}}>
            <Icon name="arrow-left" size={15}/> Gastos
          </button>
          <div style={{width:1,height:22,background:'var(--line-1)'}}/>
          <div style={{flex:1}}>
            <div style={{display:'flex',alignItems:'baseline',gap:10}}>
              <div style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:500,letterSpacing:-.4,color:'var(--ink-0)',lineHeight:1}}>{concepto.label}</div>
              <Chip tone={cat.tone}>{cat.label}</Chip>
            </div>
            <div style={{fontSize:11,color:'var(--ink-3)',marginTop:4}}>Gasto #{String(g.id).padStart(4,'0')} · Carmen · {formatFechaLarga(g.fecha)}</div>
          </div>
          <Btn variant="ghost" size="md" icon="trash" style={{color:'var(--rose)'}}>Eliminar</Btn>
          <Btn variant="secondary" size="md" icon="edit">Editar</Btn>
        </div>

        <div style={{flex:1,overflowY:'auto'}}>
          <div style={{maxWidth:1100,margin:'0 auto',padding:'32px 40px 80px',display:'grid',gridTemplateColumns:'1fr 340px',gap:24}}>
            <div style={{display:'flex',flexDirection:'column',gap:18}}>
              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:'26px 30px'}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:10}}>Monto del gasto</div>
                <Money amount={g.monto} currency={cuenta.moneda} size={52} weight={500}/>
                {cuenta.moneda!=='MXN' && <div style={{marginTop:8,fontSize:13,color:'var(--ink-3)'}} className="num">Equivale a ${g.totalMXN.toLocaleString('es-MX',{minimumFractionDigits:2})} MXN · TC {g.tc.toFixed(2)}</div>}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:20,marginTop:22,paddingTop:20,borderTop:'1px solid var(--line-2)'}}>
                  <DataCell lbl="Cuenta" val={cuenta.label} sub={`${cuenta.tipo} · ${cuenta.moneda}`}/>
                  <DataCell lbl="Proveedor" val={g.provedor}/>
                  <DataCell lbl="Fecha" val={formatFecha(g.fecha)}/>
                </div>
              </div>

              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:'22px 28px'}}>
                <div style={{fontFamily:'var(--serif)',fontSize:16,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2,marginBottom:14}}>Descripción</div>
                <div style={{fontSize:14,color:'var(--ink-1)',lineHeight:1.5,marginBottom:18}}>{g.nota || <span style={{color:'var(--ink-3)',fontStyle:'italic'}}>Sin descripción</span>}</div>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:6}}>Notas internas</div>
                <div style={{fontSize:13,color:'var(--ink-2)',lineHeight:1.5,fontStyle:'italic'}}>Semana del 18 al 24 de feb. Se incluyó propina de $50 para Juan.</div>
              </div>

              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:'22px 28px'}}>
                <div style={{fontFamily:'var(--serif)',fontSize:16,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2,marginBottom:14}}>Historial</div>
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  <HistRow icon="plus" color="var(--moss)" title="Gasto creado" who="Carmen" when="24 feb 2026 · 14:32"/>
                  <HistRow icon="edit" color="var(--ink-blue)" title="Comprobante adjuntado" who="Carmen" when="24 feb 2026 · 14:33"/>
                </div>
              </div>
            </div>

            <div>
              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:18,position:'sticky',top:24}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                  <div style={{fontFamily:'var(--serif)',fontSize:15,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2}}>Comprobante</div>
                  <Chip tone="moss"><Icon name="check" size={9}/>Adjunto</Chip>
                </div>

                <div style={{aspectRatio:'3/4',background:'linear-gradient(135deg, #f5ecd8 0%, #ede6d6 100%)',borderRadius:10,border:'1px solid var(--line-1)',padding:'24px 20px',fontFamily:'var(--mono)',fontSize:10.5,color:'var(--ink-2)',lineHeight:1.7,position:'relative',overflow:'hidden'}}>
                  <div style={{textAlign:'center',fontWeight:700,fontSize:12,letterSpacing:1,marginBottom:14,color:'var(--ink-0)'}}>LAVANDERÍA XCALACOCO</div>
                  <div style={{textAlign:'center',fontSize:9,color:'var(--ink-3)',marginBottom:18,letterSpacing:.5}}>Playa del Carmen</div>
                  <div style={{borderTop:'1px dashed var(--ink-4)',paddingTop:12,marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}><span>Fecha:</span><span>24/02/2026</span></div>
                    <div style={{display:'flex',justifyContent:'space-between'}}><span>Nota #:</span><span>00847</span></div>
                  </div>
                  <div style={{borderTop:'1px dashed var(--ink-4)',paddingTop:12,marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}><span>8kg lavado</span><span>$640</span></div>
                    <div style={{display:'flex',justifyContent:'space-between'}}><span>Planchado</span><span>$260</span></div>
                    <div style={{display:'flex',justifyContent:'space-between'}}><span>Propina</span><span>$50</span></div>
                  </div>
                  <div style={{borderTop:'1px dashed var(--ink-4)',borderBottom:'1px dashed var(--ink-4)',padding:'8px 0',fontWeight:700,color:'var(--ink-0)',display:'flex',justifyContent:'space-between'}}>
                    <span>TOTAL</span><span>$950.00</span>
                  </div>
                </div>

                <div style={{display:'flex',gap:6,marginTop:12}}>
                  <Btn variant="secondary" size="sm" icon="download" style={{flex:1,justifyContent:'center'}}>Descargar</Btn>
                  <Btn variant="ghost" size="sm" icon="edit" style={{flex:1,justifyContent:'center'}}>Reemplazar</Btn>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DataCell = ({lbl,val,sub})=>(
  <div>
    <div style={{fontSize:10,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:5}}>{lbl}</div>
    <div style={{fontSize:14,fontWeight:600,color:'var(--ink-0)'}}>{val}</div>
    {sub && <div style={{fontSize:11,color:'var(--ink-3)',marginTop:2}}>{sub}</div>}
  </div>
);

const HistRow = ({icon,color,title,who,when})=>(
  <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
    <div style={{width:26,height:26,borderRadius:999,background:'var(--paper-sunk)',border:'1px solid var(--line-1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color}}>
      <Icon name={icon} size={12} stroke={2}/>
    </div>
    <div style={{flex:1}}>
      <div style={{fontSize:13,color:'var(--ink-0)',fontWeight:600}}>{title}</div>
      <div style={{fontSize:11.5,color:'var(--ink-3)',marginTop:2}}>{who} · {when}</div>
    </div>
  </div>
);

Object.assign(window,{GastosDetalle,DataCell,HistRow});
