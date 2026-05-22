console.log("🔥 UniShoe FULL READY");

// ================= SUPABASE =================
const { createClient } = supabase;

const supabaseClient = createClient(
  "https://laozayivkrlmfqkzxswd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhb3pheWl2a3JsbWZxa3p4c3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzU0NDgsImV4cCI6MjA5NDg1MTQ0OH0.raN9MS4BlWx16ve2K3mzG_vOCQ5JGAUSPcHbABsQJ4"
);

// ================= STATE =================
let currentUser = null;
let ads = [];
let currentIndex = 0;

// ================= AUTH =================
async function getUser() {
  const { data } = await supabaseClient.auth.getUser();
  currentUser = data?.user || null;
  updateAuthUI();
}

function updateAuthUI() {
  const w = document.getElementById("welcome");
  if (!w) return;

  w.textContent = currentUser
    ? "Connecté : " + currentUser.email + " 👟"
    : "Non connecté";
}

getUser();

// ================= LOGIN =================
async function loginUser() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) return alert(error.message);

  currentUser = data.user;
  updateAuthUI();
  loadAds();
}

// ================= REGISTER =================
async function registerUser() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) return alert(error.message);

  alert("Compte créé ✔ connecte-toi !");
}

// ================= LOGOUT =================
async function logoutUser() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  updateAuthUI();
}

// ================= PROFILE =================
async function saveProfile() {
  if (!currentUser) return alert("Connecte-toi d'abord");

  const intent = document.getElementById("userIntent").value;
  const side = document.getElementById("profileShoeSide").value;

  const { error } = await supabaseClient
    .from("profiles")
    .upsert({
      id: currentUser.id,
      intent,
      side
    });

  if (error) return alert(error.message);

  document.getElementById("profileStatus").textContent =
    "Profil enregistré ✔";
}

// ================= PHOTO =================
async function uploadPhoto(file) {
  const fileName = Date.now() + "_" + file.name;

  const { error } = await supabaseClient.storage
    .from("shoes")
    .upload(fileName, file);

  if (error) {
    console.log(error);
    return "";
  }

  const { data } = supabaseClient.storage
    .from("shoes")
    .getPublicUrl(fileName);

  return data.publicUrl;
}

// ================= ADS =================
async function loadAds() {
  const { data } = await supabaseClient
    .from("ads")
    .select("*")
    .order("id", { ascending: false });

  ads = data || [];

  displayAds();
  renderCard();
  renderMatches();
}

async function addAd() {
  if (!currentUser) return alert("Connecte-toi !");

  const file = document.getElementById("photoFile")?.files[0];
  let photoUrl = "";

  if (file) photoUrl = await uploadPhoto(file);

  const ad = {
    title: document.getElementById("title").value,
    size: parseInt(document.getElementById("size").value),
    city: document.getElementById("city").value.toLowerCase(),
    side: document.getElementById("adShoeSide").value,
    user_name: currentUser.email,
    user_id: currentUser.id,
    photo: photoUrl
  };

  const { data, error } = await supabaseClient
    .from("ads")
    .insert([ad])
    .select();

  if (error) return alert(error.message);

  if (data?.length) ads.unshift(data[0]);

  displayAds();
  renderCard();
  renderMatches();
}

// ================= DISPLAY =================
function displayAds() {
  const c = document.getElementById("ads");
  if (!c) return;

  c.innerHTML = ads.map(ad => `
    <div class="ad">
      <b>${ad.user_name}</b><br>
      ${ad.title}<br>
      👟 ${ad.size} | 📍 ${ad.city} | ${ad.side}
      ${ad.photo ? `<img src="${ad.photo}" class="ad-img">` : ""}
    </div>
  `).join("");
}

// ================= MATCHING =================
function renderMatches() {
  const box = document.getElementById("matchBox");
  if (!box || !currentUser) return;

  const myProfileSide = document.getElementById("profileShoeSide")?.value;

  const matches = ads.filter(ad => {
    return (
      ad.user_id !== currentUser.id &&
      ad.side &&
      myProfileSide &&
      ad.side !== myProfileSide
    );
  });

  if (!matches.length) {
    box.innerHTML = "Aucun match pour le moment";
    return;
  }

  box.innerHTML = matches.map(m => `
    <div class="match">
      💜 Match potentiel<br>
      ${m.title}<br>
      👟 ${m.size} | 📍 ${m.city} | ${m.side}
    </div>
  `).join("");
}

// ================= SWIPE =================
function renderCard() {
  const c = document.getElementById("cardContainer");
  if (!c) return;

  if (!ads.length) {
    c.innerHTML = "Aucune annonce";
    return;
  }

  const ad = ads[currentIndex];

  c.innerHTML = `
    <div class="card">
      ${ad.photo ? `<img src="${ad.photo}" style="width:100%;border-radius:12px;">` : ""}
      <h3>${ad.title}</h3>
      <p>👟 ${ad.size}</p>
      <p>📍 ${ad.city}</p>
      <p>${ad.side}</p>
      <p>👤 ${ad.user_name}</p>
    </div>
  `;
}

function swipeLeft() {
  if (!ads.length) return;
  currentIndex = (currentIndex + 1) % ads.length;
  renderCard();
}

function swipeRight() {
  if (!ads.length) return;
  currentIndex = (currentIndex + 1) % ads.length;
  renderCard();
}

// ================= INIT =================
loadAds();