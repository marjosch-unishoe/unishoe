console.log("🔥 UniShoe FULL READY");

// ================= SUPABASE =================
const supabaseClient = supabase.createClient(
  "https://laozayivkrlmfqkzxswd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhb3pheWl2a3JsbWZxa3p4c3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzU0NDgsImV4cCI6MjA5NDg1MTQ0OH0.raN9MS4BlWx16ve2K3mzG_vOCQ5hJGAUSPcHbABsQJ4"
);

// ================= STATE =================
let currentUser = null;
let ads = [];
let currentChatUser = null;
window.editingAdId = null;

// ================= USER INTENT UI =================
document.getElementById("userIntent").addEventListener("change", function () {

  const container = document.getElementById("matchOptions");
  const value = this.value;

  container.innerHTML = "";

  if (value === "match") {
    container.innerHTML = `
      <label>
        <input type="radio" name="matchSide" value="gauche">
        Je cherche une chaussure gauche
      </label><br>

      <label>
        <input type="radio" name="matchSide" value="droite">
        Je cherche une chaussure droite
      </label>
    `;
  }

  if (value === "exchange") {
    container.innerHTML = `
      <label>
        <input type="radio" name="exchange" value="right_to_left">
        J’ai une chaussure droite à échanger contre une gauche
      </label><br>

      <label>
        <input type="radio" name="exchange" value="left_to_right">
        J’ai une chaussure gauche à échanger contre une droite
      </label>
    `;
  }

  if (value === "share") {
    container.innerHTML = `
      <label>
        <input type="radio" name="share" value="gauche">
        J’ai besoin du côté gauche
      </label><br>

      <label>
        <input type="radio" name="share" value="droite">
        J’ai besoin du côté droit
      </label>
    `;
  }
});

// ================= AUTH =================
async function getUser() {

  const { data } =
    await supabaseClient.auth.getUser();

  currentUser = data?.user || null;

  updateAuthUI();

  await loadAds();
}

getUser();

function updateAuthUI() {

  const welcome =
    document.getElementById("welcome");

  if (!welcome) return;

  welcome.textContent = currentUser
    ? `Connecté : ${currentUser.email}`
    : "Non connecté";
}

async function loginUser() {

  const email =
    document.getElementById("email").value;

  const password =
    document.getElementById("password").value;

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    alert(error.message);
    return;
  }

  currentUser = data.user;

  updateAuthUI();
  await loadAds();

  showToast("✅ Connecté");
}

async function registerUser() {

  const email =
    document.getElementById("email").value;

  const password =
    document.getElementById("password").value;

  const { error } =
    await supabaseClient.auth.signUp({
      email,
      password
    });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Compte créé ✔");
}

async function logoutUser() {

  await supabaseClient.auth.signOut();

  currentUser = null;

  updateAuthUI();
  loadAds();

  showToast("👋 Déconnecté");
}

// ================= PROFILE =================
async function saveProfile() {

  if (!currentUser)
    return alert("Connecte-toi");

  const intent =
    document.getElementById("userIntent").value;

  const selectedSide =
    document.querySelector('input[name="matchSide"]:checked')?.value ||
    document.querySelector('input[name="exchange"]:checked')?.value ||
    document.querySelector('input[name="share"]:checked')?.value;

  const searchSize =
    document.getElementById("searchSize").value;

  const { error } =
    await supabaseClient
      .from("profiles")
      .upsert({
        id: currentUser.id,
        intent,
        side: selectedSide,
        size: searchSize
      });

  if (error) {
    alert(error.message);
    return;
  }

  document.getElementById("profileStatus")
    .textContent = "✅ Profil enregistré";

  loadMatches();
}

// ================= LOAD ADS =================
async function loadAds() {

  const { data, error } =
    await supabaseClient
      .from("ads")
      .select("*")
      .order("id", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  ads = data || [];

  displayAds();
  loadMatches();
}

// ================= DISPLAY ADS =================
function displayAds() {

  const container =
    document.getElementById("ads");

  container.innerHTML = ads.map(ad => {

    const isOwner =
      currentUser &&
      currentUser.id === ad.user_id;

    const typeLabel =
      ad.type === "offer"
        ? "👟 Chaussure proposée"
        : ad.type === "exchange"
        ? "🔁 Échange proposé"
        : ad.type === "share"
        ? "🤝 Achat partagé"
        : "❓ Non précisé";

    return `
      <div class="ad">

        <b>${ad.title || ""}</b><br>

        📌 ${typeLabel}<br>

        📝 ${ad.description || ""}<br>

        📍 ${ad.city || ""}<br>

        👟 Pointure : ${ad.size || ""}<br>

        👣 ${ad.side || "Non précisé"}<br>

        🧼 ${ad.condition || "Non précisé"}<br>

        ${
          ad.photo
            ? `<img src="${ad.photo}" width="150" style="border-radius:10px;margin-top:10px;">`
            : ""
        }

        <br><br>

        <button onclick="likeAd()">❤️ Intéressant</button>
        <button onclick="dislikeAd()">❌ Pas intéressé</button>

        ${
          isOwner
            ? `
              <button onclick="editAd(${ad.id})">✏️ Modifier</button>
              <button onclick="deleteAd(${ad.id})">🗑 Supprimer</button>
            `
            : `
              <button onclick="openChat('${ad.user_id}')">💬 Contacter</button>
            `
        }

      </div>
    `;
  }).join("");
}

// ================= ADD / UPDATE AD =================
async function addAd() {

  if (!currentUser)
    return alert("Connecte-toi");

  const title =
    document.getElementById("title").value.trim();

  const size =
    document.getElementById("size").value.trim();

  const city =
    document.getElementById("city").value.trim();

  const description =
    document.getElementById("description").value.trim();

  const side =
    document.getElementById("adShoeSide").value;

  const condition =
    document.getElementById("condition").value;

  const type =
    document.getElementById("adType").value;

  if (!title || !size || !side)
    return alert("Champs obligatoires manquants");

  const file =
    document.getElementById("photoFile").files[0];

  let photoUrl = "";

  if (window.editingAdId) {
    const oldAd = ads.find(a => a.id === window.editingAdId);
    photoUrl = oldAd?.photo || "";
  }

  if (file) {
    photoUrl = await uploadPhoto(file);
  }

  const ad = {
    title,
    size,
    city,
    description,
    side,
    condition,
    type,
    photo: photoUrl,
    user_id: currentUser.id,
    user_name: currentUser.email
  };

  let error;

  if (window.editingAdId !== null) {

    ({ error } =
      await supabaseClient
        .from("ads")
        .update(ad)
        .eq("id", window.editingAdId));

  } else {

    ({ error } =
      await supabaseClient
        .from("ads")
        .insert([ad]));
  }

  if (error) {
    alert(error.message);
    return;
  }

  resetForm();
  showToast("💜 Sauvegardé");
  await loadAds();
}

// ================= EDIT =================
function editAd(id) {

  const ad = ads.find(a => a.id === id);
  if (!ad) return;

  document.getElementById("title").value = ad.title || "";
  document.getElementById("size").value = ad.size || "";
  document.getElementById("city").value = ad.city || "";
  document.getElementById("description").value = ad.description || "";
  document.getElementById("adShoeSide").value = ad.side || "";
  document.getElementById("condition").value = ad.condition || "";
  document.getElementById("adType").value = ad.type || "";

  window.editingAdId = id;

  showToast("✏️ Mode édition");
}

// ================= DELETE =================
async function deleteAd(id) {

  const ok = confirm("Supprimer ?");
  if (!ok) return;

  await supabaseClient.from("ads").delete().eq("id", id);

  await loadAds();
}

// ================= RESET =================
function resetForm() {

  window.editingAdId = null;

  document.getElementById("title").value = "";
  document.getElementById("size").value = "";
  document.getElementById("city").value = "";
  document.getElementById("description").value = "";
  document.getElementById("adShoeSide").value = "";
  document.getElementById("condition").value = "";
  document.getElementById("adType").value = "";
}

// ================= MATCH SYSTEM =================
async function loadMatches() {

  const container =
    document.getElementById("matchContainer");

  if (!currentUser) return;

  const { data: profile } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single();

  if (!profile) return;

  let html = "";

  ads.forEach(ad => {

    if (ad.user_id === currentUser.id) return;

    const opposite =
      (profile.side === "gauche" && ad.side === "droite") ||
      (profile.side === "droite" && ad.side === "gauche");

    const sameSize =
      Math.abs(Number(profile.size) - Number(ad.size)) <= 1;

    if (opposite && sameSize) {

      html += `
        <div class="ad">

          <h3>💜 Match</h3>

          <b>${ad.title}</b><br>
          📌 ${ad.type}<br>
          👟 ${ad.size}<br>
          👣 ${ad.side}<br>

          <button onclick="openChat('${ad.user_id}')">💬 Chat</button>

        </div>
      `;
    }
  });

  container.innerHTML = html || "<p>Aucun match 💜</p>";
}

// ================= CHAT =================
async function openChat(userId) {

  currentChatUser = userId;

  loadMessages();
}

async function sendMessage() {

  const input = document.getElementById("chatMessage");
  const text = input.value.trim();
  if (!text || !currentChatUser) return;

  await supabaseClient.from("messages").insert([{
    sender_id: currentUser.id,
    receiver_id: currentChatUser,
    message: text
  }]);

  input.value = "";
  loadMessages();
}

async function loadMessages() {

  const { data } = await supabaseClient
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${currentUser.id},receiver_id.eq.${currentChatUser}),and(sender_id.eq.${currentChatUser},receiver_id.eq.${currentUser.id})`
    )
    .order("id");

  const box = document.getElementById("chatBox");
  if (!box) return;

  box.innerHTML = (data || []).map(m => `
    <div style="text-align:${m.sender_id === currentUser.id ? "right" : "left"}">
      <span style="display:inline-block;padding:8px;border-radius:10px;background:${m.sender_id === currentUser.id ? "#6a0dad" : "#ddd"};color:${m.sender_id === currentUser.id ? "white" : "black"}">
        ${m.message}
      </span>
    </div>
  `).join("");

  box.scrollTop = box.scrollHeight;
}

// ================= UI =================
function likeAd() { showToast("❤️ Intéressant"); }
function dislikeAd() { showToast("❌ Pas intéressé"); }

function showToast(msg) {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.position = "fixed";
  t.style.bottom = "20px";
  t.style.left = "50%";
  t.style.transform = "translateX(-50%)";
  t.style.background = "#6a0dad";
  t.style.color = "white";
  t.style.padding = "10px 16px";
  t.style.borderRadius = "12px";
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

// ================= STORAGE =================
async function uploadPhoto(file) {

  const name = Date.now() + "_" + file.name;

  const { data, error } = await supabaseClient.storage
    .from("shoes")
    .upload(name, file);

  if (error) return "";

  const { data: url } = supabaseClient.storage
    .from("shoes")
    .getPublicUrl(data.path);

  return url.publicUrl;
}