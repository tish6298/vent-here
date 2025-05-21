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

const vaultPassword = "tishcancode"; // <<--- Change your vault password here!

// --- Custom Modal Alert ---
function showCustomModal(msg, withOK = true) {
  const modal = document.getElementById('customModal');
  if (modal) {
    modal.innerHTML = `<div class="modal-content">${msg}${withOK ? `<br><br><button onclick="closeCustomModal()" class="big-btn" style="width:90%;margin-top:15px;display:block;margin-left:auto;margin-right:auto;">OK</button>` : ''}</div>`;
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
    showCustomModal(`<span>Type a little more? I want to hear you.</span>`);
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
  if (inputPassword !== vaultPassword) {
    showCustomModal("That’s not our secret word… try again?");
    return;
  }
  // Show loader
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
  // Main content
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
    showCustomModal(`<span>Are you sure you want to delete this memory?</span><br><br><button class="delete-btn" style="margin-top:8px;width:80%;display:block;margin-left:auto;margin-right:auto;" onclick="confirmDeleteSingle('${docId}')">Yes, delete</button>`);
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

  document.addEventListener("click", function(e) {
    if (menuPopup.style.display === "block" && 
        !menuPopup.contains(e.target) && 
        !menuBtn.contains(e.target)) {
      menuPopup.style.display = "none";
      menuBtn.classList.remove("active");
      const backdrop = document.getElementById("menuBackdrop");
      if (backdrop) backdrop.style.display = "none";
    }
  });

  card.appendChild(contentDiv);
  card.appendChild(menuBtn);
  card.appendChild(menuPopup);
  return card;
}

window.confirmDeleteSingle = function(docId) {
  closeCustomModal();
  db.collection("nayuVault").doc(docId).delete().then(() => {
    showCustomModal("Deleted! I’m always here for your next note.");
    setTimeout(()=>location.reload(),1200);
  }).catch(err => showCustomModal("Error deleting: " + err.message));
};

function deleteAllVents() {
  showCustomModal("Are you sure you want to delete all your memories? This can’t be undone.<br><br><button onclick='confirmDeleteAll()' class='delete-btn' style='margin-left:auto;margin-right:auto;display:block;'>Yes, delete all</button>");
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
  }
}
if (document.getElementById("closeModal")) {
  document.getElementById("closeModal").onclick = function () {
    document.getElementById("previewModal").style.display = "none";
  };
  window.onclick = function (event) {
    const modal = document.getElementById("previewModal");
    if (event.target === modal) {
      modal.style.display = "none";
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
