// ──────────────────────────────────────────
// Respaldo de datos — exporta todo (o por periodo) a Excel
// Solo admin. Produce un .xlsx con una hoja por tabla.
// ──────────────────────────────────────────

const RespaldoPanel = () => {
  const auth = useAuth();
  const esAdmin = auth.rol === 'admin';

  const hoy = new Date();
  const iniMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const fmtDate = d => d.toISOString().slice(0,10);

  const [scope, setScope]     = React.useState('todo'); // 'todo' | 'mes' | 'rango'
  const [desde, setDesde]     = React.useState(fmtDate(iniMes));
  const [hasta, setHasta]     = React.useState(fmtDate(hoy));
  const [loading, setLoading] = React.useState(false);
  const [progreso, setProg]   = React.useState('');

  if (!esAdmin) {
    return (
      <div style={{padding:'60px 36px',textAlign:'center'}}>
        <div style={{fontFamily:'var(--serif)',fontSize:22,color:'var(--ink-0)',marginBottom:8}}>Sin acceso</div>
        <div style={{fontSize:13,color:'var(--ink-3)'}}>Solo administración puede generar respaldos.</div>
      </div>
    );
  }

  const calcularRango = () => {
    if (scope === 'todo') return { ini: null, fin: null };
    if (scope === 'mes') return { ini: fmtDate(iniMes), fin: fmtDate(hoy) };
    return { ini: desde, fin: hasta };
  };

  const descargar = async () => {
    setLoading(true);
    setProg('Consultando base de datos…');
    try {
      const {ini, fin} = calcularRango();

      // Consultas en paralelo — las tablas de catálogo siempre completas,
      // las transaccionales se filtran por fecha si hay rango.
      const filtrarFecha = (q, col='fecha') => {
        if (ini) q = q.gte(col, ini);
        if (fin) q = q.lte(col, fin);
        return q;
      };

      const queries = {
        perfiles:          sb.from('perfiles').select('*'),
        roles:             sb.from('roles').select('*'),
        colaboradoras:     sb.from('colaboradoras').select('*'),
        servicios:         sb.from('servicios').select('*'),
        catalogo_gastos:   sb.from('catalogo_gastos').select('*'),
        cuentas:           sb.from('cuentas').select('*'),
        monedas:           sb.from('monedas').select('*'),
        config_fiscal:     sb.from('config_fiscal').select('*'),
        objetivos:         sb.from('objetivos').select('*'),
        turnos:            filtrarFecha(sb.from('turnos').select('*'), 'fecha_apertura'),
        ventas:            filtrarFecha(sb.from('ventas').select('*')),
        turno_colaboradoras: sb.from('turno_colaboradoras').select('*'),
        gastos:            filtrarFecha(sb.from('gastos').select('*')),
        gasto_pagos:       sb.from('gasto_pagos').select('*'),
        arqueos:           filtrarFecha(sb.from('arqueos').select('*'), 'fecha'),
      };

      const entries = Object.entries(queries);
      const data = {};
      for (let i = 0; i < entries.length; i++) {
        const [nombre, q] = entries[i];
        setProg(`Descargando ${nombre}… (${i+1}/${entries.length})`);
        const {data: rows, error} = await q;
        if (error) {
          console.warn(`[respaldo] ${nombre}: ${error.message}`);
          continue; // Si una tabla falla (ej. no existe), seguimos con las demás
        }
        data[nombre] = rows || [];
      }

      setProg('Construyendo Excel…');
      if (!window.XLSX) throw new Error('XLSX no cargado');
      const wb = window.XLSX.utils.book_new();

      // Hoja 0: Metadatos
      const meta = [
        ['Respaldo CashFlow Spa'],
        ['Generado', new Date().toLocaleString('es-MX')],
        ['Periodo', scope === 'todo' ? 'Todo el histórico' : `${ini} → ${fin}`],
        ['Generado por', auth.perfil?.nombre_display + ' (@' + auth.perfil?.username + ')'],
        [],
        ['Hoja', 'Filas'],
        ...Object.entries(data).map(([k,v]) => [k, v.length]),
      ];
      window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet(meta), '_info');

      // Una hoja por tabla
      Object.entries(data).forEach(([nombre, rows]) => {
        if (!rows || rows.length === 0) {
          // Hoja vacía con solo encabezado
          window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.aoa_to_sheet([['(vacío)']]), nombre.slice(0,31));
          return;
        }
        const ws = window.XLSX.utils.json_to_sheet(rows);
        window.XLSX.utils.book_append_sheet(wb, ws, nombre.slice(0,31)); // max 31 chars
      });

      const stamp = new Date().toISOString().slice(0,10);
      const sufijo = scope === 'todo' ? 'todo' : (ini + '_a_' + fin);
      const filename = `cashflow-respaldo-${stamp}-${sufijo}.xlsx`;

      window.XLSX.writeFile(wb, filename);
      notify('Respaldo descargado: ' + filename);
      setProg('');
    } catch(err) {
      console.error(err);
      notify('Error: ' + err.message, 'err');
      setProg('');
    } finally {
      setLoading(false);
    }
  };

  const radioStyle = (activo) => ({
    display:'flex',alignItems:'flex-start',gap:10,padding:'12px 14px',
    border:'1px solid ' + (activo ? 'var(--clay)' : 'var(--line-1)'),
    background: activo ? 'rgba(212,131,74,.06)' : 'var(--paper-raised)',
    borderRadius:10, cursor:'pointer', marginBottom:8,
  });

  return (
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',fontFamily:'var(--sans)',background:'var(--paper)',color:'var(--ink-1)'}}>
      <div style={{padding:'28px 36px 18px'}}>
        <div style={{fontSize:11,color:'var(--ink-3)',fontWeight:600,letterSpacing:.5,textTransform:'uppercase',marginBottom:6}}>Configuración</div>
        <div style={{fontFamily:'var(--serif)',fontSize:34,fontWeight:500,letterSpacing:-.8,color:'var(--ink-0)',lineHeight:1}}>Respaldo de datos</div>
        <div style={{fontSize:13,color:'var(--ink-2)',marginTop:6,maxWidth:640}}>Descarga un archivo Excel con todos los datos (ventas, gastos, arqueos, usuarios, catálogos). Guárdalo en tu Drive/OneDrive como respaldo independiente de Supabase.</div>
      </div>

      <div style={{flex:1,overflowY:'auto',padding:'12px 36px 60px'}}>
        <div style={{background:'var(--paper-raised)',border:'1px solid var(--line-1)',borderRadius:12,padding:'22px 24px',maxWidth:640}}>

          <div style={{fontSize:12,fontWeight:700,color:'var(--ink-3)',letterSpacing:.4,textTransform:'uppercase',marginBottom:12}}>Periodo</div>

          <label style={radioStyle(scope==='todo')}>
            <input type="radio" checked={scope==='todo'} onChange={()=>setScope('todo')} style={{marginTop:2}}/>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:'var(--ink-0)'}}>Todo el histórico</div>
              <div style={{fontSize:12,color:'var(--ink-3)',marginTop:2}}>Respaldo completo. Ideal para archivo mensual o migración.</div>
            </div>
          </label>

          <label style={radioStyle(scope==='mes')}>
            <input type="radio" checked={scope==='mes'} onChange={()=>setScope('mes')} style={{marginTop:2}}/>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:'var(--ink-0)'}}>Este mes</div>
              <div style={{fontSize:12,color:'var(--ink-3)',marginTop:2}}>Del día 1 al día de hoy.</div>
            </div>
          </label>

          <label style={radioStyle(scope==='rango')}>
            <input type="radio" checked={scope==='rango'} onChange={()=>setScope('rango')} style={{marginTop:2}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600,color:'var(--ink-0)'}}>Rango personalizado</div>
              <div style={{fontSize:12,color:'var(--ink-3)',marginTop:2}}>Útil para cierres fiscales o reportes específicos.</div>
              {scope === 'rango' && (
                <div style={{display:'flex',gap:10,marginTop:10}}>
                  <input type="date" value={desde} onChange={e=>setDesde(e.target.value)} style={{padding:'8px 10px',border:'1px solid var(--line-1)',borderRadius:6,fontFamily:'inherit',fontSize:13}}/>
                  <span style={{alignSelf:'center',color:'var(--ink-3)'}}>→</span>
                  <input type="date" value={hasta} onChange={e=>setHasta(e.target.value)} style={{padding:'8px 10px',border:'1px solid var(--line-1)',borderRadius:6,fontFamily:'inherit',fontSize:13}}/>
                </div>
              )}
            </div>
          </label>

          <div style={{marginTop:18,paddingTop:18,borderTop:'1px solid var(--line-1)'}}>
            <Btn variant="clay" size="md" icon="download" onClick={descargar} disabled={loading}>
              {loading ? (progreso || 'Descargando…') : 'Descargar Excel (.xlsx)'}
            </Btn>
            {!loading && (
              <div style={{fontSize:11.5,color:'var(--ink-3)',marginTop:10,lineHeight:1.5}}>
                Los catálogos (perfiles, roles, colaboradores, servicios, cuentas, etc.) siempre salen completos.
                Las tablas transaccionales (ventas, gastos, arqueos, turnos) se filtran por el periodo elegido.
              </div>
            )}
          </div>
        </div>

        <div style={{marginTop:24,padding:'16px 20px',background:'var(--paper-sunk)',border:'1px solid var(--line-1)',borderRadius:10,maxWidth:640,fontSize:12.5,color:'var(--ink-2)',lineHeight:1.55}}>
          <strong style={{color:'var(--ink-0)'}}>Recomendación:</strong> Genera un respaldo mensual ("Este mes" los últimos días del mes) y guárdalo en Drive/OneDrive. Cada trimestre o cierre fiscal, uno completo ("Todo el histórico"). Así siempre tienes copia independiente de Supabase.
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { RespaldoPanel });
