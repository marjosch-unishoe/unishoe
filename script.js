console.log("🔥 UniShoe FULL READY");

// ================= SUPABASE =================
const supabaseClient = supabase.createClient(
  "https://laozayivkrlmfqkzxswd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhb3pheWl2a3JsbWZxa3p4c3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzU0NDgsImV4cCI6MjA5NDg1MTQ0OH0.raN9MS4BlWx16ve2K3mzG_vOCQ5hJGAUSPcHbABsQJ4"
);

// ================= STATE =================
let currentUser = null;
let ads = [];
window.editingAdId = null;

// ================= USER INTENT UI =================
document.getElementById("userIntent").addEventListener("change", function () {
  const container = document.getElementById("matchOptions");
  const value = this.value;

  container.innerHTML = "";

  if (value === "match") {
    container.innerHTML = `
      <label><input type="radio" name="matchSide" value="gauche"> Je cherche une chaussure gauche</label><br>
      <label><input type="radio" name="matchSide" value="droite"> Je cherche une chaussure droite</label>
    `;
  }

  if (value === "exchange") {
    container.innerHTML = `
      <label><input type="radio" name="exchange" value="right_to_left"> J’ai une chaussure droite à échanger contre une gauche</label><br>
      <label><input type="radio" name="exchange" value="left_to_right"> J’ai une chaussure gauche à échanger contre une droite</label>
    `;
  }

  if (value === "share") {
    container.innerHTML = `
      <label><input type="radio" name="share" value="gauche"> J’ai besoin du côté gauche</label><br>
      <label><input type="radio" name="share" value="droite"> J’ai besoin du côté droit</label>
    `;
  }
});

// ================= AUTH =================
async function getUser() {
  const { data } = await supabaseClient.auth.getUser();
  currentUser = data?.user || null;

  updateAuthUI();
  loadAds();
}
getUser();

function updateAuthUI() {
  const w = document.getElementById("welcome");
  if (!w) return;

  w.textContent = currentUser
    ? `Connecté : ${currentUser.email}`
    : "Non connecté";
}

async function loginUser() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) return alert(error.message);

  currentUser = data?.user || null;

  await loadProfile();
  updateAuthUI();
  loadAds();
}

async function registerUser() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) return alert(error.message);

  alert("Compte créé ✔");
}

async function logoutUser() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  updateAuthUI();
}

// ================= PROFILE =================
async function saveProfile() {
  if (!currentUser) return alert("Connecte-toi");

  const intent = document.getElementById("userIntent").value;

  const selectedSide =
    document.querySelector('input[name="matchSide"]:checked')?.value ||
    document.querySelector('input[name="exchange"]:checked')?.value ||
    document.querySelector('input[name="share"]:checked')?.value;

  const { error } = await supabaseClient
    .from("profiles")
    .upsert({
      id: currentUser.id,
      intent,
      side: selectedSide
    });

  if (error) return alert(error.message);

  document.getElementById("profileStatus").textContent =
    "✅ Profil enregistré";
}

async function loadProfile() {
  const { data } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (data) {
    document.getElementById("userIntent").value = data.intent || "";
    console.log("Profil chargé", data);
  }
}

// ================= ADS =================
async function loadAds() {
  const { data } = await supabaseClient
    .from("ads")
    .select("*")
    .order("id", { ascending: false });

  ads = data || [];
  displayAds();
}

function displayAds() {
  const container = document.getElementById("ads");

  container.innerHTML = ads.map(ad => `
    <div class="ad">

      <b>${ad.title}</b><br>
      📝 ${ad.description || ""}<br>
      📍 ${ad.city || ""} | 👟 ${ad.size}<br>

      ${ad.photo ? `<img src="${ad.photo}" width="150">` : ""}

      <br><br>

      <button onclick="likeAd()">❤️ Intéressant</button>
      <button onclick="dislikeAd()">❌ Pas intéressé</button>
      <button onclick="editAd(${ad.id})">✏️ Modifier</button>

    </div>
  `).join("");
}

// ================= EDIT AD =================
function editAd(id) {
  const ad = ads.find(a => a.id === id);
  if (!ad) return;

  document.getElementById("title").value = ad.title || "";
  document.getElementById("size").value = ad.size || "";
  document.getElementById("city").value = ad.city || "";
  document.getElementById("description").value = ad.description || "";
  document.getElementById("userIntent").value = ad.intent || "";
  document.getElementById("adShoeSide").value = ad.side || "";

  window.editingAdId = id;

  document.querySelector("button[onclick='addAd()']").textContent =
    "💾 Mettre à jour";

  document.getElementById("cancelBtn").style.display = "inline-block";

  showToast("✏️ Mode édition activé");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ================= CANCEL EDIT =================
function cancelEdit() {
  window.editingAdId = null;

  document.getElementById("title").value = "";
  document.getElementById("size").value = "";
  document.getElementById("city").value = "";
  document.getElementById("description").value = "";
  document.getElementById("userIntent").value = "";
  document.getElementById("adShoeSide").value = "";

  document.getElementById("profileStatus").textContent = "";

  document.querySelector("button[onclick='addAd()']").textContent =
    "📢 Publier";

  document.getElementById("cancelBtn").style.display = "none";

  showToast("✖️ Mode édition annulé");
}

// ================= ADD AD =================
async function addAd() {
  if (!currentUser) return alert("Connecte-toi");

  const file = document.getElementById("photoFile").files[0];
  let photoUrl = "";

  if (file) photoUrl = await uploadPhoto(file);

  const intent = document.getElementById("userIntent").value;

  const side =
    document.getElementById("adShoeSide")?.value ||
    document.querySelector('input[name="matchSide"]:checked')?.value ||
    document.querySelector('input[name="exchange"]:checked')?.value ||
    document.querySelector('input[name="share"]:checked')?.value;

  if (!side) {
    alert("Choisis un côté de chaussure");
    return;
  }

  const ad = {
    title: document.getElementById("title").value,
    size: document.getElementById("size").value,
    condition: document.getElementById("condition")?.value,
    city: document.getElementById("city").value,
    description: document.getElementById("description").value,
    user_id: currentUser.id,
    user_name: currentUser.email,
    photo: photoUrl,
    intent,
    side
  };

  let query;

  if (window.editingAdId) {
    query = supabaseClient
      .from("ads")
      .update(ad)
      .eq("id", window.editingAdId);
  } else {
    query = supabaseClient
      .from("ads")
      .insert([ad]);
  }

  const { error } = await query;

  if (error) {
    console.error(error);
    return alert(error.message);
  }

  window.editingAdId = null;

  document.querySelector("button[onclick='addAd()']").textContent =
    "📢 Publier";

  document.getElementById("cancelBtn").style.display = "none";

  showToast("💜 sauvegardé !");
  await loadMatches();
}

// ================= UPLOAD =================
async function uploadPhoto(file) {
  const fileName = Date.now() + "_" + file.name;

  const { data, error } = await supabaseClient.storage
    .from("shoes")
    .upload(fileName, file);

  if (error) return "";

  const { data: url } = supabaseClient.storage
    .from("shoes")
    .getPublicUrl(data.path);

  return url.publicUrl;
}

// ================= MATCHING =================
function isMatch(a, b) {
  const aSide = (a.side || "").trim().toLowerCase();
  const bSide = (b.side || "").trim().toLowerCase();

  const aSize = Number(a.size);
  const bSize = Number(b.size);

  if (!aSide || !bSide) return false;
  if (isNaN(aSize) || isNaN(bSize)) return false;

  const sideMatch =
    (aSide === "gauche" && bSide === "droite") ||
    (aSide === "droite" && bSide === "gauche");

  const sizeMatch = Math.abs(aSize - bSize) <= 1;

  const intentMatch =
    a.intent === "match" &&
    b.intent === "match";

  return sideMatch && sizeMatch && intentMatch;
}

// ================= ACTIONS =================
function likeAd() {
  showToast("❤️ Intéressant !");
}

function dislikeAd() {
  showToast("❌ Pas intéressé !");
}

// ================= TOAST =================
function showToast(message) {
  const t = document.createElement("div");
  t.textContent = message;
  t.style.position = "fixed";
  t.style.bottom = "20px";
  t.style.left = "50%";
  t.style.transform = "translateX(-50%)";
  t.style.background = "#6a0dad";
  t.style.color = "white";
  t.style.padding = "10px 16px";
  t.style.borderRadius = "10px";
  document.body.appendChild(t);

  setTimeout(() => t.remove(), 2000);
}

// ================= START =================
loadAds();