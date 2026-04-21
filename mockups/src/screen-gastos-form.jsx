// Screen — Gastos · Alta compacta (un solo cuadro denso)
const GastosForm = () => {
  const [conceptoId, setConcepto] = React.useState('lavanderia');
  const [cuentaId, setCuenta] = React.useState('hsbc');
  const concepto = getConcepto(conceptoId);
  const cat = getCat(conceptoId);
  const cuenta = getCuenta(cuentaId);
  const [monto, setMonto] = React.useState('950.00');
  const montoNum = parseFloat(monto)||0;
  const mxn = montoNum * (TC[cuenta.moneda]||1);

  return (
    <div style={{width:'100%',height:'100%',display:'flex',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)'}}>
      <Sidebar active="gastos"/>
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        <div style={{padding:'18px 36px',borderBottom:'1px solid var(--line-1)',background:'var(--paper-raised)',display:'flex',alignItems:'center',gap:14}}>
          <button style={{background:'transparent',border:'none',display:'flex',alignItems:'center',gap:5,color:'var(--ink-2)',fontSize:13,cursor:'pointer',fontWeight:500,fontFamily:'inherit'}}>
            <Icon name="arrow-left" size={15}/> Gastos
          </button>
          <div style={{width:1,height:22,background:'var(--line-1)'}}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:500,letterSpacing:-.4,color:'var(--ink-0)',lineHeight:1}}>Nuevo gasto</div>
            <div style={{fontSize:11,color:'var(--ink-3)',marginTop:4}}>Captura rápida · concepto define categoría, cuenta define moneda</div>
          </div>
          <Btn variant="ghost" size="md">Cancelar</Btn>
          <Btn variant="secondary" size="md">Guardar y nuevo</Btn>
          <Btn variant="clay" size="md" icon="check">Guardar gasto</Btn>
        </div>

        <div style={{flex:1,overflowY:'auto',background:'var(--paper)'}}>
          <div style={{maxWidth:1000,margin:'0 auto',padding:'32px 36px 80px',display:'grid',gridTemplateColumns:'1fr 320px',gap:24}}>
            {/* Cuadro único */}
            <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:'26px 28px'}}>
              {/* Row 1: Fecha + Concepto (que muestra categoría derivada) */}
              <div style={{display:'grid',gridTemplateColumns:'170px 1fr',gap:18,marginBottom:18}}>
                <F label="Fecha">
                  <div style={{position:'relative'}}>
                    <Icon name="calendar" size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--ink-3)'}}/>
                    <input type="date" defaultValue="2026-02-24" className="cf-input" style={{paddingLeft:34}}/>
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
                      <Icon name="check" size={9} stroke={2.4}/>
                      {cat.label}
                    </Chip>
                  </div>
                </F>
              </div>

              {/* Row 2: Proveedor + Cuenta (muestra moneda derivada) */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,marginBottom:18}}>
                <F label="Proveedor" hint="Libre · con sugerencias">
                  <input list="provedores" defaultValue="LAVANDERIA XCALACOCO" className="cf-input"/>
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

              {/* Row 3: Monto grande + equivalente si no es MXN */}
              <div style={{display:'grid',gridTemplateColumns:cuenta.moneda==='MXN'?'1fr':'1fr 200px',gap:18,marginBottom:18,padding:'18px',background:'var(--paper-sunk)',borderRadius:10,border:'1px solid var(--line-2)'}}>
                <F label={`Monto en ${cuenta.moneda}`}>
                  <div style={{position:'relative'}}>
                    <span style={{position:'absolute',left:16,top:'50%',transform:'translateY(-50%)',fontFamily:'var(--serif)',fontSize:26,color:'var(--ink-3)',fontWeight:500}}>$</span>
                    <input value={monto} onChange={e=>setMonto(e.target.value)} className="num" style={{width:'100%',padding:'14px 16px 14px 36px',fontSize:26,fontWeight:500,fontFamily:'var(--serif)',letterSpacing:-.3,border:'1px solid var(--line-1)',borderRadius:10,background:'var(--paper-raised)',color:'var(--ink-0)',textAlign:'right'}}/>
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

              {/* Row 4: Descripción */}
              <div style={{marginBottom:14}}>
                <F label="Descripción / concepto libre" hint="Aparece en la lista">
                  <input defaultValue="Lavandería nota 900 + 50 tip" className="cf-input"/>
                </F>
              </div>

              {/* Row 5: Notas internas */}
              <F label="Notas internas" hint="Referencia privada, no se exporta">
                <textarea rows={2} placeholder="Ej. Incluye propina, semana del 18-24 feb" className="cf-input" style={{resize:'vertical',minHeight:58}}/>
              </F>
            </div>

            {/* Comprobante lateral compacto */}
            <div>
              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:14,padding:18,position:'sticky',top:24}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                  <div style={{fontFamily:'var(--serif)',fontSize:15,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2}}>Comprobante</div>
                  <Chip tone="amber" style={{fontSize:9}}>Recomendado</Chip>
                </div>
                <div style={{fontSize:11,color:'var(--ink-3)',marginBottom:14,lineHeight:1.45}}>Foto del ticket, factura o transferencia.</div>

                <div style={{border:'1.5px dashed var(--line-1)',borderRadius:10,padding:'22px 14px',textAlign:'center',background:'var(--paper-sunk)',cursor:'pointer'}}>
                  <div style={{width:38,height:38,borderRadius:10,background:'var(--paper-raised)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px',color:'var(--clay)',border:'1px solid var(--line-1)'}}>
                    <Icon name="receipt" size={18} stroke={1.7}/>
                  </div>
                  <div style={{fontSize:12.5,fontWeight:600,color:'var(--ink-1)',marginBottom:2}}>Toca para adjuntar</div>
                  <div style={{fontSize:10.5,color:'var(--ink-3)'}}>cámara o archivo</div>
                </div>

                <div style={{marginTop:12,padding:'9px 11px',background:'var(--sand-100)',border:'1px solid #ecd49a',borderRadius:7,display:'flex',gap:8,alignItems:'flex-start'}}>
                  <Icon name="sparkles" size={12} color="#a86b15" stroke={1.8} style={{marginTop:1}}/>
                  <div style={{fontSize:10.5,color:'#7a4e10',lineHeight:1.4}}>Al subir foto leeremos monto y fecha automáticamente.</div>
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

const F = ({label,hint,children})=>(
  <label style={{display:'flex',flexDirection:'column',gap:6}}>
    <div style={{display:'flex',alignItems:'baseline',gap:8}}>
      <span style={{fontSize:11,fontWeight:600,color:'var(--ink-2)',letterSpacing:.2,textTransform:'uppercase'}}>{label}</span>
      {hint && <span style={{fontSize:10.5,color:'var(--ink-3)',fontWeight:500}}>{hint}</span>}
    </div>
    {children}
  </label>
);

Object.assign(window,{GastosForm,F});
