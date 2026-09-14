const KEY="igelkott_restaurant_web_v3";
const menuDefault=[
{id:1,name:"Cheeseburgare",category:"Huvudrätt",price:149,emoji:"🍔"},
{id:2,name:"Fish & Chips",category:"Huvudrätt",price:159,emoji:"🐟"},
{id:3,name:"Caesarsallad",category:"Huvudrätt",price:129,emoji:"🥗"},
{id:4,name:"Margherita",category:"Pizza",price:119,emoji:"🍕"},
{id:5,name:"Pepperoni",category:"Pizza",price:139,emoji:"🍕"},
{id:6,name:"Pommes frites",category:"Tillbehör",price:39,emoji:"🍟"},
{id:7,name:"Vitlöksbröd",category:"Tillbehör",price:45,emoji:"🥖"},
{id:8,name:"Läsk",category:"Dryck",price:29,emoji:"🥤"},
{id:9,name:"Mineralvatten",category:"Dryck",price:25,emoji:"💧"},
{id:10,name:"Kladdkaka",category:"Dessert",price:69,emoji:"🍰"}];
const defaultState={
 menu:menuDefault,
 tables:Array.from({length:12},(_,i)=>({id:i+1,order:null,status:"free"})),
 sales:[],
 bookings:[],
 inventory:[{id:1,name:"Hamburgerbröd",qty:24,min:8},{id:2,name:"Pommes",qty:30,min:10},{id:3,name:"Läsk",qty:18,min:6}],
 staff:[{name:"Anna",role:"Chef"},{name:"Erik",role:"Servitör"},{name:"Sara",role:"Kök"},{name:"Oskar",role:"Kassör"}],
 parked:[]};
function clone(x){return JSON.parse(JSON.stringify(x))}
function load(){try{return Object.assign(clone(defaultState),JSON.parse(localStorage.getItem(KEY)||"{}"))}catch{return clone(defaultState)}}
let state=load(),activeTable=null,activeCategory="Alla",paymentMethod="Kort";
function save(){localStorage.setItem(KEY,JSON.stringify(state)); try{new BroadcastChannel("igelkott-rest").postMessage("update")}catch{}}
function kr(n){return Math.round(n).toLocaleString("sv-SE")+" kr"}
function total(t){return t?.order?.items.reduce((s,x)=>s+x.price*x.qty,0)||0}
function toast(msg){const e=document.getElementById("toast");e.textContent=msg;e.classList.remove("hidden");setTimeout(()=>e.classList.add("hidden"),2600)}
document.getElementById("dateText").textContent=new Date().toLocaleDateString("sv-SE",{weekday:"long",year:"numeric",month:"long",day:"numeric"});

function renderTables(){const el=document.getElementById("tablesGrid");el.innerHTML=state.tables.map(t=>`<div class="table-card ${t.status}" onclick="openOrder(${t.id})"><div class="table-top"><b>Bord ${t.id}</b><span>${t.status==="free"?"Ledigt":t.status==="pay"?"Betalning":t.order?.status==="ready"?"Klar":t.order?.status==="served"?"Serverad":"Upptaget"}</span></div><div class="table-meta">${t.order?`${t.order.items.reduce((s,x)=>s+x.qty,0)} artiklar`:"Inget aktivt sällskap"}</div><div class="table-total">${t.order?kr(total(t)):"—"}</div></div>`).join("")}
function renderCategories(){const cats=["Alla",...new Set(state.menu.map(x=>x.category))],el=document.getElementById("categoryTabs");el.innerHTML=cats.map(c=>`<button class="category-tab ${c===activeCategory?"active":""}" onclick="setCat('${c.replaceAll("'","\\'")}')">${c}</button>`).join("")}
function setCat(c){activeCategory=c;renderCategories();renderPicker()}
function renderPicker(){const q=document.getElementById("menuSearch").value.trim().toLowerCase();let items=state.menu;if(activeCategory!=="Alla")items=items.filter(x=>x.category===activeCategory);if(q)items=items.filter(x=>(x.name+" "+x.category).toLowerCase().includes(q));document.getElementById("menuPicker").innerHTML=items.map(x=>`<button class="food-card" onclick="addItem(${x.id})"><span class="emoji">${x.emoji}</span><strong>${x.name}</strong><small>${kr(x.price)}</small></button>`).join("")||'<div class="empty">Ingen rätt hittades.</div>'}
function openOrder(id){activeTable=id;const t=state.tables.find(x=>x.id===id);if(!t.order)t.order={items:[],note:"",status:"draft"};t.status="busy";activeCategory="Alla";document.getElementById("orderTitle").textContent=`Bord ${id}`;document.getElementById("orderNote").value=t.order.note||"";document.getElementById("menuSearch").value="";document.getElementById("moveTable").innerHTML='<option value="">Flytta bord...</option>'+state.tables.filter(x=>x.id!==id).map(x=>`<option value="${x.id}">Bord ${x.id}${x.order?" (upptaget)":""}</option>`).join("");renderCategories();renderPicker();renderOrder();save();document.getElementById("orderModal").classList.remove("hidden")}
function renderOrder(){const t=state.tables.find(x=>x.id===activeTable),el=document.getElementById("orderItems");el.innerHTML=t.order.items.length?t.order.items.map((x,i)=>`<div class="order-line"><div><b>${x.name}</b><small>${kr(x.price)} st.</small></div><div class="qty"><button onclick="changeQty(${i},-1)">−</button><b>${x.qty}</b><button onclick="changeQty(${i},1)">＋</button><button class="remove" onclick="removeItem(${i})">×</button></div></div>`).join(""):'<div class="empty">🛒 Beställningen är tom.</div>';document.getElementById("orderTotal").textContent=kr(total(t))}
function addItem(id){const t=state.tables.find(x=>x.id===activeTable),it=state.menu.find(x=>x.id===id),ex=t.order.items.find(x=>x.id===id);if(ex)ex.qty++;else t.order.items.push({...it,qty:1});save();renderOrder();renderTables()}
function changeQty(i,d){const t=state.tables.find(x=>x.id===activeTable);t.order.items[i].qty+=d;if(t.order.items[i].qty<=0)t.order.items.splice(i,1);save();renderOrder();renderTables()}
function removeItem(i){const t=state.tables.find(x=>x.id===activeTable);t.order.items.splice(i,1);save();renderOrder();renderTables()}
function saveCurrent(){const t=state.tables.find(x=>x.id===activeTable);t.order.note=document.getElementById("orderNote").value;save();document.getElementById("orderModal").classList.add("hidden");renderAll();toast("Beställningen sparades.")}
function sendKitchen(){const t=state.tables.find(x=>x.id===activeTable);t.order.note=document.getElementById("orderNote").value;t.order.status="new";t.status="busy";save();publishNtfy("staff_status",{type:"staff_status",orderId:t.order.customerOrderId||null,table:t.id,status:"new"});document.getElementById("orderModal").classList.add("hidden");renderAll();toast("Beställningen skickades till köket.")}
function park(){const t=state.tables.find(x=>x.id===activeTable);if(!t.order.items.length)return toast("Beställningen är tom.");state.parked.push({table:t.id,order:clone(t.order),time:new Date().toISOString()});t.order=null;t.status="free";save();document.getElementById("orderModal").classList.add("hidden");renderAll();toast("Beställningen parkerades.")}
function moveTable(){const to=+document.getElementById("moveTable").value;if(!to)return;const a=state.tables.find(x=>x.id===activeTable),b=state.tables.find(x=>x.id===to);if(b.order)return toast("Det bordet är upptaget.");b.order=a.order;b.status="busy";a.order=null;a.status="free";activeTable=to;save();openOrder(to);toast(`Flyttade beställningen till bord ${to}.`)}

function openPayment(){const t=state.tables.find(x=>x.id===activeTable);if(!t.order?.items.length)return toast("Lägg till minst en rätt först.");document.getElementById("paymentTitle").textContent=`Bord ${activeTable}`;document.getElementById("discountInput").value=0;document.getElementById("cardCode").value="";document.getElementById("cashGiven").value="";updatePayment();document.getElementById("paymentModal").classList.remove("hidden")}
function updatePayment(){const t=state.tables.find(x=>x.id===activeTable),sub=total(t),d=Math.min(100,Math.max(0,+document.getElementById("discountInput").value||0)),fin=Math.round(sub*(1-d/100));document.getElementById("paymentTotal").textContent=kr(sub);document.getElementById("finalTotal").textContent=kr(fin);updateChange();updateCard()}
function updateChange(){const fin=+document.getElementById("finalTotal").textContent.replace(/\D/g,"")||0,g=+document.getElementById("cashGiven").value||0;document.getElementById("changeText").textContent=g>=fin&&fin?`Växel: ${kr(g-fin)}`:"Växel: –"}
const defaultCustomers={"1234":"Lillebror","5678":"Mamma","2468":"Pappa"};
function getCustomers(){try{return Object.assign({},defaultCustomers,JSON.parse(localStorage.getItem("igelkott_demo_cards")||"{}"))}catch{return {...defaultCustomers}}}
function getCustomerName(code){return getCustomers()[code]||""}
function updateCard(){const c=document.getElementById("cardCode").value,box=document.getElementById("cardCustomer"),customers=getCustomers();box.textContent=customers[c]?`Demo-kund: ${customers[c]}`:c.length===4?"Okänd demo-kund – betalning kan ändå genomföras":"Använd en registrerad DEMO-kortkod"}
function completePayment(){const t=state.tables.find(x=>x.id===activeTable),sub=total(t),d=Math.min(100,Math.max(0,+document.getElementById("discountInput").value||0)),fin=Math.round(sub*(1-d/100));if(paymentMethod==="Kort"&&document.getElementById("cardCode").value.length!==4)return toast("Ange en 4-siffrig DEMO-kortkod.");if(paymentMethod==="Kontant"&&(+(document.getElementById("cashGiven").value||0)<fin))return toast("Kunden har betalat för lite.");state.sales.push({table:t.id,items:clone(t.order.items),total:fin,method:paymentMethod,customer:getCustomerName(document.getElementById("cardCode").value),time:new Date().toISOString()});t.order=null;t.status="free";save();document.getElementById("paymentModal").classList.add("hidden");document.getElementById("orderModal").classList.add("hidden");renderAll();toast("Betalningen registrerades.")}
function selectPayment(m){paymentMethod=m;document.querySelectorAll(".payment-method").forEach(x=>x.classList.toggle("active",x.dataset.method===m));document.getElementById("cardBox").classList.toggle("hidden",m!=="Kort");document.getElementById("cashBox").classList.toggle("hidden",m!=="Kontant");document.getElementById("swishBox").classList.toggle("hidden",m!=="Swish");updatePayment()}

function renderKitchen(){document.getElementById("kitchenList").innerHTML=state.tables.filter(t=>t.order&&["new","cooking","ready"].includes(t.order.status)).map(t=>`<div class="card"><h3>Bord ${t.id}</h3><p>${t.order.items.map(x=>`${x.qty}× ${x.name}`).join(", ")}</p><p>Status: <b>${t.order.status==="new"?"Ny":t.order.status==="cooking"?"Tillagas":"Klar för servering"}</b></p><div class="card-actions">${t.order.status==="new"?`<button class="secondary" onclick="cook(${t.id})">Tillagas</button>`:""}${t.order.status!=="ready"?`<button class="primary" onclick="ready(${t.id})">Servera</button>`:""}</div></div>`).join("")||'<div class="empty">Inga aktiva köksbeställningar.</div>'}
function cook(id){const t=state.tables.find(x=>x.id===id);t.order.status="cooking";save();publishNtfy("staff_status",{type:"staff_status",orderId:t.order.customerOrderId||null,table:t.id,status:"cooking"});renderAll()}
function ready(id){const t=state.tables.find(x=>x.id===id);t.order.status="served";t.status="busy";save();publishNtfy("staff_status",{type:"staff_status",orderId:t.order.customerOrderId||null,table:t.id,status:"served"});renderAll();document.getElementById("bellText").textContent=`beställning till bord ${String(id).padStart(4,"0")} klar för servering`;document.getElementById("serverBell").classList.remove("hidden");try{new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=").play().catch(()=>{})}catch{}}
function renderMenuAdmin(){document.getElementById("menuList").innerHTML=state.menu.map(x=>`<div class="menu-admin-item"><div class="food-icon">${x.emoji}</div><div><b>${x.name}</b><small>${x.category} · ${kr(x.price)}</small></div><div class="menu-actions"><button class="icon-btn" onclick="openItemModal(${x.id})">✏️</button><button class="icon-btn" onclick="deleteMenuItem(${x.id})">🗑️</button></div></div>`).join("")}
function openItemModal(id=null){document.getElementById("editItemId").value=id||"";const x=id&&state.menu.find(i=>i.id===id);document.getElementById("itemModalTitle").textContent=id?"Ändra rätt":"Lägg till rätt";document.getElementById("itemName").value=x?.name||"";document.getElementById("itemCategory").value=x?.category||"Huvudrätt";document.getElementById("itemPrice").value=x?.price||"";document.getElementById("itemEmoji").value=x?.emoji||"🍽️";document.getElementById("itemModal").classList.remove("hidden")}
function saveMenuItem(){const id=+document.getElementById("editItemId").value,name=document.getElementById("itemName").value.trim(),cat=document.getElementById("itemCategory").value.trim(),price=+document.getElementById("itemPrice").value,emoji=document.getElementById("itemEmoji").value.trim()||"🍽️";if(!name||!cat||price<0)return toast("Fyll i namn, kategori och giltigt pris.");if(id)Object.assign(state.menu.find(x=>x.id===id),{name,category:cat,price,emoji});else state.menu.push({id:Date.now(),name,category:cat,price,emoji});save();document.getElementById("itemModal").classList.add("hidden");renderAll()}
function deleteMenuItem(id){if(confirm("Ta bort denna rätt?")){state.menu=state.menu.filter(x=>x.id!==id);save();renderAll()}}

function renderBookings(){document.getElementById("bookingList").innerHTML=state.bookings.length?state.bookings.map((b,i)=>`<div class="card"><h3>${b.name}</h3><p>${b.date} kl. ${b.time} · ${b.party} personer</p><div class="card-actions"><button class="secondary" onclick="deleteBooking(${i})">Ta bort</button></div></div>`).join(""):'<div class="empty">Inga bokningar.</div>'}
function saveBooking(){const b={name:document.getElementById("bookingName").value.trim(),date:document.getElementById("bookingDate").value,time:document.getElementById("bookingTime").value,party:+document.getElementById("bookingParty").value};if(!b.name||!b.date||!b.time)return toast("Fyll i namn, datum och tid.");state.bookings.push(b);save();document.getElementById("bookingModal").classList.add("hidden");renderAll()}
function deleteBooking(i){state.bookings.splice(i,1);save();renderAll()}
function renderInventory(){document.getElementById("inventoryList").innerHTML=state.inventory.map((x,i)=>`<div class="card"><h3>${x.name}</h3><p>Antal: <b>${x.qty}</b> · Miniminivå: ${x.min} ${x.qty<=x.min?"⚠️ Lågt lager":""}</p><div class="card-actions"><button class="secondary" onclick="stockChange(${i},-1)">− 1</button><button class="secondary" onclick="stockChange(${i},1)">＋ 1</button><button class="secondary" onclick="deleteStock(${i})">Ta bort</button></div></div>`).join("")}
function stockChange(i,d){state.inventory[i].qty=Math.max(0,state.inventory[i].qty+d);save();renderAll()}
function deleteStock(i){state.inventory.splice(i,1);save();renderAll()}
function saveStock(){const name=document.getElementById("stockName").value.trim(),qty=Math.max(0,+document.getElementById("stockQty").value||0),min=Math.max(0,+document.getElementById("stockMin").value||0);if(!name)return toast("Skriv ett artikelnamn.");state.inventory.push({id:Date.now(),name,qty,min});save();document.getElementById("stockModal").classList.add("hidden");renderAll()}
function renderStaff(){document.getElementById("staffList").innerHTML=state.staff.map(x=>`<div class="card"><h3>${x.name}</h3><p>Roll: ${x.role}</p></div>`).join("")}
function renderStats(){const totalSales=state.sales.reduce((s,x)=>s+x.total,0),items={};state.sales.forEach(s=>s.items.forEach(i=>items[i.name]=(items[i.name]||0)+i.qty));const top=Object.entries(items).sort((a,b)=>b[1]-a[1])[0];document.getElementById("statsCards").innerHTML=`<div class="stat-card"><span>Försäljning</span><strong>${kr(totalSales)}</strong></div><div class="stat-card"><span>Betalningar</span><strong>${state.sales.length}</strong></div><div class="stat-card"><span>Mest sålda</span><strong>${top?`${top[0]} (${top[1]})`:"—"}</strong></div>`;document.getElementById("salesList").innerHTML=state.sales.length?state.sales.slice().reverse().map(s=>`<div class="sale-row"><span>Bord ${s.table} · ${s.method}${s.customer?" · "+s.customer:""}<br><small>${new Date(s.time).toLocaleString("sv-SE")}</small></span><b>${kr(s.total)}</b></div>`).join(""):'<div class="empty">📊 Inga betalningar ännu.</div>'}
function renderAll(){renderTables();renderKitchen();renderMenuAdmin();renderBookings();renderInventory();renderStaff();renderStats()}
document.querySelectorAll(".nav").forEach(btn=>btn.onclick=()=>{document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));btn.classList.add("active");document.querySelectorAll(".view").forEach(x=>x.classList.add("hidden"));const v=btn.dataset.view;document.getElementById(v+"View").classList.remove("hidden");document.getElementById("pageTitle").textContent={tables:"Bordsöversikt",kitchen:"Kök",menu:"Meny",bookings:"Bokningar",inventory:"Lager",staff:"Personal & roller",stats:"Statistik"}[v]});
document.getElementById("newOrderBtn").onclick=()=>{const f=state.tables.find(t=>!t.order);f?openOrder(f.id):toast("Alla bord är upptagna.")};
document.getElementById("menuSearch").oninput=renderPicker;document.getElementById("saveOrder").onclick=saveCurrent;document.getElementById("sendKitchen").onclick=sendKitchen;document.getElementById("payOrder").onclick=()=>{const t=state.tables.find(x=>x.id===activeTable);t.order.note=document.getElementById("orderNote").value;save();openPayment()};document.getElementById("parkOrder").onclick=park;document.getElementById("moveTable").onchange=moveTable;document.getElementById("discountInput").oninput=updatePayment;document.getElementById("cashGiven").oninput=updateChange;document.getElementById("cardCode").oninput=updateCard;document.querySelectorAll(".payment-method").forEach(b=>b.onclick=()=>selectPayment(b.dataset.method));document.querySelectorAll("[data-cash]").forEach(b=>b.onclick=()=>{document.getElementById("cashGiven").value=b.dataset.cash;updateChange()});document.getElementById("completePayment").onclick=completePayment;
document.getElementById("addItemBtn").onclick=()=>openItemModal();document.getElementById("saveMenuItem").onclick=saveMenuItem;document.getElementById("addBookingBtn").onclick=()=>{document.getElementById("bookingDate").value=new Date().toISOString().slice(0,10);document.getElementById("bookingModal").classList.remove("hidden")};document.getElementById("saveBooking").onclick=saveBooking;document.getElementById("addStockBtn").onclick=()=>document.getElementById("stockModal").classList.remove("hidden");document.getElementById("saveStock").onclick=saveStock;
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).classList.add("hidden"));
document.getElementById("resetData").onclick=()=>{if(confirm("Återställ allt till testdata?")){state=clone(defaultState);save();renderAll();toast("Testdata återställd.")}};
try{const bc=new BroadcastChannel("igelkott-rest");bc.onmessage=()=>{state=load();renderAll()}}catch{}

// --- KUNDORDER VIA NTFY.SH ---
// Ingen inloggning, Apps Script, Firebase eller Node behövs.
// Kundsidan publicerar ordern till en gemensam ntfy-kanal.
// Personalsidan lyssnar på samma kanal med EventSource.

let cloudOrderIds = new Set();
let ntfySource = null;

function ntfyConfig(){
  return window.IGELKOTT_NTFY || {base:"https://ntfy.sh",topic:""};
}

async function publishNtfy(kind, payload){
  const cfg=ntfyConfig();
  if(!cfg.topic) return false;
  const message=JSON.stringify({kind,payload,ts:Date.now()});
  try{
    const r=await fetch(cfg.base+"/"+encodeURIComponent(cfg.topic),{
      method:"POST",
      headers:{"Content-Type":"text/plain","Title":"Igelkotts restaurang"},
      body:message
    });
    return r.ok;
  }catch(e){
    console.warn("Kunde inte skicka till ntfy:",e);
    return false;
  }
}

function importCustomerOrder(o){
  if(!o) return;
  const key=String(o.id);
  if(cloudOrderIds.has(key)) return;
  cloudOrderIds.add(key);

  // Ignore old cached demo orders when the staff page is opened much later.
  if(o.time && Date.now()-new Date(o.time).getTime()>2*60*60*1000) return;

  const t=state.tables.find(x=>String(x.id)===String(o.table));
  if(!t){
    toast(`Kundbeställning till okänt bord ${o.table}.`);
    return;
  }
  const incomingItems=(o.items||[]).map(i=>({
    id:i.id,name:i.name,price:+i.price||0,qty:+i.quantity||1
  }));

  // Ett bord kan beställa igen efter att den tidigare beställningen serverats.
  // Då lägger vi den nya kundbeställningen på samma öppna nota i stället för att blockera bordet.
  if(t.order && (t.order.status==="served" || t.order.status==="ready")){
    incomingItems.forEach(ni=>{
      const ex=t.order.items.find(x=>String(x.id)===String(ni.id));
      if(ex) ex.qty += ni.qty; else t.order.items.push(ni);
    });
    t.order.note = [t.order.note, o.note].filter(Boolean).join("\n");
    t.order.status="new";
    t.order.customerOrderId=key;
    t.order.customerOrder=true;
    t.status="busy";
    save();
    renderAll();
    toast(`Ny kundbeställning till bord ${o.table}.`);
    return;
  }

  if(t.order){
    toast(`Ny kundbeställning till bord ${o.table} kunde inte läggas: bordet har redan en aktiv order.`);
    return;
  }

  t.order={
    items:incomingItems,
    note:o.note||"",
    status:"new",
    customerOrderId:key,
    customerOrder:true
  };
  t.status="busy";
  save();
  renderAll();
  toast(`Ny kundbeställning till bord ${o.table}.`);
}


function handleDigitalPayment(payment){
  if(!payment || !payment.table || !payment.amount) return;
  const t=state.tables.find(x=>String(x.id)===String(payment.table));
  if(t && t.order){
    t.order.digitalPaid=true;
    t.order.digitalPaymentId=payment.id;
    t.order.digitalPaidAmount=+payment.amount;
    t.order.digitalPaidTime=payment.time||new Date().toISOString();
    save();
    renderAll();
  }
  const bell=document.getElementById("serverBell");
  if(bell){
    bell.classList.remove("hidden");
    const text=document.getElementById("bellText");
    if(text) text.textContent=`Bord ${payment.table}: betalade ${payment.amount} kr digitalt med Swish`;
    try{new Audio("data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YTAAAAAA").play().catch(()=>{});}catch{}
    setTimeout(()=>bell.classList.add("hidden"),6000);
  }
  toast(`📱 Bord ${payment.table} betalade ${payment.amount} kr digitalt med Swish.`);
}
function handleNtfyEvent(event){
  if(!event.data) return;
  try{
    const msg=JSON.parse(event.data);
    if(msg.event!=="message" || !msg.message) return;
    const packet=JSON.parse(msg.message);
    if(packet.kind==="customer_order") importCustomerOrder(packet.payload);
    if(packet.kind==="digital_payment") handleDigitalPayment(packet.payload);
  }catch(e){
    console.warn("Ogiltigt ntfy-meddelande",e);
  }
}

function connectNtfy(){
  const cfg=ntfyConfig();
  if(!cfg.topic || !window.EventSource) return;
  if(ntfySource) ntfySource.close();

  ntfySource=new EventSource(cfg.base+"/"+encodeURIComponent(cfg.topic)+"/sse");
  ntfySource.onmessage=handleNtfyEvent;
  ntfySource.onerror=()=>{
    // EventSource reconnects automatically.
  };
}

connectNtfy();


renderAll();
