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

// --- Custom Modal Alert ---
function showCustomModal(msg, withOK = true) {
  const modal = document.getElementById('customModal');
  if (modal) {
    modal.innerHTML = `<div class="modal-content">${msg}${withOK ? `<br><br><button onclick="closeCustomModal()" class="big-btn" style="width:90%;margin-top:15px;">OK</button>` : ''}</div>`;
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  } else {
    alert(msg); // fallback
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
function submitVent() {
  const moodElem = document.getElementById("mood");
  const ventElem = document.getElementById("vent");
  if (!moodElem || !ventElem) return;
  const mood = moodElem.value;
  let text = ventElem.innerHTML.trim();
  if (!text || text.replace(/<[^>]*>?/gm, '').trim().length < 2) {
    showCustomModal(
      `<span>Type a little more? I want to hear you.</span>`,
      false
    );
    setTimeout(() => {
      const modal = document.getElementById('customModal');
      if (modal) {
        modal.onclick = (e) => {
          if (e.target.classList.contains('modal-content') || e.target.classList.contains('custom-modal')) {
            closeCustomModal();
            modal.onclick = null;
          }
        };
      }
    }, 10);
    return;
  }

  // Show loader modal
  const loading = document.getElementById("loadingCard");
  const circ = document.getElementById("mainRibbonCirc");
  if (loading) {
    loading.classList.add("active");
    if (circ) circ.classList.remove("done");
    document.body.style.overflow = "hidden";
  }
  // Save to Firestore (with encryption)
  const date = new Date().toLocaleString();
  const preview = ventElem.innerText.split(" ").slice(0, 18).join(" ") + (ventElem.innerText.split(" ").length > 18 ? "..." : "");
  const entry = { date, mood, preview, fullText: text };

  const vaultPassword = "tishcancode";
  encryptText(JSON.stringify(entry), vaultPassword).then((encrypted) => {
    db.collection("nayuVault").add({
      encrypted,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      if (circ) circ.classList.add("done");
      setTimeout(()=>{
        loading.classList.remove("active");
        document.body.style.overflow = "";
        ventElem.innerHTML = '';
        showCustomModal("Your words are safe with me now. Thank you for trusting me with your heart. 💗");
      }, 800);
    }).catch(err => {
      loading.classList.remove("active");
      document.body.style.overflow = "";
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
  const loader = document.getElementById("vaultLoader");
  const circ = document.getElementById("vaultRibbonCirc");
  if (!inputElem) return;
  const inputPassword = inputElem.value;
  if (inputPassword !== "tishcancode") {
    showCustomModal("That’s not our secret word… try again?");
    return;
  }
  if (loader) {
    loader.classList.add("active");
    if (circ) circ.classList.remove("done");
    document.body.style.overflow = "hidden";
  }
  setTimeout(()=>{
    if (circ) circ.classList.add("done");
    setTimeout(()=>{
      loader.classList.remove("active");
      document.body.style.overflow = "";
      document.getElementById("passwordPrompt").style.display = "none";
      document.getElementById("vaultSection").style.display = "block";
      loadVaultEntries(inputPassword);
    }, 700);
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
        list.innerHTML = "<div class='vault-card' style='text-align:center;'>No notes yet, but I’m always here when you need me.</div>";
        return;
      }
      querySnapshot.forEach(doc => {
        const entryEnc = doc.data().encrypted;
        decryptText(entryEnc, password).then(decrypted => {
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

  // Dots Menu
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
    document.getElementById("menuBackdrop").style.display = "none";
    e.stopPropagation();
  };
  menuPopup.querySelector(".menu-download").onclick = e => {
    let safeFilename = `${data.date.replace(/[/:,]/g, "-")} - ${data.mood}.txt`;
    safeFilename = safeFilename.replace(/[\s?<>\\:*|"]/g, '_');
    downloadText(data.fullText, safeFilename);
    menuPopup.style.display = "none";
    document.getElementById("menuBackdrop").style.display = "none";
    e.stopPropagation();
  };
  menuPopup.querySelector(".menu-delete").onclick = e => {
    showDeleteConfirm(docId);
    menuPopup.style.display = "none";
    document.getElementById("menuBackdrop").style.display = "none";
    e.stopPropagation();
  };
  menuBtn.onclick = function(e) {
    document.querySelectorAll(".menu-popup").forEach(m => { if (m!==menuPopup) m.style.display="none"; });
    document.querySelectorAll(".menu-dots").forEach(b => b.classList.remove("active"));
    const backdrop = document.getElementById("menuBackdrop");
    if (menuPopup.style.display === "block") {
      menuPopup.style.display = "none";
      menuBtn.classList.remove("active");
      if (backdrop) backdrop.style.display = "none";
    } else {
      menuPopup.style.display = "block";
      menuBtn.classList.add("active");
      if (backdrop) backdrop.style.display = "block";
      menuPopup.style.left = "auto";
    }
    e.stopPropagation();
  };
  const backdrop = document.getElementById("menuBackdrop");
  if (backdrop) {
    backdrop.onclick = function() {
      document.querySelectorAll(".menu-popup").forEach(m => m.style.display="none");
      document.querySelectorAll(".menu-dots").forEach(b => b.classList.remove("active"));
      backdrop.style.display = "none";
    };
  }
  // Proper document click close (only one event listener, per menu)
  if (!menuPopup._clickListener) {
    menuPopup._clickListener = function(e) {
      if (menuPopup.style.display === "block" && 
          !menuPopup.contains(e.target) && 
          !menuBtn.contains(e.target)) {
        menuPopup.style.display = "none";
        menuBtn.classList.remove("active");
        const backdrop = document.getElementById("menuBackdrop");
        if (backdrop) backdrop.style.display = "none";
      }
    };
    document.addEventListener("click", menuPopup._clickListener);
  }
  card.appendChild(contentDiv);
  card.appendChild(menuBtn);
  card.appendChild(menuPopup);
  return card;
}

// --- Themed Delete Confirm Modal ---
function showDeleteConfirm(docId) {
  showCustomModal(
    `<span>Are you sure you want to delete this memory?</span><br><br>
     <button class="delete-btn" style="margin-top:8px;width:80%;" onclick="confirmDeleteSingle('${docId}')">Yes, delete</button>
     <button class="big-btn" style="margin-top:8px;width:80%;" onclick="closeCustomModal()">Cancel</button>`,
    false
  );
}
window.confirmDeleteSingle = function(docId) {
  closeCustomModal();
  db.collection("nayuVault").doc(docId).delete().then(() => {
    showCustomModal("Deleted! I’m always here for your next note.");
    setTimeout(()=>location.reload(),1200);
  }).catch(err => showCustomModal("Error deleting: " + err.message));
};

function deleteAllVents() {
  showCustomModal(
    `<span>Are you sure you want to delete all your memories? This can’t be undone.</span><br><br>
     <button onclick='confirmDeleteAll()' class='delete-btn'>Yes, delete all</button>
     <button class="big-btn" style="margin-top:8px;width:80%;" onclick="closeCustomModal()">Cancel</button>`,
    false
  );
}
window.deleteAllVents = deleteAllVents;
window.deleteAllEntries = deleteAllVents;

function confirmDeleteAll() {
  closeCustomModal();
  db.collection("nayuVault").get().then((querySnapshot) => {
    const batch = db.batch();
    querySnapshot.forEach((doc) => batch.delete(doc.ref));
    return batch.commit();
  }).then(() => {
    showCustomModal("Everything deleted. I’ll be here for your next secret anytime.");
    setTimeout(()=>location.reload(),1200);
  }).catch(err => showCustomModal("Error deleting: " + err.message));
}
window.confirmDeleteAll = confirmDeleteAll;

// --- MODAL FOR ENTRY READING ---
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
function startBreathing() {
  const modal = document.getElementById("breathingModal");
  const instruct = document.getElementById("breathInstruct");
  const circle = document.getElementById("breathCircle");
  if (!modal) return;
  modal.classList.add("active");
  let steps = [
    {txt:"Breathe In", time: 3500, scale:1.21, color:"#fa8dc0"},
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
  modal.onclick = function(e) { if(e.target===modal){ active=false; modal.classList.remove("active"); } };
  window.closeBreathing = () => { active=false; modal.classList.remove("active"); };
}
window.startBreathing = startBreathing;

function complimentRain() {
  const compliments = [
    "You are enough.", "You’re so strong.", "Your feelings are valid.",
    "You make my world softer.", "I love your heart.", "I’m proud of you.",
    "It’s okay to rest.", "You shine even on rough days.", "You are loved."
  ];
  let complimentCount = 13;
  let rainDuration = 3300; // ms for the longest bubble
  for (let i=0; i<complimentCount; ++i) {
    setTimeout(()=>{
      let el = document.createElement("div");
      el.className = "compliment-bubble";
      el.textContent = compliments[Math.floor(Math.random()*compliments.length)];
      el.style.left = (8 + Math.random()*82) + "vw";
      el.style.top = "-50px";
      document.body.appendChild(el);
      let end = 100 + Math.random()*15;
      el.animate([
        {top:"-50px", opacity:1, transform:"scale(1.05)"},
        {top:end+"vh", opacity:1, transform:"scale(1.17)"},
        {top:end+"vh", opacity:0, transform:"scale(1.26)"}
      ], {duration:rainDuration, easing:"ease-in"});
      el.onclick = () => {
        el.classList.add("popped");
        setTimeout(()=>{if(el)el.remove();}, 250);
      };
      setTimeout(()=>{if(el)el.remove();}, rainDuration+160);
    }, i*300);
  }
  document.body.style.pointerEvents = "none";
  setTimeout(() => { document.body.style.pointerEvents = ""; }, complimentCount * 300 + rainDuration + 200);
}
window.complimentRain = complimentRain;

// --- Pet Bixie (cat face) ---
function petTheCat() {
  const catModal = document.getElementById("catModal");
  const theCat = document.getElementById("theCat");
  const catMsg = document.getElementById("catMsg");
  if (!catModal || !theCat || !catMsg) return;
  catModal.classList.add("active");
  catMsg.textContent = "Tap Bixie to pet!";
  theCat.innerHTML = `
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
      <ellipse cx="48" cy="53" rx="38" ry="32" fill="#ffe7c2"/>
      <ellipse cx="29" cy="43" rx="10" ry="13" fill="#ffb564"/>
      <ellipse cx="67" cy="43" rx="10" ry="13" fill="#ffb564"/>
      <ellipse cx="48" cy="53" rx="26" ry="23" fill="#fff7ee"/>
      <ellipse cx="48" cy="53" rx="16" ry="13" fill="#ffd17b"/>
      <ellipse cx="48" cy="63" rx="11" ry="7" fill="#ffb564"/>
      <ellipse cx="43" cy="43" rx="2" ry="4" fill="#ffcf92"/>
      <ellipse cx="53" cy="43" rx="2" ry="4" fill="#ffcf92"/>
      <ellipse cx="44" cy="56" rx="2" ry="3" fill="#8e5c26"/>
      <ellipse cx="52" cy="56" rx="2" ry="3" fill="#8e5c26"/>
      <ellipse cx="48" cy="59" rx="3" ry="1.2" fill="#fff"/>
      <ellipse cx="48" cy="61" rx="1.1" ry="0.7" fill="#c97b2b"/>
      <path d="M46 62 Q48 64,50 62" stroke="#c97b2b" stroke-width="1.2" fill="none"/>
      <ellipse cx="48" cy="60.5" rx="1.2" ry="1" fill="#c97b2b"/>
      <path d="M44 51 Q48 56,52 51" stroke="#c97b2b" stroke-width="1.2" fill="none"/>
      <!-- Ears -->
      <polygon points="18,28 25,45 31,36" fill="#ffb564"/>
      <polygon points="78,28 71,45 65,36" fill="#ffb564"/>
    </svg>
  `;
  let purrs = [
    "Bixie purrs and rubs you!", "She closes her eyes, so happy!", "She loves your gentle touch!", "Bixie does a tiny happy dance."
  ];
  let times = 0;
  theCat.onclick = function() {
    catMsg.textContent = purrs[times%purrs.length];
    times++;
    theCat.style.transform = "scale(1.07)";
    setTimeout(()=>{theCat.style.transform="";},170);
  }
  window.closeCat = ()=>{catModal.classList.remove("active");};
}
window.petTheCat = petTheCat;

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
