console.log("🔥 UniShoe STABLE FULL VERSION");

// ================= SUPABASE =================
const supabaseClient = supabase.createClient(
  "https://laozayivkrlmfqkzxswd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhb3pheWl2a3JsbWZxa3p4c3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzU0NDgsImV4cCI6MjA5NDg1MTQ0OH0.raN9MS4BlWx16ve2K3mzG_vOCQ5hJGAUSPcHbABsQJ4"
);

// ================= STATE =================
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

        ${ad.photo
  ? `<img class="ad-img" src="${ad.photo}" alt="photo">`
  : ""
}

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
  const btn =
  document.getElementById("cancelBtn");

if (btn)
  btn.style.display = "block"; showToast("✏️ Édition activée");
}

// ================= DELETE =================
async function deleteAd(id) {
  if (!confirm("Supprimer ?")) return;

  await supabaseClient.from("ads").delete().eq("id", id);
  await loadAds();
}

// ================= RESET =================
function resetForm() {
  editingAdId = null;

  document.getElementById("title").value = "";
  document.getElementById("size").value = "";
  document.getElementById("city").value = "";
  document.getElementById("description").value = "";
  document.getElementById("adShoeSide").value = "";
  document.getElementById("condition").value = "";
  document.getElementById("adType").value = "";
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
          👟 ${ad.size || ""}<br>
          👣 ${ad.side || ""}<br>
          📍 ${ad.city || ""}<br>

          <button onclick="openChat('${ad.user_id}')">💬 Chat</button>
        </div>
      `;

      showToast("💜 Nouveau match !");
    }
  });

  container.innerHTML = html || "<p>Aucun match 💔</p>";
}

// ================= CHAT =================
async function openChat(userId) {
  currentChatUser = userId;
  loadMessages();
}

async function sendMessage() {

  if (!currentUser)
    return alert("Connecte-toi");

  const text =
    document.getElementById("chatMessage").value;

  if (!text || !currentChatUser)
    return ;

  await supabaseClient.from("messages").insert([{
    sender_id: currentUser.id,
    receiver_id: currentChatUser,
    message: text
  }]);

  document.getElementById("chatMessage").value = "";
  loadMessages();
}

async function loadMessages() {
  if (!currentChatUser) return;

  const { data } = await supabaseClient
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${currentUser.id},receiver_id.eq.${currentChatUser}),and(sender_id.eq.${currentChatUser},receiver_id.eq.${currentUser.id})`
    )
    .order("id");

  const box = document.getElementById("chatBox");

  box.innerHTML = (data || []).map(m => `
    <div style="text-align:${m.sender_id === currentUser.id ? "right" : "left"}">
      <span style="display:inline-block;padding:8px;border-radius:10px;background:${m.sender_id === currentUser.id ? "#6a0dad" : "#ddd"};color:${m.sender_id === currentUser.id ? "white" : "black"}">
        ${m.message}
      </span>
    </div>
  `).join("");

  box.scrollTop = box.scrollHeight;
}

// ================= SOCIAL =================
async function likeAd(id) {

  if (!currentUser)
    return alert("Connecte-toi");

  await supabaseClient
    .from("likes")
    .insert([
      {
        ad_id: id,
        user_id: currentUser.id
      }
    ]);

  showToast("❤️ Like");
} ;


async function reportAd(id) {

  if (!currentUser)
    return alert("Connecte-toi");

  await supabaseClient
    .from("reports")
    .insert([
      {
        ad_id: id,
        user_id: currentUser.id
      }
    ]);

  showToast("🚩 Signalé");
};


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

// ================= REALTIME ADS (BONUS PROPRE) =================
if (!window.adsRealtimeInitialized) {
  window.adsRealtimeInitialized = true;

  supabaseClient
    .channel('ads-realtime')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ads'
      },
      (payload) => {
        const newAd = payload.new;

        ads.unshift(newAd);
        allAdsCache.unshift(newAd);

        renderAds();
        loadMatches();
      }
    )
    .subscribe();
} // ================= PROFILE =================
async function saveProfile() {

  if (!currentUser)
    return alert("Connecte-toi");

  const profile = {
    id: currentUser.id,
    email: currentUser.email,
    display_name:
      document.getElementById("displayName").value || "",
    intent:
      document.getElementById("userIntent").value || "",
    size:
      Number(document.getElementById("searchSize").value || 0)
  };

  const { error } = await supabaseClient
    .from("profiles")
    .upsert(profile);

  if (error)
    return alert(error.message);

  document.getElementById("profileStatus").textContent =
    "✅ Profil enregistré";

  showToast("💜 Profil sauvegardé");

  loadMatches();
} // ================= FILTERS =================
function applyFilters() {

  const text =
    document.getElementById("filterText").value
      .toLowerCase()
      .trim();

  const size =
    document.getElementById("filterSize").value;

  const side =
    document.getElementById("filterSide").value;

  const type =
    document.getElementById("filterType").value;

  const filtered = allAdsCache.filter(ad => {

    const matchText =
      !text ||
      (ad.title || "")
        .toLowerCase()
        .includes(text);

    const matchSize =
      !size ||
      String(ad.size) === String(size);

    const matchSide =
      !side ||
      ad.side === side;

    const matchType =
      !type ||
      ad.type === type;

    return (
      matchText &&
      matchSize &&
      matchSide &&
      matchType
    );

  });

  renderAds(filtered);
} function resetFilters() {

  document.getElementById("filterText").value = "";
  document.getElementById("filterSize").value = "";
  document.getElementById("filterSide").value = "";
  document.getElementById("filterType").value = "";

  renderAds(allAdsCache);

  showToast("🔄 Filtres réinitialisés");
} function cancelEdit() {

  resetForm();

  const btn =
    document.getElementById("cancelBtn");

  if (btn)
    btn.style.display = "none";

  showToast("❌ Édition annulée");
}const btn =
  document.getElementById("cancelBtn");

if (btn)
  btn.style.display = "none";