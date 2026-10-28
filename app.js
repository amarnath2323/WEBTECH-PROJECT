const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

const STORAGE_KEY = "resumeforge.profile.v1";
const SNAP_KEY = "resumeforge.snapshots.v1";
const TOKEN_KEY = "resumeforge.jwt.token";
const ACTIVE_RESUME_ID_KEY = "resumeforge.active_resume_id";
const GUEST_DRAFT_KEY = "resumeforge.guest_draft";

const defaultData = {
  name:"Amarnath", title:"Computer Science & Engineering Student", email:"amarnath010@gmail.com", phone:"+91 98765 43210", location:"Coimbatore, India", linkedin:"https://linkedin.com/in/amarnath", github:"https://github.com/amarnath",
  about:"Computer Science student interested in software development, web technologies, and building practical solutions. I enjoy learning new tools, collaborating with others, and turning ideas into useful projects.",
  education:[{degree:"B.Tech Computer Science and Engineering",institution:"Karunya University",location:"Coimbatore, India",start:"2023",end:"2027",grade:"8.8 CGPA",description:"Coursework in Data Structures, Database Systems, Web Technologies."}],
  skills:["Java","HTML","CSS","JavaScript","MySQL","Node.js","Express","SQLite"], softSkills:["Leadership","Creativity","Problem Solving","Teamwork"],
  projects:[
    {name:"Job Application Tracking System",description:"A web application to add, view, and track job applications with real-time status updates.",technologies:"Java, JDBC, MySQL",role:"Full-Stack Developer",github:"https://github.com/amarnath/job-tracker",live:""},
    {name:"ResumeForge Builder",description:"Dynamic resume workshop with live templates, PDF generation, and ATS optimization.",technologies:"JavaScript, Node.js, Express, SQLite",role:"Lead Developer",github:"https://github.com/amarnath/resumeforge",live:""}
  ],
  experience:[{company:"TechNova Solutions",role:"Python Development Intern",start:"Jun 2026",end:"Aug 2026",description:"Worked on data handling, debugging, query optimization, and REST API development.",technologies:"Python, SQL"}],
  certifications:[{name:"Full Stack Web Development",organization:"FreeCodeCamp",date:"2025",url:""}],
  achievements:"• Department Academic Merit Award\n• Smart Hackathon Finalist",
  template:"minimal", accent:"#6658e8", titleSnapshot:"Full-Stack Developer Resume"
};

let data = loadData();
let activeStep = 0;
let toastTimer;
let cloudSaveTimer;
let currentUser = null;
let cloudResumes = [];
let cloudMessages = [];
let activeResumeId = localStorage.getItem(ACTIVE_RESUME_ID_KEY) || null;

function accountResumeKey(){
  return currentUser ? `${ACTIVE_RESUME_ID_KEY}.${currentUser.id}` : ACTIVE_RESUME_ID_KEY;
}

function storeActiveResumeId(){
  if (activeResumeId) localStorage.setItem(accountResumeKey(), String(activeResumeId));
  else localStorage.removeItem(accountResumeKey());
}

const stepNames = ["personal","education","skills","projects","experience","extras"];
const templateNames = {minimal:"Minimal Professional",modern:"Modern Developer",corporate:"Corporate",creative:"Creative",ats:"ATS-friendly"};

function clone(x){return JSON.parse(JSON.stringify(x))}
function loadData(){try{return {...clone(defaultData),...JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")}}catch{return clone(defaultData)}}

function saveData(show=false){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(data));
  if (currentUser) localStorage.removeItem(GUEST_DRAFT_KEY);
  else localStorage.setItem(GUEST_DRAFT_KEY,"1");
  $("#saveState").textContent = currentUser ? "☁ Cloud synced" : "● Local saved";
  refreshDashboard();
  if(show) toast("Resume draft saved.");

  if(currentUser){
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(() => syncCurrentResumeToCloud(), 800);
  }
}

function toast(msg){
  const t=$("#toast");
  t.textContent=msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove("show"),2800);
}

function escapeHTML(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function escAttr(s=""){return escapeHTML(s)}
function safeUrl(s=""){try{const u=new URL(s);return ["http:","https:"].includes(u.protocol)?u.href:"#"}catch{return "#"}}
function textList(v){return Array.isArray(v)?v:String(v||"").split(",").map(x=>x.trim()).filter(Boolean)}
function field(name,label,placeholder="",value="",type="text"){return `<label class="field">${label}<input data-key="${name}" type="${type}" placeholder="${placeholder}" value="${escAttr(value||"")}"></label>`}
function textarea(name,label,placeholder,value=""){return `<label class="field full-field">${label}<textarea data-key="${name}" rows="3" placeholder="${placeholder}">${escapeHTML(value||"")}</textarea></label>`}

// Backend API Client
async function api(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  try {
    const res = await fetch(path, { credentials: 'same-origin', ...options, headers });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || `HTTP ${res.status}`);
    }
    return json;
  } catch (err) {
    console.warn(`API Error [${path}]:`, err.message);
    throw err;
  }
}

function renderRepeaters(){
  $("#educationFields").innerHTML=(data.education||[]).map((e,i)=>`<div class="repeat-card"><div class="repeat-head"><span>Education ${i+1}</span><button type="button" class="remove-item" data-remove="education" data-index="${i}">Remove</button></div><div class="field-grid">${field(`education.${i}.degree`,"Degree","B.Tech Computer Science",e.degree)}${field(`education.${i}.institution`,"Institution","University / college",e.institution)}${field(`education.${i}.location`,"Location","City, Country",e.location)}${field(`education.${i}.grade`,"CGPA / Percentage","e.g. 8.5 CGPA",e.grade)}${field(`education.${i}.start`,"Start year","2023",e.start)}${field(`education.${i}.end`,"End year","2027",e.end)}${textarea(`education.${i}.description`,"Description","Relevant coursework or details",e.description)}</div></div>`).join("");
  $("#projectFields").innerHTML=(data.projects||[]).map((p,i)=>`<div class="repeat-card"><div class="repeat-head"><span>Project ${i+1}</span><button type="button" class="remove-item" data-remove="projects" data-index="${i}">Remove</button></div><div class="field-grid">${field(`projects.${i}.name`,"Project name","Project title",p.name)}${field(`projects.${i}.role`,"Your role","Developer",p.role)}${textarea(`projects.${i}.description`,"Description","What does it do?",p.description)}${field(`projects.${i}.technologies`,"Technologies","HTML, CSS, JavaScript",p.technologies)}${field(`projects.${i}.github`,"GitHub URL","https://github.com/...",p.github,"url")}${field(`projects.${i}.live`,"Live demo URL","https://...",p.live,"url")}</div></div>`).join("");
  $("#experienceFields").innerHTML=(data.experience||[]).map((e,i)=>`<div class="repeat-card"><div class="repeat-head"><span>Experience ${i+1}</span><button type="button" class="remove-item" data-remove="experience" data-index="${i}">Remove</button></div><div class="field-grid">${field(`experience.${i}.company`,"Company","Company name",e.company)}${field(`experience.${i}.role`,"Job role","Intern / Developer",e.role)}${field(`experience.${i}.start`,"Start date","Jun 2026",e.start)}${field(`experience.${i}.end`,"End date","Aug 2026 / Present",e.end)}${textarea(`experience.${i}.description`,"Description","Your responsibilities and results",e.description)}${field(`experience.${i}.technologies`,"Technologies","Java, MySQL",e.technologies)}</div></div>`).join("");
  $("#certFields").innerHTML=(data.certifications||[]).map((c,i)=>`<div class="repeat-card"><div class="repeat-head"><span>Certification ${i+1}</span><button type="button" class="remove-item" data-remove="certifications" data-index="${i}">Remove</button></div><div class="field-grid">${field(`certifications.${i}.name`,"Certificate name","Certificate title",c.name)}${field(`certifications.${i}.organization`,"Organization","Issuing organization",c.organization)}${field(`certifications.${i}.date`,"Issue date","2026",c.date)}${field(`certifications.${i}.url`,"Credential URL","https://...",c.url,"url")}</div></div>`).join("");
}

function setPath(obj,path,value){const parts=path.split(".");let o=obj;for(let i=0;i<parts.length-1;i++)o=o[parts[i]];o[parts.at(-1)]=value}

function syncForm(){
  const f=$("#resumeForm");
  for(const el of $$("[name]",f)){
    if(el.type==="color") el.value=data[el.name]||el.value;
    else if(el.name==="skills") el.value=(data.skills||[]).join(", ");
    else if(el.name==="softSkills") el.value=(data.softSkills||[]).join(", ");
    else if(el.name in data && typeof data[el.name]!=="object") el.value=data[el.name]??"";
  }
  renderRepeaters();
}

function renderResume(){
  const d=data, skills=textList(d.skills), soft=textList(d.softSkills);
  const contact=[d.email,d.phone,d.location,d.linkedin?"LinkedIn":"" ,d.github?"GitHub":""].filter(Boolean).map((x,i)=>{
    if(i===3)return `<a href="${safeUrl(d.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>`;
    if(i===4)return `<a href="${safeUrl(d.github)}" target="_blank" rel="noopener">GitHub</a>`;
    return escapeHTML(x);
  }).join(" · ");
  const section=(title,body)=>body?`<section><h2>${title}</h2>${body}</section>`:"";
  const edu=(d.education||[]).filter(e=>e.degree||e.institution).map(e=>`<div class="resume-entry"><strong>${escapeHTML(e.degree||"")}</strong><small>${escapeHTML(e.institution||"")}${e.location?" · "+escapeHTML(e.location):""}${e.start||e.end?" · "+escapeHTML([e.start,e.end].filter(Boolean).join(" – ")):""}</small>${e.grade?`<p>${escapeHTML(e.grade)}</p>`:""}${e.description?`<p>${escapeHTML(e.description)}</p>`:""}</div>`).join("");
  const proj=(d.projects||[]).filter(p=>p.name||p.description).map(p=>`<div class="resume-entry"><strong>${escapeHTML(p.name||"Project")}</strong><small>${escapeHTML(p.technologies||"")}${p.role?" · "+escapeHTML(p.role):""}</small><p>${escapeHTML(p.description||"")}</p>${p.github?`<a href="${safeUrl(p.github)}" target="_blank" rel="noopener">GitHub</a> `:""}${p.live?`<a href="${safeUrl(p.live)}" target="_blank" rel="noopener">Live demo</a>`:""}</div>`).join("");
  const exp=(d.experience||[]).filter(e=>e.company||e.role||e.description).map(e=>`<div class="resume-entry"><strong>${escapeHTML(e.role||"Role")}${e.company?" · "+escapeHTML(e.company):""}</strong><small>${escapeHTML([e.start,e.end].filter(Boolean).join(" – "))}</small><p>${escapeHTML(e.description||"")}</p>${e.technologies?`<small>Technologies: ${escapeHTML(e.technologies)}</small>`:""}</div>`).join("");
  const cert=(d.certifications||[]).filter(c=>c.name).map(c=>`<div class="resume-entry"><strong>${escapeHTML(c.name)}</strong><small>${escapeHTML(c.organization||"")}${c.date?" · "+escapeHTML(c.date):""}</small></div>`).join("");
  const ach=(d.achievements||"").trim().split("\n").filter(Boolean).map(a=>`<p>• ${escapeHTML(a)}</p>`).join("");

  $("#resumePaper").className=`resume-paper template-${d.template||"minimal"}`;
  $("#resumePaper").style.setProperty("--accent",d.accent||"#6658e8");
  $("#resumePaper").innerHTML=`<header><h1 class="resume-name">${escapeHTML(d.name||"Your Name")}</h1><div class="resume-title">${escapeHTML(d.title||"Professional Title")}</div><div class="resume-contact">${contact||"Email · Phone · Location"}</div></header>
  ${section("Profile",d.about?`<p>${escapeHTML(d.about)}</p>`:"")}
  ${section("Education",edu)}
  ${section("Technical Skills",skills.length?`<div class="resume-skills">${skills.map(s=>`<span>${escapeHTML(s)}</span>`).join("")}</div>`:"")}
  ${section("Soft Skills",soft.length?`<p>${soft.map(escapeHTML).join(" · ")}</p>`:"")}
  ${section("Projects",proj)}${section("Experience",exp)}${section("Certifications",cert)}${section("Achievements",ach)}`;
}

function completion(){
  const checks=[
    ["Personal information",!!(data.name&&data.title&&data.email&&data.about)],
    ["Education", (data.education||[]).some(e=>e.degree&&e.institution)],
    ["Skills",textList(data.skills).length>=3],
    ["Projects",(data.projects||[]).some(p=>p.name&&p.description)],
    ["Experience",(data.experience||[]).some(e=>e.role&&e.description)],
    ["Certifications",(data.certifications||[]).some(c=>c.name)],
    ["Achievements",!!(data.achievements||"").trim()]
  ];
  const done=checks.filter(x=>x[1]).length, percent=Math.round(done/checks.length*100);
  return {checks,percent,strength:Math.min(100,Math.round((checks.filter(x=>x[1]).length/7)*75+Math.min(textList(data.skills).length,8)*2+Math.min((data.projects||[]).filter(p=>p.name).length,3)*3))};
}

function refreshDashboard(){
  const c=completion();
  const displayName = currentUser ? currentUser.name : (data.name || "there");
  $("#welcomeName").textContent=displayName;
  $("#miniName").textContent=displayName;
  $("#miniAvatar").textContent=(displayName||"R").trim().charAt(0).toUpperCase();
  $("#strengthStat").textContent=c.strength;
  $("#strengthBar").style.width=c.strength+"%";
  $("#completionStat").textContent=c.percent;
  $("#completionBar").style.width=c.percent+"%";
  $("#circleValue").textContent=c.percent+"%";
  $("#progressCircle").style.background=`conic-gradient(var(--accent) ${c.percent}%,#f0eff8 0)`;
  $("#dashResumeTitle").textContent=data.titleSnapshot||"My professional resume";
  $("#dashResumeMeta").textContent=(currentUser ? "Saved in Cloud DB · " : "Saved in this browser · ")+templateNames[data.template];
  $("#checklist").innerHTML=c.checks.map(([label,ok])=>`<div class="check-item ${ok?"done":""}"><span class="check-mark">${ok?"✓":""}</span>${label}</div>`).join("");

  const missing=c.checks.filter(x=>!x[1]);
  $("#recommendations").innerHTML=(missing.length?missing.slice(0,3).map(([label])=>({
    "Personal information":["Complete your introduction","Add a professional title and contact details."],
    "Education":["Add your education","Include your degree, institution, and graduation year."],
    "Skills":["Add relevant skills","List tools and skills you can confidently use."],
    "Projects":["Show your work","Add a project, what it does, and the technologies used."],
    "Experience":["Add experience","Internships, volunteering, and relevant practical work count."],
    "Certifications":["Add certifications","Include credentials relevant to your target role."],
    "Achievements":["Highlight achievements","Add a genuine award, event, or accomplishment."]
  }[label])).map(([title,desc])=>`<div class="recommendation"><span class="rec-check">✦</span><div><strong>${title}</strong><p>${desc}</p></div></div>`).join(""):`<div class="recommendation"><span class="rec-check">✓</span><div><strong>Great progress</strong><p>Review your details and tailor the resume to each role.</p></div></div>`);

  renderSnapshots();
}

function getSnapshots(){
  try{return JSON.parse(localStorage.getItem(SNAP_KEY)||"[]")}catch{return []}
}

async function fetchCloudResumes(){
  if (!currentUser) return false;
  try {
    const res = await api('/api/resumes');
    if (res.resumes) {
      cloudResumes = res.resumes;
      $("#resumeCount").textContent = cloudResumes.length;
      renderSnapshots();
    }
    return true;
  } catch (err) {
    console.warn("Could not load cloud resumes:", err);
    return false;
  }
}

async function hydrateCloudWorkspace(importLocal){
  if (!currentUser) return;
  const shouldImportLocal = importLocal && localStorage.getItem(GUEST_DRAFT_KEY) === "1";
  activeResumeId = localStorage.getItem(accountResumeKey()) || null;
  if (!await fetchCloudResumes()) {
    toast("Could not load your cloud resumes. Your local draft is unchanged.");
    return;
  }

  let localImportFailed = false;
  if (shouldImportLocal && cloudResumes.length === 0) {
    try {
      await api('/api/resumes/sync-local', {
        method: 'POST',
        body: JSON.stringify({ localData: data, snapshots: getSnapshots() })
      });
      if (!await fetchCloudResumes()) return;
    } catch (err) {
      localImportFailed = true;
      console.warn("Could not import local resumes:", err);
      toast("Could not import local resumes: " + err.message);
    }
  }

  if (cloudResumes.length) {
    let activeResume = cloudResumes.find(resume => String(resume.id) === String(activeResumeId));
    if (!activeResume) activeResume = cloudResumes[0];
    activeResumeId = activeResume.id;
    storeActiveResumeId();
    data = { ...clone(defaultData), ...activeResume.data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    applyDataToForm();
  } else {
    activeResumeId = null;
    storeActiveResumeId();
  }
  if (!localImportFailed) localStorage.removeItem(GUEST_DRAFT_KEY);
}

function renderSnapshots(){
  if (currentUser && cloudResumes.length > 0) {
    $("#resumeCount").textContent = cloudResumes.length;
    $("#savedResumeList").innerHTML = cloudResumes.map(r => `
      <article class="saved-card">
        <div class="doc-icon">CV</div>
        <h3>${escapeHTML(r.title)}</h3>
        <p>${escapeHTML(templateNames[r.template] || templateNames.minimal)} · ${new Date(r.updated_at).toLocaleDateString()}</p>
        <div class="tag-row">
          <span class="tag">Cloud DB</span>
          ${r.id == activeResumeId ? '<span class="tag" style="background:#e5f8ef;color:#24a879;">Active in editor</span>' : ''}
        </div>
        <div class="saved-card-actions">
          <button class="primary" data-open-cloud="${r.id}">Open</button>
          <button class="secondary" data-dup-cloud="${r.id}">Duplicate</button>
          <button class="danger" data-del-cloud="${r.id}">Delete</button>
        </div>
      </article>
    `).join("");
    return;
  }

  // Local fallback
  const snaps = getSnapshots();
  const items = [{id:"current",title:data.titleSnapshot||"My professional resume",template:data.template,updated:"Current draft"},...snaps];
  $("#resumeCount").textContent = items.length;
  $("#savedResumeList").innerHTML = items.map(s => `
    <article class="saved-card">
      <div class="doc-icon">CV</div>
      <h3>${escapeHTML(s.title)}</h3>
      <p>${escapeHTML(templateNames[s.template]||templateNames.minimal)} · ${escapeHTML(s.updated||"Saved version")}</p>
      <div class="tag-row"><span class="tag">${s.id==="current"?"Current draft":"Saved local snapshot"}</span></div>
      <div class="saved-card-actions">
        <button class="primary" data-open-snapshot="${escapeHTML(s.id)}">Open</button>
        ${s.id!=="current"?`<button class="danger" data-delete-snapshot="${escapeHTML(s.id)}">Delete</button>`:""}
      </div>
    </article>
  `).join("");
}

function renderPortfolio(){
  const d=data, skills=textList(d.skills).concat(textList(d.softSkills));
  const projects=(d.projects||[]).filter(p=>p.name).map(p=>`<article class="portfolio-project"><strong>${escapeHTML(p.name)}</strong><p>${escapeHTML(p.description||"")}</p><small>${escapeHTML(p.technologies||"")}</small><p>${p.github?`<a href="${safeUrl(p.github)}" target="_blank" rel="noopener">GitHub ↗</a>`:""} ${p.live?`<a href="${safeUrl(p.live)}" target="_blank" rel="noopener">Live demo ↗</a>`:""}</p></article>`).join("");
  const exp=(d.experience||[]).filter(e=>e.role||e.company).map(e=>`<p><strong>${escapeHTML(e.role||"")}${e.company?" · "+escapeHTML(e.company):""}</strong><br>${escapeHTML([e.start,e.end].filter(Boolean).join(" – "))}<br>${escapeHTML(e.description||"")}</p>`).join("");
  const edu=(d.education||[]).filter(e=>e.degree||e.institution).map(e=>`<p><strong>${escapeHTML(e.degree||"")}</strong><br>${escapeHTML(e.institution||"")}${e.end?" · "+escapeHTML(e.end):""}</p>`).join("");
  const cert=(d.certifications||[]).filter(c=>c.name).map(c=>`<p><strong>${escapeHTML(c.name)}</strong> · ${escapeHTML(c.organization||"")}</p>`).join("");

  // Update live host link bar
  const slug = currentUser?.portfolioSlug || "amarnath";
  const publicUrl = `${window.location.origin}/p/${slug}`;
  if ($("#hostUrlDisplay")) $("#hostUrlDisplay").textContent = publicUrl;
  if ($("#openLiveLinkBtn")) $("#openLiveLinkBtn").href = `/p/${slug}`;

  $("#portfolioPage").innerHTML=`<header class="portfolio-hero" style="--accent:${escAttr(d.accent)}"><div class="portfolio-kicker">HELLO, I'M</div><h2>${escapeHTML(d.name||"Your Name")}<br><span>${escapeHTML(d.title||"Your next opportunity starts here.")}</span></h2><p>${escapeHTML(d.about||"Add a short introduction in the resume builder to tell people about yourself.")}</p><div class="portfolio-links"><a class="primary" href="/p/${slug}" target="_blank">View Live Interactive Page ↗</a>${d.email?`<a class="secondary" href="mailto:${escAttr(d.email)}">Contact me</a>`:""}${d.github?`<a class="secondary" href="${safeUrl(d.github)}" target="_blank" rel="noopener">GitHub ↗</a>`:""}</div></header>
  <section class="portfolio-section"><h3>About me</h3><p>${escapeHTML(d.about||"Your professional introduction will appear here.")}</p></section>
  <section class="portfolio-section"><h3>Skills & strengths</h3><div class="portfolio-skill-list">${skills.map(s=>`<span>${escapeHTML(s)}</span>`).join("")||"<p>Add skills to show them here.</p>"}</div></section>
  ${projects?`<section class="portfolio-section"><h3>Selected projects</h3><div class="portfolio-projects">${projects}</div></section>`:""}
  ${exp?`<section class="portfolio-section"><h3>Experience</h3>${exp}</section>`:""}
  ${edu?`<section class="portfolio-section"><h3>Education</h3>${edu}</section>`:""}
  ${cert?`<section class="portfolio-section"><h3>Certifications</h3>${cert}</section>`:""}
  ${d.achievements?`<section class="portfolio-section"><h3>Achievements</h3><p>${escapeHTML(d.achievements).replace(/\n/g,"<br>")}</p></section>`:""}
  <section class="portfolio-section"><h3>Let's connect</h3><p>${d.email?`Email: <a href="mailto:${escAttr(d.email)}">${escapeHTML(d.email)}</a>`:"Add an email address in your profile."}${d.location?"<br>Location: "+escapeHTML(d.location):""}</p></section>`;
}

function setStep(n){
  activeStep=Math.max(0,Math.min(stepNames.length-1,n));
  $$(".step-tab").forEach((b,i)=>b.classList.toggle("active",i===activeStep));
  $$(".form-step").forEach((b,i)=>b.classList.toggle("active",i===activeStep));
  $("#prevStep").disabled=activeStep===0;
  $("#prevStep").style.opacity=activeStep===0?".45":"1";
  $("#nextStep").textContent=activeStep===stepNames.length-1?"Finish ✓":"Continue →";
  $("#stepStatus").textContent=`Step ${activeStep+1} of ${stepNames.length}`;
}

function goView(name){
  $$(".view").forEach(v=>v.classList.toggle("active",v.id===`view-${name}`));
  $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
  $("#pageName").textContent=({
    dashboard:"Dashboard",
    builder:"Resume builder",
    resumes:"My resumes",
    portfolio:"Portfolio preview",
    ats:"ATS & AI Optimizer",
    messages:"Inquiries & Messages",
    templates:"Templates",
    settings:"Settings"
  })[name]||name;

  $("#sidebar").classList.remove("open");
  if(name==="builder"){syncForm();renderResume();setStep(activeStep)}
  if(name==="portfolio")renderPortfolio();
  if(name==="resumes")renderSnapshots();
  if(name==="messages")loadMessages();
  if(name==="ats")runAtsScan();
  window.scrollTo({top:0,behavior:"smooth"});
}

function applyDataToForm(){
  syncForm();
  renderResume();
  renderPortfolio();
  refreshDashboard();
}

function downloadPDF(){
  renderResume();
  if(!window.html2pdf){toast("PDF library unavailable. Use Print → Save as PDF.");return}
  const element=$("#resumePaper");
  const opt={
    margin:[8,8,8,8],
    filename:(data.name||"Resume").trim().replace(/\s+/g,"_")+"_Resume.pdf",
    image:{type:"jpeg",quality:.98},
    html2canvas:{scale:2,useCORS:true},
    jsPDF:{unit:"mm",format:"a4",orientation:"portrait"}
  };
  window.html2pdf().set(opt).from(element).save().then(()=>toast("PDF download started."));
}

function downloadJSON(){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="resumeforge-profile.json";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Profile backup exported.");
}

function openSnapshot(id){
  if(id==="current"){goView("builder");return}
  const snap=getSnapshots().find(s=>s.id===id);
  if(!snap)return;
  data={...clone(defaultData),...snap.data};
  saveData();
  applyDataToForm();
  goView("builder");
  toast("Snapshot loaded into the editor.");
}

async function openCloudResume(id) {
  try {
    const res = await api(`/api/resumes/${id}`);
    if (res.resume && res.resume.data) {
      data = { ...clone(defaultData), ...res.resume.data };
      activeResumeId = id;
      storeActiveResumeId();
      saveData();
      applyDataToForm();
      goView("builder");
      toast(`Loaded "${res.resume.title}" from cloud database.`);
    }
  } catch (err) {
    toast("Failed to load resume from database.");
  }
}

async function duplicateCloudResume(id) {
  try {
    await api(`/api/resumes/${id}/duplicate`, { method: 'POST' });
    toast("Resume duplicated in cloud database.");
    hydrateCloudWorkspace(true);
  } catch (err) {
    toast("Failed to duplicate resume.");
  }
}

async function deleteCloudResume(id) {
  if (!confirm("Are you sure you want to delete this resume from the database?")) return;
  try {
    await api(`/api/resumes/${id}`, { method: 'DELETE' });
    if (activeResumeId == id) {
      activeResumeId = null;
      storeActiveResumeId();
    }
    toast("Resume deleted from cloud database.");
    await hydrateCloudWorkspace(false);
  } catch (err) {
    toast("Failed to delete resume.");
  }
}

async function syncCurrentResumeToCloud() {
  if (!currentUser) return;
  try {
    $("#saveState").textContent = "☁ Saving to DB…";
    if (activeResumeId) {
      await api(`/api/resumes/${activeResumeId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: data.titleSnapshot || "My professional resume",
          template: data.template || "minimal",
          accent: data.accent || "#6658e8",
          data
        })
      });
    } else {
      const res = await api('/api/resumes', {
        method: 'POST',
        body: JSON.stringify({
          title: data.titleSnapshot || "My professional resume",
          template: data.template || "minimal",
          accent: data.accent || "#6658e8",
          data
        })
      });
      if (res.resume?.id) {
        activeResumeId = res.resume.id;
        storeActiveResumeId();
      }
    }
    $("#saveState").textContent = "☁ Cloud synced";
  } catch (err) {
    $("#saveState").textContent = "● Saved locally";
  }
}

function openModal(){$("#modal").classList.add("open");$("#snapshotName").focus()}
function closeModal(){$("#modal").classList.remove("open")}

function openAuthModal(isRegister=false){
  $("#authModal").classList.add("open");
  switchAuthTab(isRegister ? "register" : "signin");
}
function closeAuthModal(){$("#authModal").classList.remove("open")}

function switchAuthTab(type){
  const isReg = type === "register";
  $("#tabSignIn").classList.toggle("active", !isReg);
  $("#tabRegister").classList.toggle("active", isReg);
  $("#authNameField").style.display = isReg ? "flex" : "none";
  $("#authSubmitBtn").textContent = isReg ? "Create Account ↗" : "Sign In ↗";
  $("#authAlert").className = "auth-alert";
  $("#authAlert").style.display = "none";
}

function setTheme(dark){
  document.body.classList.toggle("dark-mode",dark);
  $("#settingsTheme").setAttribute("aria-pressed",String(dark));
  localStorage.setItem("resumeforge.dark",dark?"1":"0");
}

// Inquiries / Messages handler
async function loadMessages() {
  if (!currentUser) {
    $("#messagesList").innerHTML = `<div class="panel" style="text-align:center; padding:30px;"><p>Sign in to your account to view messages sent through your live portfolio.</p><button class="primary" onclick="openAuthModal()" style="margin-top:10px;">Sign In</button></div>`;
    return;
  }
  try {
    $("#messagesList").innerHTML = '<p class="muted">Loading inquiries from database...</p>';
    const res = await api('/api/messages');
    cloudMessages = res.messages || [];
    const unread = cloudMessages.filter(m => !m.is_read).length;
    
    // Update badge
    const badge = $("#unreadBadge");
    if (unread > 0) {
      badge.textContent = unread;
      badge.style.display = "inline-block";
    } else {
      badge.style.display = "none";
    }
    $("#messagesCountStat").textContent = cloudMessages.length;

    if (cloudMessages.length === 0) {
      $("#messagesList").innerHTML = `<div class="panel" style="text-align:center; padding:30px;"><p class="muted">No messages received yet. When recruiters or visitors contact you through your hosted portfolio, their messages will appear here!</p></div>`;
      return;
    }

    $("#messagesList").innerHTML = cloudMessages.map(m => `
      <article class="message-card ${m.is_read ? '' : 'unread'}" id="msgCard-${m.id}">
        <div class="message-header">
          <div class="sender-meta">
            <div class="sender-avatar">${escapeHTML((m.sender_name || 'U').charAt(0).toUpperCase())}</div>
            <div class="sender-info">
              <strong>${escapeHTML(m.sender_name)}</strong>
              <small>${escapeHTML(m.sender_email)}</small>
            </div>
          </div>
          <span class="message-time">${new Date(m.created_at).toLocaleString()}</span>
        </div>
        <div class="message-subject">Re: ${escapeHTML(m.subject || 'Portfolio Inquiry')}</div>
        <div class="message-body">${escapeHTML(m.message)}</div>
        <div class="message-actions">
          <a class="primary small" href="mailto:${escAttr(m.sender_email)}?subject=Re: ${escAttr(m.subject || 'Portfolio Inquiry')}">✉ Reply via Email</a>
          ${!m.is_read ? `<button class="secondary small" data-read-msg="${m.id}">Mark as read</button>` : ''}
          <button class="danger small" data-del-msg="${m.id}">Delete</button>
        </div>
      </article>
    `).join("");
  } catch (err) {
    $("#messagesList").innerHTML = `<p class="muted" style="color:#e05252;">Failed to load messages from database: ${err.message}</p>`;
  }
}

// ATS Scanner handler
async function runAtsScan() {
  const targetRole = $("#atsTargetRole")?.value || "software-engineer";
  $("#atsScoreRating").textContent = "Analyzing…";
  $("#atsScoreValue").textContent = "..";
  try {
    const res = await api('/api/ai/ats-analyze', {
      method: 'POST',
      body: JSON.stringify({ resumeData: data, targetRole })
    });

    $("#atsScoreValue").textContent = res.score;
    $("#atsScoreRating").textContent = res.rating;
    $("#atsScoreRating").style.background = res.score >= 80 ? "#e5f8ef" : res.score >= 65 ? "#eef4ff" : "#fff1f1";
    $("#atsScoreRating").style.color = res.score >= 80 ? "#24a879" : res.score >= 65 ? "#3277d4" : "#c34848";
    $("#atsScoreCircle").style.background = `conic-gradient(var(--accent) ${res.score}%, #efedff 0)`;
    $("#atsSummaryText").textContent = `Analysis complete for ${targetRole.replace('-', ' ')}. Score is evaluated on contact presence, keyword density, and action verbs.`;

    // Strengths
    $("#atsStrengthsList").innerHTML = res.strengths.map(s => `
      <div class="recommendation">
        <span class="rec-check">✓</span>
        <div><strong>Passed Criterion</strong><p>${escapeHTML(s)}</p></div>
      </div>
    `).join("") || '<p class="muted">No strong signals found.</p>';

    // Missing keywords
    if (res.missingKeywords && res.missingKeywords.length > 0) {
      $("#atsMissingKeywords").innerHTML = res.missingKeywords.map(kw => `
        <span class="chip" data-add-skill="${escAttr(kw)}">
          <span class="chip-add">+</span> ${escapeHTML(kw)}
        </span>
      `).join("");
    } else {
      $("#atsMissingKeywords").innerHTML = '<p class="muted" style="color:#24a879;">✓ Great keyword coverage! All target competencies matched.</p>';
    }

  } catch (err) {
    toast("ATS analysis failed: " + err.message);
  }
}

// AI Bullet Enhancer
async function enhanceBullet() {
  const text = $("#bulletInputText").value.trim();
  if (!text) {
    toast("Please enter a rough bullet point or note to enhance.");
    return;
  }
  const btn = $("#generateBulletBtn");
  btn.disabled = true;
  btn.textContent = "✦ Analyzing with AI…";

  try {
    const res = await api('/api/ai/enhance-bullet', {
      method: 'POST',
      body: JSON.stringify({ text, role: $("#atsTargetRole")?.value })
    });

    $("#bulletSuggestionsContainer").innerHTML = res.suggestions.map((s, idx) => `
      <div class="bullet-item">
        <div><span>${idx + 1}.</span> ${escapeHTML(s)}</div>
        <button class="secondary small" data-copy-bullet="${escAttr(s)}">Copy 📋</button>
      </div>
    `).join("");
    toast("AI suggestions generated.");
  } catch (err) {
    toast("Failed to generate AI bullets: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "✦ Enhance with AI";
  }
}

// Initialize Auth Status
async function checkAuthStatus() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    setGuestState();
    return;
  }
  try {
    const res = await api('/api/auth/me');
    if (res.user) {
      currentUser = res.user;
      currentUser.portfolioSlug = res.portfolioSlug || `user-${res.user.id}`;
      setLoggedInState(res);
      await hydrateCloudWorkspace(true);
    } else {
      setGuestState();
    }
  } catch (err) {
    setGuestState();
  }
}

function setLoggedInState(profileData) {
  $("#authBtn").textContent = "Account (Log out)";
  $("#userCloudStatus").textContent = "Cloud DB Connected";
  $("#userDot").style.background = "#24a879";
  $("#saveState").textContent = "☁ Cloud Database Synced";
  if (profileData.portfolioViews !== undefined) {
    $("#portfolioViewsStat").textContent = profileData.portfolioViews;
  }
  if (profileData.unreadMessages !== undefined && profileData.unreadMessages > 0) {
    $("#unreadBadge").textContent = profileData.unreadMessages;
    $("#unreadBadge").style.display = "inline-block";
  }
  refreshDashboard();
}

function setGuestState() {
  currentUser = null;
  activeResumeId = null;
  $("#authBtn").textContent = "Sign in";
  $("#userCloudStatus").textContent = "Local Guest Mode";
  $("#userDot").style.background = "#d9822b";
  $("#saveState").textContent = "● Local saved";
  $("#portfolioViewsStat").textContent = "0";
  $("#messagesCountStat").textContent = "0";
}

document.addEventListener("DOMContentLoaded", async () => {
  syncForm();
  renderResume();
  renderPortfolio();
  refreshDashboard();
  setStep(0);
  setTheme(localStorage.getItem("resumeforge.dark")==="1");

  await checkAuthStatus();

  // Navigation
  $$("[data-view]").forEach(b => b.addEventListener("click", () => goView(b.dataset.view)));
  $$("[data-go]").forEach(b => b.addEventListener("click", () => goView(b.dataset.go)));

  $("#tipCreate").addEventListener("click", () => goView("builder"));
  $("#topCreate").addEventListener("click", () => goView("builder"));
  $("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  $("#themeToggle").addEventListener("click", () => setTheme(!document.body.classList.contains("dark-mode")));
  $("#settingsTheme").addEventListener("click", () => setTheme(!document.body.classList.contains("dark-mode")));

  $("#settingsAccent").addEventListener("input", e => {
    data.accent=e.target.value;
    $("#resumeForm").elements.accent.value=data.accent;
    saveData();
    renderResume();
    renderPortfolio();
  });

  $("#resumeForm").addEventListener("input", e => {
    const el=e.target;
    if(el.dataset.key){
      setPath(data,el.dataset.key,el.value);
    } else if(el.name==="skills") {
      data.skills=textList(el.value);
    } else if(el.name==="softSkills") {
      data.softSkills=textList(el.value);
    } else if(el.name in data && typeof data[el.name]!=="object") {
      data[el.name]=el.value;
    }
    $("#saveState").textContent="● Saving…";
    saveData();
    renderResume();
    renderPortfolio();
  });

  $("#resumeForm").addEventListener("change", e => {
    if(e.target.name==="template"){
      data.template=e.target.value;
      $$("[data-template]").forEach(c=>c.classList.toggle("selected",c.dataset.template===data.template));
      saveData();
      renderResume();
    }
  });

  $("#stepTabs").addEventListener("click", e => {
    const b=e.target.closest("[data-step]");
    if(b) setStep(stepNames.indexOf(b.dataset.step));
  });

  $("#prevStep").addEventListener("click", () => setStep(activeStep-1));

  $("#nextStep").addEventListener("click", () => {
    if(activeStep===0){
      const f=$("#resumeForm");
      const name=f.elements.name;
      if(!name.value.trim()){
        name.reportValidity();
        toast("Please enter your name to continue.");
        return;
      }
      if(f.elements.email.value&&!f.elements.email.checkValidity()){
        f.elements.email.reportValidity();
        return;
      }
    }
    if(activeStep===stepNames.length-1){
      saveData(true);
      goView("portfolio");
    } else {
      setStep(activeStep+1);
    }
  });

  // Repeater controls
  $$("[data-add]").forEach(b => b.addEventListener("click", () => {
    const k=b.dataset.add;
    const blank={
      education:{degree:"",institution:"",location:"",start:"",end:"",grade:"",description:""},
      projects:{name:"",description:"",technologies:"",role:"",github:"",live:""},
      experience:{company:"",role:"",start:"",end:"",description:"",technologies:""},
      certifications:{name:"",organization:"",date:"",url:""}
    };
    data[k].push(blank[k]);
    renderRepeaters();
    renderResume();
    saveData();
  }));

  document.addEventListener("click", e => {
    const b=e.target.closest("[data-remove]");
    if(!b) return;
    const k=b.dataset.remove, i=Number(b.dataset.index);
    data[k].splice(i,1);
    renderRepeaters();
    renderResume();
    renderPortfolio();
    saveData();
  });

  // Save Modal
  $("#saveResume").addEventListener("click", () => {
    saveData(true);
    openModal();
  });

  $("#confirmSnapshot").addEventListener("click", async () => {
    const title = $("#snapshotName").value.trim();
    if (!title) { toast("Enter a name for this resume."); return; }
    data.titleSnapshot = title;

    if (currentUser) {
      try {
        const res = await api('/api/resumes', {
          method: 'POST',
          body: JSON.stringify({
            title,
            template: data.template,
            accent: data.accent,
            data
          })
        });
        if (res.resume?.id) {
          activeResumeId = res.resume.id;
          storeActiveResumeId();
        }
        await fetchCloudResumes();
        closeModal();
        toast("Resume version saved to SQLite database!");
        return;
      } catch (err) {
        toast("Database save failed, saving local snapshot.");
      }
    }

    // Local snapshot fallback
    const snaps=getSnapshots();
    snaps.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),title,template:data.template,updated:new Date().toLocaleDateString(),data:clone(data)});
    localStorage.setItem(SNAP_KEY,JSON.stringify(snaps));
    saveData();
    refreshDashboard();
    closeModal();
    toast("Resume version saved locally.");
  });

  $("#modalClose").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", e => { if(e.target.id==="modal") closeModal(); });

  // PDF & Print
  $("#downloadPdf").addEventListener("click", downloadPDF);
  $("#printResume").addEventListener("click", () => { goView("builder"); setTimeout(() => window.print(), 100); });
  $("#printPortfolio").addEventListener("click", () => window.print());

  // Copy portfolio summary
  $("#copyPortfolio").addEventListener("click", async () => {
    const t=`${data.name}\n${data.title}\n\n${data.about}\n\nSkills: ${textList(data.skills).join(", ")}\n\nProjects:\n${(data.projects||[]).map(p=>`${p.name}: ${p.description}`).join("\n")}\n\nContact: ${data.email||""}`;
    try {
      await navigator.clipboard.writeText(t);
      toast("Portfolio summary copied.");
    } catch {
      toast("Clipboard permission unavailable.");
    }
  });

  // Copy Live Public Link
  $("#copyLiveLinkBtn")?.addEventListener("click", async () => {
    const slug = currentUser?.portfolioSlug || "amarnath";
    const url = `${window.location.origin}/p/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("Live public portfolio URL copied to clipboard!");
    } catch {
      toast("Copied: " + url);
    }
  });

  // Saved resume actions (Open, Duplicate, Delete)
  $("#savedResumeList").addEventListener("click", e => {
    const openCloud = e.target.closest("[data-open-cloud]");
    if (openCloud) return openCloudResume(openCloud.dataset.openCloud);

    const dupCloud = e.target.closest("[data-dup-cloud]");
    if (dupCloud) return duplicateCloudResume(dupCloud.dataset.dupCloud);

    const delCloud = e.target.closest("[data-del-cloud]");
    if (delCloud) return deleteCloudResume(delCloud.dataset.delCloud);

    const open = e.target.closest("[data-open-snapshot]");
    if(open) openSnapshot(open.dataset.openSnapshot);

    const del = e.target.closest("[data-delete-snapshot]");
    if(del) {
      localStorage.setItem(SNAP_KEY,JSON.stringify(getSnapshots().filter(s=>s.id!==del.dataset.deleteSnapshot)));
      refreshDashboard();
      toast("Saved version deleted.");
    }
  });

  // Template cards
  $$("[data-template]").forEach(b => b.addEventListener("click", () => {
    data.template=b.dataset.template;
    $("#resumeForm").elements.template.value=data.template;
    $$("[data-template]").forEach(c=>c.classList.toggle("selected",c===b));
    saveData();
    renderResume();
    goView("builder");
    toast(`${templateNames[data.template]} selected.`);
  }));

  $("#exportData").addEventListener("click", downloadJSON);

  $("#importData").addEventListener("change", async e => {
    const f=e.target.files[0];
    if(!f) return;
    try {
      const incoming=JSON.parse(await f.text());
      if(!incoming||typeof incoming!=="object"||!incoming.name) throw Error("invalid");
      data={...clone(defaultData),...incoming};
      saveData();
      applyDataToForm();
      toast("Profile imported successfully.");
    } catch {
      toast("That file is not a valid ResumeForge backup.");
    }
    e.target.value="";
  });

  $("#resetData").addEventListener("click", () => {
    if(confirm("Reset your profile to demo defaults?")){
      data=clone(defaultData);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(SNAP_KEY);
      applyDataToForm();
      goView("dashboard");
      toast("Demo profile reset.");
    }
  });

  // ATS Scanner triggers
  $("#runAtsScanBtn")?.addEventListener("click", runAtsScan);
  $("#atsTargetRole")?.addEventListener("change", runAtsScan);

  // Click on missing keyword chip to instantly add to skills
  $("#atsMissingKeywords")?.addEventListener("click", e => {
    const chip = e.target.closest("[data-add-skill]");
    if (!chip) return;
    const skillName = chip.dataset.addSkill;
    const curSkills = textList(data.skills);
    if (!curSkills.map(s => s.toLowerCase()).includes(skillName.toLowerCase())) {
      curSkills.push(skillName);
      data.skills = curSkills;
      $("#resumeForm").elements.skills.value = curSkills.join(", ");
      saveData();
      renderResume();
      toast(`Added "${skillName}" to Technical Skills!`);
      runAtsScan();
    }
  });

  // AI Bullet Enhancer
  $("#generateBulletBtn")?.addEventListener("click", enhanceBullet);
  $("#bulletSuggestionsContainer")?.addEventListener("click", async e => {
    const btn = e.target.closest("[data-copy-bullet]");
    if (!btn) return;
    const text = btn.dataset.copyBullet;
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied enhanced bullet to clipboard!");
    } catch {
      toast("Clipboard error.");
    }
  });

  // Messages view refresh and actions
  $("#refreshMessagesBtn")?.addEventListener("click", loadMessages);
  $("#messagesList")?.addEventListener("click", async e => {
    const readBtn = e.target.closest("[data-read-msg]");
    if (readBtn) {
      const id = readBtn.dataset.readMsg;
      await api(`/api/messages/${id}/read`, { method: 'PUT' });
      loadMessages();
      toast("Marked as read.");
    }
    const delBtn = e.target.closest("[data-del-msg]");
    if (delBtn) {
      const id = delBtn.dataset.delMsg;
      if (confirm("Delete this message?")) {
        await api(`/api/messages/${id}`, { method: 'DELETE' });
        loadMessages();
        toast("Message deleted.");
      }
    }
  });

  // Auth Modal & Buttons
  $("#authBtn").addEventListener("click", () => {
    if (currentUser) {
      if (confirm(`Logged in as ${currentUser.name} (${currentUser.email}). Do you want to log out?`)) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(accountResumeKey());
        localStorage.removeItem(ACTIVE_RESUME_ID_KEY);
        setGuestState();
        refreshDashboard();
        toast("Logged out of cloud account.");
      }
    } else {
      openAuthModal();
    }
  });

  $("#userMiniBtn").addEventListener("click", () => {
    if (!currentUser) openAuthModal();
    else $("#authBtn").click();
  });

  $("#authModalClose").addEventListener("click", closeAuthModal);
  $("#authModal").addEventListener("click", e => { if (e.target.id === "authModal") closeAuthModal(); });

  $("#tabSignIn").addEventListener("click", () => switchAuthTab("signin"));
  $("#tabRegister").addEventListener("click", () => switchAuthTab("register"));

  // 1-Click Demo Fill
  $("#demoFillBtn").addEventListener("click", () => {
    switchAuthTab("signin");
    $("#authEmail").value = "amarnath@example.com";
    $("#authPassword").value = "password123";
    toast("Demo credentials filled: amarnath@example.com");
  });

  // Auth Form Submit
  $("#authForm").addEventListener("submit", async e => {
    e.preventDefault();
    const isReg = $("#tabRegister").classList.contains("active");
    const email = $("#authEmail").value.trim();
    const password = $("#authPassword").value;
    const name = $("#authName").value.trim();
    const alertBox = $("#authAlert");

    alertBox.className = "auth-alert";
    alertBox.style.display = "none";

    try {
      const endpoint = isReg ? '/api/auth/register' : '/api/auth/login';
      const payload = isReg ? { name, email, password } : { email, password };
      const res = await api(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.token) {
        localStorage.setItem(TOKEN_KEY, res.token);
        currentUser = res.user;
        currentUser.portfolioSlug = res.portfolioSlug || `user-${res.user.id}`;
        setLoggedInState(res);
        await hydrateCloudWorkspace(true);
        closeAuthModal();
        toast(`Welcome back, ${currentUser.name}!`);
      }
    } catch (err) {
      alertBox.className = "auth-alert error";
      alertBox.textContent = err.message || "Authentication failed.";
      alertBox.style.display = "block";
    }
  });
});