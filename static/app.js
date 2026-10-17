
const API = "";

const $ = (id) => document.getElementById(id);

let authMode = "login";
let token = localStorage.getItem("psai_token") || "";

function setMessage(id, text, type = "") {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.className = `message ${type}`;
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = data.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((item) => item.msg).join("، ")
          : "درخواست ناموفق بود.";
    throw new Error(message);
  }

  return data;
}

function showAuthenticatedUI(email = "") {
  $("auth-section").classList.add("hidden");
  $("app-section").classList.remove("hidden");
  $("logout-btn").classList.remove("hidden");
  $("user-email").textContent = email;
}

function showLoggedOutUI() {
  $("auth-section").classList.remove("hidden");
  $("app-section").classList.add("hidden");
  $("logout-btn").classList.add("hidden");
  $("user-email").textContent = "";
}

function setAuthMode(mode) {
  authMode = mode;

  $("login-tab").classList.toggle("active", mode === "login");
  $("register-tab").classList.toggle("active", mode === "register");
  $("auth-submit").textContent =
    mode === "login" ? "ورود" : "ساخت حساب کاربری";

  $("password").autocomplete =
    mode === "login" ? "current-password" : "new-password";

  setMessage("auth-message", "");
}

$("login-tab").addEventListener("click", () => setAuthMode("login"));
$("register-tab").addEventListener("click", () => setAuthMode("register"));

$("auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const button = $("auth-submit");
  button.disabled = true;
  button.textContent = "لطفاً صبر کن...";
  setMessage("auth-message", "");

  try {
    const email = $("email").value.trim().toLowerCase();
    const password = $("password").value;

    const data = await request(
      authMode === "login" ? "/login" : "/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }
    );

    if (authMode === "register") {
      setAuthMode("login");
      $("password").value = "";
      setMessage(
        "auth-message",
        "حساب ساخته شد؛ حالا وارد شو.",
        "success"
      );
      return;
    }

    if (!data.access_token) {
      throw new Error("توکن ورود از سرور دریافت نشد.");
    }

    token = data.access_token;
    localStorage.setItem("psai_token", token);

    showAuthenticatedUI(email);
    await loadHistory();
  } catch (error) {
    setMessage("auth-message", error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent =
      authMode === "login" ? "ورود" : "ساخت حساب کاربری";
  }
});

$("logout-btn").addEventListener("click", () => {
  token = "";
  localStorage.removeItem("psai_token");
  $("transcript").value = "";
  $("result-meta").classList.add("hidden");
  $("copy-btn").disabled = true;
  showLoggedOutUI();
  setMessage("auth-message", "از حساب خارج شدی.", "success");
});

$("audio-file").addEventListener("change", () => {
  const file = $("audio-file").files[0];
  $("file-label").textContent = file
    ? file.name
    : "برای انتخاب فایل کلیک کن";
  setMessage("upload-message", "");
});

$("upload-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const file = $("audio-file").files[0];
  if (!file) {
    setMessage("upload-message", "اول یک فایل انتخاب کن.", "error");
    return;
  }

  if (file.size > 25 * 1024 * 1024) {
    setMessage("upload-message", "حجم فایل نباید بیشتر از ۲۵ مگابایت باشد.", "error");
    return;
  }

  const button = $("transcribe-btn");
  button.disabled = true;
  button.textContent = "در حال پردازش فایل...";
  setMessage("upload-message", "ممکن است پردازش کمی طول بکشد.");

  try {
    const formData = new FormData();
    formData.append("file", file);

    const data = await request("/transcribe", {
      method: "POST",
      body: formData,
    });

    $("transcript").value = data.text || "";
    $("copy-btn").disabled = !data.text;

    $("result-meta").textContent =
      `فایل: ${data.filename || file.name} · زبان تشخیص‌داده‌شده: ${data.language || "نامشخص"}`;

    $("result-meta").classList.remove("hidden");

    setMessage("upload-message", "تبدیل با موفقیت انجام شد.", "success");
    await loadHistory();
  } catch (error) {
    setMessage("upload-message", error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "تبدیل به متن";
  }
});

$("copy-btn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("transcript").value);
    setMessage("global-message", "متن کپی شد.", "success");
  } catch {
    setMessage("global-message", "کپی خودکار انجام نشد؛ متن را دستی انتخاب کن.", "error");
  }
});

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("fa-IR");
}

function renderHistory(items) {
  const list = $("history-list");
  list.replaceChildren();

  if (!Array.isArray(items) || items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "هنوز تبدیلی ثبت نشده است.";
    list.appendChild(empty);
    return;
  }

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "history-item";

    const info = document.createElement("div");

    const name = document.createElement("div");
    name.className = "history-name";
    name.textContent = item.filename || "فایل بدون نام";

    const detail = document.createElement("div");
    detail.className = "history-detail";
    detail.textContent =
      `${item.language || "زبان نامشخص"} · ${formatDate(item.created_at)}`;

    info.append(name, detail);

    const openButton = document.createElement("button");
    openButton.className = "button secondary history-open";
    openButton.textContent = "مشاهده متن";

    openButton.addEventListener("click", () => {
      $("transcript").value = item.text || "";
      $("copy-btn").disabled = !item.text;
      $("result-meta").textContent =
        `فایل: ${item.filename || ""} · زبان: ${item.language || "نامشخص"}`;
      $("result-meta").classList.remove("hidden");
      $("transcript").scrollIntoView({ behavior: "smooth", block: "center" });
    });

    row.append(info, openButton);
    list.appendChild(row);
  }
}

async function loadHistory() {
  try {
    const data = await request("/history");
    renderHistory(Array.isArray(data) ? data : data.items || []);
  } catch (error) {
    setMessage("global-message", `دریافت تاریخچه ناموفق بود: ${error.message}`, "error");
  }
}

$("refresh-history").addEventListener("click", loadHistory);

async function initialize() {
  if (!token) {
    showLoggedOutUI();
    return;
  }

  try {
    const user = await request("/me");
    showAuthenticatedUI(user.email || "");
    await loadHistory();
  } catch {
    token = "";
    localStorage.removeItem("psai_token");
    showLoggedOutUI();
  }
}

initialize();
