// CashFlow Spa — shared primitives
// SVG icons (line style), chip, button, card, number display

const Icon = ({name, size=18, stroke=1.6, color='currentColor', style={}}) => {
  const s={width:size,height:size,display:'inline-block',flexShrink:0,...style};
  const common={fill:'none',stroke:color,strokeWidth:stroke,strokeLinecap:'round',strokeLinejoin:'round'};
  const v='0 0 24 24';
  const P=(d)=>(<svg viewBox={v} style={s}><path {...common} d={d}/></svg>);
  switch(name){
    case 'receipt': return P('M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h4');
    case 'chart':   return P('M4 20V10M10 20V4M16 20v-7M22 20H2');
    case 'gear':    return (<svg viewBox={v} style={s}><circle {...common} cx="12" cy="12" r="3"/><path {...common} d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>);
    case 'users':   return (<svg viewBox={v} style={s}><path {...common} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle {...common} cx="9" cy="7" r="4"/><path {...common} d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>);
    case 'sparkles':return P('M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8');
    case 'coins':   return (<svg viewBox={v} style={s}><circle {...common} cx="8" cy="8" r="6"/><path {...common} d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M17 16h-3l2 2-2 2h3"/></svg>);
    case 'percent': return (<svg viewBox={v} style={s}><line {...common} x1="19" y1="5" x2="5" y2="19"/><circle {...common} cx="6.5" cy="6.5" r="2.5"/><circle {...common} cx="17.5" cy="17.5" r="2.5"/></svg>);
    case 'shield':  return P('M12 2l8 3v7c0 5-3.5 8-8 10-4.5-2-8-5-8-10V5l8-3z');
    case 'plus':    return P('M12 5v14M5 12h14');
    case 'arrow-right': return P('M5 12h14M13 5l7 7-7 7');
    case 'arrow-left':  return P('M19 12H5M12 19l-7-7 7-7');
    case 'arrow-up':    return P('M12 19V5M5 12l7-7 7 7');
    case 'arrow-down':  return P('M12 5v14M5 12l7 7 7-7');
    case 'check':   return P('M5 12l5 5L20 7');
    case 'x':       return P('M6 6l12 12M18 6L6 18');
    case 'lock':    return (<svg viewBox={v} style={s}><rect {...common} x="3" y="11" width="18" height="11" rx="2"/><path {...common} d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>);
    case 'clock':   return (<svg viewBox={v} style={s}><circle {...common} cx="12" cy="12" r="9"/><path {...common} d="M12 7v5l3 2"/></svg>);
    case 'calendar':return (<svg viewBox={v} style={s}><rect {...common} x="3" y="5" width="18" height="16" rx="2"/><path {...common} d="M3 10h18M8 3v4M16 3v4"/></svg>);
    case 'download':return P('M12 3v13M6 11l6 6 6-6M4 21h16');
    case 'search':  return (<svg viewBox={v} style={s}><circle {...common} cx="11" cy="11" r="7"/><path {...common} d="M20 20l-4-4"/></svg>);
    case 'trend-up':return P('M3 17l6-6 4 4 8-8M14 7h7v7');
    case 'wallet':  return (<svg viewBox={v} style={s}><path {...common} d="M21 7H6a3 3 0 0 1 0-6h13v6z"/><path {...common} d="M3 5v14a3 3 0 0 0 3 3h15V7"/><circle {...common} cx="17" cy="14" r="1.2"/></svg>);
    case 'chev-right': return P('M9 6l6 6-6 6');
    case 'chev-down':  return P('M6 9l6 6 6-6');
    case 'dot':     return (<svg viewBox={v} style={s}><circle cx="12" cy="12" r="4" fill={color}/></svg>);
    case 'more':    return (<svg viewBox={v} style={s}><circle cx="5" cy="12" r="1.6" fill={color}/><circle cx="12" cy="12" r="1.6" fill={color}/><circle cx="19" cy="12" r="1.6" fill={color}/></svg>);
    case 'edit':    return P('M12 20h9M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4z');
    case 'trash':   return P('M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6');
    case 'logout':  return P('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9');
    case 'flower':  return (<svg viewBox={v} style={s}><circle {...common} cx="12" cy="12" r="3"/><path {...common} d="M12 9c0-3 1-6 0-6s-1 3-1 6M12 15c0 3-1 6 0 6s1-3 1-6M9 12c-3 0-6 1-6 0s3-1 6-1M15 12c3 0 6-1 6 0s-3 1-6 1"/></svg>);
    case 'user':    return (<svg viewBox={v} style={s}><circle {...common} cx="12" cy="8" r="4"/><path {...common} d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>);
    case 'filter':  return P('M3 5h18l-7 8v5l-4 2v-7L3 5z');
    case 'home':    return P('M3 12l9-9 9 9M5 10v11h14V10');
    default: return null;
  }
};

const Chip = ({tone='neutral', children, style={}}) => {
  const tones={
    neutral:{bg:'#efeadd',fg:'#55504a',bd:'#e1dac9'},
    moss:   {bg:'#e3ecd2',fg:'#3c5228',bd:'#c7d5ad'},
    clay:   {bg:'#f6e5dc',fg:'#8a3820',bd:'#ebcebd'},
    amber:  {bg:'#f5e6c8',fg:'#7a4e10',bd:'#ecd49a'},
    blue:   {bg:'#dde7f0',fg:'#274862',bd:'#bccdd c'},
    rose:   {bg:'#f4dee0',fg:'#7a2c3c',bd:'#e7b9bf'},
    ink:    {bg:'#201c16',fg:'#faf7f1',bd:'#201c16'},
  };
  const t=tones[tone]||tones.neutral;
  return <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,fontWeight:600,letterSpacing:.2,padding:'3px 9px',borderRadius:999,background:t.bg,color:t.fg,border:'1px solid '+t.bd,...style}}>{children}</span>;
};

const Btn = ({variant='primary', icon, children, onClick, size='md', style={}}) => {
  const sizes={sm:{p:'6px 10px',fs:12,r:6},md:{p:'9px 14px',fs:13,r:8},lg:{p:'12px 18px',fs:14,r:10}};
  const variants={
    primary:{bg:'#201c16',fg:'#faf7f1',bd:'1px solid #201c16'},
    clay:   {bg:'#b04a2a',fg:'#fff',bd:'1px solid #b04a2a'},
    moss:   {bg:'#4f6b3a',fg:'#fff',bd:'1px solid #4f6b3a'},
    secondary:{bg:'#fff',fg:'#201c16',bd:'1px solid #e8e2d6'},
    ghost:  {bg:'transparent',fg:'#55504a',bd:'1px solid transparent'},
    danger: {bg:'#f4dee0',fg:'#7a2c3c',bd:'1px solid #e7b9bf'},
  };
  const s=sizes[size],v=variants[variant];
  return <button onClick={onClick} style={{display:'inline-flex',alignItems:'center',gap:6,padding:s.p,fontSize:s.fs,fontWeight:600,border:v.bd,borderRadius:s.r,background:v.bg,color:v.fg,cursor:'pointer',fontFamily:'inherit',letterSpacing:-.1,...style}}>
    {icon && <Icon name={icon} size={s.fs+2}/>}
    {children}
  </button>;
};

// Avatar with warm palette
const Av = ({name='', tone='clay', size=32, style={}}) => {
  const initials=name.split(' ').filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'—';
  const tones={
    clay: {bg:'#f6e5dc',fg:'#8a3820'},
    moss: {bg:'#e3ecd2',fg:'#3c5228'},
    sand: {bg:'#f5ecd8',fg:'#7a5a15'},
    ink:  {bg:'#201c16',fg:'#faf7f1'},
    blue: {bg:'#dde7f0',fg:'#274862'},
    stone:{bg:'#ede6d6',fg:'#55504a'},
  };
  const t=tones[tone]||tones.clay;
  return <div style={{width:size,height:size,borderRadius:999,background:t.bg,color:t.fg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.38,fontWeight:600,fontFamily:'var(--serif)',letterSpacing:.3,flexShrink:0,...style}}>{initials}</div>;
};

// Money display — serif for the figure
const Money = ({amount, currency='MXN', size=32, weight=500, color='var(--ink-0)', signed=false}) => {
  const symbol={MXN:'$',USD:'$',EUR:'€'}[currency]||'$';
  const v=Math.abs(amount||0);
  const sign=signed?(amount>=0?'+':'−'):(amount<0?'−':'');
  const [whole, dec]=v.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2}).split('.');
  return <span className="num" style={{fontFamily:'var(--serif)',fontWeight:weight,fontSize:size,letterSpacing:-0.5,color,lineHeight:1}}>
    <span style={{fontSize:size*0.55,opacity:.6,marginRight:2}}>{sign}{symbol}</span>
    {whole}
    <span style={{fontSize:size*0.6,opacity:.55}}>.{dec}</span>
    {currency!=='MXN' && <span style={{fontSize:size*0.38,opacity:.5,marginLeft:5,letterSpacing:.5,fontFamily:'var(--sans)',fontWeight:600}}>{currency}</span>}
  </span>;
};

Object.assign(window,{Icon,Chip,Btn,Av,Money});
