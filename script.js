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

    return `
      <div class="ad">

        <b>${ad.title || ""}</b><br>

        📝 ${ad.description || ""}<br>

        📍 ${ad.city || ""}<br>

        👟 Pointure : ${ad.size || ""}<br>

        👣 ${ad.side || "Non précisé"}<br>

        🧼 ${ad.condition || "Non précisé"}<br>

        ${
          ad.photo
            ? `
              <img
                src="${ad.photo}"
                width="150"
                style="border-radius:10px;margin-top:10px;"
              >
            `
            : ""
        }

        <br><br>

        <button onclick="likeAd()">
          ❤️ Intéressant
        </button>

        <button onclick="dislikeAd()">
          ❌ Pas intéressé
        </button>

        ${
          isOwner
            ? `
              <button onclick="editAd(${ad.id})">
                ✏️ Modifier
              </button>

              <button onclick="deleteAd(${ad.id})">
                🗑 Supprimer
              </button>
            `
            : `
              <button onclick="openChat('${ad.user_id}')">
                💬 Contacter
              </button>
            `
        }

      </div>
    `;
  }).join("");
}

// ================= ADD / UPDATE AD =================
async function addAd() {

  if (!currentUser) {
    alert("Connecte-toi");
    return;
  }

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

  const intent =
    document.getElementById("userIntent").value;

  if (!title) {
    alert("Ajoute un titre");
    return;
  }

  if (!size) {
    alert("Ajoute une pointure");
    return;
  }

  if (!side) {
    alert("Choisis gauche ou droite");
    return;
  }

  const file =
    document.getElementById("photoFile").files[0];

  let photoUrl = "";

  if (window.editingAdId) {

    const oldAd =
      ads.find(a => a.id === window.editingAdId);

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
    intent,

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
    console.error(error);
    alert(error.message);
    return;
  }

  resetForm();

  showToast("💜 Sauvegardé");

  await loadAds();
}

// ================= EDIT =================
function editAd(id) {

  const ad =
    ads.find(a => a.id === id);

  if (!ad) return;

  document.getElementById("title").value =
    ad.title || "";

  document.getElementById("size").value =
    ad.size || "";

  document.getElementById("city").value =
    ad.city || "";

  document.getElementById("description").value =
    ad.description || "";

  document.getElementById("adShoeSide").value =
    ad.side || "";

  document.getElementById("condition").value =
    ad.condition || "";

  document.getElementById("userIntent").value =
    ad.intent || "";

  window.editingAdId = id;

  document.querySelector("button[onclick='addAd()']")
    .textContent = "💾 Mettre à jour";

  const cancelBtn =
    document.getElementById("cancelBtn");

  if (cancelBtn) {
    cancelBtn.style.display = "inline-block";
  }

  showToast("✏️ Mode édition");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

// ================= DELETE =================
async function deleteAd(id) {

  const confirmDelete =
    confirm("Supprimer cette annonce ?");

  if (!confirmDelete) return;

  const { error } =
    await supabaseClient
      .from("ads")
      .delete()
      .eq("id", id);

  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }

  showToast("🗑 Annonce supprimée");

  await loadAds();
}

// ================= CANCEL EDIT =================
function cancelEdit() {
  resetForm();
}

// ================= RESET FORM =================
function resetForm() {

  window.editingAdId = null;

  document.getElementById("title").value = "";
  document.getElementById("size").value = "";
  document.getElementById("city").value = "";
  document.getElementById("description").value = "";
  document.getElementById("adShoeSide").value = "";
  document.getElementById("condition").value = "";
  document.getElementById("photoFile").value = "";

  document.querySelector("button[onclick='addAd()']")
    .textContent = "📢 Publier";

  const cancelBtn =
    document.getElementById("cancelBtn");

  if (cancelBtn) {
    cancelBtn.style.display = "none";
  }
}

// ================= MATCH SYSTEM =================
async function loadMatches() {

  const container =
    document.getElementById("matchContainer");

  if (!container) return;

  if (!currentUser) {
    container.innerHTML = "";
    return;
  }

  const { data: profile } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single();

  if (!profile) {
    container.innerHTML =
      "<p>Aucun match pour le moment 💜</p>";
    return;
  }

  let matchesHTML = "";

  ads.forEach(ad => {

    if (ad.user_id === currentUser.id)
      return;

    const oppositeSide =

      (profile.side === "gauche" && ad.side === "droite") ||

      (profile.side === "droite" && ad.side === "gauche");

    const sameSize =
      Math.abs(Number(profile.size) - Number(ad.size)) <= 1;

    if (oppositeSide && sameSize) {

      matchesHTML += `
        <div class="ad">

          <h3>💜 Match trouvé !</h3>

          <b>${ad.title}</b><br>

          👟 ${ad.size}<br>

          📍 ${ad.city || ""}<br>

          👣 ${ad.side}<br>

          ${
            ad.photo
              ? `
                <img
                  src="${ad.photo}"
                  width="150"
                  style="border-radius:10px;margin-top:10px;"
                >
              `
              : ""
          }

          <br><br>

          <button onclick="openChat('${ad.user_id}')">
            💬 Contacter
          </button>

        </div>
      `;
    }
  });

  if (matchesHTML) {

    container.innerHTML = matchesHTML;

  } else {

    container.innerHTML =
      "<p>Aucun match pour le moment 💜</p>";
  }
}

// ================= CHAT =================
async function openChat(userId) {

  if (!currentUser) {
    alert("Connecte-toi");
    return;
  }

  currentChatUser = userId;

  loadMessages();

  showToast("💬 Chat ouvert");
}

async function sendMessage() {

  if (!currentUser || !currentChatUser)
    return;

  const input =
    document.getElementById("chatMessage");

  const text =
    input.value.trim();

  if (!text) return;

  const { error } =
    await supabaseClient
      .from("messages")
      .insert([{
        sender_id: currentUser.id,
        receiver_id: currentChatUser,
        message: text
      }]);

  if (error) {
    console.error(error);
    return;
  }

  input.value = "";

  loadMessages();
}

async function loadMessages() {

  if (!currentUser || !currentChatUser)
    return;

  const { data, error } =
    await supabaseClient
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUser.id},receiver_id.eq.${currentChatUser}),and(sender_id.eq.${currentChatUser},receiver_id.eq.${currentUser.id})`
      )
      .order("id");

  if (error) {
    console.error(error);
    return;
  }

  const chatBox =
    document.getElementById("chatBox");

  if (!chatBox) return;

  chatBox.innerHTML = data.map(msg => {

    const mine =
      msg.sender_id === currentUser.id;

    return `
      <div style="
        margin:10px 0;
        text-align:${mine ? "right" : "left"};
      ">

        <span style="
          display:inline-block;
          background:${mine ? "#6a0dad" : "#ddd"};
          color:${mine ? "white" : "black"};
          padding:10px;
          border-radius:12px;
          max-width:70%;
        ">
          ${msg.message}
        </span>

      </div>
    `;
  }).join("");

  chatBox.scrollTop =
    chatBox.scrollHeight;
}

// ================= LIKE / DISLIKE =================
function likeAd() {
  showToast("❤️ Intéressant !");
}

function dislikeAd() {
  showToast("❌ Pas intéressé !");
}

// ================= PHOTO UPLOAD =================
async function uploadPhoto(file) {

  const fileName =
    Date.now() + "_" + file.name;

  const { data, error } =
    await supabaseClient.storage
      .from("shoes")
      .upload(fileName, file);

  if (error) {
    console.error(error);
    return "";
  }

  const { data: url } =
    supabaseClient.storage
      .from("shoes")
      .getPublicUrl(data.path);

  return url.publicUrl;
}

// ================= TOAST =================
function showToast(message) {

  const toast =
    document.createElement("div");

  toast.textContent = message;

  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.background = "#6a0dad";
  toast.style.color = "white";
  toast.style.padding = "12px 18px";
  toast.style.borderRadius = "12px";
  toast.style.zIndex = "9999";
  toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2000);
}