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

function affirmationHearts() {
  const affirmations = [
    "You are loved.", "You matter.", "You are beautiful.", "You are worthy.",
    "You make this world brighter.", "You are strong.", "You are precious.",
    "It's okay to rest.", "You're doing enough.", "You are not alone.",
    "You deserve kindness.", "Your heart is gold.", "You’re my favorite."
  ];
  let count = 13, dur = 4000;
  for (let i=0; i<count; ++i) {
    setTimeout(()=>{
      let el = document.createElement("div");
      el.className = "affirm-heart";
      el.textContent = affirmations[Math.floor(Math.random()*affirmations.length)];
      el.style.left = (10 + Math.random()*78) + "vw";
      el.style.fontSize = (17 + Math.random()*6) + "px";
      el.style.top = "-50px";
      document.body.appendChild(el);
      let end = 85 + Math.random()*12;
      el.animate([
        {top:"-50px", opacity:1, transform:"scale(1.09)"},
        {top:end+"vh", opacity:1, transform:"scale(1.15)"},
        {top:end+"vh", opacity:0, transform:"scale(1.19)"}
      ], {duration:dur, easing:"ease-in"});
      el.onclick = () => {
        el.classList.add("popped");
        setTimeout(()=>{if(el)el.remove();}, 250);
      };
      setTimeout(()=>{if(el)el.remove();}, dur+160);
    }, i*260);
  }
  document.body.style.pointerEvents = "none";
  setTimeout(() => { document.body.style.pointerEvents = ""; }, count * 260 + dur + 200);
}
window.affirmationHearts = affirmationHearts;

// Cat: Cute Garfield Face
function petTheCat() {
  const catModal = document.getElementById("catModal");
  const theCat = document.getElementById("theCat");
  const catMsg = document.getElementById("catMsg");
  if (!catModal || !theCat || !catMsg) return;
  catModal.classList.add("active");
  catMsg.textContent = "Tap Garfield to pet!";
  theCat.innerHTML = `
    <svg width="84" height="84" viewBox="0 0 96 96" fill="none">
      <!-- Garfield ears -->
      <ellipse cx="29" cy="32" rx="13" ry="20" fill="#ffe7c2" stroke="#d5b081" stroke-width="1.4"/>
      <ellipse cx="67" cy="32" rx="13" ry="20" fill="#ffe7c2" stroke="#d5b081" stroke-width="1.4"/>
      <!-- Face base -->
      <ellipse cx="48" cy="53" rx="36" ry="31" fill="#ffe7c2" stroke="#d5b081" stroke-width="2.1"/>
      <!-- Eyes -->
      <ellipse cx="38" cy="54" rx="8" ry="10" fill="#fff"/>
      <ellipse cx="58" cy="54" rx="8" ry="10" fill="#fff"/>
      <ellipse cx="39.5" cy="58.5" rx="2.7" ry="3.2" fill="#222"/>
      <ellipse cx="58.5" cy="58.5" rx="2.7" ry="3.2" fill="#222"/>
      <!-- Nose -->
      <ellipse cx="48" cy="66" rx="5" ry="3" fill="#ffb441"/>
      <!-- Mouth -->
      <path d="M44 70 Q48 74 52 70" stroke="#d29657" stroke-width="2" fill="none"/>
      <ellipse cx="48" cy="72" rx="2.6" ry="0.7" fill="#d29657"/>
      <!-- Garfield stripes -->
      <rect x="44" y="35" width="2" height="12" fill="#ffb441" rx="1"/>
      <rect x="50" y="35" width="2" height="12" fill="#ffb441" rx="1"/>
      <rect x="47" y="33" width="2" height="7" fill="#ffb441" rx="1"/>
    </svg>
  `;
  let purrs = [
    "Garfield purrs and rubs you!", "He closes his eyes, so happy!", "He loves your gentle touch!", "Garfield smiles lazily."
  ];
  let times = 0;
  theCat.onclick = function() {
    catMsg.textContent = purrs[times%purrs.length];
    times++;
    theCat.style.transform = "scale(1.11)";
    setTimeout(()=>{theCat.style.transform="";},180);
  }
  window.closeCat = ()=>{catModal.classList.remove("active");};
}
window.petTheCat = petTheCat;
