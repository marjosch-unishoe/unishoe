console.log("🔥 UniShoe STABLE FULL VERSION");

// ================= SUPABASE =================
const supabaseClient = supabase.createClient(
  "https://laozayivkrlmfqkzxswd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhb3pheWl2a3JsbWZxa3p4c3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzU0NDgsImV4cCI6MjA5NDg1MTQ0OH0.raN9MS4BlWx16ve2K3mzG_vOCQ5hJGAUSPcHbABsQJ4"
);

let currentUser = null;
let ads = [];
let allAdsCache = [];
let currentChatUser = null;
let editingAdId = null;

// ================= INIT =================
getUser();

async function getUser() {
  const { data } = await supabaseClient.auth.getUser();
  currentUser = data?.user || null;

  updateAuthUI();
  await loadAds();
  await loadStats();
}

function updateAuthUI() {
  const welcome = document.getElementById("welcome");
  if (!welcome) return;

  welcome.textContent = currentUser
    ? `Connecté : ${currentUser.email}`
    : "Non connecté";
}

// ================= AUTH =================
async function loginUser() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) return alert(error.message);

  currentUser = data.user;
  updateAuthUI();
  await loadAds();

  showToast("✅ Connecté");
}

async function registerUser() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } =
    await supabaseClient.auth.signUp({ email, password });

  if (error) return alert(error.message);

  alert("Compte créé ✔");
}

async function logoutUser() {
  await supabaseClient.auth.signOut();

  currentUser = null;
  ads = [];
  allAdsCache = [];

  document.getElementById("ads").innerHTML = "";
  document.getElementById("matchContainer").innerHTML = "";

  updateAuthUI();
  showToast("👋 Déconnecté");
}

// ================= ADS =================
async function loadAds() {
  const { data, error } = await supabaseClient
    .from("ads")
    .select("*")
    .order("id", { ascending: false });

  if (error) return console.error(error);

  ads = data || [];
  allAdsCache = [...ads];

  renderAds();
  loadMatches();
}

function renderAds(list = ads) {
  const container = document.getElementById("ads");

  container.innerHTML = list.map(ad => {

    const isOwner =
      currentUser && currentUser.id === ad.user_id;

    return `
      <div class="ad">

        <b>${ad.title || ""}</b><br>
        📌 ${ad.type || ""}<br>
        👟 ${ad.size || ""}<br>
        👣 ${ad.side || ""}<br>
        📍 ${ad.city || ""}<br>
        🧼 ${ad.condition || ""}<br>
        📝 ${ad.description || ""}<br>

        ${ad.photo ? `<img src="${ad.photo}" width="140">` : ""}

        <br><br>

        <button onclick="likeAd('${ad.id}')">❤️ Like</button>
        <button onclick="reportAd('${ad.id}')">🚩 Signaler</button>

        ${
          isOwner
            ? `
              <button onclick="editAd(${ad.id})">✏️ Modifier</button>
              <button onclick="deleteAd(${ad.id})">🗑 Supprimer</button>
            `
            : `
              <button onclick="openChat('${ad.user_id}')">💬 Chat</button>
            `
        }

      </div>
    `;
  }).join("");
}

// ================= ADD =================
async function addAd() {
  if (!currentUser) return alert("Connecte-toi");

  const ad = {
    title: document.getElementById("title").value,
    size: document.getElementById("size").value,
    city: document.getElementById("city").value,
    description: document.getElementById("description").value,
    side: document.getElementById("adShoeSide").value,
    condition: document.getElementById("condition").value,
    type: document.getElementById("adType").value,
    user_id: currentUser.id,
    user_name: currentUser.email
  };

  const file = document.getElementById("photoFile").files[0];
  if (file) ad.photo = await uploadPhoto(file);

  const query = supabaseClient.from("ads");

  if (editingAdId) {
    const { error } = await query.update(ad).eq("id", editingAdId);
    if (error) return alert(error.message);
  } else {
    const { error } = await query.insert([ad]);
    if (error) return alert(error.message);
  }

  resetForm();
  await loadAds();
  showToast("💜 Sauvegardé");
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

  editingAdId = id;
  showToast("✏️ Édition activée");
}

// ================= DELETE =================
async function deleteAd(id) {
  if (!confirm("Supprimer ?")) return;

  await supabaseClient.from("ads").delete().eq("id", id);
  await loadAds();
}

// ================= MATCH =================
async function loadMatches() {
  if (!currentUser) return;

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (!profile) return;

  const container = document.getElementById("matchContainer");

  let html = "";

  ads.forEach(ad => {
    if (ad.user_id === currentUser.id) return;

    const opposite =
      (profile.side === "gauche" && ad.side === "droite") ||
      (profile.side === "droite" && ad.side === "gauche");

    const sameSize =
      Math.abs(Number(profile.size ?? 0) - Number(ad.size)) <= 1;

    if (opposite && sameSize) {
      html += `
        <div class="ad">
          <h3>💜 Match</h3>
          <b>${ad.title}</b><br>
          👟 ${ad.size}<br>
          👣 ${ad.side}<br>

          <button onclick="openChat('${ad.user_id}')">💬 Chat</button>
        </div>
      `;
    }
  });

  container.innerHTML = html || "<p>Aucun match</p>";
}

// ================= CHAT =================
async function openChat(userId) {
  currentChatUser = userId;
  loadMessages();
}

async function sendMessage() {
  const text = document.getElementById("chatMessage").value;
  if (!text || !currentChatUser) return;

  await supabaseClient.from("messages").insert([{
    sender_id: currentUser.id,
    receiver_id: currentChatUser,
    message: text
  }]);

  document.getElementById("chatMessage").value = "";
  loadMessages();
}

async function loadMatches() {
  if (!currentUser) return;

  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (error || !profile) return;

  const container = document.getElementById("matchContainer");
  let html = "";

  ads.forEach(ad => {
    if (ad.user_id === currentUser.id) return;

    // 🧠 sécurité anti-null
    const profileSide = profile.side || "";
    const adSide = ad.side || "";

    const profileSize = Number(profile.size || 0);
    const adSize = Number(ad.size || 0);

    const opposite =
      (profileSide === "gauche" && adSide === "droite") ||
      (profileSide === "droite" && adSide === "gauche");

    const sameSize =
      Math.abs(profileSize - adSize) <= 1;

    if (opposite && sameSize) {

      html += `
        <div class="ad">
          <h3>💜 Match</h3>

          <b>${ad.title || ""}</b><br>
          👟 Taille : ${ad.size || ""}<br>
          👣 Côté : ${ad.side || ""}<br>
          📍 Ville : ${ad.city || ""}<br>

          <button onclick="openChat('${ad.user_id}')">💬 Chat</button>
        </div>
      `;

      // 🔔 notification match
      showToast("💜 Nouveau match trouvé !");
    }
  });

  container.innerHTML = html || "<p>Aucun match 💔</p>";
}

// ================= SOCIAL =================
async function likeAd(id) {
  await supabaseClient.from("likes").insert([{ ad_id: id, user_id: currentUser.id }]);
  showToast("❤️ Like");
}

async function reportAd(id) {
  await supabaseClient.from("reports").insert([{ ad_id: id, user_id: currentUser.id }]);
  showToast("🚩 Signalé");
}

// ================= STATS =================
async function loadStats() {
  const { count } = await supabaseClient
    .from("ads")
    .select("*", { count: "exact", head: true });

  const el = document.getElementById("totalAds");
  if (el) el.textContent = count || 0;
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

// ================= UI =================
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
supabaseClient
  .channel('messages-realtime')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages'
    },
    (payload) => {
      const m = payload.new;

      if (!currentChatUser) return;

      // 🔥 IMPORTANT : on filtre seulement le chat actif
      const isRelevant =
        (m.sender_id === currentUser.id && m.receiver_id === currentChatUser) ||
        (m.sender_id === currentChatUser && m.receiver_id === currentUser.id);

      if (!isRelevant) return;

      const box = document.getElementById("chatBox");

      const isMine = m.sender_id === currentUser.id;

      box.innerHTML += `
        <div style="text-align:${isMine ? "right" : "left"}">
          <span style="display:inline-block;padding:8px;border-radius:10px;background:${isMine ? "#6a0dad" : "#ddd"};color:${isMine ? "white" : "black"}">
            ${m.message}
          </span>
        </div>
      `;

      box.scrollTop = box.scrollHeight;
    }
  )
  .subscribe();