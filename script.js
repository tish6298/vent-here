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

// --- VENT SUBMISSION ---
function submitVent() {
  const mood = document.getElementById("mood").value;
  const text = document.getElementById("vent").value.trim();
  if (!text) {
    alert("Can you write just a bit? I want to hear you.");
    return;
  }
  const overlay = document.getElementById("overlay");
  const loader = document.getElementById("heart-loader");
  const successMessage = document.getElementById("successMessage");
  overlay.style.display = "flex";
  loader.classList.remove("hide");
  loader.style.display = "block";
  successMessage.style.display = "none";

  const date = new Date().toLocaleString();
  const preview = text.split(" ").slice(0, 12).join(" ") + (text.split(" ").length > 12 ? "..." : "");

  const entry = { date, mood, preview, fullText: text };

  const vaultPassword = "tishcancode";
  encryptText(JSON.stringify(entry), vaultPassword).then((encrypted) => {
    db.collection("nayuVault").add({
      encrypted,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      document.getElementById("vent").value = "";
      loader.style.display = "none";
      loader.classList.add("hide");
      successMessage.style.display = "block";
      setTimeout(() => { overlay.style.display = "none"; }, 1700);
    }).catch(err => {
      overlay.style.display = "none";
      alert("Something went wrong saving your vent: " + err.message);
    });
  });
}

// --- VAULT ACCESS ---
function unlockVault() {
  const inputPassword = document.getElementById("vaultPassword").value;
  if (inputPassword !== "tishcancode") {
    alert("That’s not our secret word… try again?");
    return;
  }
  document.getElementById("passwordPrompt").style.display = "none";
  document.getElementById("vaultSection").style.display = "block";
  loadVaultEntries(inputPassword);

  // Show comfort corner
  setTimeout(() => {
    if(document.getElementById("comfortCorner")) document.getElementById("comfortCorner").style.display = "block";
  }, 400);
}
function loadVaultEntries(password) {
  const list = document.getElementById("ventList");
  list.innerHTML = "";
  db.collection("nayuVault").orderBy("timestamp", "desc").get()
    .then(querySnapshot => {
      if (querySnapshot.empty) {
        list.innerHTML = "<li>No notes yet, but I’m always here when you need me.</li>";
        return;
      }
      querySnapshot.forEach(doc => {
        const entryEnc = doc.data().encrypted;
        decryptText(entryEnc, password).then(decrypted => {
          const data = JSON.parse(decrypted);
          list.appendChild(createVaultListItem(data, doc.id));
        }).catch(() => {});
      });
    }).catch(err => alert("Could not load the vault: " + err.message));
}

function createVaultListItem(data, docId) {
  const li = document.createElement("li");
  li.dataset.docId = docId;
  li.style.position = "relative";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.dataset.docId = docId;
  const mainDiv = document.createElement("div");
  mainDiv.className = "vent-main";
  const header = document.createElement("div");
  header.className = "ventHeader";
  header.textContent = `${data.date} — [${data.mood}]`;
  const preview = document.createElement("div");
  preview.className = "ventPreview";
  preview.textContent = data.preview;
  mainDiv.appendChild(header);
  mainDiv.appendChild(preview);

  // Dots Menu Button
  const menuBtn = document.createElement("button");
  menuBtn.className = "menu-dots";
  menuBtn.innerHTML = "&#x22EE;";
  menuBtn.title = "More";
  const menuPopup = document.createElement("div");
  menuPopup.className = "menu-popup";
  menuPopup.style.display = "none";
  menuPopup.innerHTML = `
    <button class="menu-read">Read Softly</button>
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
  li.appendChild(checkbox);
  li.appendChild(mainDiv);
  li.appendChild(menuBtn);
  li.appendChild(menuPopup);
  li.style.display = "flex";
  li.style.alignItems = "flex-start";
  li.style.justifyContent = "space-between";
  li.style.gap = "8px";
  menuPopup.style.position = "absolute";
  menuPopup.style.right = "7px";
  menuPopup.style.top = "37px";
  menuPopup.style.zIndex = 9111;
  return li;
}

// --- DELETE FUNCTION ---
function deleteSelected() {
  const checkboxes = document.querySelectorAll('#ventList input[type="checkbox"]:checked');
  if (checkboxes.length === 0) {
    alert("Pick what you want to let go of. I’ll be gentle.");
    return;
  }
  if (!confirm("Delete selected? (No pressure, I promise.)")) return;
  const batch = db.batch();
  checkboxes.forEach(cb => {
    const docId = cb.dataset.docId;
    if (docId) {
      const docRef = db.collection("nayuVault").doc(docId);
      batch.delete(docRef);
    }
  });
  batch.commit().then(() => {
    alert("Gone! Remember, I’m always here for the next one.");
    location.reload();
  }).catch(err => alert("Error deleting: " + err.message));
}

// --- MODAL ---
function showModal(text) {
  const modal = document.getElementById("previewModal");
  const modalText = document.getElementById("modalText");
  modalText.textContent = text;
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

// --- VAULT PAGE LOAD ---
if (document.getElementById("vaultPassword")) {
  document.getElementById("vaultPassword")
    .addEventListener("keyup", e => {
      if (e.key === "Enter") unlockVault();
    });
}

// --- Activities / Games ---
// 1. Breathing Exercise
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

// 2. Compliment Rain
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

// 3. Pet the Cat
function petTheCat() {
  const catModal = document.getElementById("catModal");
  const theCat = document.getElementById("theCat");
  const catMsg = document.getElementById("catMsg");
  catModal.style.display = "flex";
  catMsg.textContent = "Tap the cat to pet her!";
  theCat.innerHTML = `
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
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
