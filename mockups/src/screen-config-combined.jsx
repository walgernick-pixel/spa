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
      <Sidebar active="cuentas"/>
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
      <Sidebar active="conceptos"/>
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
                    <button onClick={()=>toggle(kat.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 20px',background:'var(--paper-sunk)',border:'none',cursor:'pointer',borderBottom:isCollapsed?'none':'1px solid var(--line-1)',fontFamily:'inherit',textAlign:'left'}}>
                      <Icon name={isCollapsed?'chev-right':'chev-down'} size={14} color="var(--ink-2)"/>
                      <span style={{width:10,height:10,borderRadius:2,background:CAT_COLORS[kat.id]}}/>
                      <div style={{fontFamily:'var(--serif)',fontSize:16,fontWeight:600,color:'var(--ink-0)',letterSpacing:-.2}}>{kat.label}</div>
                      <div style={{fontSize:11,color:'var(--ink-3)',background:'var(--paper-raised)',padding:'2px 8px',borderRadius:999,border:'1px solid var(--line-1)'}}>{items.length}</div>
                      <div style={{flex:1,fontSize:11.5,color:'var(--ink-3)',fontStyle:'italic',marginLeft:8}}>{kat.desc}</div>
                      <button onClick={(e)=>{e.stopPropagation();}} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'6px 10px',fontSize:11,fontWeight:600,color:'var(--ink-2)',background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:7,cursor:'pointer',fontFamily:'inherit'}}>
                        <Icon name="plus" size={11} stroke={2.2}/> Concepto
                      </button>
                    </button>
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
// Pantalla: Servicios y comisiones (shell)
// ──────────────────────────────────────────
const ServiciosComisiones = () => {
  const [tab,setTab] = React.useState('servicios');

  const servMock = [
    {cat:'Masajes', items:[
      {nombre:'Masaje sueco',       dur:60,  precio:1200},
      {nombre:'Masaje tejido profundo',dur:60,precio:1400},
      {nombre:'Masaje piedras calientes',dur:90,precio:1800},
    ]},
    {cat:'Faciales', items:[
      {nombre:'Facial básico',      dur:45,  precio:900},
      {nombre:'Facial antiedad',    dur:60,  precio:1500},
    ]},
    {cat:'Corporales', items:[
      {nombre:'Exfoliación corporal',dur:60, precio:1100},
      {nombre:'Envoltura de algas', dur:75, precio:1600},
    ]},
  ];

  const canales = [
    {id:'hotel',  label:'Venta fuera (hotel)',       desc:'Terapeuta sale a vender a clientes de hotel', pct:60, activo:true, color:'var(--clay)'},
    {id:'modulo', label:'Venta propia en módulo',    desc:'Terapeuta atiende a cliente que llegó al spa',pct:50, activo:true, color:'var(--moss)'},
    {id:'rol',    label:'Rol · venta pasada',         desc:'Le pasan la venta (no la consiguió ella)',   pct:40, activo:true, color:'var(--ink-blue)'},
  ];

  return (
    <div style={{width:'100%',height:'100%',display:'flex',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)'}}>
      <Sidebar active="servicios"/>
      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
        <div style={{padding:'28px 36px 18px',display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:16}}>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:600,letterSpacing:.5,textTransform:'uppercase',marginBottom:6}}>Configuración · Shell preview</div>
            <div style={{fontFamily:'var(--serif)',fontSize:34,fontWeight:500,letterSpacing:-.8,color:'var(--ink-0)',lineHeight:1}}>Servicios y comisiones</div>
            <div style={{fontSize:13,color:'var(--ink-2)',marginTop:6}}>Menú del spa · reglas de comisión por canal de venta</div>
          </div>
          <Btn variant="clay" size="md" icon="plus">
            {tab==='servicios'?'Nuevo servicio':'Nuevo canal'}
          </Btn>
        </div>

        <TabHeader active={tab} onChange={setTab} tabs={[
          {id:'servicios',  label:'Servicios',  icon:'sparkles', count:7},
          {id:'comisiones', label:'Comisiones', icon:'percent',  count:canales.length},
        ]}/>

        <div style={{flex:1,overflowY:'auto',padding:'22px 36px 60px'}}>
          {tab==='servicios' && (
            <>
              <div style={{marginBottom:16,padding:'14px 18px',background:'var(--sand-100)',border:'1px solid #ecd49a',borderRadius:8,display:'flex',gap:10,alignItems:'flex-start',fontSize:12.5,color:'#7a4e10',lineHeight:1.55}}>
                <Icon name="sparkles" size={14} stroke={1.8} style={{marginTop:2}}/>
                <div>
                  <strong>Nota para el sprint de PV:</strong> cada servicio tendrá flags opcionales <code style={{background:'#fff4db',padding:'1px 6px',borderRadius:4,fontFamily:'var(--mono)',fontSize:11}}>precio libre</code> y <code style={{background:'#fff4db',padding:'1px 6px',borderRadius:4,fontFamily:'var(--mono)',fontSize:11}}>duración libre</code> — si están activos, el PV permite editar esos campos al momento de la venta. Además existirá un ítem genérico "Servicio personalizado" para ventas totalmente fuera de catálogo. Esto modifica el módulo PV; se diseña cuando entremos ahí.
                </div>
              </div>
              {servMock.map((grp,gi)=>(
                <div key={grp.cat} style={{marginBottom:14}}>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:.8,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:8,padding:'0 4px'}}>{grp.cat}</div>
                  <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:10,overflow:'hidden'}}>
                    {grp.items.map((s,i)=>(
                      <div key={s.nombre} style={{display:'grid',gridTemplateColumns:'1fr 90px 120px 80px',gap:14,alignItems:'center',padding:'12px 20px',borderTop:i===0?'none':'1px solid var(--line-1)'}}>
                        <div style={{fontSize:14,fontWeight:600,color:'var(--ink-0)'}}>{s.nombre}</div>
                        <div style={{fontSize:12,color:'var(--ink-3)'}} className="num">{s.dur} min</div>
                        <div style={{textAlign:'right'}}><Money amount={s.precio} size={14} weight={600}/></div>
                        <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                          <button style={{background:'transparent',border:'none',cursor:'pointer',padding:5,color:'var(--ink-3)',borderRadius:6}}><Icon name="edit" size={13}/></button>
                          <button style={{background:'transparent',border:'none',cursor:'pointer',padding:5,color:'var(--ink-3)',borderRadius:6}}><Icon name="more" size={13}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {tab==='comisiones' && (
            <>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:14,marginBottom:20}}>
                {canales.map(c=>(
                  <div key={c.id} style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,padding:'20px 22px',position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:c.color}}/>
                    <div style={{fontSize:11,fontWeight:700,letterSpacing:.5,textTransform:'uppercase',color:'var(--ink-3)',marginBottom:8}}>{c.label}</div>
                    <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:10}}>
                      <span style={{fontFamily:'var(--serif)',fontSize:40,fontWeight:500,color:'var(--ink-0)',letterSpacing:-1,lineHeight:1}} className="num">{c.pct}</span>
                      <span style={{fontSize:18,color:'var(--ink-2)',fontWeight:500}}>%</span>
                      <span style={{fontSize:11,color:'var(--ink-3)',marginLeft:'auto'}}>terapeuta</span>
                    </div>
                    <div style={{fontSize:12,color:'var(--ink-2)',lineHeight:1.4,minHeight:34}}>{c.desc}</div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:14,paddingTop:12,borderTop:'1px solid var(--line-1)'}}>
                      <span style={{fontSize:11,color:'var(--ink-3)'}}>Caja: <strong style={{color:'var(--ink-1)'}}>{100-c.pct}%</strong></span>
                      <Btn variant="ghost" size="sm" icon="edit">Editar</Btn>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{padding:'12px 16px',background:'var(--ink-blue-100)',border:'1px solid #bccdec',borderRadius:8,display:'flex',gap:10,alignItems:'flex-start',fontSize:12,color:'var(--ink-blue)',lineHeight:1.5}}>
                <Icon name="sparkles" size={14} stroke={1.8} style={{marginTop:2}}/>
                <div>El porcentaje restante va completo a la caja del spa. Los % aplican igual a todas las terapeutas — el canal se elige al momento de registrar la venta.</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

Object.assign(window,{TabHeader,CuentasMonedas,CatalogoGastos,ServiciosComisiones});
