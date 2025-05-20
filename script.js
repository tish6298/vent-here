// === FIREBASE INIT ===
const firebaseConfig = {
  apiKey: "AIzaSyAEZKxpPIADzU2IBjz3DcbgQDLBP4dlp18",
  authDomain: "vent-here-4d549.firebaseapp.com",
  projectId: "vent-here-4d549",
  storageBucket: "vent-here-4d549.appspot.com",
  messagingSenderId: "167638687306",
  appId: "1:167638687306:web:9b8ef549397d7893f090b3",
  measurementId: "G-3GMJGF0V1Z"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

window.onload = function() {
  window.scrollTo(0, 0);
};

// --- Loader Ribbon ---
function showRibbonLoader(msg, circId) {
  const modal = document.getElementById(circId === "vaultRibbonCirc" ? "vaultLoader" : "loadingCard");
  if (!modal) return;
  modal.classList.add('active');
  let ribbon = modal.querySelector('.ribbon');
  if (ribbon) ribbon.innerText = msg;
  let circ = modal.querySelector('.ribbon-loader-circ');
  if (circ) {
    circ.classList.remove('done');
    circ.style.background = '';
  }
}
function hideRibbonLoader(circId, successText) {
  const modal = document.getElementById(circId === "vaultRibbonCirc" ? "vaultLoader" : "loadingCard");
  if (!modal) return;
  let circ = modal.querySelector('.ribbon-loader-circ');
  if (circ) circ.classList.add('done');
  let ribbon = modal.querySelector('.ribbon');
  if (ribbon && successText) ribbon.innerText = successText;
  setTimeout(() => {
    modal.classList.remove('active');
    if (circ) circ.classList.remove('done');
    if (ribbon && successText) ribbon.innerText = '';
  }, 850);
}
function showCustomModal(msg) {
  const modal = document.getElementById('customModal');
  if (modal) {
    modal.querySelector('.modal-content').innerHTML = msg + '<br><br><button onclick="closeCustomModal()" class="big-btn">OK</button>';
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}
function closeCustomModal() {
  const modal = document.getElementById('customModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = "";
}

// --- FORMAT TOOLS ---
function formatDoc(cmd, val) {
  document.execCommand(cmd, false, val);
  document.getElementById("vent").focus();
}
if (document.getElementById("vent")) {
  document.getElementById("vent").addEventListener('paste', function(e){
    e.preventDefault();
    var text = (e.originalEvent || e).clipboardData.getData('text/plain');
    document.execCommand('insertHTML', false, text.replace(/\n/g,"<br>"));
  });
  window.formatDoc = formatDoc;
}

// --- VENT SUBMISSION ---
let ventDisabled = false;
function submitVent() {
  if (ventDisabled) return;
  const moodElem = document.getElementById("mood");
  const ventElem = document.getElementById("vent");
  if (!moodElem || !ventElem) return;
  const mood = moodElem.value;
  let text = ventElem.innerHTML.trim();
  if (!text || text.replace(/<[^>]*>?/gm, '').trim().length < 2) {
    showCustomModal("Write a little more for me? I want to know you better.");
    return;
  }
  ventDisabled = true;
  showRibbonLoader("Sending to your vault...", "mainRibbonCirc");
  const btn = document.querySelector(".big-btn");
  if (btn) btn.disabled = true;

  const date = new Date().toLocaleString();
  const preview = ventElem.innerText.split(" ").slice(0, 18).join(" ") + (ventElem.innerText.split(" ").length > 18 ? "..." : "");
  const entry = { date, mood, preview, fullText: text };

  const vaultPassword = "tishcancode";
  encryptText(JSON.stringify(entry), vaultPassword).then((encrypted) => {
    db.collection("nayuVault").add({
      encrypted,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      hideRibbonLoader("mainRibbonCirc", "Saved with love!");
      ventElem.innerHTML = '';
      if (btn) btn.disabled = false;
      setTimeout(()=>{
        showCustomModal("It’s safe with me now. Thank you for trusting me, sweetheart 💗");
        ventDisabled = false;
      }, 800);
    }).catch(err => {
      hideRibbonLoader("mainRibbonCirc");
      if (btn) btn.disabled = false;
      ventDisabled = false;
      showCustomModal("Something went wrong saving your vent. <br><small>" + err.message + "</small>");
    });
  });
}
window.submitVent = submitVent;

// --- AES ENCRYPTION ---
function encryptText(text, password) {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const pwUtf8 = enc.encode(password);
  return window.crypto.subtle.digest("SHA-256", pwUtf8).then((pwHash) =>
    window.crypto.subtle.importKey("raw", pwHash, { name: "AES-GCM" }, false, ["encrypt"])
  ).then((key) => {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    return window.crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, data).then((encData) => {
      const buffer = new Uint8Array(iv.byteLength + encData.byteLength);
      buffer.set(iv, 0);
      buffer.set(new Uint8Array(encData), iv.byteLength);
      return btoa(String.fromCharCode.apply(null, buffer));
    });
  });
}
function decryptText(base64, password) {
  const data = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const iv = data.slice(0, 12);
  const encData = data.slice(12);
  const enc = new TextEncoder();
  const pwUtf8 = enc.encode(password);
  return window.crypto.subtle.digest("SHA-256", pwUtf8).then((pwHash) =>
    window.crypto.subtle.importKey("raw", pwHash, { name: "AES-GCM" }, false, ["decrypt"])
  ).then((key) =>
    window.crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, encData)
  ).then((decData) => {
    const dec = new TextDecoder();
    return dec.decode(decData);
  });
}

// --- VAULT ACCESS ---
function unlockVault() {
  const inputElem = document.getElementById("vaultPassword");
  if (!inputElem) return;
  const inputPassword = inputElem.value;
  const btn = document.getElementById("unlockBtn");
  if (btn) btn.disabled = true;
  if (inputPassword !== "tishcancode") {
    showCustomModal("Oops, not the secret word! Try again, love.");
    if (btn) btn.disabled = false;
    return;
  }
  showRibbonLoader("Unlocking your vault...", "vaultRibbonCirc");
  setTimeout(()=>{
    hideRibbonLoader("vaultRibbonCirc", "Unlocked!");
    document.getElementById("passwordPrompt").style.display = "none";
    document.getElementById("vaultSection").style.display = "block";
    loadVaultEntries(inputPassword);
    if (btn) btn.disabled = false;
  }, 800);
}
window.unlockVault = unlockVault;

function loadVaultEntries(password) {
  const list = document.getElementById("ventList");
  if (!list) return;
  list.innerHTML = "";
  db.collection("nayuVault").orderBy("timestamp", "desc").get()
    .then(querySnapshot => {
      if (querySnapshot.empty) {
        list.innerHTML = "<div class='vault-card' style='text-align:center;'>Nothing here yet. I’ll hold every memory close for you, promise. 💖</div>";
        return;
      }
      querySnapshot.forEach(doc => {
        const entryEnc = doc.data().encrypted;
        decryptText(entryEnc, "tishcancode").then(decrypted => {
          const data = JSON.parse(decrypted);
          list.appendChild(createVaultCard(data, doc.id));
        }).catch(() => {});
      });
    }).catch(err => showCustomModal("Could not load the vault: " + err.message));
}

function createVaultCard(data, docId) {
  const card = document.createElement("div");
  card.className = "vault-card";
  card.dataset.docId = docId;
  const contentDiv = document.createElement("div");
  contentDiv.className = "vault-card-content";
  const header = document.createElement("div");
  header.className = "vault-card-header";
  header.textContent = `${data.date} — [${data.mood}]`;
  contentDiv.appendChild(header);

  const menuBtn = document.createElement("button");
  menuBtn.className = "menu-dots";
  menuBtn.innerHTML = "&#x22EE;";
  menuBtn.title = "More";
  const menuPopup = document.createElement("div");
  menuPopup.className = "menu-popup";
  menuPopup.style.display = "none";
  menuPopup.innerHTML = `
    <button class="menu-read">Read</button>
    <button class="menu-download">Download</button>
    <button class="menu-delete">Delete</button>
  `;
  menuPopup.querySelector(".menu-read").onclick = e => {
    showModal(data.fullText);
    menuPopup.style.display = "none";
    e.stopPropagation();
  };
  menuPopup.querySelector(".menu-download").onclick = e => {
    let safeFilename = `${data.date.replace(/[/:,]/g, "-")} - ${data.mood}.txt`;
    safeFilename = safeFilename.replace(/[\s?<>\\:*|"]/g, '_');
    downloadText(data.fullText, safeFilename);
    menuPopup.style.display = "none";
    e.stopPropagation();
  };
  menuPopup.querySelector(".menu-delete").onclick = e => {
    showCustomModal("Delete this memory forever?<br><br><button onclick='confirmDeleteOne(\""+docId+"\")' class='big-btn'>Delete It</button>");
    menuPopup.style.display = "none";
    e.stopPropagation();
  };
  menuBtn.onclick = function(e) {
    document.querySelectorAll(".menu-popup").forEach(m => { if (m!==menuPopup) m.style.display="none"; });
    menuPopup.style.display = menuPopup.style.display === "block" ? "none" : "block";
    e.stopPropagation();
  };
  card.appendChild(contentDiv);
  card.appendChild(menuBtn);
  card.appendChild(menuPopup);
  return card;
}
window.confirmDeleteOne = function(docId) {
  closeCustomModal();
  db.collection("nayuVault").doc(docId).delete().then(()=>{
    showCustomModal("Deleted that memory. But I’ll remember the love!");
    setTimeout(()=>location.reload(),800);
  });
};

function deleteAllVents() {
  showCustomModal("Delete every memory? This can’t be undone.<br><br><button onclick='confirmDeleteAll()' class='big-btn'>Delete All</button>");
}
window.deleteAllVents = deleteAllVents;
function confirmDeleteAll() {
  closeCustomModal();
  db.collection("nayuVault").get().then(snapshot=>{
    let batch = db.batch();
    snapshot.docs.forEach(doc=>{
      batch.delete(doc.ref);
    });
    return batch.commit();
  }).then(()=>{
    showCustomModal("All gone. You can write more whenever you want, love.");
    setTimeout(()=>location.reload(),1200);
  });
}

// --- Modal for reading ---
function showModal(text) {
  const modal = document.getElementById("previewModal");
  const modalText = document.getElementById("modalText");
  if (modal && modalText) {
    modalText.innerHTML = text;
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
}
if (document.getElementById("closeModal")) {
  document.getElementById("closeModal").onclick = function () {
    document.getElementById("previewModal").style.display = "none";
    document.body.style.overflow = "";
  };
  window.onclick = function (event) {
    const modal = document.getElementById("previewModal");
    if (event.target === modal) {
      modal.style.display = "none";
      document.body.style.overflow = "";
    }
  };
}
function downloadText(content, filename) {
  const blob = new Blob([content], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }, 110);
}
if (document.getElementById("vaultPassword")) {
  document.getElementById("vaultPassword")
    .addEventListener("keyup", e => {
      if (e.key === "Enter") unlockVault();
    });
}

// --- Activities / Games ---
function petTheCat() {
  const catModal = document.getElementById("catModal");
  const theCat = document.getElementById("theCat");
  const catMsg = document.getElementById("catMsg");
  if (!catModal || !theCat || !catMsg) return;
  catModal.style.display = "flex";
  catMsg.textContent = "Tap Bixie’s nose to pet!";
  theCat.innerHTML = `
    <svg viewBox="0 0 90 90" width="95" height="95" fill="none">
      <ellipse cx="45" cy="49" rx="36" ry="34" fill="#ffcb88"/>
      <ellipse cx="23" cy="33" rx="9" ry="13" fill="#ffe7c2"/>
      <ellipse cx="67" cy="33" rx="9" ry="13" fill="#ffe7c2"/>
      <ellipse cx="45" cy="55" rx="23" ry="16" fill="#fff7ee"/>
      <ellipse cx="32" cy="37" rx="3" ry="7" fill="#fff4d2"/>
      <ellipse cx="58" cy="37" rx="3" ry="7" fill="#fff4d2"/>
      <ellipse cx="37" cy="47" rx="3" ry="6" fill="#a77a45"/>
      <ellipse cx="53" cy="47" rx="3" ry="6" fill="#a77a45"/>
      <ellipse cx="45" cy="61" rx="6" ry="3" fill="#fff"/>
      <ellipse cx="45" cy="51" rx="3" ry="2" fill="#b97234"/>
      <ellipse cx="45" cy="59" rx="5" ry="2.1" fill="#ffcb88"/>
      <ellipse cx="45" cy="47.5" rx="2" ry="1.4" fill="#fff"/>
      <ellipse cx="45" cy="54" rx="2" ry="1.2" fill="#fff"/>
      <ellipse cx="45" cy="52.3" rx="2" ry="1.1" fill="#fff"/>
      <ellipse cx="45" cy="54.5" rx="1.3" ry="0.7" fill="#fff"/>
      <ellipse id="bixieNose" cx="45" cy="54" rx="2.5" ry="2" fill="#ed9d64" style="cursor:pointer;"/>
      <path d="M44 57 Q45 58.8,46 57" stroke="#c97b2b" stroke-width="1.2" fill="none"/>
      <path d="M32 53 Q28 54,32 56" stroke="#a77a45" stroke-width="1.2" fill="none"/>
      <path d="M58 53 Q62 54,58 56" stroke="#a77a45" stroke-width="1.2" fill="none"/>
      <ellipse class="bixie-blink" cx="37" cy="47" rx="1.3" ry="1.7" fill="#4a3010"/>
      <ellipse class="bixie-blink" cx="53" cy="47" rx="1.3" ry="1.7" fill="#4a3010"/>
    </svg>
  `;
  let purrs = [
    "Bixie purrs and rubs her face on you!",
    "She closes her eyes and smiles.",
    "Bixie blinks and you feel loved.",
    "She makes a happy little mew!"
  ];
  let times = 0;
  theCat.querySelector("#bixieNose").onclick = function() {
    catMsg.textContent = purrs[times % purrs.length];
    times++;
    theCat.style.transform = "scale(1.07)";
    setTimeout(()=>{theCat.style.transform="";},170);
  }
  window.closeCat = ()=>{catModal.style.display="none";};
}
window.petTheCat = petTheCat;

// --- Compliment Rain (slower, pop, blocks BG, disables interaction while active) ---
let complimentRainActive = false;
function complimentRain() {
  if (complimentRainActive) return;
  complimentRainActive = true;
  const blockDiv = document.createElement("div");
  blockDiv.style.position = "fixed";
  blockDiv.style.top = 0;
  blockDiv.style.left = 0;
  blockDiv.style.width = "100vw";
  blockDiv.style.height = "100vh";
  blockDiv.style.zIndex = 14999;
  blockDiv.style.background = "rgba(255,255,255,0.01)";
  document.body.appendChild(blockDiv);

  const compliments = [
    "You are enough.", "You’re so strong.", "Your feelings are valid.",
    "You make my world softer.", "I love your heart.", "I’m proud of you.",
    "It’s okay to rest.", "You shine even on rough days.", "You are loved.",
    "Your smile makes everything lighter.", "You matter to me, always.", "You can be soft here.",
    "It's okay to be sad.", "You are never a burden.", "Tish will always listen."
  ];
  let total = 13, popped = 0, rainSpeed = 3600, delay = 290;
  for (let i=0; i<total; ++i) {
    setTimeout(()=>{
      let el = document.createElement("div");
      el.className = "compliment-bubble";
      el.textContent = compliments[Math.floor(Math.random()*compliments.length)];
      el.style.left = (6 + Math.random()*88) + "vw";
      el.style.top = "-40px";
      document.body.appendChild(el);
      let end = 90 + Math.random()*13;
      let anim = el.animate([
        {top:"-40px", opacity:1, transform:"scale(1.07)"},
        {top:end+"vh", opacity:0.6, transform:"scale(1.13) rotate(-4deg)"}
      ], {duration: rainSpeed+Math.random()*1200, easing:"ease-in"});
      el.onclick = function() {
        el.classList.add("popped");
        setTimeout(()=>{el.remove();},190);
        popped++;
        if (popped===total) finishRain();
      };
      setTimeout(()=>{if(el)el.classList.add("popped");if(el)el.remove(); popped++; if (popped===total) finishRain();}, rainSpeed+1400);
    }, i*delay);
  }
  function finishRain() {
    document.body.removeChild(blockDiv);
    complimentRainActive = false;
  }
}
window.complimentRain = complimentRain;

// --- Breathe Modal ---
function startBreathing() {
  const modal = document.getElementById("breathingModal");
  const instruct = document.getElementById("breathInstruct");
  const circle = document.getElementById("breathCircle");
  if (!modal) return;
  modal.style.display = "flex";
  let steps = [
    {txt:"Breathe In", time: 3500, scale:1.23, color:"#fa8dc0"},
    {txt:"Hold", time: 2000, scale:1.13, color:"#f7bff0"},
    {txt:"Breathe Out", time: 4000, scale:0.99, color:"#96d1ea"},
    {txt:"Hold", time: 1700, scale:1.08, color:"#ffd2ef"}
  ];
  let i=0, active=true;
  function nextStep() {
    if(!active) return;
    instruct.textContent = steps[i].txt;
    circle.style.transition = "all 0.88s cubic-bezier(.6,1.1,.7,1.08)";
    circle.style.transform = `scale(${steps[i].scale})`;
    circle.style.background = `linear-gradient(135deg, ${steps[i].color} 50%, #b5fffc 100%)`;
    setTimeout(() => { i=(i+1)%steps.length; nextStep(); }, steps[i].time);
  }
  nextStep();
  modal.onclick = function(e) { if(e.target===modal){ active=false; modal.style.display="none"; } };
  window.closeBreathing = () => { active=false; modal.style.display="none"; };
}
window.startBreathing = startBreathing;

// === COUNTDOWN TIMERS ===
function pad(n){return n<10?'0'+n:n;}
function getNextOctober23() {
  let now = new Date();
  let y = now.getFullYear();
  let d = new Date(y, 9, 23, 0,0,0,0); // Oct is month 9
  if (now > d) d = new Date(y+1, 9, 23, 0,0,0,0);
  return d;
}
function getNextOctober1() {
  let now = new Date();
  let y = now.getFullYear();
  let d = new Date(y, 9, 1, 0,0,0,0);
  if (now > d) d = new Date(y+1, 9, 1, 0,0,0,0);
  return d;
}
function getRelStart() {
  return new Date(2023,11,1,0,0,0,0); // Dec is 11
}
function updateCountdowns() {
  let cNayu = document.getElementById("countNayu");
  let cTish = document.getElementById("countTish");
  let cRel = document.getElementById("countRel");
  if (!cNayu || !cTish || !cRel) return;
  let now = new Date();

  // Nayu's Birthday
  let nbd = getNextOctober23();
  let delta = Math.floor((nbd-now)/1000);
  let days = Math.floor(delta/86400), hrs = Math.floor((delta%86400)/3600), min = Math.floor((delta%3600)/60), sec = delta%60;
  cNayu.textContent = `${pad(days)}d ${pad(hrs)}h ${pad(min)}m ${pad(sec)}s`;

  // Tish's Birthday
  let tbd = getNextOctober1();
  delta = Math.floor((tbd-now)/1000);
  days = Math.floor(delta/86400), hrs = Math.floor((delta%86400)/3600), min = Math.floor((delta%3600)/60), sec = delta%60;
  cTish.textContent = `${pad(days)}d ${pad(hrs)}h ${pad(min)}m ${pad(sec)}s`;

  // Relationship counter (since)
  let rel = getRelStart();
  delta = Math.floor((now-rel)/1000);
  days = Math.floor(delta/86400), hrs = Math.floor((delta%86400)/3600), min = Math.floor((delta%3600)/60), sec = delta%60;
  cRel.textContent = `${pad(days)}d ${pad(hrs)}h ${pad(min)}m ${pad(sec)}s`;
}
if(document.getElementById("countNayu")) setInterval(updateCountdowns, 1000), updateCountdowns();
