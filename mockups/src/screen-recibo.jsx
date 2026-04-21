// Screen 7 — Recibo consolidado (una hoja, firma todo el equipo)
const Recibo = () => {
  const data = {
    fecha:'Sábado 20 de abril 2024',
    turno:'Abierto 09:12 · cerrado 16:30',
    folio:'CMS-2024-0420',
    encargada:'Carmen Díaz',
    spa:{nombre:'Xcalacoco Spa',dir:'Playa Xcalacoco, Playa del Carmen QR',rfc:'XSP231115ABC'},
    ters:[
      {nombre:'Lupita Rangel',rfc:'RALU880423XYZ',pagos:[{mon:'MXN',c:1270,t:150},{mon:'USD',c:56,t:20}],totalMXN:1840},
      {nombre:'Tomi García',rfc:'GATT920815ABC',pagos:[{mon:'USD',c:200,t:0},{mon:'CAD',c:400,t:0}],totalMXN:9560},
      {nombre:'Carmen Díaz',rfc:'DICA850102JKL',pagos:[{mon:'MXN',c:560,t:100}],totalMXN:660},
      {nombre:'Sofía Méndez',rfc:'MESO910420MNO',pagos:[{mon:'MXN',c:333,t:120}],totalMXN:453},
    ],
  };
  const grandTotal = data.ters.reduce((a,t)=>a+t.totalMXN,0);

  return (
    <div style={{width:'100%',height:'100%',background:'#e9e5dc',padding:'40px 60px',fontFamily:'var(--sans)',overflow:'auto'}}>
      {/* toolbar */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,maxWidth:900,margin:'0 auto 24px'}}>
        <div>
          <div style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:500,letterSpacing:-.3,color:'var(--ink-0)'}}>Recibo consolidado de comisiones</div>
          <div style={{fontSize:12,color:'var(--ink-3)',marginTop:2}}>Una sola hoja · firma todo el equipo</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button style={{display:'flex',alignItems:'center',gap:6,padding:'9px 14px',fontSize:13,fontWeight:600,background:'var(--paper-raised)',color:'var(--ink-1)',border:'1px solid var(--line-1)',borderRadius:8,cursor:'pointer',fontFamily:'inherit'}}>
            <Icon name="download" size={14}/>Descargar PDF
          </button>
          <button style={{display:'flex',alignItems:'center',gap:6,padding:'9px 14px',fontSize:13,fontWeight:600,background:'var(--ink-0)',color:'#faf7f1',border:'none',borderRadius:8,cursor:'pointer',fontFamily:'inherit'}}>
            <Icon name="file-text" size={14}/>Imprimir para firma
          </button>
        </div>
      </div>

      {/* Paper */}
      <div style={{maxWidth:900,margin:'0 auto',background:'#fefdf9',boxShadow:'0 8px 28px rgba(60,40,20,.12), 0 2px 6px rgba(60,40,20,.06)',borderRadius:4,padding:'48px 56px',fontSize:13,color:'#1a1816',border:'1px solid #e2dcce'}}>
        {/* header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:26,paddingBottom:18,borderBottom:'1.5px solid #1a1816'}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <div style={{width:32,height:32,borderRadius:8,background:'#1a1816',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Icon name="flower" size={17} color="#fefdf9" stroke={1.5}/>
              </div>
              <div>
                <div style={{fontFamily:'var(--serif)',fontSize:19,fontWeight:500,letterSpacing:-.3,lineHeight:1}}>{data.spa.nombre}</div>
                <div style={{fontSize:10,color:'#73726c',marginTop:3}}>{data.spa.dir} · RFC <span className="mono">{data.spa.rfc}</span></div>
              </div>
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:1,color:'#73726c',textTransform:'uppercase',marginBottom:4}}>Recibo · comisiones del turno</div>
            <div className="mono" style={{fontSize:13,color:'#1a1816',fontWeight:600}}>{data.folio}</div>
            <div style={{fontSize:11,color:'#73726c',marginTop:3}}>{data.fecha}</div>
            <div style={{fontSize:10,color:'#a8a79f',marginTop:1}}>{data.turno}</div>
          </div>
        </div>

        {/* Clause */}
        <div style={{padding:'13px 16px',background:'#f5f2ea',border:'1px solid #e2dcce',borderLeft:'3px solid #1a1816',borderRadius:2,fontSize:11.5,lineHeight:1.65,color:'#4a4a48',marginBottom:22}}>
          Las abajo firmantes declaran haber recibido de <strong style={{color:'#1a1816'}}>{data.spa.nombre}</strong> las cantidades detalladas a continuación, desglosadas por moneda, correspondientes a comisiones y propinas del turno indicado. Con su firma se liberan las obligaciones del spa respecto a este periodo.
        </div>

        {/* Main table */}
        <table style={{width:'100%',borderCollapse:'collapse',marginBottom:20}}>
          <thead>
            <tr style={{borderBottom:'1px solid #1a1816'}}>
              <th style={th}>#</th>
              <th style={{...th,textAlign:'left'}}>Colaboradora</th>
              <th style={{...th,textAlign:'left'}}>Desglose por moneda</th>
              <th style={{...th,textAlign:'right'}}>Total MXN eq.</th>
              <th style={{...th,textAlign:'center',width:180}}>Firma</th>
            </tr>
          </thead>
          <tbody>
            {data.ters.map((t,i)=>(
              <tr key={i} style={{borderBottom:'1px dashed #d9d3c4'}}>
                <td style={{padding:'14px 0',fontSize:11,color:'#a8a79f',fontWeight:600,width:24}} className="mono">{String(i+1).padStart(2,'0')}</td>
                <td style={{padding:'14px 10px 14px 0',fontSize:13,color:'#1a1816',fontWeight:600}}>
                  {t.nombre}
                  <div style={{fontSize:10,color:'#73726c',fontWeight:400,marginTop:2}} className="mono">RFC {t.rfc}</div>
                </td>
                <td style={{padding:'14px 10px 14px 0',fontSize:12,color:'#4a4a48'}}>
                  {t.pagos.map((p,j)=>(
                    <div key={j} style={{display:'flex',gap:10,marginBottom:j===t.pagos.length-1?0:4}}>
                      <span style={{fontWeight:700,color:'#1a1816',minWidth:38}}>{p.mon}</span>
                      <span className="mono num">Com. {p.c.toLocaleString()}{p.t>0?` + Prop. ${p.t}`:''} = <strong>{(p.c+p.t).toLocaleString()}</strong></span>
                    </div>
                  ))}
                </td>
                <td className="mono num" style={{padding:'14px 0',fontSize:14,textAlign:'right',color:'#1a1816',fontWeight:700,verticalAlign:'top'}}>${t.totalMXN.toLocaleString()}</td>
                <td style={{padding:'14px 0 14px 16px',verticalAlign:'bottom'}}>
                  <div style={{borderBottom:'1px solid #1a1816',height:34,marginBottom:4}}/>
                  <div style={{fontSize:9,color:'#a8a79f',textAlign:'center',letterSpacing:.3}}>firma</div>
                </td>
              </tr>
            ))}
            <tr>
              <td/>
              <td colSpan="2" style={{padding:'16px 0 0',fontSize:11,fontWeight:700,letterSpacing:1,color:'#73726c',textTransform:'uppercase',textAlign:'right'}}>Total entregado · MXN equivalente</td>
              <td className="mono num" style={{padding:'16px 0 0',fontSize:20,textAlign:'right',color:'#1a1816',fontWeight:700,fontFamily:'var(--serif)'}}>${grandTotal.toLocaleString()}</td>
              <td/>
            </tr>
          </tbody>
        </table>

        {/* Entregó */}
        <div style={{marginTop:32,paddingTop:22,borderTop:'1px solid #e2dcce',display:'grid',gridTemplateColumns:'1fr 280px',gap:40,alignItems:'flex-end'}}>
          <div style={{fontSize:10,color:'#73726c',lineHeight:1.6}}>
            Documento generado por CashFlow · {data.folio} · {data.fecha}<br/>
            Conserve una copia firmada en el archivo del spa.
          </div>
          <div>
            <div style={{height:48,borderBottom:'1.5px solid #1a1816',marginBottom:6}}/>
            <div style={{fontSize:11,color:'#73726c',fontWeight:600,letterSpacing:.4}}>Entregó · Encargada</div>
            <div style={{fontSize:12,color:'#1a1816',fontWeight:600,marginTop:2}}>{data.encargada}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const th = {fontSize:10,fontWeight:700,letterSpacing:.5,color:'#73726c',textTransform:'uppercase',padding:'8px 0'};

Object.assign(window,{Recibo});
