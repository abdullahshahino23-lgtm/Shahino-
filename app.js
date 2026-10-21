import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc, updateDoc, query, orderBy, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
$("#year").textContent = new Date().getFullYear();
const menuToggle = $("#menu-toggle");
menuToggle?.addEventListener("click", () => {
  const nav = $(".desktop-nav");
  if (!nav) return;
  const open = nav.dataset.open === "true";
  nav.dataset.open = String(!open);
  Object.assign(nav.style, open ? {} : {display:"flex",position:"absolute",top:"72px",right:"0",left:"0",padding:"20px",background:"#101010",flexDirection:"column",borderBottom:"1px solid #333"});
});
let app, auth, db, firebaseReady = false;
try {
  firebaseReady = !Object.values(firebaseConfig).some(v => String(v).startsWith("YOUR_"));
  if (firebaseReady) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (e) { console.error(e); }

const modal = $("#admin-modal"), adminApp = $("#admin-app");
$("#admin-open").addEventListener("click", () => { modal.hidden = false; });
$("#login-close").addEventListener("click", () => { modal.hidden = true; });
modal.addEventListener("click", e => { if (e.target === modal) modal.hidden = true; });
$("#back-to-site").addEventListener("click", () => { adminApp.hidden = true; document.body.style.overflow = ""; });
$("#login-form").addEventListener("submit", async e => {
  e.preventDefault();
  const status = $("#login-status");
  if (!firebaseReady) { status.textContent = "أكمل إعداد firebase-config.js أولًا ثم أعد تحميل الصفحة."; return; }
  status.textContent = "جارٍ تسجيل الدخول...";
  const data = new FormData(e.currentTarget);
  try { await signInWithEmailAndPassword(auth, data.get("email"), data.get("password")); }
  catch (err) { status.textContent = friendlyAuthError(err.code); }
});
$("#logout-btn").addEventListener("click", async () => { if(auth) await signOut(auth); adminApp.hidden = true; document.body.style.overflow = ""; });
function friendlyAuthError(code) {
  const messages = {
    "auth/invalid-credential":"بيانات الدخول غير صحيحة.",
    "auth/user-not-found":"لا يوجد حساب بهذا البريد.",
    "auth/wrong-password":"كلمة المرور غير صحيحة.",
    "auth/too-many-requests":"محاولات كثيرة. حاول لاحقًا.",
    "auth/invalid-email":"البريد الإلكتروني غير صالح."
  };
  return messages[code] || "تعذر تسجيل الدخول. تحقق من إعدادات Firebase واتصال الإنترنت.";
}
async function loadPublicContent() {
  if (!firebaseReady || !db) return;
  try {
    const [servicesSnap, projectsSnap, settingsSnap] = await Promise.all([
      getDocs(collection(db, "services")),
      getDocs(collection(db, "projects")),
      getDoc(doc(db, "settings", "site"))
    ]);
    const services = servicesSnap.docs.map(d => ({id:d.id,...d.data()}));
    const projects = projectsSnap.docs.map(d => ({id:d.id,...d.data()}));
    const settings = settingsSnap.exists() ? settingsSnap.data() : {};
    if (settings.brand) document.title = settings.brand + " | مساحة الإبداع والتطوير";
    if (settings.tagline) $(".hero .eyebrow").innerHTML = `<span class="eyebrow-dot"></span>${escapeHtml(settings.tagline)}`;
    if (settings.about) $("#about .about-inner p").textContent = settings.about;
    if (services.length) {
      $("#services-grid").innerHTML = services.map((s,i)=>`<article class="service-card"><span class="card-index">${String(i+1).padStart(2,"0")}</span><div class="card-icon">${["✦","⌘","◈"][i%3]}</div><h3>${escapeHtml(s.title||"خدمة")}</h3><p>${escapeHtml(s.description||"")}</p>${s.price?`<p class="tag">${escapeHtml(s.price)}</p>`:""}</article>`).join("");
      const select = $('select[name="service"]');
      if (select) {
        const first = select.querySelector('option[value=""]');
        select.innerHTML = "";
        select.append(first);
        services.forEach(s=>{const option=document.createElement("option");option.value=s.title||"خدمة";option.textContent=s.title||"خدمة";select.append(option);});
        const other=document.createElement("option");other.value="خدمة أخرى";other.textContent="خدمة أخرى";select.append(other);
      }
    }
    if (projects.length) {
      $("#projects-grid").innerHTML = projects.map((p,i)=>`<article class="work-card ${i===0?"work-feature":""}"><div class="work-art ${["art-one","art-two","art-three"][i%3]}">${p.image?`<img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.title||"مشروع")}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`:`<span class="art-word">${escapeHtml(p.category||"SHAHINO AI")}</span>`}</div><div class="work-meta"><div><span class="tag">${escapeHtml(p.category||"مشروع")}</span><h3>${escapeHtml(p.title||"مشروع جديد")}</h3></div>${p.url?`<a class="work-arrow" href="${escapeAttr(p.url)}" target="_blank" rel="noopener">↗</a>`:`<span class="work-arrow">↗</span>`}</div></article>`).join("");
    }
  } catch (e) { console.warn("تعذر تحميل المحتوى المنشور من Firestore:", e); }
}
loadPublicContent();

if (firebaseReady && auth) onAuthStateChanged(auth, async user => {
  if (!user || !firebaseReady) return;
  try {
    const adminDoc = await getDoc(doc(db, "admins", user.uid));
    if (!adminDoc.exists() || adminDoc.data().active !== true) {
      await signOut(auth);
      $("#login-status").textContent = "هذا الحساب ليس ضمن المديرين المصرّح لهم.";
      return;
    }
    modal.hidden = true;
    adminApp.hidden = false;
    document.body.style.overflow = "hidden";
    $("#admin-email").textContent = user.email || user.uid;
    await showPage("overview");
  } catch (err) {
    console.error(err);
    $("#login-status").textContent = "تعذر التحقق من صلاحيات المدير. راجع قواعد Firestore ووثيقة admins.";
  }
});

$("#contact-form").addEventListener("submit", async e => {
  e.preventDefault();
  const status = $("#contact-status");
  if (!firebaseReady) { status.textContent = "الموقع يحتاج إلى إعداد Firebase قبل استقبال الطلبات."; return; }
  const data = new FormData(e.currentTarget);
  const payload = {
    name: String(data.get("name")).trim(),
    email: String(data.get("email")).trim(),
    service: String(data.get("service")).trim(),
    message: String(data.get("message")).trim(),
    status: "new",
    createdAt: serverTimestamp()
  };
  status.textContent = "جارٍ إرسال طلبك...";
  try {
    await addDoc(collection(db, "orders"), payload);
    e.currentTarget.reset();
    status.textContent = "تم إرسال طلبك بنجاح، شكرًا لثقتك بنا.";
  } catch (err) {
    console.error(err);
    status.textContent = "تعذر إرسال الطلب. حاول مرة أخرى بعد قليل.";
  }
});

const pageNames = {overview:"نظرة عامة",projects:"المشاريع",services:"الخدمات",orders:"الطلبات",users:"المديرون",settings:"الإعدادات"};
$$(".nav-item").forEach(b => b.addEventListener("click", () => showPage(b.dataset.page)));
async function showPage(page) {
  if (!db || !auth?.currentUser) return;
  $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  $("#admin-page-title").textContent = pageNames[page] || "لوحة التحكم";
  const root = $("#admin-content");
  root.innerHTML = '<div class="loading">جارٍ تحميل البيانات...</div>';
  try {
    if (page === "overview") await renderOverview(root);
    else if (page === "projects") await renderCollectionManager(root, "projects", ["title","category","description","image","url"], "المشاريع");
    else if (page === "services") await renderCollectionManager(root, "services", ["title","price","description"], "الخدمات");
    else if (page === "orders") await renderOrders(root);
    else if (page === "users") await renderAdmins(root);
    else if (page === "settings") await renderSettings(root);
  } catch (err) {
    console.error(err);
    root.innerHTML = `<div class="admin-card"><h3>تعذر تحميل القسم</h3><p>${escapeHtml(err.message || "تحقق من قواعد Firestore والاتصال.")}</p></div>`;
  }
}
async function readAll(name, sort="createdAt") {
  const q = query(collection(db, name), orderBy(sort, "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({id:d.id, ...d.data()}));
}
async function renderOverview(root) {
  const [projects, services, orders, admins] = await Promise.all([
    readAll("projects","updatedAt").catch(()=>readAll("projects","title").catch(()=>[])),
    readAll("services","updatedAt").catch(()=>readAll("services","title").catch(()=>[])),
    readAll("orders").catch(()=>[]),
    getDocs(collection(db,"admins")).then(s=>s.docs.map(d=>({id:d.id,...d.data()}))).catch(()=>[])
  ]);
  const newOrders = orders.filter(o=>o.status==="new").length;
  root.innerHTML = `<div class="stats-grid">
    ${stat("المشاريع",projects.length)}${stat("الخدمات",services.length)}${stat("إجمالي الطلبات",orders.length)}${stat("طلبات جديدة",newOrders)}
    </div><div class="admin-grid-two"><div class="admin-card"><h3>آخر الطلبات</h3>${orders.slice(0,5).map(o=>`<p><b>${escapeHtml(o.name||"عميل")}</b> — ${escapeHtml(o.service||"خدمة")} <span class="status-pill">${escapeHtml(o.status||"new")}</span></p>`).join("")||'<p>لا توجد طلبات حتى الآن.</p>'}</div><div class="admin-card"><h3>حالة النظام</h3><p>تم تسجيل الدخول والتحقق من حساب المدير.</p><p>عدد حسابات المديرين: ${admins.length}</p><p>إعداد Firebase: مكتمل</p><p class="help-note">قد تحتاج بعض الأقسام إلى إنشاء فهارس Firestore عند ظهور رسالة تطلب ذلك.</p></div></div>`;
}
function stat(label,value){return `<div class="stat-card"><span>${label}</span><strong>${value}</strong></div>`;}
async function renderCollectionManager(root, name, fields, title) {
  const items = await getDocs(collection(db,name)).then(s=>s.docs.map(d=>({id:d.id,...d.data()})));
  const labels = {title:"العنوان",category:"التصنيف",description:"الوصف",image:"رابط الصورة",url:"رابط المشروع",price:"السعر"};
  root.innerHTML = `<div class="admin-toolbar"><h3>إدارة ${title}</h3><button class="btn btn-gold" id="add-item">+ إضافة جديد</button></div>
    <div class="admin-card" id="editor" hidden></div>
    <div class="data-table-wrap"><table class="data-table"><thead><tr>${fields.map(f=>`<th>${labels[f]||f}</th>`).join("")}<th>إجراءات</th></tr></thead><tbody>${items.map(item=>`<tr>${fields.map(f=>`<td>${escapeHtml(String(item[f]||"—").slice(0,100))}</td>`).join("")}<td><div class="table-actions"><button class="mini-btn" data-edit="${item.id}">تعديل</button><button class="mini-btn danger" data-delete="${item.id}">حذف</button></div></td></tr>`).join("")||`<tr><td colspan="${fields.length+1}" class="empty-state">لا توجد بيانات بعد.</td></tr>`}</tbody></table></div>`;
  const editor = $("#editor");
  const openEditor = item => {
    editor.hidden = false;
    editor.innerHTML = `<h3>${item?"تعديل":"إضافة"} ${title}</h3><form class="admin-form" id="item-form">${fields.map(f=>`<label class="${f==="description"?"span-two":""}">${labels[f]||f}${f==="description"?`<textarea name="${f}" rows="3" required>${escapeHtml(item?.[f]||"")}</textarea>`:`<input name="${f}" ${["title","description"].includes(f)?"required":""} value="${escapeAttr(item?.[f]||"")}" ${f==="url"||f==="image"?"type=\"url\"":""}>`}</label>`).join("")}<div class="form-actions"><button class="btn btn-gold" type="submit">حفظ</button><button class="btn btn-outline" type="button" id="cancel-edit">إلغاء</button></div></form>`;
    $("#cancel-edit").onclick=()=>editor.hidden=true;
    $("#item-form").onsubmit=async e=>{e.preventDefault();const payload=Object.fromEntries(new FormData(e.currentTarget).entries());payload.updatedAt=serverTimestamp();try{if(item)await updateDoc(doc(db,name,item.id),payload);else{payload.createdAt=serverTimestamp();await addDoc(collection(db,name),payload);}await showPage(name);}catch(err){alert("تعذر الحفظ: "+err.message);}};
  };
  $("#add-item").onclick=()=>openEditor(null);
  $$("[data-edit]").forEach(b=>b.onclick=()=>openEditor(items.find(i=>i.id===b.dataset.edit)));
  $$("[data-delete]").forEach(b=>b.onclick=async()=>{if(confirm("هل تريد حذف هذا العنصر نهائيًا؟")){try{await deleteDoc(doc(db,name,b.dataset.delete));await showPage(name);}catch(err){alert("تعذر الحذف: "+err.message);}}});
}
async function renderOrders(root) {
  const items = await getDocs(collection(db,"orders")).then(s=>s.docs.map(d=>({id:d.id,...d.data()})));
  root.innerHTML = `<div class="admin-toolbar"><h3>طلبات العملاء (${items.length})</h3><button class="btn btn-outline" id="refresh-orders">تحديث</button></div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>العميل</th><th>البريد</th><th>الخدمة</th><th>التفاصيل</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>${items.map(o=>`<tr><td>${escapeHtml(o.name||"—")}</td><td dir="ltr">${escapeHtml(o.email||"—")}</td><td>${escapeHtml(o.service||"—")}</td><td>${escapeHtml(o.message||"—")}</td><td><span class="status-pill">${escapeHtml(o.status||"new")}</span></td><td><div class="table-actions"><button class="mini-btn" data-status="${o.id}">تغيير الحالة</button><button class="mini-btn danger" data-order-delete="${o.id}">حذف</button></div></td></tr>`).join("")||'<tr><td colspan="6" class="empty-state">لا توجد طلبات حتى الآن.</td></tr>'}</tbody></table></div>`;
  $("#refresh-orders").onclick=()=>showPage("orders");
  $$("[data-status]").forEach(b=>b.onclick=async()=>{const next=prompt("اكتب الحالة: new أو in_progress أو completed أو cancelled","in_progress");if(!next||!["new","in_progress","completed","cancelled"].includes(next))return;try{await updateDoc(doc(db,"orders",b.dataset.status),{status:next,updatedAt:serverTimestamp()});await showPage("orders");}catch(e){alert("تعذر تحديث الحالة: "+e.message);}});
  $$("[data-order-delete]").forEach(b=>b.onclick=async()=>{if(confirm("حذف الطلب؟")){try{await deleteDoc(doc(db,"orders",b.dataset.orderDelete));await showPage("orders");}catch(e){alert("تعذر الحذف: "+e.message);}}});
}
async function renderAdmins(root) {
  const items=await getDocs(collection(db,"admins")).then(s=>s.docs.map(d=>({id:d.id,...d.data()})));
  root.innerHTML=`<div class="admin-card"><h3>إدارة صلاحيات المديرين</h3><p>لأمان الحسابات، أنشئ المستخدم في Firebase Authentication أولًا، ثم أضف وثيقة في مجموعة admins يكون معرّفها UID للمستخدم.</p><form class="admin-form" id="admin-form"><label>UID المستخدم<input name="uid" required placeholder="Firebase Authentication UID"></label><label>اسم المدير<input name="name" placeholder="اسم المدير"></label><label class="check-row"><input type="checkbox" name="active" checked> تفعيل صلاحية المدير</label><div class="form-actions"><button class="btn btn-gold" type="submit">حفظ الصلاحية</button></div></form><div class="data-table-wrap" style="margin-top:20px"><table class="data-table"><thead><tr><th>UID</th><th>الاسم</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>${items.map(a=>`<tr><td dir="ltr">${escapeHtml(a.id)}</td><td>${escapeHtml(a.name||"—")}</td><td>${a.active===true?"مفعّل":"معطّل"}</td><td><button class="mini-btn danger" data-admin-delete="${a.id}">إزالة</button></td></tr>`).join("")||'<tr><td colspan="4">لا توجد حسابات مديرين.</td></tr>'}</tbody></table></div><p class="help-note">لا يمكن لهذا النموذج إنشاء حساب Authentication؛ استخدم وحدة Firebase Authentication لإضافة مستخدم بكلمة مرور مؤقتة ثم أضف UID هنا.</p></div>`;
  $("#admin-form").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const uid=String(f.get("uid")).trim();try{await setDoc(doc(db,"admins",uid),{name:String(f.get("name")||"").trim(),active:f.get("active")==="on",updatedAt:serverTimestamp()});await showPage("users");}catch(err){alert("تعذر حفظ الصلاحية: "+err.message);}};
  $$("[data-admin-delete]").forEach(b=>b.onclick=async()=>{if(b.dataset.adminDelete===auth.currentUser.uid){alert("لا يمكنك إزالة صلاحيتك أثناء تسجيل الدخول.");return;}if(confirm("إزالة صلاحية هذا المدير؟")){try{await deleteDoc(doc(db,"admins",b.dataset.adminDelete));await showPage("users");}catch(e){alert("تعذر الحذف: "+e.message);}}});
}
async function renderSettings(root) {
  const ref=doc(db,"settings","site");
  const snap=await getDoc(ref);
  const s=snap.exists()?snap.data():{};
  root.innerHTML=`<div class="admin-card"><h3>إعدادات الموقع</h3><form class="admin-form" id="settings-form"><label>اسم العلامة التجارية<input name="brand" value="${escapeAttr(s.brand||"Shahino AI")}" required></label><label>وصف الموقع<input name="tagline" value="${escapeAttr(s.tagline||"مساحة الإبداع والتطوير")}"></label><label>البريد الظاهر للتواصل<input name="contactEmail" type="email" value="${escapeAttr(s.contactEmail||"")}"></label><label>رابط حساب التواصل<input name="socialUrl" type="url" value="${escapeAttr(s.socialUrl||"")}"></label><label class="span-two">نبذة عن الموقع<textarea name="about" rows="4">${escapeHtml(s.about||"")}</textarea></label><div class="form-actions"><button class="btn btn-gold" type="submit">حفظ الإعدادات</button></div></form></div><div class="admin-card danger-zone" style="margin-top:16px"><h3>ملاحظات الأمان</h3><p>لا تضع كلمات مرور أو مفاتيح خدمة Firebase Admin داخل ملفات الموقع. صلاحيات الوصول يجب أن تفرضها قواعد Firestore.</p><p>إعدادات هذه الصفحة تُحفظ في Firestore؛ ربط كل قيمة بعناصر الواجهة العامة يحتاج استكمالًا إذا أردت تعديل الواجهة مباشرة من هنا.</p></div>`;
  $("#settings-form").onsubmit=async e=>{e.preventDefault();const p=Object.fromEntries(new FormData(e.currentTarget).entries());p.updatedAt=serverTimestamp();try{await setDoc(ref,p,{merge:true});alert("تم حفظ الإعدادات.");}catch(err){alert("تعذر الحفظ: "+err.message);}};
}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function escapeAttr(v){return escapeHtml(v);}
