// === FIREBASE INIT ===
const firebaseConfig = {
  apiKey: "AIzaSyAEZKxpPIADzU2IBjz3DcbgQDLBP4dlp18",
  authDomain: "vent-here-4d549.firebaseapp.com",
  projectId: "vent-here-4d549",
  storageBucket: "vent-here-4d549.firebasestorage.app",
  messagingSenderId: "167638687306",
  appId: "1:167638687306:web:9b8ef549397d7893f090b3",
  measurementId: "G-3GMJGF0V1Z"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Custom Modal Alert
function showCustomModal(msg) {
  const modal = document.getElementById('customModal');
  modal.querySelector('.modal-content').innerHTML = msg + '<br><br><button onclick="closeCustomModal()" style="margin-top:12px;" class="big-btn">OK</button>';
  modal.style.display = "flex";
}
function closeCustomModal() {
  document.getElementById('customModal').style.display = 'none';
}

// --- FORMAT TOOLS ---
function formatDoc(cmd, val) {
  document.execCommand(cmd, false, val);
  document.getElementById("vent").focus();
}
document.getElementById("vent").addEventListener('paste', function(e){
  e.preventDefault();
  var text = (e.originalEvent || e).clipboardData.getData('text/plain');
  document.execCommand('insertHTML', false, text.replace(/\n/g,"<br>"));
});

// --- VENT SUBMISSION ---
function submitVent() {
  const mood = document.getElementById("mood").value;
  const ventElem = document.getElementById("vent");
  let text = ventElem.innerHTML.trim();
  if (!text || text.replace(/<[^>]*>?/gm, '').trim().length < 2) {
    showCustomModal("Can you write a little more? I want to hear you.");
    return;
  }
  document.getElementById("loadingCard").style.display = "block";
  let progress = 0;
  let pb = document.getElementById("progressBar");
  pb.style.width = "0%";
  let intv = setInterval(()=>{
    progress = Math.min(progress + 15 + Math.random()*12, 92);
    pb.style.width = progress + "%";
  }, 190);

  const date = new Date().toLocaleString();
  const preview = ventElem.innerText.split(" ").slice(0, 18).join(" ") + (ventElem.innerText.split(" ").length > 18 ? "..." : "");
  const entry = { date, mood, preview, fullText: text };

  const vaultPassword = "tishcancode";
  encryptText(JSON.stringify(entry), vaultPassword).then((encrypted) => {
    db.collection("nayuVault").add({
      encrypted,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      clearInterval(intv);
      pb.style.width = "100%";
      setTimeout(()=>{
        document.getElementById("loadingCard").style.display = "none";
        ventElem.innerHTML = '';
        showCustomModal("Your words are safe with me now. Thank you for trusting me with your heart. 💗");
      }, 700);
    }).catch(err => {
      clearInterval(intv);
      document.getElementById("loadingCard").style.display = "none";
      showCustomModal("Something went wrong saving your vent. <br><small>" + err.message + "</small>");
    });
  });
}

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
  const inputPassword = document.getElementById("vaultPassword").value;
  if (inputPassword !== "tishcancode") {
    showCustomModal("That’s not our secret word… try again?");
    return;
  }
  document.getElementById("passwordPrompt").style.display = "none";
  document.getElementById("vaultSection").style.display = "block";
  loadVaultEntries(inputPassword);
}
function loadVaultEntries(password) {
  const list = document.getElementById("ventList");
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
  // Checkbox
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "vault-checkbox";
  checkbox.dataset.docId = docId;
  // Main content
  const contentDiv = document.createElement("div");
  contentDiv.className = "vault-card-content";
  const header = document.createElement("div");
  header.className = "vault-card-header";
  header.textContent = `${data.date} — [${data.mood}]`;
  const preview = document.createElement("div");
  preview.className = "vault-card-preview";
  preview.textContent = data.preview;
  contentDiv.appendChild(header);
  contentDiv.appendChild(preview);

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
  menuBtn.onclick = function(e) {
    document.querySelectorAll(".menu-popup").forEach(m => { if (m!==menuPopup) m.style.display="none"; });
    document.querySelectorAll(".menu-dots").forEach(b => b.classList.remove("active"));
    if (menuPopup.style.display === "block") {
      menuPopup.style.display = "none";
      menuBtn.classList.remove("active");
      document.getElementById("menuBackdrop").style.display = "none";
    } else {
      menuPopup.style.display = "block";
      menuBtn.classList.add("active");
      document.getElementById("menuBackdrop").style.display = "block";
      menuPopup.style.left = "auto";
    }
    e.stopPropagation();
  };
  if (document.getElementById("menuBackdrop")) {
    document.getElementById("menuBackdrop").onclick = function() {
      document.querySelectorAll(".menu-popup").forEach(m => m.style.display="none");
      document.querySelectorAll(".menu-dots").forEach(b => b.classList.remove("active"));
      document.getElementById("menuBackdrop").style.display = "none";
    };
  }
  card.appendChild(checkbox);
  card.appendChild(contentDiv);
  card.appendChild(menuBtn);
  card.appendChild(menuPopup);
  return card;
}

// --- DELETE FUNCTION ---
function deleteSelected() {
  const checkboxes = document.querySelectorAll('.vault-card input[type="checkbox"]:checked');
  if (checkboxes.length === 0) {
    showCustomModal("Pick what you want to let go of. I’ll be gentle.");
    return;
  }
  showCustomModal("Are you sure? This will really delete them forever.<br><br><button onclick='confirmDelete()' class='big-btn'>Yes, delete</button>");
}
function confirmDelete() {
  closeCustomModal();
  const checkboxes = document.querySelectorAll('.vault-card input[type="checkbox"]:checked');
  const batch = db.batch();
  checkboxes.forEach(cb => {
    const docId = cb.dataset.docId;
    if (docId) {
      const docRef = db.collection("nayuVault").doc(docId);
      batch.delete(docRef);
    }
  });
  batch.commit().then(() => {
    showCustomModal("Deleted! I’m always here for your next note.");
    setTimeout(()=>location.reload(),1200);
  }).catch(err => showCustomModal("Error deleting: " + err.message));
}

// --- MODAL FOR ENTRY READING ---
function showModal(text) {
  const modal = document.getElementById("previewModal");
  const modalText = document.getElementById("modalText");
  modalText.innerHTML = text;
  modal.style.display = "block";
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

// --- Activities / Games --- (unchanged, as in last reply)
function startBreathing() {
  const modal = document.getElementById("breathingModal");
  const instruct = document.getElementById("breathInstruct");
  const circle = document.getElementById("breathCircle");
  modal.style.display = "flex";
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
  modal.onclick = function(e) { if(e.target===modal){ active=false; modal.style.display="none"; } };
  window.closeBreathing = () => { active=false; modal.style.display="none"; };
}
function complimentRain() {
  const compliments = [
    "You are enough.", "You’re so strong.", "Your feelings are valid.",
    "You make my world softer.", "I love your heart.", "I’m proud of you.",
    "It’s okay to rest.", "You shine even on rough days.", "You are loved."
  ];
  for (let i=0; i<14; ++i) {
    setTimeout(()=>{
      let el = document.createElement("div");
      el.textContent = compliments[Math.floor(Math.random()*compliments.length)];
      el.style.position = "fixed";
      el.style.left = (6 + Math.random()*88) + "vw";
      el.style.top = "-40px";
      el.style.zIndex = 13000;
      el.style.background = "linear-gradient(90deg,#ffbde2 10%,#b5fffc 90%)";
      el.style.color = "#d83a99";
      el.style.padding = "9px 19px";
      el.style.borderRadius = "19px";
      el.style.fontWeight = "800";
      el.style.fontSize = "16px";
      el.style.opacity = "0.88";
      el.style.boxShadow = "0 2px 9px #ffe7f68a";
      document.body.appendChild(el);
      let end = 100 + Math.random()*30;
      el.animate([
        {top:"-40px", opacity:1, transform:"scale(1.1)"},
        {top:end+"vh", opacity:0, transform:"scale(1.17)"}
      ], {duration:2200+Math.random()*900, easing:"ease-in"});
      setTimeout(()=>{if(el)el.remove();}, 2600);
    }, i*160);
  }
}
function petTheCat() {
  const catModal = document.getElementById("catModal");
  const theCat = document.getElementById("theCat");
  const catMsg = document.getElementById("catMsg");
  catModal.style.display = "flex";
  catMsg.textContent = "Tap the cat to pet her!";
  theCat.innerHTML = `
    <svg width="100" height="80" viewBox="0 0 120 100" fill="none">
      <ellipse cx="60" cy="72" rx="38" ry="24" fill="#fce3f5"/>
      <ellipse cx="45" cy="45" rx="18" ry="18" fill="#ffd3ef"/>
      <ellipse cx="75" cy="45" rx="18" ry="18" fill="#ffd3ef"/>
      <ellipse cx="60" cy="70" rx="27" ry="18" fill="#fff"/>
      <ellipse cx="60" cy="60" rx="23" ry="12" fill="#ffd3ef"/>
      <ellipse cx="60" cy="67" rx="14" ry="7" fill="#f8b9e8"/>
      <ellipse cx="49" cy="44" rx="4" ry="7" fill="#cfa1e6"/>
      <ellipse cx="71" cy="44" rx="4" ry="7" fill="#cfa1e6"/>
      <ellipse cx="56" cy="52" rx="2.3" ry="3.6" fill="#553253"/>
      <ellipse cx="64" cy="52" rx="2.3" ry="3.6" fill="#553253"/>
      <ellipse cx="60" cy="61" rx="4" ry="2" fill="#fae6f7"/>
      <path d="M60 54 Q61 58,62 54" stroke="#b570ad" stroke-width="1.5" fill="none"/>
      <polygon points="37,23 42,34 44,29" fill="#f8b9e8"/>
      <polygon points="83,23 78,34 76,29" fill="#f8b9e8"/>
    </svg>
  `;
  let purrs = [
    "Purrr... she loves you.",
    "She leans into your hand.",
    "She closes her eyes and smiles.",
    "Your love calms her little heart."
  ];
  let times = 0;
  theCat.onclick = function() {
    catMsg.textContent = purrs[times%purrs.length];
    times++;
    theCat.style.transform = "scale(1.05)";
    setTimeout(()=>{theCat.style.transform="";},200);
  }
  window.closeCat = ()=>{catModal.style.display="none";};
}
// === COUNTDOWN TIMERS ===
function pad(n){return n<10?'0'+n:n;}
// Next 23rd October (Nayu's birthday)
function getNextOctober23() {
  let now = new Date();
  let y = now.getFullYear();
  let d = new Date(y, 9, 23, 0,0,0,0); // Oct is month 9
  if (now > d) d = new Date(y+1, 9, 23, 0,0,0,0);
  return d;
}
// Next 1st October (Tish's birthday)
function getNextOctober1() {
  let now = new Date();
  let y = now.getFullYear();
  let d = new Date(y, 9, 1, 0,0,0,0);
  if (now > d) d = new Date(y+1, 9, 1, 0,0,0,0);
  return d;
}
// Relationship counter since 1 Dec 2023
function getRelStart() {
  return new Date(2023,11,1,0,0,0,0); // Dec is 11
}

function updateCountdowns() {
  // Nayu's Birthday
  let now = new Date();
  let nbd = getNextOctober23();
  let delta = Math.floor((nbd-now)/1000);
  let days = Math.floor(delta/86400), hrs = Math.floor((delta%86400)/3600), min = Math.floor((delta%3600)/60), sec = delta%60;
  document.getElementById("countNayu").textContent = `${pad(days)}d ${pad(hrs)}h ${pad(min)}m ${pad(sec)}s`;

  // Tish's Birthday
  let tbd = getNextOctober1();
  delta = Math.floor((tbd-now)/1000);
  days = Math.floor(delta/86400), hrs = Math.floor((delta%86400)/3600), min = Math.floor((delta%3600)/60), sec = delta%60;
  document.getElementById("countTish").textContent = `${pad(days)}d ${pad(hrs)}h ${pad(min)}m ${pad(sec)}s`;

  // Relationship counter (since)
  let rel = getRelStart();
  delta = Math.floor((now-rel)/1000);
  days = Math.floor(delta/86400), hrs = Math.floor((delta%86400)/3600), min = Math.floor((delta%3600)/60), sec = delta%60;
  document.getElementById("countRel").textContent = `${pad(days)}d ${pad(hrs)}h ${pad(min)}m ${pad(sec)}s`;
}
if(document.getElementById("countNayu")) setInterval(updateCountdowns, 1000), updateCountdowns();

// --- Pet Bixie, ginger baby cat ---
function petTheCat() {
  const catModal = document.getElementById("catModal");
  const theCat = document.getElementById("theCat");
  const catMsg = document.getElementById("catMsg");
  catModal.style.display = "flex";
  catMsg.textContent = "Tap Bixie to pet!";
  theCat.innerHTML = `
    <svg width="110" height="90" viewBox="0 0 110 90" fill="none">
      <ellipse cx="55" cy="65" rx="34" ry="20" fill="#ffe7c2"/>
      <ellipse cx="39" cy="38" rx="14" ry="14" fill="#ffb564"/>
      <ellipse cx="71" cy="38" rx="14" ry="14" fill="#ffb564"/>
      <ellipse cx="55" cy="62" rx="23" ry="13" fill="#fff7ee"/>
      <ellipse cx="55" cy="52" rx="19" ry="9" fill="#ffd17b"/>
      <ellipse cx="55" cy="59" rx="10" ry="5" fill="#ffb564"/>
      <ellipse cx="46" cy="37" rx="3" ry="5" fill="#ffcf92"/>
      <ellipse cx="64" cy="37" rx="3" ry="5" fill="#ffcf92"/>
      <ellipse cx="52" cy="48" rx="2" ry="3" fill="#8e5c26"/>
      <ellipse cx="58" cy="48" rx="2" ry="3" fill="#8e5c26"/>
      <ellipse cx="55" cy="54" rx="4" ry="2" fill="#fff"/>
      <path d="M54 50 Q55 52,56 50" stroke="#c97b2b" stroke-width="1.2" fill="none"/>
      <polygon points="29,19 35,31 37,24" fill="#ffb564"/>
      <polygon points="81,19 75,31 73,24" fill="#ffb564"/>
      <!-- cute little nose and smile -->
      <ellipse cx="55" cy="51" rx="1.2" ry="1" fill="#c97b2b"/>
      <path d="M54 53 Q55 54,56 53" stroke="#c97b2b" stroke-width="1" fill="none"/>
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
  window.closeCat = ()=>{catModal.style.display="none";};
}
