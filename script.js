console.log("🔥 UniShoe FULL READY");

// ================= SUPABASE =================
const supabaseClient = supabase.createClient(
  "https://laozayivkrlmfqkzxswd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhb3pheWl2a3JsbWZxa3p4c3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzU0NDgsImV4cCI6MjA5NDg1MTQ0OH0.raN9MS4BlWx16ve2K3mzG_vOCQ5hJGAUSPcHbABsQJ4"
);

// ================= STATE =================
let currentUser = null;
let ads = [];

// ================= GET USER =================
async function getUser() {
  const { data } = await supabaseClient.auth.getUser();
  currentUser = data?.user || null;
  updateAuthUI();
  loadAds();
}

getUser();

// ================= UI =================
function updateAuthUI() {
  const w = document.getElementById("welcome");

  if (!w) return;

  w.textContent = currentUser
    ? `Connecté : ${currentUser.email}`
    : "Non connecté";
}

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

  console.log("🔥 USER CONNECTÉ");
  console.log("ID =", currentUser.id);

  await loadProfile();

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

  alert("Compte créé ✔");
}

// ================= LOGOUT =================
async function logoutUser() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  updateAuthUI();
}

// ================= PROFILE =================
async function saveProfile() {
  if (!currentUser) return alert("Connecte-toi");

  const intent = document.getElementById("userIntent").value;
  const side = document.getElementById("profileShoeSide").value;

  await supabaseClient.from("profiles").upsert({
    id: currentUser.id,
    intent,
    side
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
    currentUser.role = data.role || "user";
  }
}

// ================= UPLOAD =================
async function uploadPhoto(file) {
  const fileName = Date.now() + "_" + file.name;

  const { data, error } = await supabaseClient.storage
    .from("shoes")
    .upload(fileName, file);

  if (error) return "";

  const { data: urlData } = supabaseClient.storage
    .from("shoes")
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

// ================= ADD AD =================
async function addAd() {
  if (!currentUser) return alert("Connecte-toi");

  const file = document.getElementById("photoFile").files[0];
  let photoUrl = "";

  if (file) photoUrl = await uploadPhoto(file);

  const ad = {
    title: document.getElementById("title").value,
    size: document.getElementById("size").value,
    condition: document.getElementById("condition")?.value,
    city: document.getElementById("city").value,
    side: document.getElementById("adShoeSide").value,
    description: document.getElementById("description").value,
    user_id: currentUser.id,
    user_name: currentUser.email,
    photo: photoUrl
  };

  const { data, error } = await supabaseClient
    .from("ads")
    .insert([ad]);

  console.log("DATA:", data);
  console.log("ERROR:", error);

  if (error) {
    alert(error.message);
    return;
  }

  showToast("💜 annonce publiée avec succès !");;
}

// ================= LOAD ADS =================
async function loadAds() {
  const { data } = await supabaseClient
    .from("ads")
    .select("*")
    .order("id", { ascending: false });

  ads = data || [];
  displayAds();
}

// ================= DISPLAY =================
function displayAds() {
  const container = document.getElementById("ads");

  container.innerHTML = ads.map(ad => `
    <div class="ad">

      <b>${ad.title}</b><br>

      📝 ${ad.description || "Pas de description"}<br><br>

      👟 ${ad.size} |
      📍 ${ad.city} |
      ${ad.side}<br>

      💎 État : ${ad.condition || "Non précisé"}<br><br>

      ${ad.photo ? `<img src="${ad.photo}" width="150">` : ""}

      <br><br>

      ${
  currentUser &&
  (currentUser.id === ad.user_id || currentUser.role === "admin")
    ? `<button onclick="deleteAd('${ad.id}', this.parentElement)">
        🗑️ Supprimer
      </button>`
    : ""
}

    </div>
  `).join("");
}

// ================= DELETE =================
async function deleteAd(id, element) {
  if (element) {
    element.style.transform = "scale(0.8)";
    element.style.opacity = "0";
  }

  setTimeout(async () => {
    const { error } = await supabaseClient
      .from("ads")
      .delete()
      .eq("id", id);

    if (error) {
      showToast("❌ erreur suppression");
      return;
    }

    showToast("🗑️ supprimé");
    loadAds();
  }, 200);
};


function showToast(message) {
  const toast = document.createElement("div");
  toast.textContent = message;

  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.background = "#6a0dad";
  toast.style.color = "white";
  toast.style.padding = "12px 18px";
  toast.style.borderRadius = "10px";
  toast.style.zIndex = "9999";
  toast.style.fontSize = "14px";

  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2000);
}