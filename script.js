// Firebase config object (your project credentials)
const firebaseConfig = {
  apiKey: "AIzaSyAEZKxpPIADzU2IBjz3DcbgQDLBP4dlp18",
  authDomain: "vent-here-4d549.firebaseapp.com",
  projectId: "vent-here-4d549",
  storageBucket: "vent-here-4d549.firebasestorage.app",
  messagingSenderId: "167638687306",
  appId: "1:167638687306:web:9b8ef549397d7893f090b3",
  measurementId: "G-3GMJGF0V1Z"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore database
const db = firebase.firestore();

// --- AES ENCRYPTION FUNCTIONS ---
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
  if (!text) return alert("Please write something.");

  const date = new Date().toLocaleString();
  const preview = text.split(" ").slice(0, 10).join(" ") + "...";

  const entry = {
    date,
    mood,
    preview,
    fullText: text
  };

  const vaultPassword = "tishcancode";
  encryptText(JSON.stringify(entry), vaultPassword).then((encrypted) => {
    // Save encrypted vent to Firestore collection "nayuVault"
    db.collection("nayuVault").add({
      encrypted,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      alert("Submitted! It's safely stored.");
      document.getElementById("vent").value = "";
    }).catch(err => alert("Error saving vent: " + err.message));
  });
}

// --- VAULT ACCESS ---
function unlockVault() {
  const inputPassword = document.getElementById("vaultPassword").value;
  if (inputPassword !== "tishcancode") {
    alert("Wrong password.");
    return;
  }

  document.getElementById("passwordPrompt").style.display = "none";
  document.getElementById("vaultSection").style.display = "block";

  const list = document.getElementById("ventList");
  list.innerHTML = "";

  // Fetch all vents from Firestore ordered by timestamp desc
  db.collection("nayuVault").orderBy("timestamp", "desc").get()
    .then(querySnapshot => {
      if (querySnapshot.empty) {
        list.innerHTML = "<li>No vents found.</li>";
        return;
      }
      querySnapshot.forEach((doc, index) => {
        const entry = doc.data().encrypted;
        decryptText(entry, inputPassword).then(decrypted => {
          const data = JSON.parse(decrypted);
          const li = document.createElement("li");
          li.dataset.docId = doc.id;

          const header = document.createElement("div");
          header.className = "ventHeader";
          header.textContent = `${data.date} — [${data.mood}]`;

          const preview = document.createElement("div");
          preview.textContent = data.preview;

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.dataset.docId = doc.id;

          li.appendChild(checkbox);
          li.appendChild(header);
          li.appendChild(preview);
          list.appendChild(li);
        }).catch(() => console.error("Could not decrypt entry. Skipping."));
      });
    }).catch(err => alert("Error loading vault: " + err.message));
}

// --- DELETE FUNCTION ---
function deleteSelected() {
  const checkboxes = document.querySelectorAll('#ventList input[type="checkbox"]:checked');
  if (checkboxes.length === 0) {
    alert("Select entries to delete.");
    return;
  }

  const batch = db.batch();
  checkboxes.forEach(cb => {
    const docId = cb.dataset.docId;
    if (docId) {
      const docRef = db.collection("nayuVault").doc(docId);
      batch.delete(docRef);
    }
  });

  batch.commit().then(() => {
    alert("Deleted selected entries.");
    location.reload();
  }).catch(err => alert("Error deleting entries: " + err.message));
}
