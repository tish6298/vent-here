const vaultList = document.getElementById("vaultList");

function showModal(text) {
  alert(text); // Replace with real modal if needed
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function decryptText(encryptedText, password) {
  return new Promise((resolve, reject) => {
    // Dummy decryption for example
    try {
      const decrypted = atob(encryptedText); // Replace with real decryption
      resolve(decrypted);
    } catch {
      reject("Decryption failed");
    }
  });
}

function unlockVault() {
  const password = document.getElementById("vaultPassword").value;
  vaultList.innerHTML = "";

  // Replace with real Firestore query
  const fakeEntries = [
    {
      id: "1",
      encrypted: btoa(JSON.stringify({ date: "2025-05-20", mood: "Happy", preview: "Today was great...", fullText: "Today was great! I went to the park..." }))
    },
    {
      id: "2",
      encrypted: btoa(JSON.stringify({ date: "2025-05-18", mood: "Sad", preview: "It was a hard day...", fullText: "It was a hard day because..." }))
    }
  ];

  fakeEntries.forEach(doc => {
    decryptText(doc.encrypted, password).then(decrypted => {
      const data = JSON.parse(decrypted);

      const li = document.createElement("li");
      li.dataset.docId = doc.id;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.docId = doc.id;
      checkbox.style.marginRight = "10px";

      const header = document.createElement("div");
      header.className = "ventHeader";
      header.textContent = `${data.date} — [${data.mood}]`;

      const preview = document.createElement("div");
      preview.textContent = data.preview;

      const dotBtn = document.createElement("button");
      dotBtn.textContent = "⋮";
      dotBtn.className = "dot-menu";

      const dropdownWrapper = document.createElement("div");
      dropdownWrapper.className = "dropdown-wrapper";

      const dropdown = document.createElement("div");
      dropdown.className = "dropdown";

      const readOption = document.createElement("div");
      readOption.className = "dropdown-item";
      readOption.textContent = "📖 Read";
      readOption.onclick = () => showModal(data.fullText);

      const downloadOption = document.createElement("div");
      downloadOption.className = "dropdown-item";
      downloadOption.textContent = "⬇️ Download";
      downloadOption.onclick = () => {
        const sanitizedDate = data.date.replace(/[/:]/g, "-").replace(/\s+/g, "_");
        const filename = `${sanitizedDate} - ${data.mood}.txt`;
        downloadText(data.fullText, filename);
      };

      dropdown.appendChild(readOption);
      dropdown.appendChild(downloadOption);

      dotBtn.onclick = (e) => {
        e.stopPropagation();
        document.querySelectorAll('.dropdown').forEach(menu => menu.classList.remove('show'));
        dropdown.classList.toggle("show");
      };

      dropdownWrapper.appendChild(dotBtn);
      dropdownWrapper.appendChild(dropdown);

      li.appendChild(checkbox);
      li.appendChild(header);
      li.appendChild(preview);
      li.appendChild(dropdownWrapper);

      vaultList.appendChild(li);
    });
  });
}

window.addEventListener("click", () => {
  document.querySelectorAll(".dropdown").forEach(menu => menu.classList.remove("show"));
});
