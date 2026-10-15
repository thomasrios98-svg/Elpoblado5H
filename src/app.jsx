const {useState,useRef,useEffect}=React;
const WA="584148255103";
const IK="/img/kichi.webp",IY="/img/yamaha.webp",IH="/img/hero.webp",IL="/img/logo.webp";
const IA1="/img/apartamento-portada.webp";
const sm=u=>u.replace(/\.webp$/,"-sm.webp"); // 480px thumbnail of each photo
const AP1="/img/apartamento-01.webp";
const AP2="/img/apartamento-02.webp";
const AP3="/img/apartamento-03.webp";
const AP4="/img/apartamento-04.webp";
const AP5="/img/apartamento-05.webp";
const AP6="/img/apartamento-06.webp";
const AP7="/img/apartamento-07.webp";
const AP8="/img/apartamento-08.webp";
const AP9="/img/apartamento-09.webp";
const AP10="/img/apartamento-10.webp";
const AP11="/img/apartamento-11.webp";
const AP12="/img/apartamento-12.webp";
const AP13="/img/apartamento-13.webp";
const AP14="/img/apartamento-14.webp";

// ── SEASONS ──────────────────────────────────────────────────────────────────
const PEAK=[["2026-02-28","2026-03-03"],["2026-03-29","2026-04-05"],["2026-12-24","2027-01-15"]];
const MID=[["2026-07-01","2026-07-31"],["2026-08-01","2026-09-15"],["2026-12-10","2026-12-23"]];
const MIN_STAY_RANGES=[["2026-12-20","2027-01-10",4]];
function minStayFor(checkin,checkout){
  if(!checkin||!checkout)return 2;
  const ci=new Date(checkin+"T12:00:00").getTime(),co=new Date(checkout+"T12:00:00").getTime();
  let m=2;
  for(const[a,b,n]of MIN_STAY_RANGES){
    const ra=new Date(a+"T12:00:00").getTime(),rb=new Date(b+"T12:00:00").getTime();
    if(ci<=rb&&co>=ra)m=Math.max(m,n);
  }
  return m;
}
function getSeason(d){
  if(!d)return"low";
  const t=new Date(d+"T12:00:00").getTime();
  for(const[a,b]of PEAK)if(t>=new Date(a).getTime()&&t<=new Date(b+"T23:59:59").getTime())return"peak";
  for(const[a,b]of MID)if(t>=new Date(a).getTime()&&t<=new Date(b+"T23:59:59").getTime())return"mid";
  return"low";
}
const SC={peak:"#dc2626",mid:"#d97706",low:"#0ea5e9"};
const SL={peak:"🔴 Alta",mid:"🟡 Media",low:"🟢 Baja"};
function wifiPrice(d){return getSeason(d)==="peak"?50:25;}

// ── APARTMENT PRICING ────────────────────────────────────────────────────────
function aptNightPrice(d){
  if(d>="2026-12-20"&&d<="2027-01-10")return 200;
  const s=getSeason(d);
  if(s==="peak")return 180;
  if(s==="mid")return 155;
  return 135;
}
function nightsBetween(ci,co){
  if(!ci||!co)return 0;
  const d=(new Date(co+"T12:00:00")-new Date(ci+"T12:00:00"))/(1000*60*60*24);
  return Math.max(0,Math.floor(d));
}
function aptTotal(ci,co){
  if(!ci||!co)return 0;
  let t=0,cur=new Date(ci+"T12:00:00");
  const end=new Date(co+"T12:00:00");
  while(cur<end){const ds=cur.toISOString().slice(0,10);t+=aptNightPrice(ds);cur.setDate(cur.getDate()+1);}
  return t;
}

// ── BOATS ────────────────────────────────────────────────────────────────────
const BOATS={
  kichi:{id:"kichi",name:"KICHI",subtitle:"Lancha Clásica",capacity:7,img:IK,
    features:["7 pasajeros","Marino","Salvavidas","Toldo","Equipo de sonido"],
    price:(d,pax)=>{if(!d)return null;const s=getSeason(d),w=[0,5,6].includes(new Date(d+"T12:00:00").getDay());if(s==="peak")return{p:300,l:"Temp. Alta"};if(s==="mid"){const ex=(pax||2)>=7?20:0;return{p:(w?200:160)+ex,l:"Temp. Media",ex};}return{p:w?200:160,l:w?"Vie–Dom":"Lun–Jue"};}},
  yamaha:{id:"yamaha",name:"YAMAHA SX230",subtitle:"High Output · Twin Engine",capacity:9,img:IY,
    features:["9 pasajeros","Marino","Salvavidas","Toldo","2 sillas","Mesa de comer","Equipo de sonido"],
    price:(d,pax)=>{if(!d)return null;const s=getSeason(d),w=[0,5,6].includes(new Date(d+"T12:00:00").getDay()),ex=(pax||2)>=9?30:0;if(s==="peak")return{p:500+ex,l:"Temp. Alta",ex};if(s==="mid"){if(d.slice(0,7)==="2026-07")return{p:(w?300:260)+ex,l:"Temp. Media",ex};return{p:(w?320:280)+ex,l:"Temp. Media",ex};}return{p:(w?300:260)+ex,l:w?"Vie–Dom":"Lun–Jue",ex};}}
};
const BOOKED={
  kichi:["2026-06-07","2026-06-13"],
  yamaha:["2026-06-01","2026-06-05","2026-06-06","2026-06-13","2026-06-14","2026-06-23","2026-06-27","2026-07-13","2026-07-18"],
  apt:[],
};
const NO_WIFI=[];

// ── GOOGLE CALENDAR CONFIG ────────────────────────────────────────────────────
const GOOGLE_API_KEY="AIzaSyAdqLVRJMRUnOcUM8mAznpB7yxiy10xUMQ";
const GOOGLE_CALENDAR_ID="thomasrios98@gmail.com";

// ── PROMOCIONES ──────────────────────────────────────────────────────────────
const PROMOS = {
  kichi: {
    id: "kichi",
    name: "Promo Kichi",
    desc: "2 noches en el apartamento + 1 salida en Lancha Kichi",
    boat: "kichi",
    nights: 2,
    pricePerPax: 60,
    totalFixed: 420,
    maxPax: 7,
    icon: "🏠+🚤",
  },
  yamaha: {
    id: "yamaha",
    name: "Promo Yamaha SX230",
    desc: "2 noches en el apartamento + 1 salida en Yamaha SX230",
    boat: "yamaha",
    nights: 2,
    pricePerPax: 65,
    totalFixed: 455,
    maxPax: 7,
    icon: "🏠+⛵",
  },
};
function isPromoAvailable(checkin) {
  // Only in low season
  return checkin && getSeason(checkin) === "low";
}
function promoPrice(promo, pax) {
  return pax >= promo.maxPax ? promo.pricePerPax * promo.maxPax : promo.totalFixed;
}
const CAYOS=["Pescadores","Sombrero","Aleman","Los Juanes","Playa sur","Tucupido adentro","Tucupido afuera","Boca seca","360"];
const EXTRAS=[{id:"wifi",label:"WiFi Starlink",price:25,icon:"📶"},{id:"cava",label:"Cava con Hielo",price:10,icon:"🧊"}];

const MOS=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DS=["D","L","M","M","J","V","S"];
const fmt=(s)=>s?new Date(s+"T12:00:00").toLocaleDateString("es-VE",{weekday:"short",day:"numeric",month:"short"}):"";
const fmtL=(s)=>s?new Date(s+"T12:00:00").toLocaleDateString("es-VE",{weekday:"long",day:"numeric",month:"long",year:"numeric"}):"";

// ── CALENDAR ─────────────────────────────────────────────────────────────────
function Cal({boatId,sel,onToggle,checkinMode,checkin,checkout,onDayClick,promoLowOnly=false,priceFor,gcBooked={}}){
  const td=new Date();
  const[vY,setVY]=useState(td.getFullYear());
  const[vM,setVM]=useState(td.getMonth());
  const[previewDate,setPreviewDate]=useState(null);
  const ts=`${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,"0")}-${String(td.getDate()).padStart(2,"0")}`;
  const dim=new Date(vY,vM+1,0).getDate();
  const fd=new Date(vY,vM,1).getDay();
  const cells=[...Array(fd).fill(null),...Array.from({length:dim},(_,i)=>i+1)];
  const prev=()=>vM===0?(setVM(11),setVY(y=>y-1)):setVM(m=>m-1);
  const next=()=>vM===11?(setVM(0),setVY(y=>y+1)):setVM(m=>m+1);

  const isInRange=(ds)=>{
    if(!checkinMode||!checkin||!checkout)return false;
    return ds>checkin&&ds<checkout;
  };
  const isCI=(ds)=>checkinMode&&checkin===ds;
  const isCO=(ds)=>checkinMode&&checkout===ds;

  return(
    <div className="cal-wrap">
      <div className="cal-hd">
        <button className="cal-nav" onClick={prev}>&#8249;</button>
        <span className="cal-mn">{MOS[vM]} {vY}</span>
        <button className="cal-nav" onClick={next}>&#8250;</button>
      </div>
      <div className="cal-g">
        {DS.map((d,i)=><div key={i} className="cal-dl">{d}</div>)}
        {cells.map((day,i)=>{
          if(!day)return<div key={i}/>;
          const ds=`${vY}-${String(vM+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const past=ds<ts;
          const maxDate=new Date();
          maxDate.setDate(maxDate.getDate()+90);
          const maxDs=maxDate.toISOString().slice(0,10);
          const beyondLimit=ds>maxDs;
          const blk=boatId?(BOOKED[boatId]?.includes(ds)||gcBooked[boatId]?.includes(ds)):(BOOKED.apt?.includes(ds)||gcBooked.apt?.includes(ds));
          const inRange=isInRange(ds);
          const isci=isCI(ds),isco=isCO(ds);
          const s=sel?sel.includes(ds):false;
          const tot=ds===ts;
          const wk=[0,5,6].includes(new Date(ds+"T12:00:00").getDay()),season=getSeason(ds);
          let c="cd";
          if(past)c+=" past";
          else if(blk)c+=" blocked";
          else if(beyondLimit)c+=" beyond-limit";
          else if(isci||isco)c+=" sel";
          else if(inRange)c+=" in-range";
          else if(s)c+=" sel";
          else if(tot)c+=" today";
          else if(promoLowOnly && (season==="peak" || season==="mid")) c+=" blocked";
          const seasonBlocked = promoLowOnly && (season==="peak" || season==="mid"); const handler=checkinMode?()=>!past&&!blk&&!beyondLimit&&!seasonBlocked&&onDayClick&&onDayClick(ds):()=>{if(!past&&!blk&&!beyondLimit&&!seasonBlocked){setPreviewDate(ds);onToggle&&onToggle(ds);}};
          return<div key={i} className={c} onClick={handler}>{day}</div>;
        })}
      </div>
      <div style={{display:"flex",gap:10,marginTop:10,flexWrap:"wrap"}}>
        {[["#0ea5e9","Seleccionado"],["#fca5a5","No disponible"],["#cbd5e1","Fuera de límite"]].map(([c,l])=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:8,height:8,borderRadius:"50%",background:c}}/><span style={{fontSize:10,color:"#94a3b8"}}>{l}</span></div>
        ))}
      </div>
      {priceFor&&(
        <div style={{minHeight:32,marginTop:8,padding:"7px 12px",background:"#f0f9ff",borderRadius:8,border:"1.5px solid #bae6fd",fontSize:12,color:"#0c4a6e",display:"flex",alignItems:"center",gap:8,transition:"opacity .2s",opacity:previewDate?1:0.4}}>
          {previewDate?(()=>{const pr=priceFor(previewDate);return pr?<><span style={{fontWeight:700}}>{fmt(previewDate)}</span><span style={{color:"#94a3b8"}}>·</span><span style={{fontWeight:900,color:"#0369a1",fontSize:15}}>${pr.p}</span><span style={{color:"#94a3b8"}}>·</span><span style={{fontSize:11,color:SC[getSeason(previewDate)],fontWeight:700}}>{pr.l}</span></>:<span style={{color:"#94a3b8"}}>No disponible</span>;})():<span style={{color:"#94a3b8"}}>Toca un día para ver el precio</span>}
        </div>
      )}
    </div>
  );
}

// ── APARTMENT PHOTO GALLERY ──────────────────────────────────────────────────
function AptGallery(){
  const[cur,setCur]=useState(0);
  const[open,setOpen]=useState(false);
  const[showAll,setShowAll]=useState(false);
  // 6 fotos de referencia visibles
  const mainPhotos=[AP1,AP2,AP3,AP4,AP9,AP12];
  // 14 fotos en total (sin pozo ni planta)
  const allPhotos=[AP1,AP2,AP3,AP4,AP5,AP6,AP7,AP8,AP9,AP10,AP11,AP12,AP13,AP14];

  return(
    <>
    {/* Grid 6 fotos de referencia */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:3,borderRadius:12,overflow:"hidden",marginBottom:0}}>
      {mainPhotos.map((p,i)=>(
        <div key={i} style={{position:"relative",paddingBottom:"75%",overflow:"hidden",cursor:"zoom-in"}} onClick={()=>{setCur(i);setOpen(true);}}>
          <img src={sm(p)} loading="lazy" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} alt={"Apartamento vacacional en Tucacas, Morrocoy – foto "+(i+1)}/>
        </div>
      ))}
    </div>
    {/* Botón ver todas */}
    <div style={{textAlign:"center",marginTop:8,marginBottom:12}}>
      <button onClick={()=>setShowAll(true)} style={{padding:"7px 20px",borderRadius:50,border:"1.5px solid #0ea5e9",background:"transparent",color:"#0369a1",fontFamily:"Lato,sans-serif",fontWeight:700,fontSize:12,cursor:"pointer",letterSpacing:.5}}>📷 Ver todas las fotos (14)</button>
    </div>

    {/* Modal foto individual */}
    {open && (
      <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <button onClick={(e)=>{e.stopPropagation();setCur(c=>(c-1+allPhotos.length)%allPhotos.length);}} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.2)",border:"none",color:"#fff",width:40,height:40,borderRadius:"50%",cursor:"pointer",fontSize:20,zIndex:10}}>‹</button>
        <img src={allPhotos[cur]} alt={"Apartamento vacacional en Tucacas, Morrocoy – foto "+(cur+1)} style={{maxWidth:"92vw",maxHeight:"90vh",objectFit:"contain",borderRadius:8}} onClick={e=>e.stopPropagation()}/>
        <button onClick={(e)=>{e.stopPropagation();setCur(c=>(c+1)%allPhotos.length);}} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.2)",border:"none",color:"#fff",width:40,height:40,borderRadius:"50%",cursor:"pointer",fontSize:20,zIndex:10}}>›</button>
        <div style={{position:"absolute",bottom:14,left:0,right:0,textAlign:"center",color:"rgba(255,255,255,.6)",fontSize:12}}>{cur+1} / {allPhotos.length}</div>
      </div>
    )}

    {/* Modal galería completa */}
    {showAll && (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.96)",zIndex:9999,overflowY:"auto",padding:"20px 12px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,maxWidth:700,margin:"0 auto 16px"}}>
          <div className="bb" style={{color:"#fff",fontSize:22,letterSpacing:1}}>FOTOS DEL APARTAMENTO</div>
          <button onClick={()=>setShowAll(false)} style={{background:"rgba(255,255,255,.15)",border:"none",color:"#fff",padding:"6px 16px",borderRadius:50,cursor:"pointer",fontSize:13,fontFamily:"Lato,sans-serif"}}>✕ Cerrar</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:8,maxWidth:700,margin:"0 auto"}}>
          {allPhotos.map((p,i)=>(
            <div key={i} style={{position:"relative",paddingBottom:"100%",overflow:"hidden",borderRadius:8,cursor:"zoom-in"}} onClick={()=>{setCur(i);setShowAll(false);setOpen(true);}}>
              <img src={sm(p)} loading="lazy" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} alt={"Apartamento vacacional en Tucacas, Morrocoy – foto "+(i+1)}/>
            </div>
          ))}
        </div>
      </div>
    )}
    </>
  );
}


// ── MAIN APP ─────────────────────────────────────────────────────────────────
const AF0={checkin:"",checkout:"",nombre:"",telefono:"",cedula:"",notas:""};
const BF0={boats:[],pax:{kichi:2,yamaha:2},dates:{kichi:[],yamaha:[]},cayos:[],extras:[]};


function FAQSection(){
  const [open,setOpen]=React.useState(null);
  const items=[
    ["¿Dónde está ubicado El Poblado 5H?","El apartamento está en el conjunto residencial El Poblado (El Retiro), en Tucacas, Estado Falcón, Venezuela, a 10-15 minutos del muelle de acceso al Parque Nacional Morrocoy. Es el punto de partida ideal para explorar los cayos."],
    ["¿Cuántas personas puede alojar el apartamento?","El apartamento tiene capacidad para hasta 7 personas. Cuenta con 3 aires acondicionados de consola, WiFi, planta eléctrica, agua caliente, piscina y balcón con parrillera."],
    ["¿Cómo reservo el apartamento o la lancha?","Puedes verificar disponibilidad y hacer tu reserva directamente en elpoblado5h.com. El sistema muestra fechas disponibles en tiempo real. La reserva se confirma por WhatsApp con un depósito del 30%."],
    ["¿Qué lanchas tienen disponibles para Morrocoy?","Ofrecemos dos opciones:\n\nLancha Kichi — capacidad para 7 personas.\nYamaha SX230 — capacidad para 9 personas.\n\nLas tarifas varían según la temporada y el día de la semana."],
    ["¿A qué cayos de Morrocoy puedo ir en lancha?","Desde Tucacas puedes visitar los principales cayos del Parque Nacional Morrocoy: Cayo Sombrero, Cayo Pescadores, Cayo Alemán, Los Juanes, Playa Sur, Tucupido, Boca Seca y más. Puedes visitar hasta 4 cayos en un día."],
    ["¿Cuántas noches mínimo puedo reservar el apartamento?","El mínimo general es 2 noches. Durante la temporada alta del 20 de diciembre al 10 de enero, el mínimo es de 4 noches."],
    ["¿Cuál es la política de cancelación?","No se realizan devoluciones del depósito. Si avisas con más de 48 horas de anticipación, puedes reprogramar tu estadía con una penalización de $30. Si avisas con menos de 48 horas, pierdes la reserva."]
  ];
  return React.createElement("div",{style:{border:"1px solid #e2e8f0",borderRadius:14,overflow:"hidden",background:"#fff"}},
    items.map(([q,a],i)=>React.createElement("div",{key:i,style:{borderBottom:i<items.length-1?"1px solid #e2e8f0":"none"}},
      React.createElement("button",{
        onClick:()=>setOpen(open===i?null:i),
        style:{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"18px 20px",background:open===i?"#f0f9ff":"none",border:"none",cursor:"pointer",textAlign:"left",color:"#0f172a",fontFamily:"Lato,sans-serif",fontSize:"0.95rem",fontWeight:600,lineHeight:1.4}
      },
        React.createElement("span",null,q),
        React.createElement("span",{style:{flexShrink:0,width:22,height:22,borderRadius:"50%",background:open===i?"#0ea5e9":"#e0f2fe",color:open===i?"#fff":"#0ea5e9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:400,transform:open===i?"rotate(45deg)":"none",transition:"transform .2s"}},"+")
      ),
      open===i&&React.createElement("div",{style:{padding:"0 20px 18px",fontSize:"0.88rem",color:"#64748b",lineHeight:1.65,background:"#f0f9ff",whiteSpace:"pre-line"}},a)
    ))
  );
}

function App(){
  const[page,setPage]=useState("home");
  const[mode,setMode]=useState(null); // "apt" | "boat" | "both"
  // Apartment form
  const[af,setAf]=useState({...AF0});
  const[ciMode,setCiMode]=useState("ci"); // "ci" or "co"
  const[aptPax,setAptPax]=useState(2);
  const[selectedPromo,setSelectedPromo]=useState(null); // null | "kichi" | "yamaha"
  const[extraAptNights,setExtraAptNights]=useState(0);
  const[extraBoatDates,setExtraBoatDates]=useState({kichi:[],yamaha:[]});
  const[aptStep,setAptStep]=useState(0);
  // Boat form
  const[bf,setBf]=useState({...BF0,pax:{kichi:2,yamaha:2},dates:{kichi:[],yamaha:[]}});
  const[boatStep,setBoatStep]=useState(0);
  // Shared
  const[nombre,setNombre]=useState("");
  const[telefono,setTelefono]=useState("");
  const[cedula,setCedula]=useState("");
  const[notas,setNotas]=useState("");
  const[done,setDone]=useState(false);
  const[lastDep,setLastDep]=useState(0);
  const[gcBooked,setGcBooked]=useState({kichi:[],yamaha:[],apt:[]});
  useEffect(()=>{
    const fetchGCal=async()=>{
      try{
        const now=new Date().toISOString();
        const url=`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events?key=${GOOGLE_API_KEY}&timeMin=${now}&singleEvents=true&maxResults=250&orderBy=startTime`;
        const res=await fetch(url);
        if(!res.ok){console.warn("[GCal] Error HTTP:",res.status);return;}
        const data=await res.json();
        const nb={kichi:[],yamaha:[],apt:[]};
        (data.items||[]).forEach(ev=>{
          const title=(ev.summary||"").toLowerCase();
          const startD=(ev.start?.date||ev.start?.dateTime||"").slice(0,10);
          if(!startD)return;
          if(title.includes("kichi")||title.includes("yamaha")){
            const rawEnd=ev.end?.date||(ev.end?.dateTime||"").slice(0,10);
            if(!rawEnd)return;
            const endDate=new Date(rawEnd+"T12:00:00");
            if(ev.end?.date)endDate.setDate(endDate.getDate()-1); // end.date es exclusivo
            const cur=new Date(startD+"T12:00:00");
            while(cur<=endDate){
              const ds=cur.toISOString().slice(0,10);
              if(title.includes("kichi"))nb.kichi.push(ds);
              if(title.includes("yamaha"))nb.yamaha.push(ds);
              cur.setDate(cur.getDate()+1);
            }
          }
          if(title.includes("apto 5h")){
            const endD=ev.end?.date||(ev.end?.dateTime||"").slice(0,10);
            if(!endD)return;
            const cur=new Date(startD+"T12:00:00");
            const checkout=new Date(endD+"T12:00:00");
            if(ev.end?.date)checkout.setDate(checkout.getDate()-1);
            while(cur<checkout){nb.apt.push(cur.toISOString().slice(0,10));cur.setDate(cur.getDate()+1);}
          }
        });
        console.log("[GCal] Fechas bloqueadas:",nb);
        setGcBooked(nb);
      }catch(e){console.warn("[GCal] Fetch falló:",e);}
    };
    fetchGCal();
  },[]);
  const ref=useRef();

  // GA4 event names mapped to Meta Pixel standard events; the rest go as custom events.
  const FB_EVENTS={booking_started:"InitiateCheckout",whatsapp_sent:"Lead",email_sent:"Lead",whatsapp_click:"Contact"};
  const track=(ev,p={})=>{
    if(typeof gtag==="function")gtag("event",ev,p);
    if(typeof fbq==="function"){FB_EVENTS[ev]?fbq("track",FB_EVENTS[ev],p):fbq("trackCustom",ev,p);}
  };
  const goBook=(m)=>{track("booking_started",{booking_type:m});setMode(m);setPage("book");setAptStep(0);setBoatStep(0);setTimeout(()=>ref.current?.scrollIntoView({behavior:"smooth"}),80);};
  // Service pages link to /#reservar-apartamento, /#reservar-lancha or /#reservar-combo to open the wizard directly.
  useEffect(()=>{
    const m={"#reservar-apartamento":"apt","#reservar-lancha":"boat","#reservar-combo":"both"}[location.hash];
    if(!m)return;
    goBook(m);
    // goBook's smooth scroll gets lost while the page is still loading; jump again once it has.
    const go=()=>setTimeout(()=>ref.current?.scrollIntoView(),100);
    if(document.readyState==="complete")go();else window.addEventListener("load",go,{once:true});
  },[]);

  // Apartment helpers
  const nights=nightsBetween(af.checkin,af.checkout);
  const aptTot=aptTotal(af.checkin,af.checkout);
  const aptMinStay=minStayFor(af.checkin,af.checkout);
  const aptRangeBlocked=af.checkin&&af.checkout?(()=>{
    const cur=new Date(af.checkin+"T12:00:00");
    const end=new Date(af.checkout+"T12:00:00");
    while(cur<end){
      const ds=cur.toISOString().slice(0,10);
      if(BOOKED.apt?.includes(ds)||gcBooked.apt?.includes(ds))return true;
      cur.setDate(cur.getDate()+1);
    }
    return false;
  })():false;

  // Boat helpers
  const togBoat=(id)=>setBf(f=>{const on=f.boats.includes(id);return{...f,boats:on?f.boats.filter(x=>x!==id):[...f.boats,id],dates:{...f.dates,[id]:[]}};});
  const togDate=(bid,ds)=>setBf(f=>{const cur=f.dates[bid]||[];return{...f,dates:{...f.dates,[bid]:cur.includes(ds)?cur.filter(x=>x!==ds):[...cur,ds].sort()}};});
  const togCayo=(c)=>setBf(f=>{if(f.cayos.includes(c))return{...f,cayos:f.cayos.filter(x=>x!==c)};if(f.cayos.length>=4)return f;return{...f,cayos:[...f.cayos,c]};});
  const togExt=(id)=>setBf(f=>({...f,extras:f.extras.includes(id)?f.extras.filter(x=>x!==id):[...f.extras,id]}));
  const setPax=(bid,v)=>setBf(f=>({...f,pax:{...f.pax,[bid]:v}}));

  const allDates=[...new Set([...(bf.dates.kichi||[]),...(bf.dates.yamaha||[])])];
  const maxWifi=allDates.length>0?Math.max(...allDates.map(d=>wifiPrice(d))):25;
  const wifiUnavail=allDates.some(d=>NO_WIFI.includes(d));
  const dynExtras=[{id:"wifi",label:"WiFi Starlink",price:maxWifi,icon:"📶"},{id:"cava",label:"Cava con Hielo",price:10,icon:"🧊"}];
  const boatTotal=bf.boats.reduce((s,bid)=>{const b=BOATS[bid];return s+(bf.dates[bid]||[]).reduce((ss,ds)=>{const pr=b.price(ds,bf.pax[bid]);return ss+(pr?pr.p:0);},0);},0);
  const eTotal=bf.extras.reduce((s,id)=>{if(id==="wifi"&&wifiUnavail)return s;const e=dynExtras.find(x=>x.id===id);return s+(e?e.price*allDates.length:0);},0);
  const boatTot=boatTotal+eTotal;
  const grandTotal=(mode==="apt"?aptTot:0)+(mode==="boat"?boatTot:0)+(mode==="both"?aptTot+boatTot:0);
  const grandDeposit=Math.ceil(grandTotal*.3);

  // ── PROMO CALCULATIONS ──────────────────────────────────────────────────────
  const activePromo = selectedPromo ? PROMOS[selectedPromo] : null;
  const promoBasePrice = activePromo ? promoPrice(activePromo, aptPax) : 0;

  // When promo is active:
  // - nights includes ALL nights selected (checkin->checkout)
  // - first 2 nights + first boat day = covered by promo base
  // - extra nights (nights - 2) at regular apt price
  // - extra boat days (all boat days beyond 1) at regular boat price
  const promoExtraNights = activePromo ? Math.max(0, nights - activePromo.nights) : 0;
  const promoExtraNightPrice = activePromo && af.checkin ? (() => {
    let total = 0;
    // Price extra nights starting from night index 2
    const ci = new Date(af.checkin + "T12:00:00");
    for(let i = activePromo.nights; i < nights; i++) {
      const d = new Date(ci); d.setDate(d.getDate() + i);
      total += aptNightPrice(d.toISOString().slice(0,10));
    }
    return total;
  })() : 0;

  // Extra boat days = all days beyond the first 1 included in promo
  const promoBoatId = activePromo ? activePromo.boat : null;
  const promoBoatDates = promoBoatId ? (bf.dates[promoBoatId]||[]) : [];
  const promoIncludedBoatDays = activePromo ? 1 : 0; // promo includes 1 boat day
  const promoExtraBoatDays = promoBoatDates.slice(promoIncludedBoatDays); // days beyond the 1st
  const promoExtraBoatTotal = promoExtraBoatDays.reduce((s,ds)=>{
    const b = BOATS[promoBoatId]; const pr = b.price(ds, bf.pax[promoBoatId]||2);
    return s + (pr ? pr.p : 0);
  }, 0);

  // Also add any non-promo boats selected alongside promo
  const nonPromoBoatTotal = activePromo ? bf.boats.filter(bid=>bid!==activePromo.boat).reduce((s,bid)=>{
    const b=BOATS[bid]; return s+(bf.dates[bid]||[]).reduce((ss,ds)=>{const pr=b.price(ds,bf.pax[bid]);return ss+(pr?pr.p:0);},0);
  },0) : 0;
  const promoTotal = promoBasePrice + promoExtraNightPrice + promoExtraBoatTotal + nonPromoBoatTotal + eTotal;
  const promoDeposit = Math.ceil(promoTotal * .3);

  const hasDates=bf.boats.length>0&&bf.boats.every(bid=>(bf.dates[bid]||[]).length>0);

  const handleDayClick=(ds)=>{
    if(ciMode==="ci"){setAf(f=>({...f,checkin:ds,checkout:""}));setCiMode("co");}
    else{
      if(ds<=af.checkin){setAf(f=>({...f,checkin:ds,checkout:""}));setCiMode("co");}
      else{setAf(f=>({...f,checkout:ds}));setCiMode("ci");}
    }
  };

  const buildMsg=()=>{
    // Use promo pricing if active
    const finalTotal = activePromo ? promoTotal : grandTotal;
    const finalDeposit = activePromo ? promoDeposit : grandDeposit;
    let msg=`🏠⛵ *Reserva – El Poblado 5H*\n`;
    if(mode==="apt"||mode==="both"){
      msg+=`\n🏠 *APARTAMENTO*\n`;
      msg+=`👥 Personas: ${aptPax}\n`;
      msg+=`📅 Check-in: ${fmtL(af.checkin)}\n`;
      msg+=`📅 Check-out: ${fmtL(af.checkout)}\n`;
      msg+=`🌙 Noches: ${nights}\n`;
      msg+=`⏰ Check-in: 2:00pm–5:00pm | Check-out: máx 11:00am\n`;
      if(!activePromo) msg+=`💰 Total apto: $${aptTot} USD\n`;
    }
    if(mode==="boat"||mode==="both"){
      msg+=`\n⛵ *LANCHAS*\n`;
      bf.boats.forEach(bid=>{
        const b=BOATS[bid];const dates=bf.dates[bid]||[];
        msg+=`🚤 ${b.name} (${bf.pax[bid]} pax)\n`;
        dates.forEach(d=>{const pr=b.price(d,bf.pax[bid]);msg+=`  • ${fmtL(d)} — $${pr?.p} (${pr?.l})\n`;});
      });
      if(bf.cayos.length)msg+=`🏝 Cayos: ${bf.cayos.join(", ")}\n`;
      else msg+=`🏝 Cayos: Los escogeré el día del paseo con el marino\n`;
      const ae=bf.extras.filter(id=>!(id==="wifi"&&wifiUnavail));
      if(ae.length)msg+=`➕ Extras: ${dynExtras.filter(e=>ae.includes(e.id)).map(e=>`${e.label} ($${e.price*allDates.length})`).join(", ")}\n`;
      if(!activePromo) msg+=`💰 Total lanchas: $${boatTot} USD\n`;
    }
    if(activePromo){
      msg+=`\n🎯 *${activePromo.name}*\n`;
      msg+=`  • Base promo (2 noches + 1 salida): $${promoBasePrice} USD\n`;
      if(promoExtraNights>0) msg+=`  • ${promoExtraNights} noche${promoExtraNights>1?"s":""} extra: $${promoExtraNightPrice} USD\n`;
      if(promoExtraBoatTotal>0) msg+=`  • ${promoExtraBoatDays.length} salida${promoExtraBoatDays.length>1?"s":""} extra (${BOATS[activePromo.boat].name}): $${promoExtraBoatTotal} USD\n`;
      if(nonPromoBoatTotal>0){bf.boats.filter(bid=>bid!==activePromo.boat).forEach(bid=>{const b=BOATS[bid];const dates=bf.dates[bid]||[];const tot=dates.reduce((s,ds)=>{const pr=b.price(ds,bf.pax[bid]);return s+(pr?pr.p:0);},0);if(tot>0)msg+=`  • ${b.name} (${dates.length} día${dates.length>1?"s":""}): $${tot} USD\n`;});}
    }
    msg+=`\n💰 *TOTAL: $${finalTotal} USD*\n`;
    msg+=`💳 *Anticipo (30%): $${finalDeposit} USD*\n`;
    msg+=`\n👤 Nombre: ${nombre}\n📞 Teléfono: ${telefono}\n`;
    if(cedula)msg+=`🪪 Cédula/Pasaporte: ${cedula}\n`;
    if(notas)msg+=`📝 Notas: ${notas}\n`;
    msg+=`\n⚠️ *Cancelación:* Sin devoluciones. Con +48h puedes reprogramar con penalización de $30. Menos de 48h pierdes la reserva.\n`;
    return msg;
  };

  const isDesktop=()=>!/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const submitEmail=()=>{
    const msg=buildMsg();
    track("email_sent",{booking_type:mode,total_usd:grandTotal,value:grandTotal,currency:"USD"});
    const subject=encodeURIComponent("Reserva El Poblado 5H");
    const body=encodeURIComponent(msg);
    window.open(`mailto:elpoblado5h@gmail.com?subject=${subject}&body=${body}`,"_blank");
    setLastDep(grandDeposit);setDone(true);
  };
  const submit=()=>{
    const msg=buildMsg();
    track("whatsapp_sent",{booking_type:mode,total_usd:grandTotal,value:grandTotal,currency:"USD"});
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`,"_blank");
    setLastDep(grandDeposit);setDone(true);
  };

  // ── CURRENT PHASE ──────────────────────────────────────────────────────────
  // "both" mode: aptStep 0-1 first, then boatStep 0-4, then confirm
  const isAptPhase=mode==="apt"||(mode==="both"&&aptStep<2);
  const isBoatPhase=mode==="boat"||(mode==="both"&&aptStep>=2);
  const showConfirm=(mode==="apt"&&aptStep===3)||(mode==="boat"&&boatStep===5)||(mode==="both"&&boatStep===5);

  // Steps labels per mode
  const aptStepLabels=["Fechas","Lancha","Datos","Confirmar"];
  const boatStepLabels=["Lanchas","Fechas","Cayos","Extras","Confirmar"];
  const bothStepLabels=["Apto: Fechas","Lanchas","Fechas","Cayos","Extras","Confirmar"];

  const stepLabels=mode==="apt"?[...aptStepLabels,"✓"]:mode==="boat"?boatStepLabels:bothStepLabels;
  const currentStep=mode==="apt"?aptStep:mode==="boat"?boatStep:(aptStep<2?aptStep:aptStep+boatStep);

  if(done)return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0c4a6e,#0ea5e9)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{background:"#fff",borderRadius:22,padding:"44px 28px",maxWidth:420,width:"100%",textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
        <div style={{fontSize:60,marginBottom:16}}>🎉</div>
        <div className="bb" style={{fontSize:38,color:"#0f172a",marginBottom:8}}>¡SOLICITUD ENVIADA!</div>
        <p style={{color:"#64748b",fontSize:13,lineHeight:1.8,marginBottom:14}}>Tu solicitud fue enviada por WhatsApp. Te confirmaremos la disponibilidad a la brevedad.</p>
        <div style={{background:"#fffbeb",border:"1.5px solid #fde68a",borderRadius:11,padding:"11px 14px",marginBottom:24,textAlign:"left"}}>
          <p style={{fontSize:11,color:"#92400e",lineHeight:1.7}}>⚠️ Recuerda pagar el <strong>30% de anticipo (${lastDep} USD)</strong> para confirmar vía Zelle, Binance o pago móvil.</p>
        </div>
        <button onClick={()=>{setDone(false);setPage("home");setMode(null);setAf({...AF0});setAptPax(2);setSelectedPromo(null);setExtraAptNights(0);setExtraBoatDates({kichi:[],yamaha:[]});setBf({...BF0,pax:{kichi:2,yamaha:2},dates:{kichi:[],yamaha:[]}});setNombre("");setTelefono("");setCedula("");setNotas("");setAptStep(0);setBoatStep(0);}} style={{background:"linear-gradient(135deg,#0369a1,#0ea5e9)",color:"#fff",border:"none",borderRadius:50,padding:"13px 32px",fontSize:14,fontFamily:"Lato,sans-serif",fontWeight:900,cursor:"pointer"}}>Hacer otra reserva</button>
      </div>
    </div>
  );

  return(
    <div>
      {/* ── HERO ── */}
      <div className="hero">
        <img className="hero-bg" src={IH} srcSet={`${sm(IH)} 640w, ${IH} 960w`} sizes="100vw" fetchpriority="high" alt="Cayos del Parque Nacional Morrocoy, Tucacas, Venezuela"/>
        <div className="hero-ov"/>
        <div className="hero-c">
          <img src={IL} alt="El Poblado 5H" style={{width:90,height:90,objectFit:"contain",margin:"0 auto 18px",display:"block",filter:"brightness(0) invert(1)"}}/>
          <h1 className="bb">EL POBLADO <em>5H</em></h1>
          <p style={{color:"rgba(255,255,255,.8)",fontSize:"clamp(13px,3.5vw,17px)",marginTop:12,fontWeight:300,letterSpacing:.5}}>Alquiler de apartamento y lanchas en Morrocoy, Venezuela</p>
          <a href="https://share.google/HGGOvNkPUME60DJV6" target="_blank" className="badge">📍 Morrocoy, Venezuela</a>
          <div className="cta">
            <button className="btn-p" onClick={()=>{track("cta_click",{cta:"hero_reservar"});setPage("book");setTimeout(()=>ref.current?.scrollIntoView({behavior:"smooth"}),80);}}>Reservar ahora</button>
            <a className="btn-s" href="https://instagram.com/elpoblado5h" target="_blank" onClick={()=>track("instagram_click",{location:"hero"})}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="white" strokeWidth="2"/><circle cx="12" cy="12" r="5" stroke="white" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1.2" fill="white"/></svg>
              @elpoblado5h
            </a>
          </div>
        </div>
        <div className="scroll">↓<br/>CONOCE NUESTROS SERVICIOS</div>
      </div>

      {/* ── SERVICES PREVIEW ── */}
      <section style={{textAlign:"center",background:"#fff"}}>
        <div className="sec-lbl">Nuestros servicios</div>
        <div className="bb sec-ttl">TODO PARA TU ESCAPADA</div>
        <p style={{color:"#64748b",fontSize:14,marginTop:8,maxWidth:520,margin:"8px auto 0"}}>Alquila el apartamento, las lanchas, o los dos juntos para una experiencia completa en Morrocoy.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:22,marginTop:36,maxWidth:900,margin:"36px auto 0"}}>
          {/* Apartment card */}
          <div className="bc">
            <AptGallery/>
            <div className="bc-body">
              <div className="bb" style={{fontSize:26,color:"#0f172a"}}>APARTAMENTO</div>
              <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>2 Hab + Mesanina · 7 personas · 2 baños</div><div style={{marginTop:4}}><a href="https://share.google/CI23gtgSK25EgtnZB" target="_blank" style={{fontSize:11,color:"#0ea5e9",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:3}}>📍 Ver ubicación en Maps</a></div>
              <div className="bb" style={{fontSize:32,color:"#0369a1"}}>$135<span style={{fontFamily:"Lato,sans-serif",fontSize:12,color:"#94a3b8",fontWeight:400}}> USD/noche · Temp. Baja</span></div>
              <div style={{fontSize:11,color:"#64748b",marginTop:2}}>Temp. Media: $155 · Alta: $180/noche</div>
              <div className="tags" style={{marginTop:10}}>
                {["Cocina equipada","3 A/C","WiFi y TV","Piscina","Jardín","Estacionamiento","Balcón + Parrillera","Mascotas ✓","Planta eléctrica","Vigilancia 24h","Lavadora","Secadora","Agua caliente"].map(f=><span key={f} className="tag">{f}</span>)}
              </div>
              <a href="/apartamento-tucacas-morrocoy/" style={{display:"block",marginTop:10,fontSize:12,fontWeight:700,color:"#0369a1",textDecoration:"none"}}>Ver fotos, precios y detalles del apartamento →</a>
              <button onClick={()=>goBook("apt")} style={{marginTop:14,width:"100%",padding:"11px",borderRadius:50,border:"none",background:"linear-gradient(135deg,#0369a1,#0ea5e9)",color:"#fff",fontFamily:"Lato,sans-serif",fontWeight:900,fontSize:13,cursor:"pointer"}}>Reservar apartamento →</button>
            </div>
          </div>
          {/* Boats card */}
          <div className="bc">
            <img src={sm(IK)} loading="lazy" alt="Lancha Kichi para paseos a los cayos de Morrocoy" style={{width:"100%",height:130,objectFit:"cover",display:"block"}}/>
            <img src={sm(IY)} loading="lazy" alt="Lancha Yamaha SX230 en Morrocoy, Tucacas" style={{width:"100%",height:130,objectFit:"cover",display:"block"}}/>
            <div className="bc-body">
              <div className="bb" style={{fontSize:26,color:"#0f172a"}}>LANCHAS</div>
              <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Kichi (7 pax) · Yamaha SX230 (9 pax)</div>
              <div className="bb" style={{fontSize:32,color:"#0369a1"}}>$160<span style={{fontFamily:"Lato,sans-serif",fontSize:12,color:"#94a3b8",fontWeight:400}}> USD/día · Kichi Temp. Baja</span></div>
              <div style={{fontSize:11,color:"#64748b",marginTop:2}}>Yamaha desde $260/día · Hasta 4 cayos</div>
              <div className="tags" style={{marginTop:10}}>
                <a href="https://share.google/HGGOvNkPUME60DJV6" target="_blank" className="tag" style={{textDecoration:"none",color:"#0369a1"}}>📍 Ver ubicación en Maps</a>
                {["9:30am–5:30pm","Marino incluido","Salvavidas","Toldo","Equipo de sonido","WiFi Starlink (extra)"].map(f=><span key={f} className="tag">{f}</span>)}
              </div>
              <a href="/alquiler-lancha-morrocoy/" style={{display:"block",marginTop:10,fontSize:12,fontWeight:700,color:"#0369a1",textDecoration:"none"}}>Ver lanchas, tarifas y cayos →</a>
              <button onClick={()=>goBook("boat")} style={{marginTop:14,width:"100%",padding:"11px",borderRadius:50,border:"none",background:"linear-gradient(135deg,#0369a1,#0ea5e9)",color:"#fff",fontFamily:"Lato,sans-serif",fontWeight:900,fontSize:13,cursor:"pointer"}}>Reservar lanchas →</button>
            </div>
          </div>
        </div>
        {/* Combo CTA */}
        <div style={{margin:"32px auto",maxWidth:600,background:"linear-gradient(135deg,#0c4a6e,#0369a1)",borderRadius:20,padding:"28px 32px",textAlign:"center"}}>
          <div className="bb" style={{fontSize:28,color:"#fff",marginBottom:8}}>🏠 + ⛵ COMBO COMPLETO</div>
          <p style={{color:"rgba(255,255,255,.8)",fontSize:13,marginBottom:20}}>Reserva el apartamento y las lanchas juntos en una sola solicitud. La experiencia completa de Morrocoy.</p>
          <button onClick={()=>goBook("both")} style={{padding:"14px 40px",borderRadius:50,border:"2px solid rgba(255,255,255,.5)",background:"rgba(255,255,255,.15)",color:"#fff",fontFamily:"Lato,sans-serif",fontWeight:900,fontSize:15,cursor:"pointer",backdropFilter:"blur(8px)"}}>Reservar todo juntos →</button>
        </div>
      </section>

      {/* ── PROMOCIONES ── */}
      <section style={{background:"#f8fafc",padding:"48px 24px"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div className="sec-lbl">Ofertas especiales</div>
          <div className="bb sec-ttl">PROMOCIONES TEMPORADA BAJA</div>
          <p style={{color:"#64748b",fontSize:13,marginTop:8,maxWidth:480,margin:"8px auto 0"}}>2 noches en el apartamento + 1 salida en lancha. Solo disponibles en temporada baja.</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:20,maxWidth:700,margin:"32px auto 0"}}>
          {Object.values(PROMOS).map(pr=>(
            <div key={pr.id} style={{background:"#fff",borderRadius:18,overflow:"hidden",border:"2px solid #0ea5e9",boxShadow:"0 4px 24px rgba(14,165,233,.12)"}}>
              <div style={{background:"linear-gradient(135deg,#0c4a6e,#0369a1)",padding:"18px 22px"}}>
                <div style={{fontSize:30,marginBottom:6}}>{pr.icon}</div>
                <div className="bb" style={{fontSize:22,color:"#fff",letterSpacing:.5}}>{pr.name}</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginTop:4}}>{pr.desc}</div>
              </div>
              <div style={{padding:"18px 22px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:12}}>
                  <div>
                    <div className="bb" style={{fontSize:32,color:"#0369a1"}}>${pr.pricePerPax}<span style={{fontFamily:"Lato,sans-serif",fontSize:12,color:"#94a3b8",fontWeight:400}}>/persona</span></div>
                    <div style={{fontSize:11,color:"#64748b"}}>Precio total 7 pax: ${pr.totalFixed} USD</div>
                  </div>
                  <div style={{textAlign:"right",fontSize:12,color:"#64748b",lineHeight:1.8}}>
                    <div>🌙 2 noches</div>
                    <div>🚤 1 salida</div>
                  </div>
                </div>
                <div style={{background:"#f0f9ff",borderRadius:8,padding:"8px 12px",fontSize:11,color:"#0369a1",lineHeight:1.8,marginBottom:14}}>
                  ✓ Solo temporada baja<br/>
                  ✓ Cancelaciones no aplican<br/>
                  ✓ Sujeto a disponibilidad<br/>
                  ✓ Puedes agregar noches o salidas extra
                </div>
                <button onClick={()=>{track("booking_started",{booking_type:"both",promo_id:pr.id});setSelectedPromo(pr.id);setPage("book");setMode("both");setTimeout(()=>ref.current?.scrollIntoView({behavior:"smooth"}),80);}} style={{width:"100%",padding:"12px",borderRadius:50,border:"none",background:"linear-gradient(135deg,#0369a1,#0ea5e9)",color:"#fff",fontFamily:"Lato,sans-serif",fontWeight:900,fontSize:13,cursor:"pointer"}}>
                  Reservar esta promo →
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── INFO STRIP ── */}
      <div className="strip">
        <div className="strip-grid">
          {[["🏠","7 personas","2 hab + mesanina"],["⛵","2 lanchas","Hasta 9 pax c/u"],["🏝","4 cayos","Por salida"],["💳","30% anticipo","Zelle · Binance"],["🐾","Mascotas","Permitidas"]].map(([ic,t,s])=>(
            <div key={t}><div style={{fontSize:26,marginBottom:6}}>{ic}</div><div className="bb" style={{fontSize:17,color:"#fff",letterSpacing:.5}}>{t}</div><div style={{fontSize:11,color:"rgba(255,255,255,.6)",marginTop:3}}>{s}</div></div>
          ))}
        </div>
      </div>

      {/* ── BOOKING ── */}
      <div className="book-sec" ref={ref}>
        {/* PROMO BANNER */}
        {selectedPromo&&mode==="both"&&(
          <div style={{maxWidth:600,margin:"0 auto 0",background:"linear-gradient(135deg,#0369a122,#0ea5e922)",border:"1.5px solid #0ea5e9",borderRadius:12,padding:"12px 18px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:11,fontWeight:900,color:"#0ea5e9",letterSpacing:.5,textTransform:"uppercase"}}>🎯 Promo activa</div>
              <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{PROMOS[selectedPromo].name} — ${promoBasePrice} USD</div>
            </div>
            <button onClick={()=>setSelectedPromo(null)} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:50,padding:"4px 12px",fontSize:11,color:"#fff",cursor:"pointer"}}>Quitar</button>
          </div>
        )}

        {!mode?(
          // Mode selector
          <div style={{maxWidth:600,margin:"0 auto",textAlign:"center"}}>
            <h2 className="bb" style={{fontSize:"clamp(32px,7vw,52px)",color:"#fff",letterSpacing:.5}}>¿QUÉ QUIERES RESERVAR?</h2>
            <p style={{color:"rgba(255,255,255,.65)",fontSize:13,marginTop:8,marginBottom:36}}>Elige una opción para comenzar</p>
            <div style={{display:"grid",gap:14}}>
              {[["apt","🏠","Solo Apartamento","Alojamiento en Morrocoy, Morrocoy",["$135–$180/noche","7 personas","2 hab + Mesanina"]],
                ["boat","⛵","Solo Lanchas","Salida a los cayos desde Marina Las Canoas",["Desde $160/día","Kichi 7 pax · Yamaha 9 pax","Hasta 4 cayos"]],
                ["both","🏠+⛵","Apartamento + Lanchas","La experiencia completa de Morrocoy",["Todo en una reserva","Precio combinado","30% anticipo"]]
              ].map(([m,ic,title,sub,bullets])=>(
                <div key={m} onClick={()=>goBook(m)} style={{background:"rgba(255,255,255,.08)",border:"1.5px solid rgba(255,255,255,.15)",borderRadius:16,padding:"20px 24px",cursor:"pointer",transition:"all .2s",textAlign:"left",display:"flex",alignItems:"center",gap:16}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.15)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.08)"}>
                  <div style={{fontSize:36,flexShrink:0}}>{ic}</div>
                  <div style={{flex:1}}>
                    <div className="bb" style={{fontSize:22,color:"#fff",letterSpacing:.5}}>{title}</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,.6)",marginBottom:8}}>{sub}</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {bullets.map(b=><span key={b} style={{fontSize:10,background:"rgba(255,255,255,.12)",color:"rgba(255,255,255,.8)",borderRadius:50,padding:"3px 9px",fontWeight:700}}>{b}</span>)}
                    </div>
                  </div>
                  <div style={{color:"rgba(255,255,255,.4)",fontSize:20}}>›</div>
                </div>
              ))}
            </div>
          </div>
        ):(
          <div>
            <div style={{maxWidth:600,margin:"0 auto 28px",textAlign:"center"}}>
              <button onClick={()=>setMode(null)} style={{background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",color:"rgba(255,255,255,.7)",borderRadius:50,padding:"6px 16px",cursor:"pointer",fontSize:12,fontFamily:"Lato,sans-serif",marginBottom:16}}>← Cambiar selección</button>
              <h2 className="bb" style={{fontSize:"clamp(28px,6vw,44px)",color:"#fff",letterSpacing:.5}}>
                {mode==="apt"?"🏠 APARTAMENTO":mode==="boat"?"⛵ LANCHAS":"🏠+⛵ COMBO COMPLETO"}
              </h2>
            </div>

            {/* Steps */}
            <div className="steps" style={{maxWidth:580,margin:"0 auto 24px",gap:0,overflowX:"auto"}}>
              {stepLabels.map((s,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <div className={`sd ${i<currentStep?"done":i===currentStep?"active":"todo"}`}>{i<currentStep?"✓":i+1}</div>
                    <span className={`sl ${i<currentStep?"done":i===currentStep?"active":"todo"}`}>{s}</span>
                  </div>
                  {i<stepLabels.length-1&&<div className={`sline ${i<currentStep?"done":""}`}/>}
                </div>
              ))}
            </div>

            <div className="card">

              {/* ═══ APARTMENT STEPS ═══ */}
              {(mode==="apt"||(mode==="both"&&aptStep<2))&&(
                <div>
                  {aptStep===0&&(
                    <div>
                      <div className="ftitle bb">Fechas del apartamento</div>
                      <div className="fsub">
                        {ciMode==="ci"?"Toca el día de llegada (check-in)":"Ahora toca el día de salida (check-out)"}
                      </div>
                      <div style={{display:"flex",gap:10,marginBottom:16,background:"#f8fafc",borderRadius:10,padding:"10px 14px",alignItems:"center"}}>
                        <div style={{flex:1,textAlign:"center"}}>
                          <div style={{fontSize:9,fontWeight:900,letterSpacing:1,textTransform:"uppercase",color:"#94a3b8",marginBottom:3}}>CHECK-IN</div>
                          <div style={{fontSize:13,fontWeight:700,color:af.checkin?"#0369a1":"#cbd5e1"}}>{af.checkin?fmt(af.checkin):"Sin seleccionar"}</div>
                        </div>
                        <div style={{color:"#cbd5e1",fontSize:18}}>→</div>
                        <div style={{flex:1,textAlign:"center"}}>
                          <div style={{fontSize:9,fontWeight:900,letterSpacing:1,textTransform:"uppercase",color:"#94a3b8",marginBottom:3}}>CHECK-OUT</div>
                          <div style={{fontSize:13,fontWeight:700,color:af.checkout?"#0369a1":"#cbd5e1"}}>{af.checkout?fmt(af.checkout):"Sin seleccionar"}</div>
                        </div>
                        {nights>0&&<div style={{textAlign:"center"}}>
                          <div style={{fontSize:9,fontWeight:900,letterSpacing:1,textTransform:"uppercase",color:"#94a3b8",marginBottom:3}}>NOCHES</div>
                          <div className="bb" style={{fontSize:22,color:"#0369a1"}}>{nights}</div>
                        </div>}
                      </div>
                      <div style={{background:"#f0f9ff",border:"1.5px solid #bae6fd",borderRadius:12,padding:"12px 16px",marginBottom:16,fontSize:12,color:"#0c4a6e",lineHeight:1.8}}>
                        <div style={{fontWeight:900,fontSize:10,letterSpacing:1,textTransform:"uppercase",color:"#0369a1",marginBottom:6}}>⏰ Check-in & Check-out</div>
                        <div>🟢 <strong>Entrada:</strong> 2:00 pm – 5:00 pm</div>
                        <div>🔴 <strong>Salida:</strong> máximo 11:00 am</div>
                        <div style={{fontSize:11,color:"#64748b",marginTop:6}}>📞 Al confirmar tu reserva recibirás el contacto para coordinar la entrega de llaves.</div>
                      </div>
                      <div style={{marginBottom:16}}>
                        <label className="lbl">Número de personas</label>
                        <div className="pax-c">
                          <button className="pb" onClick={()=>setAptPax(p=>Math.max(1,p-1))}>−</button>
                          <span className="pn">{aptPax}</span>
                          <button className="pb" onClick={()=>setAptPax(p=>Math.min(7,p+1))}>+</button>
                          <span style={{fontSize:11,color:"#94a3b8",marginLeft:6}}>máx 7 personas</span>
                        </div>
                      </div>
                      <Cal checkinMode={true} checkin={af.checkin} checkout={af.checkout} onDayClick={handleDayClick} promoLowOnly={!!selectedPromo} gcBooked={gcBooked}/>
                      {nights>0&&(
                        <div className="pbox" style={{marginTop:12}}>
                          <div style={{fontSize:10,color:"#0369a1",fontWeight:900,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Desglose por noche</div>
                          {Array.from({length:nights},(_,i)=>{
                            const d=new Date(af.checkin+"T12:00:00");d.setDate(d.getDate()+i);const ds=d.toISOString().slice(0,10);
                            return<div key={ds} className="pr"><span>{fmt(ds)} <span style={{fontSize:10,color:SC[getSeason(ds)]}}>{SL[getSeason(ds)]}</span></span><span>${aptNightPrice(ds)}</span></div>;
                          })}
                          <div className="ptotal"><span style={{fontWeight:700,fontSize:14}}>Total {nights} noches</span><div className="ptnum bb">${aptTot} <span style={{fontFamily:"Lato,sans-serif",fontSize:13,color:"#94a3b8",fontWeight:400}}>USD</span></div></div>
                          <div className="dep">✓ Anticipo: ${Math.ceil(aptTot*.3)} USD (30%)</div>
                        </div>
                      )}
                      {nights>0&&nights<aptMinStay&&(
                        <div style={{background:"#fff7ed",border:"1.5px solid #fed7aa",borderRadius:10,padding:"10px 14px",marginTop:12,fontSize:12,color:"#c2410c",fontWeight:600}}>
                          ⚠️ El mínimo de estadía para estas fechas es <strong>{aptMinStay} noches</strong>. Por favor selecciona un checkout más tarde.
                        </div>
                      )}
                      {aptRangeBlocked&&(
                        <div style={{background:"#fff7ed",border:"1.5px solid #fed7aa",borderRadius:10,padding:"10px 14px",marginTop:12,fontSize:12,color:"#c2410c",fontWeight:600}}>
                          ⚠️ Hay fechas reservadas dentro del rango seleccionado. Por favor elige otras fechas.
                        </div>
                      )}
                      <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
                        {mode==="both"?(
                          <button className="btn-next" disabled={nights<aptMinStay||aptRangeBlocked} onClick={()=>{
                              track("apt_dates_confirmed",{nights,checkin:af.checkin,checkout:af.checkout});
                              setAptStep(1);
                              // Auto-select promo boat if promo active
                              if(activePromo&&!bf.boats.includes(activePromo.boat)){
                                setBf(f=>({...f,boats:[activePromo.boat],dates:{...f.dates,[activePromo.boat]:[]}}));
                              }
                            }}>
                            {selectedPromo?"Siguiente: Seleccionar lancha →":"Siguiente: Lanchas →"}
                          </button>
                        ):(
                          <button className="btn-next" disabled={nights<aptMinStay||aptRangeBlocked} onClick={()=>{track("apt_dates_confirmed",{nights,checkin:af.checkin,checkout:af.checkout});setAptStep(1);}}>Siguiente →</button>
                        )}
                      </div>
                    </div>
                  )}
                  {aptStep===1&&mode==="apt"&&(
                    // ── UPSELL SCREEN ──
                    <div>
                      <div style={{borderRadius:16,overflow:"hidden",marginBottom:18,position:"relative"}}>
                        <img src={sm(IK)} alt="Lancha Kichi en Morrocoy" style={{width:"100%",height:130,objectFit:"cover",display:"block",filter:"brightness(.55)"}}/>
                        <img src={sm(IY)} alt="Lancha Yamaha SX230 en Morrocoy" style={{width:"100%",height:130,objectFit:"cover",display:"block",filter:"brightness(.55)",marginTop:2}}/>
                        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 30%,rgba(6,40,80,.85))",display:"flex",alignItems:"flex-end",padding:"18px 20px"}}>
                          <div>
                            <div className="bb" style={{fontSize:26,color:"#fff",lineHeight:1,letterSpacing:.5}}>¿TE VAS SIN CONOCER LOS CAYOS?</div>
                            <div style={{fontSize:12,color:"rgba(255,255,255,.8)",marginTop:5}}>Agrega una salida en lancha y vive la experiencia completa de Morrocoy.</div>
                          </div>
                        </div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
                        {[{name:"Kichi",price:"desde $160/día",cap:"7 pax"},{name:"Yamaha SX230",price:"desde $260/día",cap:"9 pax"}].map(b=>(
                          <div key={b.name} style={{background:"#f0f9ff",border:"1.5px solid #bae6fd",borderRadius:12,padding:"12px 14px",textAlign:"center"}}>
                            <div className="bb" style={{fontSize:17,color:"#0f172a"}}>{b.name}</div>
                            <div style={{fontSize:11,color:"#0369a1",fontWeight:700,marginTop:2}}>{b.price}</div>
                            <div style={{fontSize:10,color:"#64748b",marginTop:1}}>{b.cap}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{display:"grid",gap:10}}>
                        <button onClick={()=>{setMode("both");setAptStep(1);}} style={{width:"100%",padding:"16px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#0284c7,#0ea5e9)",color:"#fff",fontFamily:"Lato,sans-serif",fontWeight:900,fontSize:15,cursor:"pointer",boxShadow:"0 6px 20px rgba(14,165,233,.35)"}}>
                          ⛵ Sí, quiero agregar una lancha
                        </button>
                        <button onClick={()=>setAptStep(2)} style={{width:"100%",padding:"14px",borderRadius:14,border:"1.5px solid #e2e8f0",background:"#fff",color:"#64748b",fontFamily:"Lato,sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                          No gracias, solo el apartamento
                        </button>
                      </div>
                      <div style={{textAlign:"center",marginTop:10}}>
                        <button className="btn-back" onClick={()=>setAptStep(0)}>← Atrás</button>
                      </div>
                    </div>
                  )}
                  {aptStep===2&&mode==="apt"&&(
                    // Datos
                    <div>
                      <div className="ftitle bb">Tus datos</div>
                      <div className="fsub">Para confirmar la reserva del apartamento.</div>
                      <div style={{display:"grid",gap:12,marginTop:4}}>
                        {[["Nombre completo *","Juan Pérez","text",nombre,setNombre],["Teléfono WhatsApp *","+58 412 000 0000","tel",telefono,setTelefono],["Cédula o Pasaporte (opcional)","V-12345678","text",cedula,setCedula]].map(([lb,ph,t,v,sv])=>(
                          <div key={lb}><label className="lbl">{lb}</label><input className="inp" type={t} placeholder={ph} value={v} onChange={e=>sv(e.target.value)}/></div>
                        ))}
                        <div><label className="lbl">Notas adicionales</label><input className="inp" placeholder="Mascotas, solicitudes especiales..." value={notas} onChange={e=>setNotas(e.target.value)}/></div>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",marginTop:16}}>
                        <button className="btn-back" onClick={()=>setAptStep(1)}>← Atrás</button>
                        <button className="btn-next" disabled={!nombre||!telefono} onClick={()=>{track("apt_info_submitted",{booking_type:mode});setAptStep(3);}}>Revisar →</button>
                      </div>
                    </div>
                  )}
                  {aptStep===3&&mode==="apt"&&(
                    // Confirm apt-only
                    <div>
                      <div className="ftitle bb">Revisa tu reserva</div>
                      <div className="fsub">Confirma antes de enviar por WhatsApp.</div>
                      <div style={{border:"1.5px solid #bae6fd",borderRadius:16,overflow:"hidden",marginTop:12,marginBottom:12}}>
                        <div className="conf-hd" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <div>
                            <div style={{fontSize:10,color:"rgba(255,255,255,.55)",letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>Total a pagar</div>
                            <div className="bb" style={{fontSize:36,color:"#fff",lineHeight:1}}>${aptTot} <span style={{fontFamily:"Lato,sans-serif",fontSize:14,color:"rgba(255,255,255,.55)",fontWeight:400}}>USD</span></div>
                            <div style={{fontSize:11,color:"#34d399",marginTop:4,fontWeight:700}}>Anticipo: ${Math.ceil(aptTot*.3)} USD (30%)</div>
                          </div>
                          <img src={sm(IA1)} alt="" style={{width:70,height:70,objectFit:"cover",borderRadius:10,border:"2px solid rgba(255,255,255,.25)"}}/>
                        </div>
                        {[["🏠","Alojamiento","Apartamento El Poblado 5H"],["👥","Personas",`${aptPax} persona${aptPax!==1?"s":""}`],["📅","Check-in",fmtL(af.checkin)],["📅","Check-out",fmtL(af.checkout)],["🌙","Noches",`${nights} noche${nights!==1?"s":""}`],["👤","Nombre",nombre],["📞","Teléfono",telefono],...(cedula?[["🪪","Documento",cedula]]:[]),...(notas?[["📝","Notas",notas]]:[])].map(([ic,lb,val])=>(
                          <div key={lb} className="conf-row"><span style={{fontSize:13,marginTop:1}}>{ic}</span><div style={{flex:1}}><div className="conf-lbl">{lb}</div><div className="conf-val">{val}</div></div></div>
                        ))}
                      </div>
                      <div className="pol">
                        <strong>⏰ Check-in:</strong> 2:00 pm – 5:00 pm · <strong>Check-out:</strong> máx 11:00 am<br/>
                        <strong>📞 Coordinación:</strong> Al confirmar te enviaremos el contacto para coordinar la entrega de llaves<br/>
                        <strong>🧹 Normas:</strong> Dejar el apartamento ordenado y utensilios de cocina limpios<br/>
                        <strong>💧 Agua:</strong> Se recomienda llevar agua potable (el agua del complejo es solo para higiene)<br/>
                        <strong>💳 Anticipo:</strong> 30% por adelantado vía Zelle, Binance o pago móvil<br/>
                        <strong>⚠️ Cancelación:</strong> Sin devoluciones. Con +48h puedes reprogramar con penalización de $30
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",marginTop:14}}>
                        <button className="btn-back" onClick={()=>setAptStep(2)}>← Atrás</button>
                        <button className="btn-wa" onClick={submit}>Enviar por WhatsApp 💬</button>
                      </div>
                      {isDesktop()&&<div style={{textAlign:"center",marginTop:10}}><span style={{fontSize:12,color:"#94a3b8"}}>¿No tienes WhatsApp? </span><button onClick={submitEmail} style={{fontSize:12,color:"#0ea5e9",background:"none",border:"none",cursor:"pointer",padding:0,textDecoration:"underline"}}>Enviar por email</button></div>}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ BOTH MODE: transition from apt to boat ═══ */}
              {mode==="both"&&aptStep===1&&(
                <div>
                  <div className="ftitle bb">Ahora elige las lanchas</div>
                  <div className="fsub">Tu apartamento está guardado. Ahora configura la salida en lancha.</div>
                  <div style={{background:"#f0f9ff",border:"1.5px solid #bae6fd",borderRadius:12,padding:"12px 16px",marginBottom:20}}>
                    <div style={{fontSize:10,color:"#0369a1",fontWeight:900,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>🏠 Apartamento confirmado</div>
                    <div style={{fontSize:13,color:"#0c4a6e",fontWeight:600}}>{fmt(af.checkin)} → {fmt(af.checkout)} · {nights} noches · ${aptTot} USD</div>
                  </div>
                  {/* Boat selection */}
                  <label className="lbl">Selecciona las lanchas</label>
                  {activePromo&&<div style={{background:"#fffbeb",border:"1.5px solid #fde68a",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:11,color:"#92400e"}}>⚠️ La {activePromo.name} incluye solo la <strong>{BOATS[activePromo.boat].name}</strong>. Puedes agregar la otra lancha a precio regular.</div>}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                    {Object.values(BOATS).map(b=>{
                      const on=bf.boats.includes(b.id);
                      const isPromoBoat=activePromo&&b.id===activePromo.boat;
                      const isOtherBoat=activePromo&&b.id!==activePromo.boat;
                      return(
                        <div key={b.id} className={`bsel${on?" on":""}`}
                          onClick={()=>{
                            if(isPromoBoat){
                              // Promo boat: always selected, can't deselect
                              if(!on) togBoat(b.id);
                            } else {
                              togBoat(b.id);
                            }
                          }}
                          style={{position:"relative",opacity:isPromoBoat&&!on?1:1}}>
                          {on&&<div className="bcheck">✓</div>}
                          {isPromoBoat&&<div style={{position:"absolute",top:8,left:8,background:"#0ea5e9",color:"#fff",fontSize:9,fontWeight:900,padding:"2px 7px",borderRadius:50,letterSpacing:.5}}>PROMO</div>}
                          <img src={sm(b.img)} alt={b.name}/>
                          <div className="bsel-body">
                            <div className="bb" style={{fontSize:16,color:"#0f172a"}}>{b.name}</div>
                            <div style={{fontSize:9,color:"#94a3b8",fontWeight:700,letterSpacing:.5}}>{b.capacity} pax máx</div>
                            {isOtherBoat&&<div style={{fontSize:9,color:"#64748b",marginTop:2}}>Precio regular</div>}
                            {isPromoBoat&&<div style={{fontSize:9,color:"#0ea5e9",fontWeight:700,marginTop:2}}>Incluida en promo</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {bf.boats.map(bid=>{
                    const b=BOATS[bid];
                    return(
                      <div key={bid} style={{marginBottom:12}}>
                        <label className="lbl">Personas en {b.name}</label>
                        <div className="pax-c">
                          <button className="pb" onClick={()=>setPax(bid,Math.max(1,bf.pax[bid]-1))}>−</button>
                          <span className="pn">{bf.pax[bid]}</span>
                          <button className="pb" onClick={()=>setPax(bid,Math.min(b.capacity,bf.pax[bid]+1))}>+</button>
                          <span style={{fontSize:11,color:"#94a3b8",marginLeft:6}}>máx {b.capacity}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
                    <button className="btn-back" onClick={()=>setAptStep(0)}>← Atrás</button>
                    <button className="btn-next" disabled={bf.boats.length===0} onClick={()=>{setAptStep(2);setBoatStep(0);}}>Siguiente →</button>
                  </div>
                </div>
              )}

              {/* ═══ BOAT STEPS (both mode uses aptStep>=2) ═══ */}
              {(mode==="boat"||(mode==="both"&&aptStep>=2))&&(
                <div>
                  {/* Boat step 0: select boats (only for boat-only mode) */}
                  {boatStep===0&&mode==="boat"&&(
                    <div>
                      <div className="ftitle bb">Elige las lanchas</div>
                      <div className="fsub">Puedes seleccionar una o ambas.</div>
                      <div style={{fontSize:10,color:"#94a3b8",marginTop:2,marginBottom:8}}>Precios desde temporada baja (lunes a jueves).</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
                        {Object.values(BOATS).map(b=>{
                          const on=bf.boats.includes(b.id);
                          return(
                            <div key={b.id} className={`bsel${on?" on":""}`} onClick={()=>togBoat(b.id)} style={{position:"relative"}}>
                              {on&&<div className="bcheck">✓</div>}
                              <img src={sm(b.img)} alt={b.name}/>
                              <div className="bsel-body">
                                <div className="bb" style={{fontSize:18,color:"#0f172a"}}>{b.name}</div>
                                <div style={{fontSize:10,color:"#94a3b8",fontWeight:700,letterSpacing:.5,marginBottom:4}}>{b.subtitle}</div>
                                <div className="bb" style={{fontSize:20,color:"#0369a1"}}><span style={{fontFamily:"Lato,sans-serif",fontSize:11,color:"#64748b",fontWeight:400}}>Desde </span>${b.price("2026-06-09",2)?.p}</div>
                                <div style={{fontSize:10,color:"#64748b"}}>{b.capacity} pax máx</div>
                                <button type="button" style={{marginTop:6,width:"100%",padding:"6px",borderRadius:8,border:"1px solid #0ea5e9",background:"#f0f9ff",color:"#0369a1",fontWeight:700}} onClick={(e)=>{e.stopPropagation();if(b.id==="yamaha"){window.showYamahaGallery&&window.showYamahaGallery();}else{window.showKichiGallery&&window.showKichiGallery();}}}>Ver fotos</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {bf.boats.map(bid=>{
                        const b=BOATS[bid];
                        return(
                          <div key={bid} style={{marginBottom:12}}>
                            <label className="lbl">Personas en {b.name}</label>
                            <div className="pax-c">
                              <button className="pb" onClick={()=>setPax(bid,Math.max(1,bf.pax[bid]-1))}>−</button>
                              <span className="pn">{bf.pax[bid]}</span>
                              <button className="pb" onClick={()=>setPax(bid,Math.min(b.capacity,bf.pax[bid]+1))}>+</button>
                              <span style={{fontSize:11,color:"#94a3b8",marginLeft:6}}>máx {b.capacity}</span>
                            </div>
                          </div>
                        );
                      })}
                      <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
                        <button className="btn-next" disabled={bf.boats.length===0} onClick={()=>setBoatStep(1)}>Siguiente →</button>
                      </div>
                    </div>
                  )}

                  {/* Boat step 1: dates */}
                  {((boatStep===1&&mode==="boat")||(boatStep===0&&mode==="both"))&&(
                    <div>
                      <div className="ftitle bb">Fechas de las lanchas</div>
                      <div className="fsub">Elige los días para cada lancha.</div>
                      {mode==="both"&&(
                        <div style={{background:"#f0f9ff",border:"1.5px solid #bae6fd",borderRadius:10,padding:"10px 14px",marginBottom:14}}>
                          <div style={{fontSize:10,color:"#0369a1",fontWeight:900,letterSpacing:1,textTransform:"uppercase",marginBottom:2}}>🏠 Apartamento</div>
                          <div style={{fontSize:12,color:"#0c4a6e",fontWeight:600}}>{fmt(af.checkin)} → {fmt(af.checkout)} · {nights} noches</div>
                        </div>
                      )}
                      {bf.boats.map(bid=>{
                        const b=BOATS[bid];const dates=bf.dates[bid]||[];
                        return(
                          <div key={bid} className="boat-dates-block">
                            <div className="boat-dates-header">
                              <img src={sm(b.img)} alt={b.name} className="boat-dates-img"/>
                              <div><div className="bb" style={{fontSize:18,color:"#0f172a"}}>{b.name}</div><div style={{fontSize:11,color:"#94a3b8"}}>{dates.length} día{dates.length!==1?"s":""} seleccionado{dates.length!==1?"s":""}</div></div>
                            </div>
                            <Cal boatId={bid} sel={dates} onToggle={(ds)=>togDate(bid,ds)} priceFor={(ds)=>b.price(ds,bf.pax[bid]||2)} gcBooked={gcBooked}/>
                            {dates.length>0&&(
                              <div style={{padding:"8px 12px",background:"#f8fafc",borderTop:"1px solid #e2e8f0"}}>
                                {dates.map(ds=><span key={ds} className="chip" style={{background:SC[getSeason(ds)]}} onClick={()=>togDate(bid,ds)}>{fmt(ds)} {SL[getSeason(ds)].split(" ")[0]} ✕</span>)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div style={{background:"#f0f9ff",border:"1.5px solid #bae6fd",borderRadius:10,padding:"12px 14px",marginTop:14,display:"flex",flexWrap:"wrap",gap:12,alignItems:"center"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:16}}>📍</span>
                          <div>
                            <div style={{fontWeight:900,fontSize:12,color:"#0c4a6e",letterSpacing:.3}}>Marina Las Canoas</div>
                            <a href="https://share.google/HGGOvNkPUME60DJV6" target="_blank" style={{fontSize:11,color:"#0ea5e9",fontWeight:700,textDecoration:"none",display:"inline-flex",alignItems:"center",gap:3,marginTop:1}}>Ver ubicación ↗</a>
                          </div>
                        </div>
                        <div style={{width:1,height:28,background:"#bae6fd",flexShrink:0}}/>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:16}}>🕘</span>
                          <div>
                            <div style={{fontWeight:900,fontSize:12,color:"#0c4a6e",letterSpacing:.3}}>Horario</div>
                            <div style={{fontSize:11,color:"#0369a1",marginTop:1}}>Llegada: 9:30 a.m. · Regreso: 5:30 p.m.</div>
                          </div>
                        </div>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",marginTop:14}}>
                        <button className="btn-back" onClick={()=>mode==="boat"?setBoatStep(0):(setAptStep(1),setBoatStep(0))}>← Atrás</button>
                        <button className="btn-next" disabled={!hasDates} onClick={()=>{track("boat_dates_confirmed",{boats:bf.boats});mode==="boat"?setBoatStep(2):setBoatStep(1);}}>Siguiente →</button>
                      </div>
                    </div>
                  )}

                  {/* Boat step 2: cayos */}
                  {((boatStep===2&&mode==="boat")||(boatStep===1&&mode==="both"))&&(
                    <div>
                      <div className="ftitle bb">Elige los cayos</div>
                      <div className="fsub">Opcional · Hasta 4 cayos por salida.</div>
                      <div style={{display:"flex",alignItems:"center",gap:6,margin:"14px 0"}}>
                        {[1,2,3,4].map(n=><div key={n} style={{flex:1,height:5,borderRadius:3,background:bf.cayos.length>=n?"#0ea5e9":"#e2e8f0",transition:"background .2s"}}/>)}
                        <span style={{fontSize:11,color:"#94a3b8",whiteSpace:"nowrap"}}>{bf.cayos.length}/4</span>
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:14}}>
                        {CAYOS.map(c=>{const on=bf.cayos.includes(c),dis=!on&&bf.cayos.length>=4;return<button key={c} onClick={()=>togCayo(c)} disabled={dis} style={{border:`1.5px solid ${on?"#0ea5e9":"#e2e8f0"}`,borderRadius:50,padding:"8px 14px",cursor:dis?"not-allowed":"pointer",fontSize:12,background:on?"#0ea5e9":"#fff",color:on?"#fff":"#0369a1",fontFamily:"Lato,sans-serif",fontWeight:700,transition:"all .18s",opacity:dis?.4:1}}>🏝 {c}</button>;})}
                      </div>
                      {bf.cayos.length>0&&<div style={{background:"#f0f9ff",border:"1.5px solid #bae6fd",borderRadius:10,padding:"10px 14px",marginBottom:10}}><div style={{fontSize:9,color:"#0369a1",fontWeight:900,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>Tu ruta</div><div style={{display:"flex",flexWrap:"wrap",gap:3,alignItems:"center"}}>{bf.cayos.map((c,i)=><span key={c} style={{fontSize:12,color:"#0c4a6e",fontWeight:700}}>{i>0&&<span style={{color:"#0ea5e9",margin:"0 3px"}}>→</span>}{c}</span>)}</div></div>}
                      {bf.cayos.length===0&&<div style={{background:"#fffbeb",border:"1.5px solid #fde68a",borderRadius:10,padding:"10px 14px",marginBottom:10,fontSize:11,color:"#92400e"}}>⚓ Si no seleccionas cayos, podrás escogerlos el día del paseo con el marino.</div>}
                      <div style={{display:"flex",justifyContent:"space-between",marginTop:14}}>
                        <button className="btn-back" onClick={()=>mode==="boat"?setBoatStep(1):setBoatStep(0)}>← Atrás</button>
                        <button className="btn-next" onClick={()=>{track("boat_cayos_selected",{booking_type:mode,cayos:bf.cayos.length});mode==="boat"?setBoatStep(3):setBoatStep(2);}}>Siguiente →</button>
                      </div>
                    </div>
                  )}

                  {/* Boat step 3: extras */}
                  {((boatStep===3&&mode==="boat")||(boatStep===2&&mode==="both"))&&(
                    <div>
                      <div className="ftitle bb">Servicios adicionales</div>
                      <div className="fsub">Opcionales para las lanchas.</div>
                      <div className="ext-row" style={{marginTop:12}}>
                        {dynExtras.map(e=>{const isWifi=e.id==="wifi",unavail=isWifi&&wifiUnavail,on=bf.extras.includes(e.id);return(
                          <div key={e.id} className={`ext-item${on?" on":""}${unavail?" dis":""}`} style={{cursor:unavail?"not-allowed":"pointer",position:"relative"}} onClick={()=>!unavail&&togExt(e.id)}>
                            {unavail&&<div style={{position:"absolute",top:5,right:7,fontSize:9,color:"#ef4444",fontWeight:700}}>NO DISPONIBLE</div>}
                            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:20}}>{e.icon}</span><div><div style={{fontSize:12,fontWeight:700,color:"#0f172a"}}>{e.label}</div><div style={{fontSize:10,color:"#94a3b8"}}>${e.price}×{allDates.length}día{allDates.length!==1?"s":""}</div></div></div>
                            <div style={{width:20,height:20,borderRadius:"50%",border:`2px solid ${on?"#0ea5e9":"#e2e8f0"}`,background:on?"#0ea5e9":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",flexShrink:0}}>{on&&"✓"}</div>
                          </div>
                        );})}
                      </div>
                      {/* Price summary */}
                      <div className="pbox" style={{marginTop:14}}>
                        {mode==="both"&&(activePromo?(
                          <div style={{marginBottom:4}}>
                            <div className="pr"><span style={{fontWeight:700}}>🎯 {activePromo.name} (base 2n+1 salida)</span><span>${promoBasePrice}</span></div>
                            {promoExtraNights>0&&<div className="pr"><span>{promoExtraNights} noche{promoExtraNights>1?"s":""} extra</span><span>${promoExtraNightPrice}</span></div>}
                            {promoExtraBoatTotal>0&&<div className="pr"><span>{promoExtraBoatDays.length} salida{promoExtraBoatDays.length>1?"s":""} extra ({BOATS[activePromo.boat].name})</span><span>${promoExtraBoatTotal}</span></div>}
                            {bf.boats.filter(bid=>bid!==activePromo.boat).map(bid=>{const b=BOATS[bid];const dates=bf.dates[bid]||[];const tot=dates.reduce((s,ds)=>{const pr=b.price(ds,bf.pax[bid]);return s+(pr?pr.p:0);},0);return tot>0?<div key={bid} className="pr"><span>{b.name} ({dates.length} día{dates.length>1?"s":""})</span><span>${tot}</span></div>:null;})}
                          </div>
                        ):(
                          <div className="pr" style={{borderBottom:"1px solid #bae6fd",paddingBottom:6,marginBottom:6}}><span style={{fontWeight:700}}>🏠 Apartamento ({nights}n)</span><span>${aptTot}</span></div>
                        ))}
                        {bf.boats.map(bid=>{const b=BOATS[bid],dates=bf.dates[bid]||[];if(!dates.length)return null;return(<div key={bid}><div style={{fontSize:9,color:"#0369a1",fontWeight:900,letterSpacing:1,textTransform:"uppercase",padding:"4px 0 2px"}}>⛵ {b.name}</div>{dates.map(ds=>{const pr=b.price(ds,bf.pax[bid]);return pr?<div key={ds} className="pr"><span>{fmt(ds)} <span style={{fontSize:10,color:SC[getSeason(ds)]}}>{SL[getSeason(ds)]}</span></span><span>${pr.p}</span></div>:null;})}</div>);})}
                        {bf.extras.filter(id=>!(id==="wifi"&&wifiUnavail)).map(id=>{const e=dynExtras.find(x=>x.id===id);return e?<div key={id} className="pr"><span>{e.label}×{allDates.length}d</span><span>${e.price*allDates.length}</span></div>:null;})}
                        <div className="ptotal"><span style={{fontWeight:700,fontSize:14}}>Total</span><div className="ptnum bb">${grandTotal} <span style={{fontFamily:"Lato,sans-serif",fontSize:13,color:"#94a3b8",fontWeight:400}}>USD</span></div></div>
                        <div className="dep">✓ Anticipo: ${grandDeposit} USD (30%)</div>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
                        <button className="btn-back" onClick={()=>mode==="boat"?setBoatStep(2):setBoatStep(1)}>← Atrás</button>
                        <button className="btn-next" onClick={()=>{track("boat_extras_selected",{booking_type:mode,extras:bf.extras.length});mode==="boat"?setBoatStep(4):setBoatStep(3);}}>Siguiente →</button>
                      </div>
                    </div>
                  )}

                  {/* Step 4: datos (boat-only) */}
                  {((boatStep===4&&mode==="boat")||(boatStep===3&&mode==="both"))&&(
                    <div>
                      <div className="ftitle bb">Tus datos</div>
                      <div className="fsub">Para confirmar tu reserva.</div>
                      <div style={{display:"grid",gap:12,marginTop:4}}>
                        {[["Nombre completo *","Juan Pérez","text",nombre,setNombre],["Teléfono WhatsApp *","+58 412 000 0000","tel",telefono,setTelefono],["Cédula o Pasaporte (opcional)","V-12345678","text",cedula,setCedula]].map(([lb,ph,t,v,sv])=>(
                          <div key={lb}><label className="lbl">{lb}</label><input className="inp" type={t} placeholder={ph} value={v} onChange={e=>sv(e.target.value)}/></div>
                        ))}
                        <div><label className="lbl">Notas adicionales</label><input className="inp" placeholder="Celebraciones, solicitudes especiales..." value={notas} onChange={e=>setNotas(e.target.value)}/></div>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",marginTop:20}}>
                        <button className="btn-back" onClick={()=>mode==="boat"?setBoatStep(3):setBoatStep(2)}>← Atrás</button>
                        <button className="btn-next" disabled={!nombre||!telefono} onClick={()=>{track("apt_info_submitted",{booking_type:mode});mode==="boat"?setBoatStep(5):setBoatStep(4);}}>Revisar →</button>
                      </div>
                    </div>
                  )}

                  {/* Step 5: confirm */}
                  {((boatStep===5&&mode==="boat")||(boatStep===4&&mode==="both"))&&(
                    <div>
                      <div className="ftitle bb">Revisa tu reserva</div>
                      <div className="fsub">Confirma antes de enviar por WhatsApp.</div>
                      <div style={{border:"1.5px solid #bae6fd",borderRadius:16,overflow:"hidden",marginTop:12,marginBottom:12}}>
                        <div className="conf-hd" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <div>
                            <div style={{fontSize:10,color:"rgba(255,255,255,.55)",letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>Total a pagar</div>
                            <div className="bb" style={{fontSize:36,color:"#fff",lineHeight:1}}>${activePromo?promoTotal:grandTotal} <span style={{fontFamily:"Lato,sans-serif",fontSize:14,color:"rgba(255,255,255,.55)",fontWeight:400}}>USD</span></div>
                            {activePromo&&<div style={{fontSize:11,color:"#fcd34d",marginTop:2,fontWeight:700}}>🎯 {activePromo.name}</div>}
                            <div style={{fontSize:11,color:"#34d399",marginTop:4,fontWeight:700}}>Anticipo: ${activePromo?promoDeposit:grandDeposit} USD (30%)</div>
                          </div>
                          <div style={{display:"flex",gap:4}}>
                            {mode==="both"&&<img src={sm(IA1)} alt="" style={{width:48,height:48,objectFit:"cover",borderRadius:7,border:"2px solid rgba(255,255,255,.25)"}}/>}
                            {bf.boats.map(bid=><img key={bid} src={sm(BOATS[bid].img)} alt="" style={{width:48,height:48,objectFit:"cover",borderRadius:7,border:"2px solid rgba(255,255,255,.25)"}}/>)}
                          </div>
                        </div>
                        {mode==="both"&&(
                          <div className="conf-row" style={{flexDirection:"column",gap:4}}>
                            <div style={{display:"flex",alignItems:"center",gap:8}}><img src={sm(IA1)} alt="" style={{width:34,height:34,objectFit:"cover",borderRadius:6}}/><div><div className="conf-lbl">APARTAMENTO · {nights} noches</div><div className="conf-val">{fmt(af.checkin)} → {fmt(af.checkout)} · ${aptTot} USD</div></div></div>
                          </div>
                        )}
                        {bf.boats.map(bid=>{
                          const b=BOATS[bid],dates=bf.dates[bid]||[];
                          return(
                            <div key={bid} className="conf-row" style={{flexDirection:"column",gap:4}}>
                              <div style={{display:"flex",alignItems:"center",gap:8}}><img src={sm(b.img)} alt="" style={{width:34,height:34,objectFit:"cover",borderRadius:6}}/><div><div className="conf-lbl">{b.name} · {bf.pax[bid]} pax</div><div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:3}}>{dates.map(ds=>{const pr=b.price(ds,bf.pax[bid]);return<span key={ds} style={{fontSize:11,background:SC[getSeason(ds)],color:"#fff",borderRadius:50,padding:"2px 8px",fontWeight:700}}>{fmt(ds)} ${pr?.p}</span>;})}</div></div></div>
                            </div>
                          );
                        })}
                        {[["🏝","Cayos",bf.cayos.length>0?bf.cayos.join(" → "):"Los escogeré el día del paseo con el marino"],
                          ...(bf.extras.filter(id=>!(id==="wifi"&&wifiUnavail)).length?[["➕","Extras",dynExtras.filter(e=>bf.extras.filter(id=>!(id==="wifi"&&wifiUnavail)).includes(e.id)).map(e=>`${e.label} ($${e.price*allDates.length})`).join(", ")]]:[]),
                          ["👤","Nombre",nombre],["📞","Teléfono",telefono],...(cedula?[["🪪","Documento",cedula]]:[]),
                          ...(notas?[["📝","Notas",notas]]:[])
                        ].map(([ic,lb,val])=>(
                          <div key={lb} className="conf-row"><span style={{fontSize:13,marginTop:1}}>{ic}</span><div style={{flex:1}}><div className="conf-lbl">{lb}</div><div className="conf-val">{val}</div></div></div>
                        ))}
                      </div>
                      <div className="pol">
                        {(mode==="both")&&<span><strong>⏰ Check-in apto:</strong> 2:00pm–5:00pm · <strong>Check-out:</strong> máx 11:00am · </span>}
                        <strong>💳 Anticipo:</strong> 30% por adelantado vía Zelle, Binance o pago móvil<br/>
                        <strong>⚠️ Cancelación:</strong> Sin devoluciones. Con +48h puedes reprogramar con penalización de $30. Menos de 48h pierdes la reserva
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",marginTop:14}}>
                        <button className="btn-back" onClick={()=>mode==="boat"?setBoatStep(4):setBoatStep(3)}>← Atrás</button>
                        <button className="btn-wa" onClick={submit}>Enviar por WhatsApp 💬</button>
                      </div>
                      {isDesktop()&&<div style={{textAlign:"center",marginTop:10}}><span style={{fontSize:12,color:"#94a3b8"}}>¿No tienes WhatsApp? </span><button onClick={submitEmail} style={{fontSize:12,color:"#0ea5e9",background:"none",border:"none",cursor:"pointer",padding:0,textDecoration:"underline"}}>Enviar por email</button></div>}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </div>


      <section style={{background:"#f8fafc",padding:"48px 0"}}>
        <div style={{maxWidth:720,margin:"0 auto",padding:"0 20px"}}>
          <p style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#0ea5e9",marginBottom:8}}>Preguntas frecuentes</p>
          <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(1.8rem,4vw,2.4rem)",color:"#0c4a6e",margin:"0 0 8px",lineHeight:1.1}}>Todo lo que necesitas saber</h2>
          <p style={{color:"#64748b",fontSize:".9rem",marginBottom:32}}>Sobre el apartamento vacacional y el alquiler de lanchas en Morrocoy, Tucacas.</p>
          <FAQSection/>
        </div>
      </section>

      <footer>
        <strong style={{color:"#fff"}}>El Poblado 5H</strong> · Morrocoy, Venezuela<br/>
        <span style={{marginTop:6,display:"block"}}>
          <a href="https://instagram.com/elpoblado5h" target="_blank" onClick={()=>track("instagram_click",{location:"footer"})} style={{display:"inline-flex",alignItems:"center",gap:4,color:"#38bdf8",textDecoration:"none"}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="#38bdf8" strokeWidth="2"/><circle cx="12" cy="12" r="5" stroke="#38bdf8" strokeWidth="2"/><circle cx="17.5" cy="6.5" r="1.2" fill="#38bdf8"/></svg>
            @elpoblado5h
          </a>
          &nbsp;·&nbsp;
          <a href="https://wa.me/584148255103" onClick={()=>track("whatsapp_click",{location:"footer"})} style={{color:"#34d399",textDecoration:"none"}}>📞 +58 414-825 5103</a>
        </span>
        <nav style={{marginTop:8,display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
          <a href="/apartamento-tucacas-morrocoy/">Apartamento en Tucacas</a>
          <a href="/alquiler-lancha-morrocoy/">Alquiler de lancha en Morrocoy</a>
        </nav>
      </footer>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
