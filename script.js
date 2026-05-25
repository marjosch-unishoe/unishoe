console.log("🔥 UniShoe FULL READY");

// ================= SUPABASE =================
const { createClient } = supabase;

const supabaseClient = createClient(
  "https://laozayivkrlmfqkzxswd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhb3pheWl2a3JsbWZxa3p4c3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzU0NDgsImV4cCI6MjA5NDg1MTQ0OH0.raN9MS4BlWx16ve2K3mzG_vOCQ5hJGAUSPcHbABsQJ4"
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

getUser();console.log("CURRENT USER:", data?.user);

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
}currentUser = data.user;

console.log("USER ID:", currentUser.id);
console.log("EMAIL:", currentUser.email);

updateAuthUI();
loadAds();

// ================= REGISTER =================
async function registerUser() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) return alert(error.message);

  alert("Compte créé ✔ Connecte-toi !");
}

// ================= LOGOUT =================
async function logoutUser() {
  await supabaseClient.auth.signOut();

  currentUser = null;

  updateAuthUI();
}

// ================= PROFILE =================
async function saveProfile() {

  if (!currentUser) {
    return alert("Connecte-toi d'abord");
  }

  const intent =
    document.getElementById("userIntent").value;

  const side =
    document.getElementById("profileShoeSide").value;

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

  const fileName = `${Date.now()}_${file.name}`;

  const { data, error } =
    await supabaseClient.storage
      .from("shoes")
      .upload(fileName, file);

  if (error) {
    console.log("UPLOAD ERROR:", error);
    return "";
  }

  const path = data.path;

  const { data: urlData } =
    supabaseClient.storage
      .from("shoes")
      .getPublicUrl(path);

  return urlData.publicUrl; console.log("FILE:", file);
console.log("UPLOAD RESPONSE:", data, error);
}


// ================= ADS =================
async function loadAds() {

  const { data } =
    await supabaseClient
      .from("ads")
      .select("*")
      .order("id", { ascending: false });

  ads = data || [];

  displayAds();
  renderCard();
  renderMatches();
}

// ================= ADD AD =================
async function addAd() {

  if (!currentUser) {
    return alert("Connecte-toi !");
  }

  const file =
    document.getElementById("photoFile")?.files[0];

  let photoUrl = "";

  if (file) {
    photoUrl = await uploadPhoto(file);
  }

  const ad = {
    title:
      document.getElementById("title").value,

    size:
      parseInt(document.getElementById("size").value),

    city:
      document.getElementById("city").value.toLowerCase(),

    side:
      document.getElementById("adShoeSide").value,

    condition:
      document.getElementById("condition").value,

    user_name:
      currentUser.email,

    user_id:
      currentUser.id,

    photo:
      photoUrl
  };

  const { data, error } =
    await supabaseClient
      .from("ads")
      .insert([ad])
      .select();

  if (error) {
    return alert(error.message);
  }

  if (data?.length) {
    ads.unshift(data[0]);
  }

  // RESET FORM
  document.getElementById("title").value = "";
  document.getElementById("size").value = "";
  document.getElementById("city").value = "";
  document.getElementById("adShoeSide").value = "";
  document.getElementById("condition").value = "";
  document.getElementById("photoFile").value = "";

  alert("Chaussure publiée 💜");

  displayAds();
  renderCard();
  renderMatches();
}

// ================= DELETE AD =================
async function deleteAd(adId) {

  const confirmed =
    confirm("Supprimer cette annonce ?");

  if (!confirmed) return;

  const { error } =
    await supabaseClient
      .from("ads")
      .delete()
      .eq("id", adId);

  if (error) {
    return alert("Erreur suppression");
  }

  ads = ads.filter(ad => ad.id !== adId);

  displayAds();
  renderCard();
  renderMatches();
}

// ================= REPORT AD =================
async function reportAd(adId) {

  const reason =
    prompt("Pourquoi signalez-vous cette annonce ?");

  if (!reason) return;

  const { error } =
    await supabaseClient
      .from("reports")
      .insert([
        {
          ad_id: adId,
          reason: reason
        }
      ]);

  if (error) {
    return alert("Erreur signalement");
  }

  alert("Annonce signalée ✔");
}

// ================= DISPLAY =================
function displayAds() {

  const c = document.getElementById("ads");

  if (!c) return;

  c.innerHTML = ads.map(ad => `

    <div class="ad">

      <b>${ad.user_name.split("@")[0]}</b><br>

      ${ad.title}<br>

      👟 ${ad.size}
      |
      📍 ${ad.city}
      |
      ${ad.side}

      <br>

      💎 État : ${ad.condition || "Non précisé"}

      <br><br>

      ${ad.photo
        ? `<img src="${ad.photo}" class="ad-img">`
        : ""
      }

      <br><br>

      ${
        currentUser &&
        currentUser.id === ad.user_id
          ? `
            <button onclick="deleteAd('${ad.id}')">
              Supprimer
            </button>
          `
          : ""
      }

      <button onclick="reportAd('${ad.id}')">
        Signaler
      </button>

    </div>

  `).join("");
}

// ================= MATCHING =================
function renderMatches() {

  const box =
    document.getElementById("matchBox");

  if (!box || !currentUser) return;

  const myProfileSide =
    document.getElementById("profileShoeSide")?.value;

  const matches = ads.filter(ad => {

    return (
      ad.user_id !== currentUser.id &&
      ad.side &&
      myProfileSide &&
      ad.side !== myProfileSide
    );

  });

  if (!matches.length) {

    box.innerHTML =
      "Aucun match pour le moment";

    return;
  }

  box.innerHTML = matches.map(m => `

    <div class="match">

      💜 Match potentiel<br>

      ${m.title}<br>

      👟 ${m.size}
      |
      📍 ${m.city}
      |
      ${m.side}

      <br>

      💎 ${m.condition || "État non précisé"}

    </div>

  `).join("");
}

// ================= SWIPE =================
function renderCard() {

  const c =
    document.getElementById("cardContainer");

  if (!c) return;

  if (!ads.length) {

    c.innerHTML =
      "Aucune annonce";

    return;
  }

  const ad = ads[currentIndex];

  c.innerHTML = `

    <div class="card">

      ${
        ad.photo
          ? `
            <img
              src="${ad.photo}"
              style="width:100%;border-radius:12px;"
            >
          `
          : ""
      }

      <h3>${ad.title}</h3>

      <p>👟 ${ad.size}</p>

      <p>📍 ${ad.city}</p>

      <p>${ad.side}</p>

      <p>💎 ${ad.condition || "État non précisé"}</p>

      <p>👤 ${ad.user_name}</p>

    </div>

  `;
}

function swipeLeft() {

  if (!ads.length) return;

  currentIndex =
    (currentIndex + 1) % ads.length;

  renderCard();
}

function swipeRight() {

  if (!ads.length) return;

  currentIndex =
    (currentIndex + 1) % ads.length;

  renderCard();
}

// ================= INIT =================
loadAds();