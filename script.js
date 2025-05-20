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

// --- HAPTIC FEEDBACK HELPER ---
function haptic(pattern = "tap") {
  if (!("vibrate" in navigator)) return;
  switch (pattern) {
    case "tap":
      navigator.vibrate(12); break;
    case "strong":
      navigator.vibrate(32); break;
    case "double":
      navigator.vibrate([12, 38, 16]); break;
    case "error":
      navigator.vibrate([14, 26, 12, 30, 17]); break;
    case "success":
      navigator.vibrate([8, 32, 24]); break;
    case "long":
      navigator.vibrate(80); break;
    case "light":
      navigator.vibrate(7); break;
    default:
      if (typeof pattern === "number" || Array.isArray(pattern))
        navigator.vibrate(pattern);
      else
        navigator.vibrate(12);
  }
}

// --- Helper: Central Modal Display ---
function showCustomModal(msg) {
  haptic("light");
  const modal = document.getElementById('customModal');
  if (modal) {
    modal.querySelector('.modal-content').innerHTML = msg + '<br><br><button onclick="closeCustomModal()" style="margin-top:12px;" class="big-btn">OK</button>';
    modal.classList.add("active");
  } else {
    alert(msg); // fallback
  }
}
function closeCustomModal() {
  haptic("light");
  const modal = document.getElementById('customModal');
  if (modal) modal.classList.remove('active');
}

// --- FORMAT TOOLS ---
if (document.getElementById("vent")) {
  function formatDoc(cmd, val) {
    haptic("tap");
    document.execCommand(cmd, false, val);
    document.getElementById("vent").focus();
  }
  document.getElementById("vent").addEventListener('paste', function(e){
    e.preventDefault();
    var text = (e.originalEvent || e).clipboardData.getData('text/plain');
    document.execCommand('insertHTML', false, text.replace(/\n/g,"<br>"));
  });
  window.formatDoc = formatDoc; // For toolbar buttons
}

// --- VENT SUBMISSION ---
function submitVent() {
  haptic("tap");
  const moodElem = document.getElementById("mood");
  const ventElem = document.getElementById("vent");
  if (!moodElem || !ventElem) return;
  const mood = moodElem.value;
  let text = ventElem.innerHTML.trim();
  if (!text || text.replace(/<[^>]*>?/gm, '').trim().length < 2) {
    showCustomModal("Can you write a little more? I want to hear you.");
    haptic("error");
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
        haptic("success");
      }, 700);
    }).catch(err => {
      clearInterval(intv);
      document.getElementById("loadingCard").style.display = "none";
      showCustomModal("Something went wrong saving your vent. <br><small>" + err.message + "</small>");
      haptic("error");
    });
  });
}
window.submitVent = submitVent; // For HTML button

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

// --- VAULT ACCESS + Loader ---
function unlockVault() {
  haptic("tap");
  const inputElem = document.getElementById("vaultPassword");
  if (!inputElem) return;
  const inputPassword = inputElem.value;
  if (inputPassword !== "tishcancode") {
    showCustomModal("That’s not our secret word… try again?");
    haptic("error");
    return;
  }
  document.getElementById("passwordPrompt").style.display = "none";
  showVaultLoader();
  setTimeout(()=>{
    document.getElementById("vaultSection").style.display = "block";
    loadVaultEntries(inputPassword);
    setTimeout(() => haptic("success"), 600); // vault unlock "success" haptic
  }, 200); // allows loader to show
}
window.unlockVault = unlockVault;

function showVaultLoader() {
  let loader = document.getElementById("vaultLoader") || document.getElementById("globalLoader");
  if (loader) loader.classList.add("active");
  let pb = document.getElementById("vaultLoadingBar");
  if (pb) {
    pb.style.width = "0%";
    let progress = 0;
    let intv = setInterval(()=>{
      progress = Math.min(progress + 14 + Math.random()*8, 94);
      pb.style.width = progress + "%";
      if(progress > 93 || !loader.classList.contains("active")) clearInterval(intv);
    }, 170);
  }
}
function hideVaultLoader() {
  let loader = document.getElementById("vaultLoader") || document.getElementById("globalLoader");
  if (loader) loader.classList.remove("active");
  let pb = document.getElementById("vaultLoadingBar");
  if (pb) pb.style.width = "100%";
}

function loadVaultEntries(password) {
  const list = document.getElementById("ventList");
  if (!list) return;
  list.innerHTML = "";
  showVaultLoader();
  db.collection("nayuVault").orderBy("timestamp", "desc").get()
    .then(querySnapshot => {
      hideVaultLoader();
      if (querySnapshot.empty) {
        list.innerHTML = "<div class='vault-card' style='text-align:center;'>No notes yet, but I’m always here when you need me.</div>";
        return;
      }
      let docs = [];
      querySnapshot.forEach(doc => docs.push(doc));
      let finished = 0;
      docs.forEach(doc => {
        const entryEnc = doc.data().encrypted;
        decryptText(entryEnc, password).then(decrypted => {
          const data = JSON.parse(decrypted);
          list.appendChild(createVaultCard(data, doc.id));
          finished++;
          // Animate loader as entries are rendered
          let pb = document.getElementById("vaultLoadingBar");
          if (pb && docs.length>1) pb.style.width = (100 * finished / docs.length) + "%";
          if (finished === docs.length) hideVaultLoader();
        }).catch(() => {
          finished++;
          if (finished === docs.length) hideVaultLoader();
        });
      });
    }).catch(err => {
      hideVaultLoader();
      showCustomModal("Could not load the vault: " + err.message);
      haptic("error");
    });
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
  checkbox.onclick = () => haptic("tap");
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
  menuBtn.onclick = function(e) {
    haptic("light");
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
  const menuPopup = document.createElement("div");
  menuPopup.className = "menu-popup";
  menuPopup.style.display = "none";
  menuPopup.innerHTML = `
    <button class="menu-read">Read</button>
    <button class="menu-download">Download</button>
  `;
  menuPopup.querySelector(".menu-read").onclick = e => {
    haptic("light");
    showModal(data.fullText);
    menuPopup.style.display = "none";
    const backdrop = document.getElementById("menuBackdrop");
    if (backdrop) backdrop.style.display = "none";
    e.stopPropagation();
  };
  menuPopup.querySelector(".menu-download").onclick = e => {
    haptic("tap");
    let safeFilename = `${data.date.replace(/[/:,]/g, "-")} - ${data.mood}.txt`;
    safeFilename = safeFilename.replace(/[\s?<>\\:*|"]/g, '_');
    downloadText(data.fullText.replace(/<br\s*\/?>/g, '\n').replace(/<\/?[^>]+(>|$)/g, ""), safeFilename);
    menuPopup.style.display = "none";
    const backdrop = document.getElementById("menuBackdrop");
    if (backdrop) backdrop.style.display = "none";
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
  card.appendChild(checkbox);
  card.appendChild(contentDiv);
  card.appendChild(menuBtn);
  card.appendChild(menuPopup);
  return card;
}

// --- DELETE FUNCTION ---
function deleteSelected() {
  haptic("error");
  const checkboxes = document.querySelectorAll('.vault-card input[type="checkbox"]:checked');
  if (checkboxes.length === 0) {
    showCustomModal("Pick what you want to let go of. I’ll be gentle.");
    return;
  }
  showCustomModal("Are you sure? This will really delete them forever.<br><br><button onclick='confirmDelete()' class='big-btn'>Yes, delete</button>");
}
window.deleteSelected = deleteSelected;

function confirmDelete() {
  haptic("error");
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
    haptic("success");
  }).catch(err => {
    showCustomModal("Error deleting: " + err.message);
    haptic("error");
  });
}
window.confirmDelete = confirmDelete;

// --- MODAL FOR ENTRY READING ---
function showModal(text) {
  haptic("light");
  const modal = document.getElementById("previewModal");
  const modalText = document.getElementById("modalText");
  if (modal && modalText) {
    modalText.innerHTML = text;
    modal.classList.add("active");
  }
}
if (document.getElementById("closeModal")) {
  document.getElementById("closeModal").onclick = function () {
    haptic("light");
    document.getElementById("previewModal").classList.remove("active");
  };
  window.onclick = function (event) {
    const modal = document.getElementById("previewModal");
    if (event.target === modal) {
      haptic("light");
      modal.classList.remove("active");
    }
  };
}
function downloadText(content, filename) {
  haptic("tap");
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
let breatheInterval = null;
function startBreathing() {
  haptic("long");
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
  breatheInterval = setInterval(() => haptic("light"), 1900);
  modal.onclick = function(e) { if(e.target===modal){ active=false; modal.classList.remove("active"); if (breatheInterval) clearInterval(breatheInterval); haptic("light");} };
  window.closeBreathing = () => { active=false; modal.classList.remove("active"); if (breatheInterval) clearInterval(breatheInterval); haptic("light");};
}
window.startBreathing = startBreathing;

// --- Enhanced Compliment Rain ---
function complimentRain() {
  haptic("success");
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

      // Cute floating animation (sway + fade)
      let sway = Math.random()*40 - 20;
      let duration = 2400+Math.random()*1000;
      let end = 100 + Math.random()*26;
      el.animate([
        {top:"-48px", left:el.style.left, opacity:1, transform:el.style.transform},
        {top:(end)+"vh", left:`calc(${el.style.left} + ${sway}px)`, opacity:0.12, transform:`${el.style.transform} scale(1.07)`}
      ], {duration:duration, easing:"ease-in"});
      setTimeout(()=>{if(el)el.remove();}, duration+300);

      // Clicking on a compliment makes it "pop" with sparkles & fade
      el.onclick = () => {
        haptic("double");
        el.style.transition = "opacity 0.27s, transform 0.22s";
        el.style.opacity = 0;
        el.style.transform += " scale(1.2) rotate(-5deg)";
        setTimeout(()=>el.remove(), 300);
        // Optional: Add a little sparkle burst!
        let sp = document.createElement("div");
        sp.style.position = "fixed";
        sp.style.left = el.style.left;
        sp.style.top = (parseInt(el.style.top)+15)+"px";
        sp.innerHTML = `<svg width="30" height="30" style="pointer-events:none"><g>
          <circle cx="15" cy="15" r="7" fill="#ffd6ec" opacity="0.72"/><circle cx="15" cy="15" r="2.7" fill="#ea6fbd"/>
          <path d="M15 4L15 0M15 30L15 26M4 15L0 15M30 15L26 15M8 8L3 3M22 8L27 3M8 22L3 27M22 22L27 27" stroke="#ea6fbd" stroke-width="1.2"/>
        </g></svg>`;
        sp.style.zIndex = 14000;
        document.body.appendChild(sp);
        sp.animate([{opacity:1, transform:"scale(0.75)"}, {opacity:0, transform:"scale(1.32)"}], {duration:700});
        setTimeout(()=>sp.remove(), 700);
      };
    }, i*130);
  }
}
window.complimentRain = complimentRain;

// --- Pet Bixie (ginger baby cat) ---
function petTheCat() {
  haptic("tap");
  const catModal = document.getElementById("catModal");
  const theCat = document.getElementById("theCat");
  const catMsg = document.getElementById("catMsg");
  if (!catModal || !theCat || !catMsg) return;
  catModal.classList.add("active");
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
    haptic("tap");
    catMsg.textContent = purrs[times%purrs.length];
    times++;
    theCat.style.transform = "scale(1.07)";
    setTimeout(()=>{theCat.style.transform="";},170);
  }
  window.closeCat = ()=>{ catModal.classList.remove("active"); haptic("light"); };
}
window.petTheCat = petTheCat;

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

