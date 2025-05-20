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

// --- Utility: Central Modals/Popups ---
function showLoading(msg) {
  const loading = document.getElementById('loadingCard') || document.getElementById('vaultLoader');
  if (loading) {
    let text = loading.querySelector('.loading-text');
    if (text) text.innerText = msg;
    loading.classList.add('active');
  }
}
function hideLoading() {
  let modals = document.querySelectorAll('#loadingCard, #vaultLoader');
  modals.forEach(m => m.classList.remove('active'));
}
function showCustomModal(msg) {
  const modal = document.getElementById('customModal');
  if (modal) {
    modal.querySelector('.modal-content').innerHTML = msg + '<br><br><button onclick="closeCustomModal()" class="big-btn">OK</button>';
    modal.classList.add("active");
  }
}
function closeCustomModal() {
  const modal = document.getElementById('customModal');
  if (modal) modal.classList.remove('active');
}
function hideAllPopups() {
  hideLoading();
  closeCustomModal();
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
  window.formatDoc = formatDoc; // For toolbar buttons
}

// --- VENT SUBMISSION ---
function submitVent() {
  const moodElem = document.getElementById("mood");
  const ventElem = document.getElementById("vent");
  if (!moodElem || !ventElem) return;
  const mood = moodElem.value;
  let text = ventElem.innerHTML.trim();
  if (!text || text.replace(/<[^>]*>?/gm, '').trim().length < 2) {
    showCustomModal("Can you write a little more? I want to hear you.");
    return;
  }
  showLoading("Sending to your vault...");
  let progress = 0;
  let pb = document.getElementById("progressBar");
  if (pb) pb.style.width = "0%";
  let intv = setInterval(()=>{
    progress = Math.min(progress + 15 + Math.random()*12, 92);
    if (pb) pb.style.width = progress + "%";
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
      if (pb) pb.style.width = "100%";
      setTimeout(()=>{
        hideLoading();
        ventElem.innerHTML = '';
        showCustomModal("Your words are safe with me now. Thank you for trusting me with your heart. 💗");
      }, 700);
    }).catch(err => {
      clearInterval(intv);
      hideLoading();
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
  if (inputPassword !== "tishcancode") {
    showCustomModal("That’s not our secret word… try again?");
    return;
  }
  showLoading("Unlocking your heart vault...");
  setTimeout(()=>{
    hideLoading();
    document.getElementById("passwordPrompt").style.display = "none";
    document.getElementById("vaultSection").style.display = "block";
    loadVaultEntries(inputPassword);
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
  contentDiv.appendChild(header);

  // Dots Menu with working Read/Download
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
    e.stopPropagation();
  };
  menuPopup.querySelector(".menu-download").onclick = e => {
    let safeFilename = `${data.date.replace(/[/:,]/g, "-")} - ${data.mood}.txt`;
    safeFilename = safeFilename.replace(/[\s?<>\\:*|"]/g, '_');
    downloadText(data.fullText, safeFilename);
    menuPopup.style.display = "none";
    e.stopPropagation();
  };
  menuBtn.onclick = function(e) {
    document.querySelectorAll(".menu-popup").forEach(m => { if (m!==menuPopup) m.style.display="none"; });
    menuPopup.style.display = menuPopup.style.display === "block" ? "none" : "block";
    e.stopPropagation();
  };
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
window.deleteSelected = deleteSelected;

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
window.confirmDelete = confirmDelete;

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

// --- Activities / Games (on comfort.html only) ---
function startBreathing() {
  const modal = document.getElementById("breathingModal");
  const instruct = document.getElementById("breathInstruct");
  const circle = document.getElementById("breathCircle");
  if (!modal) return;
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
window.startBreathing = startBreathing;

function complimentRain() {
  const compliments = [
    "You are enough.", "You’re so strong.", "Your feelings are valid.",
    "You make my world softer.", "I love your heart.", "I’m proud of you.",
    "It’s okay to rest.", "You shine even on rough days.", "You are loved."
  ];
  const heartSVG = `<svg class="compliment-heart" viewBox="0 0 24 22"><path d="M12 21s-5.1-3.2-8.1-7C1.4 11 0 8.7 2.1 6.5A5.7 5.7 0 0112 7a5.7 5.7 0 019.9-.5C24 8.7 22.6 11 20.1 14c-3 3.8-8.1 7-8.1 7z" fill="#ff87b2" stroke="#e055ab" stroke-width="1"/></svg>`;
  for (let i=0; i<16; ++i) {
    setTimeout(()=>{
      let el = document.createElement("div");
      el.className = "compliment-bubble";
      let compliment = compliments[Math.floor(Math.random()*compliments.length)];
      el.innerHTML = compliment + (Math.random() > 0.6 ? heartSVG : "");
      el.style.left = (7 + Math.random()*83) + "vw";
      el.style.top = "-48px";
      el.style.zIndex = 13000;
      el.style.fontSize = (15 + Math.random()*6) + "px";
      el.style.transform = `rotate(${Math.floor(-13+Math.random()*26)}deg)`;
      document.body.appendChild(el);

      // SLOWER animation
      let sway = Math.random()*40 - 20;
      let duration = 3600+Math.random()*1500;
      let end = 100 + Math.random()*26;
      el.animate([
        {top:"-48px", left:el.style.left, opacity:1, transform:el.style.transform},
        {top:(end)+"vh", left:`calc(${el.style.left} + ${sway}px)`, opacity:0.12, transform:`${el.style.transform} scale(1.07)`}
      ], {duration:duration, easing:"ease-in"});
      setTimeout(()=>{if(el)el.remove();}, duration+300);

      // Clicking on a compliment makes it "pop"
      el.onclick = () => {
        el.style.transition = "opacity 0.27s, transform 0.22s";
        el.style.opacity = 0;
        el.style.transform += " scale(1.2) rotate(-5deg)";
        setTimeout(()=>el.remove(), 300);
      };
    }, i*270);
  }
}
window.complimentRain = complimentRain;

// --- Pet Bixie ---
function petTheCat() {
  const catModal = document.getElementById("catModal");
  const theCat = document.getElementById("theCat");
  const catMsg = document.getElementById("catMsg");
  if (!catModal || !theCat || !catMsg) return;
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
