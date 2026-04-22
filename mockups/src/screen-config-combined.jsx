// Config screens — pantallas combinadas con tabs

// Helper: tab header reusable
const TabHeader = ({tabs, active, onChange}) => (
  <div style={{display:'flex',padding:'0 36px',borderBottom:'1px solid var(--line-1)',gap:4,background:'var(--paper)'}}>
    {tabs.map(t=>{
      const isActive = active===t.id;
      return (
        <button key={t.id} onClick={()=>onChange(t.id)} style={{padding:'13px 18px',fontSize:13,fontWeight:isActive?600:500,color:isActive?'var(--clay)':'var(--ink-2)',background:'transparent',border:'none',borderBottom:isActive?'2px solid var(--clay)':'2px solid transparent',cursor:'pointer',marginBottom:-1,fontFamily:'inherit',display:'inline-flex',alignItems:'center',gap:7}}>
          {t.icon && <Icon name={t.icon} size={14} stroke={1.7}/>}
          {t.label}
          {t.count!==undefined && <span style={{fontSize:10,color:'var(--ink-3)',fontWeight:500,background:'var(--paper-sunk)',padding:'1px 7px',borderRadius:999,border:'1px solid var(--line-1)'}}>{t.count}</span>}
        </button>
      );
    })}
  </div>
);

// ──────────────────────────────────────────
// Pantalla: Cuentas y monedas
// ──────────────────────────────────────────
const CuentasMonedas = () => {
  const [tab,setTab] = React.useState('cuentas');
  const monedaColor={MXN:'var(--ink-blue)',USD:'var(--moss)',CAD:'var(--clay)'};

  return (
    <div style={{width:'100%',height:'100%',display:'flex',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)'}}>
      {!window.__EMBEDDED__ && <Sidebar active="cuentas"/>}
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        <div style={{padding:'28px 36px 18px',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16}}>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:600,letterSpacing:.5,textTransform:'uppercase',marginBottom:6}}>Configuración</div>
            <div style={{fontFamily:'var(--serif)',fontSize:34,fontWeight:500,letterSpacing:-.8,color:'var(--ink-0)',lineHeight:1}}>Cuentas y monedas</div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:6}}>Bancos, efectivo, terminales · tipos de cambio</div>
          </div>
          <Btn variant="clay" size="md" icon="plus">
            {tab==='cuentas'?'Nueva cuenta':'Nueva moneda'}
          </Btn>
        </div>

        <TabHeader active={tab} onChange={setTab} tabs={[
          {id:'cuentas', label:'Cuentas', icon:'coins', count:GASTO_CUENTAS.length},
          {id:'monedas', label:'Monedas y TC', icon:'percent', count:3},
        ]}/>

        <div style={{flex:1,overflowY:'auto',padding:'24px 36px 60px'}}>
          {tab==='cuentas' && (
            <>
              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 140px 100px 140px 100px 80px',gap:14,padding:'12px 22px',fontSize:10,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)',borderBottom:'1px solid var(--line-1)',background:'var(--paper-sunk)'}}>
                  <div>Nombre</div>
                  <div>Tipo</div>
                  <div>Moneda</div>
                  <div style={{textAlign:'right'}}>Saldo actual</div>
                  <div>Estado</div>
                  <div/>
                </div>
                {GASTO_CUENTAS.map((c,i)=>(
                  <div key={c.id} style={{display:'grid',gridTemplateColumns:'1fr 140px 100px 140px 100px 80px',gap:14,alignItems:'center',padding:'14px 22px',borderTop:i===0?'none':'1px solid var(--line-1)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <span style={{width:10,height:10,borderRadius:2,background:monedaColor[c.moneda]}}/>
                      <span style={{fontSize:14,fontWeight:600,color:'var(--ink-0)'}}>{c.label}</span>
                    </div>
                    <div style={{fontSize:12,color:'var(--ink-2)'}}>{c.tipo}</div>
                    <div><Chip tone="neutral" style={{fontSize:10,fontFamily:'var(--mono)',letterSpacing:.5}}>{c.moneda}</Chip></div>
                    <div style={{textAlign:'right'}}><Money amount={c.saldo} currency={c.moneda} size={14} weight={600}/></div>
                    <div><Chip tone={c.activo?'moss':'neutral'}>{c.activo?'Activa':'Archivada'}</Chip></div>
                    <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                      <button style={{background:'transparent',border:'none',cursor:'pointer',padding:6,color:'var(--ink-3)',borderRadius:6}}><Icon name="edit" size={14}/></button>
                      <button style={{background:'transparent',border:'none',cursor:'pointer',padding:6,color:'var(--ink-3)',borderRadius:6}}><Icon name="more" size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:14,padding:'12px 16px',background:'var(--sand-100)',border:'1px solid #ecd49a',borderRadius:8,display:'flex',gap:10,alignItems:'flex-start',fontSize:12,color:'#7a4e10',lineHeight:1.5}}>
                <Icon name="sparkles" size={14} stroke={1.8} style={{marginTop:2}}/>
                <div>La moneda se define al crear la cuenta y <strong>no se puede cambiar después</strong> (rompería el historial). Para cambiar moneda, archiva la cuenta y crea una nueva.</div>
              </div>
            </>
          )}

          {tab==='monedas' && (
            <>
              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 90px 90px 160px 180px 80px',gap:14,padding:'12px 22px',fontSize:10,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)',borderBottom:'1px solid var(--line-1)',background:'var(--paper-sunk)'}}>
                  <div>Moneda</div>
                  <div>Código</div>
                  <div>Símbolo</div>
                  <div style={{textAlign:'right'}}>TC actual (→ MXN)</div>
                  <div>Última actualización</div>
                  <div/>
                </div>
                {[
                  {label:'Peso mexicano',  code:'MXN', sym:'$',   tc:1.00,  base:true,  upd:'—'},
                  {label:'Dólar americano',code:'USD', sym:'US$', tc:23.00, base:false, upd:'24 feb 2026 · 09:12'},
                  {label:'Dólar canadiense',code:'CAD',sym:'C$',  tc:17.00, base:false, upd:'24 feb 2026 · 09:12'},
                ].map((m,i)=>(
                  <div key={m.code} style={{display:'grid',gridTemplateColumns:'1fr 90px 90px 160px 180px 80px',gap:14,alignItems:'center',padding:'14px 22px',borderTop:i===0?'none':'1px solid var(--line-1)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <span style={{width:10,height:10,borderRadius:2,background:monedaColor[m.code]}}/>
                      <div>
                        <div style={{fontSize:14,fontWeight:600,color:'var(--ink-0)'}}>{m.label}</div>
                        {m.base && <div style={{fontSize:10,color:'var(--ink-3)',marginTop:2}}>Moneda base del sistema</div>}
                      </div>
                    </div>
                    <div><Chip tone="neutral" style={{fontSize:10,fontFamily:'var(--mono)',letterSpacing:.5}}>{m.code}</Chip></div>
                    <div style={{fontSize:16,fontFamily:'var(--serif)',fontWeight:500,color:'var(--ink-1)'}}>{m.sym}</div>
                    <div style={{textAlign:'right'}}>
                      {m.base ? (
                        <span style={{fontSize:13,color:'var(--ink-3)',fontStyle:'italic'}}>(base)</span>
                      ) : (
                        <div className="num" style={{fontSize:18,fontFamily:'var(--serif)',fontWeight:500,color:'var(--ink-0)',letterSpacing:-.3}}>{m.tc.toFixed(2)}</div>
                      )}
                    </div>
                    <div style={{fontSize:12,color:'var(--ink-3)'}}>{m.upd}</div>
                    <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                      {!m.base && <button style={{background:'transparent',border:'none',cursor:'pointer',padding:6,color:'var(--clay)',borderRadius:6}} title="Actualizar TC"><Icon name="edit" size={14}/></button>}
                      <button style={{background:'transparent',border:'none',cursor:'pointer',padding:6,color:'var(--ink-3)',borderRadius:6}}><Icon name="more" size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:14,padding:'12px 16px',background:'var(--ink-blue-100)',border:'1px solid #bccdec',borderRadius:8,display:'flex',gap:10,alignItems:'flex-start',fontSize:12,color:'var(--ink-blue)',lineHeight:1.5}}>
                <Icon name="sparkles" size={14} stroke={1.8} style={{marginTop:2}}/>
                <div>El TC se ingresa manualmente. Cada gasto guarda el TC vigente al momento de capturar — si cambias el TC después no afecta gastos anteriores.</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────
// Pantalla: Catálogo de gastos (Conceptos + Categorías)
// ──────────────────────────────────────────
const CatalogoGastos = () => {
  const [tab,setTab] = React.useState('conceptos');
  const [collapsed,setCollapsed] = React.useState({});
  const toggle = (id)=>setCollapsed(s=>({...s,[id]:!s[id]}));

  return (
    <div style={{width:'100%',height:'100%',display:'flex',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)'}}>
      {!window.__EMBEDDED__ && <Sidebar active="conceptos"/>}
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        <div style={{padding:'28px 36px 18px',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16}}>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:600,letterSpacing:.5,textTransform:'uppercase',marginBottom:6}}>Configuración</div>
            <div style={{fontFamily:'var(--serif)',fontSize:34,fontWeight:500,letterSpacing:-.8,color:'var(--ink-0)',lineHeight:1}}>Catálogo de gastos</div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:6}}>Conceptos que se pueden registrar · agrupados por categoría</div>
          </div>
          <Btn variant="clay" size="md" icon="plus">
            {tab==='conceptos'?'Nuevo concepto':'Nueva categoría'}
          </Btn>
        </div>

        <TabHeader active={tab} onChange={setTab} tabs={[
          {id:'conceptos', label:'Conceptos', icon:'wallet', count:GASTO_CONCEPTOS.length},
          {id:'categorias', label:'Categorías', icon:'chart', count:GASTO_CATEGORIAS.length},
        ]}/>

        <div style={{flex:1,overflowY:'auto',padding:'22px 36px 60px'}}>
          {tab==='conceptos' && (
            <>
              <div style={{marginBottom:14,display:'flex',gap:10,alignItems:'center'}}>
                <div style={{position:'relative',flex:'0 1 300px'}}>
                  <Icon name="search" size={14} style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'var(--ink-3)'}}/>
                  <input placeholder="Buscar concepto..." style={{width:'100%',padding:'9px 12px 9px 32px',fontSize:13,border:'1px solid var(--line-1)',borderRadius:8,background:'var(--paper-raised)',fontFamily:'inherit',color:'var(--ink-1)'}}/>
                </div>
                <div style={{flex:1}}/>
                <button onClick={()=>setCollapsed({})} style={{background:'transparent',border:'none',fontSize:12,color:'var(--ink-3)',cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>Expandir todo</button>
                <button onClick={()=>{const s={};GASTO_CATEGORIAS.forEach(c=>s[c.id]=true);setCollapsed(s);}} style={{background:'transparent',border:'none',fontSize:12,color:'var(--ink-3)',cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>Colapsar todo</button>
              </div>

              {GASTO_CATEGORIAS.map(kat=>{
                const items = GASTO_CONCEPTOS.filter(c=>c.categoria===kat.id);
                const isCollapsed = collapsed[kat.id];
                return (
                  <div key={kat.id} style={{marginBottom:14,background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden'}}>
                    <div onClick={()=>toggle(kat.id)} role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle(kat.id);}}} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 20px',background:'var(--paper-sunk)',cursor:'pointer',borderBottom:isCollapsed?'none':'1px solid var(--line-1)',fontFamily:'inherit',textAlign:'left',boxSizing:'border-box'}}>
                      <Icon name={isCollapsed?'chev-right':'chev-down'} size={14} color="var(--ink-2)"/>
                      <span style={{width:10,height:10,borderRadius:2,background:CAT_COLORS[kat.id]}}/>
                      <div style={{fontFamily:'var(--serif)',fontSize:16,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2}}>{kat.label}</div>
                      <div style={{fontSize:11,color:'var(--ink-3)',background:'var(--paper-raised)',padding:'2px 8px',borderRadius:999,border:'1px solid var(--line-1)'}}>{items.length}</div>
                      <div style={{flex:1,fontSize:11.5,color:'var(--ink-3)',fontStyle:'italic',marginLeft:8}}>{kat.desc}</div>
                      <button onClick={(e)=>{e.stopPropagation();}} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'6px 10px',fontSize:11,fontWeight:600,color:'var(--ink-2)',background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:7,cursor:'pointer',fontFamily:'inherit'}}>
                        <Icon name="plus" size={11} stroke={2.2}/> Concepto
                      </button>
                    </div>
                    {!isCollapsed && (
                      <div>
                        {items.map((c,i)=>(
                          <div key={c.id} style={{display:'grid',gridTemplateColumns:'1fr 120px 80px',gap:14,alignItems:'center',padding:'11px 20px 11px 48px',borderTop:i===0?'none':'1px solid var(--line-1)'}}>
                            <div style={{fontSize:13.5,fontWeight:500,color:'var(--ink-1)'}}>{c.label}</div>
                            <div><Chip tone={c.activo?'moss':'neutral'}>{c.activo?'Activo':'Inactivo'}</Chip></div>
                            <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                              <button style={{background:'transparent',border:'none',cursor:'pointer',padding:5,color:'var(--ink-3)',borderRadius:6}}><Icon name="edit" size={13}/></button>
                              <button style={{background:'transparent',border:'none',cursor:'pointer',padding:5,color:'var(--ink-3)',borderRadius:6}}><Icon name="more" size={13}/></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {tab==='categorias' && (
            <>
              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 2fr 100px 100px 80px',gap:14,padding:'12px 22px',fontSize:10,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)',borderBottom:'1px solid var(--line-1)',background:'var(--paper-sunk)'}}>
                  <div>Categoría</div>
                  <div>Descripción</div>
                  <div style={{textAlign:'center'}}>Conceptos</div>
                  <div>Estado</div>
                  <div/>
                </div>
                {GASTO_CATEGORIAS.map((kat,i)=>{
                  const count = GASTO_CONCEPTOS.filter(c=>c.categoria===kat.id).length;
                  return (
                    <div key={kat.id} style={{display:'grid',gridTemplateColumns:'1fr 2fr 100px 100px 80px',gap:14,alignItems:'center',padding:'14px 22px',borderTop:i===0?'none':'1px solid var(--line-1)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <span style={{width:12,height:12,borderRadius:3,background:CAT_COLORS[kat.id]}}/>
                        <span style={{fontSize:14,fontWeight:600,color:'var(--ink-0)'}}>{kat.label}</span>
                      </div>
                      <div style={{fontSize:12,color:'var(--ink-2)'}}>{kat.desc}</div>
                      <div style={{textAlign:'center',fontSize:13,fontWeight:600,color:'var(--ink-1)'}} className="num">{count}</div>
                      <div><Chip tone="moss">Activa</Chip></div>
                      <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                        <button style={{background:'transparent',border:'none',cursor:'pointer',padding:6,color:'var(--ink-3)',borderRadius:6}}><Icon name="edit" size={14}/></button>
                        <button style={{background:'transparent',border:'none',cursor:'pointer',padding:6,color:'var(--ink-3)',borderRadius:6}}><Icon name="more" size={14}/></button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{marginTop:14,padding:'12px 16px',background:'var(--sand-100)',border:'1px solid #ecd49a',borderRadius:8,display:'flex',gap:10,alignItems:'flex-start',fontSize:12,color:'#7a4e10',lineHeight:1.5}}>
                <Icon name="sparkles" size={14} stroke={1.8} style={{marginTop:2}}/>
                <div>No se puede eliminar una categoría si tiene conceptos asignados. Para eliminarla, primero mueve sus conceptos a otra categoría o archívalos.</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────
// Pantalla: Servicios y comisiones
// Catálogo plano (alta libre) + 3 canales editables
// ──────────────────────────────────────────
const ServiciosComisiones = () => {
  const [tab,setTab] = React.useState('servicios');

  // Servicios = catálogo plano, solo nombre + activo.
  // Precio, moneda y duración se definen al momento de la venta.
  const servicios = [
    {nombre:'Masaje',       activo:true, ventas14d:52},
    {nombre:'Fish spa',     activo:true, ventas14d:18},
    {nombre:'Trenzas',      activo:true, ventas14d:24},
    {nombre:'Temazcal',     activo:true, ventas14d:8},
    {nombre:'Reflexología', activo:true, ventas14d:12},
    {nombre:'Exfoliación',  activo:true, ventas14d:9},
    {nombre:'Facial',       activo:false,ventas14d:0},
  ];
  // Inicial del servicio como monograma sobrio
  const initial = s => s.trim().charAt(0).toUpperCase();

  const canales = [
    {id:'hotel',  label:'Hotel',  desc:'Venta traída por hoteles asociados (cliente externo)', pct:60, activo:true, color:'var(--clay)'},
    {id:'modulo', label:'Módulo', desc:'Venta directa en el módulo del spa',                    pct:50, activo:true, color:'var(--moss)'},
    {id:'rol',    label:'Rol',    desc:'Turno rotativo · la venta se asigna al rol',            pct:40, activo:true, color:'var(--ink-blue)'},
  ];

  return (
    <div style={{width:'100%',height:'100%',display:'flex',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)'}}>
      {!window.__EMBEDDED__ && <Sidebar active="servicios"/>}
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        <div style={{padding:'28px 36px 18px',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16}}>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:600,letterSpacing:.5,textTransform:'uppercase',marginBottom:6}}>Configuración</div>
            <div style={{fontFamily:'var(--serif)',fontSize:34,fontWeight:500,letterSpacing:-.8,color:'var(--ink-0)',lineHeight:1}}>Servicios y comisiones</div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:6}}>Catálogo de servicios del spa · comisión al terapeuta según canal de venta</div>
          </div>
          <Btn variant="clay" size="md" icon="plus">
            {tab==='servicios'?'Nuevo servicio':'Editar canales'}
          </Btn>
        </div>

        <TabHeader active={tab} onChange={setTab} tabs={[
          {id:'servicios',  label:'Servicios',  icon:'sparkles', count:servicios.filter(s=>s.activo).length},
          {id:'comisiones', label:'Canales',    icon:'percent',  count:canales.length},
        ]}/>

        <div style={{flex:1,overflowY:'auto',padding:'22px 36px 60px'}}>
          {tab==='servicios' && (
            <>
              {/* Nota explicativa del modelo */}
              <div style={{marginBottom:18,padding:'14px 18px',background:'var(--sand-100)',border:'1px solid #ecd49a',borderRadius:10,display:'flex',gap:12,alignItems:'flex-start',fontSize:12.5,color:'#7a4e10',lineHeight:1.55}}>
                <Icon name="sparkles" size={14} stroke={1.8} style={{marginTop:2,flexShrink:0}}/>
                <div>
                  <strong>Todo es libre al momento de la venta.</strong> Solo el nombre del servicio vive aquí. <span style={{opacity:.7}}>Precio, moneda y duración se capturan en el PV cuando se registra la venta. Así un mismo "Masaje" puede cobrarse $1,000 MXN a un cliente y USD 60 a otro, sin duplicar el catálogo.</span>
                </div>
              </div>

              {/* Catálogo plano */}
              <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,overflow:'hidden'}}>
                <div style={{display:'grid',gridTemplateColumns:'56px 1fr 140px 100px 80px',gap:14,padding:'11px 20px',background:'var(--paper-sunk)',borderBottom:'1px solid var(--line-1)'}}>
                  {['','Servicio','Ventas 14d','Estado',''].map((h,i)=>(
                    <div key={i} style={{fontSize:10,fontWeight:700,letterSpacing:.6,textTransform:'uppercase',color:'var(--ink-3)'}}>{h}</div>
                  ))}
                </div>
                {servicios.map((s,i)=>(
                  <div key={s.nombre} style={{display:'grid',gridTemplateColumns:'56px 1fr 140px 100px 80px',gap:14,alignItems:'center',padding:'14px 20px',borderTop:i===0?'none':'1px solid var(--line-1)',opacity:s.activo?1:.55}}>
                    <div style={{width:36,height:36,borderRadius:8,background:s.activo?'var(--sand-100)':'var(--paper-sunk)',border:`1px solid ${s.activo?'#e6d4a8':'var(--line-1)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--serif)',fontSize:15,fontWeight:600,color:s.activo?'var(--clay)':'var(--ink-3)',letterSpacing:-.3}}>{initial(s.nombre)}</div>
                    <div style={{fontSize:15,fontWeight:600,color:'var(--ink-0)',fontFamily:'var(--serif)',letterSpacing:-.2}}>{s.nombre}</div>
                    <div style={{fontSize:12,color:'var(--ink-3)'}} className="num mono">
                      {s.ventas14d>0 ? <><strong style={{color:'var(--ink-1)',fontWeight:700}}>{s.ventas14d}</strong> servicios</> : '—'}
                    </div>
                    <div><Chip tone={s.activo?'moss':'neutral'}>{s.activo?'Activo':'Archivado'}</Chip></div>
                    <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                      <button style={{background:'transparent',border:'none',cursor:'pointer',padding:6,color:'var(--ink-3)',borderRadius:6}}><Icon name="edit" size={14}/></button>
                      <button style={{background:'transparent',border:'none',cursor:'pointer',padding:6,color:'var(--ink-3)',borderRadius:6}}><Icon name="more" size={14}/></button>
                    </div>
                  </div>
                ))}
                {/* Placeholder vacío para sugerir agregar más */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'14px 20px',borderTop:'1px dashed var(--line-1)',fontSize:12.5,color:'var(--ink-3)',cursor:'pointer',background:'var(--paper-sunk)'}}>
                  <Icon name="plus" size={13} stroke={2}/> Agregar servicio al catálogo
                </div>
              </div>
            </>
          )}

          {tab==='comisiones' && (
            <>
              {/* 3 canales */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:14,marginBottom:24}}>
                {canales.map(c=>(
                  <div key={c.id} style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,padding:'22px 22px 18px',position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:c.color}}/>
                    <div style={{fontSize:11,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:c.color,marginBottom:10}}>Canal · {c.label}</div>
                    <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:12}}>
                      <span style={{fontFamily:'var(--serif)',fontSize:56,fontWeight:500,color:'var(--ink-0)',letterSpacing:-1.5,lineHeight:.9}} className="num">{c.pct}</span>
                      <span style={{fontSize:22,color:'var(--ink-2)',fontWeight:500,fontFamily:'var(--serif)'}}>%</span>
                      <span style={{fontSize:10.5,color:'var(--ink-3)',marginLeft:'auto',fontWeight:600,letterSpacing:.4,textTransform:'uppercase'}}>al terapeuta</span>
                    </div>
                    <div style={{fontSize:12,color:'var(--ink-2)',lineHeight:1.5,minHeight:48}}>{c.desc}</div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12,paddingTop:12,borderTop:'1px solid var(--line-1)'}}>
                      <span style={{fontSize:11,color:'var(--ink-3)'}}>Spa se queda con <strong style={{color:'var(--ink-1)'}}>{100-c.pct}%</strong></span>
                      <Btn variant="ghost" size="sm" icon="edit">Editar</Btn>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mini-ejemplo visual · cómo se aplica en el PV */}
              <div style={{background:'linear-gradient(135deg, #fef9ef 0%, #fcecd9 100%)',border:'1px solid #ecd49a',borderRadius:14,padding:'22px 26px'}}>
                <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:16}}>
                  <div>
                    <div style={{fontSize:10.5,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--clay)',marginBottom:4}}>Ejemplo de aplicación</div>
                    <div style={{fontFamily:'var(--serif)',fontSize:18,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.3}}>Venta de <span style={{color:'var(--clay)'}}>$1,000</span> según canal</div>
                  </div>
                  <div style={{fontSize:11,color:'var(--ink-3)'}}>simulación · datos reales llegan del PV</div>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:14}}>
                  {canales.map(c=>{
                    const precio=1000;
                    const ter=precio*c.pct/100;
                    const spa=precio-ter;
                    return (
                      <div key={c.id} style={{background:'rgba(254,253,249,.85)',border:`1px solid ${c.color}`,borderRadius:10,padding:'14px 16px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                          <div style={{width:8,height:8,borderRadius:999,background:c.color}}/>
                          <div style={{fontSize:13,fontWeight:700,color:'var(--ink-0)'}}>{c.label}</div>
                          <div style={{marginLeft:'auto',fontSize:10,fontWeight:700,color:c.color,background:'#fff',padding:'2px 7px',borderRadius:999,border:`1px solid ${c.color}`,fontFamily:'var(--mono)'}}>{c.pct}%</div>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:6,fontSize:12}}>
                          <span style={{color:'var(--ink-3)'}}>Terapeuta</span>
                          <span className="num mono" style={{fontWeight:700,color:c.color}}>${ter.toLocaleString('es-MX')}</span>
                          <span style={{color:'var(--ink-3)'}}>Spa</span>
                          <span className="num mono" style={{fontWeight:600,color:'var(--ink-2)'}}>${spa.toLocaleString('es-MX')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{marginTop:14,padding:'10px 14px',background:'rgba(254,253,249,.6)',borderRadius:8,fontSize:11.5,color:'#7a4e10',lineHeight:1.5,display:'flex',gap:8,alignItems:'flex-start'}}>
                  <Icon name="sparkles" size={12} stroke={1.8} style={{marginTop:1,flexShrink:0}}/>
                  <div><strong>Nota para el PV:</strong> al capturar una venta, en lugar de elegir "% Ter" manual (40/50/60), la encargada elige el <strong>canal</strong> y el porcentaje se aplica solo. Más rápido, menos errores, y queda registrado el canal para reportes.</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

Object.assign(window,{TabHeader,CuentasMonedas,CatalogoGastos,ServiciosComisiones});
