// Screen — Gastos · Editar (form con datos precargados)
const GastosEditar = () => {
  // Toma el gasto #4 del mock (Lavandería) como ejemplo
  const g = GASTOS_DATA.find(x=>x.id===4);
  const [conceptoId, setConcepto] = React.useState(g.conceptoId);
  const [cuentaId, setCuenta] = React.useState(g.cuentaId);
  const concepto = getConcepto(conceptoId);
  const cat = getCat(conceptoId);
  const cuenta = getCuenta(cuentaId);
  const [monto, setMonto] = React.useState(String(g.monto));
  const [desc, setDesc] = React.useState(g.nota || '');
  const montoNum = parseFloat(monto)||0;
  const mxn = montoNum * (TC[cuenta.moneda]||1);

  return (
    <div style={{width:'100%',height:'100%',display:'flex',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)'}}>
      {!window.__EMBEDDED__ && <Sidebar active="gastos"/>}
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        <div style={{padding:'18px 36px',borderBottom:'1px solid var(--line-1)',background:'var(--paper-raised)',display:'flex',alignItems:'center',gap:14}}>
          <button style={{background:'transparent',border:'none',display:'flex',alignItems:'center',gap:5,color:'var(--ink-2)',fontSize:13,cursor:'pointer',fontWeight:500,fontFamily:'inherit'}}>
            <Icon name="arrow-left" size={15}/> Detalle
          </button>
          <div style={{width:1,height:22,background:'var(--line-1)'}}/>
          <div style={{flex:1}}>
            <div style={{display:'flex',alignItems:'baseline',gap:10}}>
              <div style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:500,letterSpacing:-.4,color:'var(--ink-0)',lineHeight:1}}>Editar gasto</div>
              <Chip tone="amber" style={{fontSize:10}}>
                <Icon name="edit" size={9} stroke={2.4}/> Modificando
              </Chip>
            </div>
            <div style={{fontSize:11,color:'var(--ink-3)',marginTop:4}}>Gasto #{String(g.id).padStart(4,'0')} · Creado 24 feb 2026 por Carmen · Última edición hace 3 minutos</div>
          </div>
          <Btn variant="ghost" size="md">Cancelar</Btn>
          <Btn variant="secondary" size="md" icon="trash" style={{color:'var(--rose)'}}>Eliminar</Btn>
          <Btn variant="clay" size="md" icon="check">Guardar cambios</Btn>
        </div>

        {/* Banner de cambios sin guardar */}
        <div style={{padding:'11px 36px',background:'var(--sand-100)',borderBottom:'1px solid #ecd49a',display:'flex',alignItems:'center',gap:10,fontSize:12,color:'#7a4e10'}}>
          <Icon name="sparkles" size={13} stroke={2}/>
          <span><strong>2 cambios sin guardar</strong> — monto modificado ($950 → $1,050) · descripción modificada</span>
          <div style={{flex:1}}/>
          <button style={{background:'transparent',border:'none',fontSize:12,color:'#7a4e10',cursor:'pointer',textDecoration:'underline',fontWeight:600,fontFamily:'inherit'}}>Descartar cambios</button>
        </div>

        <div style={{flex:1,overflowY:'auto',background:'var(--paper)'}}>
          <div style={{maxWidth:1000,margin:'0 auto',padding:'32px 36px 80px',display:'grid',gridTemplateColumns:'1fr 320px',gap:24}}>
            <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:'26px 28px'}}>
              <div style={{display:'grid',gridTemplateColumns:'170px 1fr',gap:18,marginBottom:18}}>
                <F label="Fecha">
                  <div style={{position:'relative'}}>
                    <Icon name="calendar" size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--ink-3)'}}/>
                    <input type="date" defaultValue={g.fecha} className="cf-input" style={{paddingLeft:34}}/>
                  </div>
                </F>
                <F label="Concepto" hint="La categoría se asigna automáticamente">
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <select className="cf-input" value={conceptoId} onChange={e=>setConcepto(e.target.value)} style={{flex:1}}>
                      {GASTO_CATEGORIAS.map(kat=>(
                        <optgroup key={kat.id} label={kat.label}>
                          {GASTO_CONCEPTOS.filter(c=>c.categoria===kat.id).map(c=>(
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <Chip tone={cat.tone} style={{fontSize:10,padding:'5px 10px'}}>
                      <Icon name="check" size={9} stroke={2.4}/>{cat.label}
                    </Chip>
                  </div>
                </F>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,marginBottom:18}}>
                <F label="Proveedor" hint="Libre · con sugerencias">
                  <input list="provedores" defaultValue={g.provedor} className="cf-input"/>
                  <datalist id="provedores">
                    {GASTO_PROVEDORES.map(p=><option key={p} value={p}/>)}
                  </datalist>
                </F>
                <F label="Cuenta" hint="La moneda se deriva de la cuenta">
                  <div style={{display:'flex',gap:8,alignItems:'center'}}>
                    <select className="cf-input" value={cuentaId} onChange={e=>setCuenta(e.target.value)} style={{flex:1}}>
                      {GASTO_CUENTAS.filter(c=>c.activo).map(c=>(
                        <option key={c.id} value={c.id}>{c.label} · {c.tipo} · {c.moneda}</option>
                      ))}
                    </select>
                    <Chip tone="neutral" style={{fontSize:10,padding:'5px 10px',fontFamily:'var(--mono)',letterSpacing:.5}}>
                      {cuenta.moneda}
                    </Chip>
                  </div>
                </F>
              </div>

              <div style={{display:'grid',gridTemplateColumns:cuenta.moneda==='MXN'?'1fr':'1fr 200px',gap:18,marginBottom:18,padding:'18px',background:'var(--paper-sunk)',borderRadius:10,border:'1px solid var(--line-2)',position:'relative'}}>
                <F label={`Monto en ${cuenta.moneda}`}>
                  <div style={{position:'relative'}}>
                    <span style={{position:'absolute',left:16,top:'50%',transform:'translateY(-50%)',fontFamily:'var(--serif)',fontSize:26,color:'var(--ink-3)',fontWeight:500}}>$</span>
                    <input value={monto} onChange={e=>setMonto(e.target.value)} className="num" style={{width:'100%',padding:'14px 16px 14px 36px',fontSize:26,fontWeight:500,fontFamily:'var(--serif)',letterSpacing:-.3,border:'1px solid var(--amber)',borderRadius:10,background:'#fff9ed',color:'var(--ink-0)',textAlign:'right',boxShadow:'0 0 0 3px rgba(217,143,26,.1)'}}/>
                  </div>
                  <div style={{fontSize:11,color:'var(--amber)',fontWeight:600,marginTop:4,display:'flex',alignItems:'center',gap:4}}>
                    <Icon name="edit" size={10} stroke={2.2}/> Modificado · original $950.00
                  </div>
                </F>
                {cuenta.moneda!=='MXN' && (
                  <F label="Equivalente MXN" hint={`TC ${TC[cuenta.moneda].toFixed(2)}`}>
                    <div className="num" style={{padding:'14px 16px',fontSize:18,fontFamily:'var(--serif)',fontWeight:500,color:'var(--ink-2)',background:'var(--paper-raised)',borderRadius:10,border:'1px solid var(--line-1)',textAlign:'right'}}>
                      ${mxn.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})}
                    </div>
                  </F>
                )}
              </div>

              <div style={{marginBottom:14}}>
                <F label="Descripción / concepto libre">
                  <input value={desc} onChange={e=>setDesc(e.target.value)} className="cf-input" style={{borderColor:'var(--amber)',boxShadow:'0 0 0 3px rgba(217,143,26,.08)'}}/>
                  <div style={{fontSize:11,color:'var(--amber)',fontWeight:600,marginTop:4,display:'flex',alignItems:'center',gap:4}}>
                    <Icon name="edit" size={10} stroke={2.2}/> Modificado
                  </div>
                </F>
              </div>

              <F label="Notas internas" hint="Referencia privada, no se exporta">
                <textarea rows={2} defaultValue="Semana del 18 al 24 de feb. Se incluyó propina de $50 para Juan." className="cf-input" style={{resize:'vertical',minHeight:58}}/>
              </F>
            </div>

            <div>
              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:18,position:'sticky',top:24}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                  <div style={{fontFamily:'var(--serif)',fontSize:15,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2}}>Comprobante</div>
                  <Chip tone="moss" style={{fontSize:9}}><Icon name="check" size={9}/>Adjunto</Chip>
                </div>

                <div style={{aspectRatio:'3/4',background:'linear-gradient(135deg, #f5ecd8 0%, #ede6d6 100%)',borderRadius:10,border:'1px solid var(--line-1)',padding:'18px 16px',fontFamily:'var(--mono)',fontSize:9.5,color:'var(--ink-2)',lineHeight:1.7,position:'relative',overflow:'hidden'}}>
                  <div style={{textAlign:'center',fontWeight:700,fontSize:11,letterSpacing:1,marginBottom:10,color:'var(--ink-0)'}}>LAVANDERÍA XCALACOCO</div>
                  <div style={{textAlign:'center',fontSize:8,color:'var(--ink-3)',marginBottom:14}}>Playa del Carmen</div>
                  <div style={{borderTop:'1px dashed var(--ink-4)',paddingTop:10,marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}><span>Fecha:</span><span>24/02/26</span></div>
                    <div style={{display:'flex',justifyContent:'space-between'}}><span>Nota #:</span><span>00847</span></div>
                  </div>
                  <div style={{borderTop:'1px dashed var(--ink-4)',borderBottom:'1px dashed var(--ink-4)',padding:'7px 0',fontWeight:700,color:'var(--ink-0)',display:'flex',justifyContent:'space-between'}}>
                    <span>TOTAL</span><span>$950.00</span>
                  </div>
                </div>

                <div style={{display:'flex',gap:6,marginTop:12}}>
                  <Btn variant="secondary" size="sm" icon="edit" style={{flex:1,justifyContent:'center'}}>Reemplazar</Btn>
                  <Btn variant="ghost" size="sm" icon="trash" style={{flex:1,justifyContent:'center',color:'var(--rose)'}}>Quitar</Btn>
                </div>

                <div style={{marginTop:14,padding:'10px 12px',background:'var(--paper-sunk)',borderRadius:8,fontSize:10.5,color:'var(--ink-3)',lineHeight:1.4}}>
                  <div style={{display:'flex',alignItems:'center',gap:5,color:'var(--ink-2)',fontWeight:600,marginBottom:4}}>
                    <Icon name="sparkles" size={11} stroke={1.8}/> Historial
                  </div>
                  <div>2 ediciones previas · última hace 3 días por Lupita</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .cf-input{width:100%;padding:10px 12px;font-size:13px;border:1px solid var(--line-1);border-radius:8px;background:var(--paper-raised);color:var(--ink-1);font-family:inherit;letter-spacing:-.1px}
        .cf-input:focus{outline:none;border-color:var(--ink-2);box-shadow:0 0 0 3px rgba(32,28,22,.06)}
        select.cf-input{appearance:none;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238a857e' stroke-width='2' stroke-linecap='round'><path d='M6 9l6 6 6-6'/></svg>");background-repeat:no-repeat;background-position:right 10px center;padding-right:30px}
      `}</style>
    </div>
  );
};

Object.assign(window,{GastosEditar});
