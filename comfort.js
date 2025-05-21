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

// Heart affirmations
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
      let end = 85 + Math.random()*14;
      el.animate([
        {top:"-50px", opacity:1, transform:"scale(1.07)"},
        {top:end+"vh", opacity:1, transform:"scale(1.15)"},
        {top:end+"vh", opacity:0, transform:"scale(1.26)"}
      ], {duration:dur, easing:"ease-in"});
      el.onclick = () => {
        el.classList.add("popped");
        setTimeout(()=>{if(el)el.remove();}, 220);
      };
      setTimeout(()=>{if(el)el.remove();}, dur+140);
    }, i*300);
  }
  document.body.style.pointerEvents = "none";
  setTimeout(() => { document.body.style.pointerEvents = ""; }, count * 300 + dur + 150);
}
window.affirmationHearts = affirmationHearts;

// Cute Garfield-like cat face (SVG)
function petTheCat() {
  const catModal = document.getElementById("catModal");
  const theCat = document.getElementById("theCat");
  const catMsg = document.getElementById("catMsg");
  if (!catModal || !theCat || !catMsg) return;
  catModal.classList.add("active");
  catMsg.textContent = "Tap Bixie to pet!";
  theCat.innerHTML = `
  <svg width="96" height="96" viewBox="0 0 96 96">
    <ellipse cx="48" cy="56" rx="35" ry="30" fill="#ffe7c2" stroke="#d5b081" stroke-width="2"/>
    <!-- Cheeks -->
    <ellipse cx="33" cy="70" rx="9" ry="8" fill="#ffcf9b" opacity="0.7"/>
    <ellipse cx="63" cy="70" rx="9" ry="8" fill="#ffcf9b" opacity="0.7"/>
    <!-- Eyes -->
    <ellipse cx="38" cy="54" rx="6" ry="9" fill="#fff"/>
    <ellipse cx="58" cy="54" rx="6" ry="9" fill="#fff"/>
    <ellipse cx="38" cy="57" rx="2.4" ry="4" fill="#222"/>
    <ellipse cx="58" cy="57" rx="2.4" ry="4" fill="#222"/>
    <ellipse cx="38" cy="55" rx="1" ry="1.6" fill="#fff"/>
    <ellipse cx="58" cy="55" rx="1" ry="1.6" fill="#fff"/>
    <!-- Nose -->
    <ellipse cx="48" cy="67" rx="2.2" ry="1.5" fill="#ff7c80" />
    <!-- Mouth -->
    <path d="M45 72 Q48 76, 51 72" stroke="#d2829b" stroke-width="2" fill="none"/>
    <!-- Whiskers -->
    <path d="M30 67 Q23 70, 32 72" stroke="#d5b081" stroke-width="1.4" fill="none"/>
    <path d="M30 72 Q24 74, 33 76" stroke="#d5b081" stroke-width="1.1" fill="none"/>
    <path d="M66 67 Q73 70, 64 72" stroke="#d5b081" stroke-width="1.4" fill="none"/>
    <path d="M66 72 Q72 74, 63 76" stroke="#d5b081" stroke-width="1.1" fill="none"/>
    <!-- Ears -->
    <polygon points="19,38 33,18 41,37" fill="#ffe7c2" stroke="#d5b081" stroke-width="1"/>
    <polygon points="77,38 63,18 55,37" fill="#ffe7c2" stroke="#d5b081" stroke-width="1"/>
    <!-- Garfield stripes -->
    <rect x="44" y="35" width="2" height="12" fill="#ffb441" rx="1"/>
    <rect x="50" y="35" width="2" height="12" fill="#ffb441" rx="1"/>
    <rect x="47" y="33" width="2" height="7" fill="#ffb441" rx="1"/>
  </svg>
  `;
  let purrs = [
    "Bixie purrs and rubs you!", "She closes her eyes, so happy!", "She loves your gentle touch!", "Bixie does a tiny happy dance."
  ];
  let times = 0;
  theCat.onclick = function() {
    catMsg.textContent = purrs[times%purrs.length];
    times++;
    theCat.style.transform = "scale(1.09)";
    setTimeout(()=>{theCat.style.transform="";},180);
  }
  window.closeCat = ()=>{catModal.classList.remove("active");};
}
window.petTheCat = petTheCat;
