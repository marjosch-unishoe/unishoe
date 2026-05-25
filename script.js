console.log("🔥 UniShoe FULL READY");

// ================= SUPABASE =================
const supabaseClient = supabase.createClient(
  "https://laozayivkrlmfqkzxswd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhb3pheWl2a3JsbWZxa3p4c3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzU0NDgsImV4cCI6MjA5NDg1MTQ0OH0.raN9MS4BlWx16ve2K3mzG_vOCQ5hJGAUSPcHbABsQJ4"
);

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
      <label><input type="radio" name="exchange" value="right_to_left"> J’ai une chaussure droite à échanger</label><br>
      <label><input type="radio" name="exchange" value="left_to_right"> J’ai une chaussure gauche à échanger</label>
    `;
  }

  if (value === "share") {
    container.innerHTML = `
      <label><input type="radio" name="share" value="gauche"> J’ai besoin du côté gauche</label><br>
      <label><input type="radio" name="share" value="droite"> J’ai besoin du côté droit</label>
    `;
  }
});

// ================= STATE =================
let currentUser = null;
let ads = [];

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

  currentUser = data.user;

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

  await supabaseClient.from("profiles").upsert({
    id: currentUser.id,
    intent,
    side: document.getElementById("profileShoeSide").value
  });

  alert("Profil enregistré");
}

async function loadProfile() {
  const { data } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (data) {
    document.getElementById("userIntent").value = data.intent || "";
    document.getElementById("profileShoeSide").value = data.side || "";
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

    </div>
  `).join("");
}


// ================= ADD AD =================
async function addAd() {
  if (!currentUser) return alert("Connecte-toi");

  const file = document.getElementById("photoFile").files[0];
  let photoUrl = "";

  if (file) photoUrl = await uploadPhoto(file);

  const intent = document.getElementById("userIntent").value;

  const selectedOption =
    document.querySelector('input[name="matchSide"]:checked')?.value ||
    document.querySelector('input[name="exchange"]:checked')?.value ||
    document.querySelector('input[name="share"]:checked')?.value;

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
    option: selectedOption
  };

  const { error } = await supabaseClient
    .from("ads")
    .insert([ad]);

  if (error) return alert(error.message);

  showToast("💜 annonce publiée !");
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
  if (a.intent !== "match") return false;
  if (b.intent !== "match") return false;

  return (
    (a.option === "gauche" && b.option === "droite") ||
    (a.option === "droite" && b.option === "gauche")
  );
}

async function loadMatches() {
  const { data, error } = await supabaseClient
    .from("ads")
    .select("*");

  if (error) return console.error(error);

  const container = document.getElementById("ads");
  container.innerHTML = "";

  let matchFound = false;

  for (let i = 0; i < data.length; i++) {
    for (let j = i + 1; j < data.length; j++) {

      if (isMatch(data[i], data[j])) {
        matchFound = true;

        const div = document.createElement("div");
        div.className = "ad";

        div.innerHTML = `
          <h3>🔥 MATCH TROUVÉ</h3>
          <p>${data[i].title} ↔ ${data[j].title}</p>
          <button onclick="likeAd()">❤️</button>
          <button onclick="dislikeAd()">❌</button>
        `;

        container.appendChild(div);
      }
    }
  }

  if (!matchFound) {
    container.innerHTML = "<p>Aucun match pour le moment</p>";
  }
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