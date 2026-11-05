const signinScreen = document.querySelector("#signin-screen");
const signinForm = document.querySelector("#signin-form");
const signinEmail = document.querySelector("#signin-email");
const signinPassword = document.querySelector("#signin-password");
const signinSubmit = document.querySelector("#signin-submit");
const signinError = document.querySelector("#signin-error");
const navigation = document.querySelector("#portal-navigation");
const dashboardScreen = document.querySelector("#dashboard-screen");
const notFoundScreen = document.querySelector("#not-found-screen");
const serviceErrorScreen = document.querySelector("#service-error-screen");
const rateLimitScreen = document.querySelector("#rate-limit-screen");
const returnLink = document.querySelector("#return-to-application");
const retryLink = document.querySelector("#retry-application");
const rateLimitReturn = document.querySelector("#rate-limit-return");
let currentAccount = null;
let rotationTimer = null;

function clearRotationTimer() {
  if (rotationTimer !== null) window.clearTimeout(rotationTimer);
  rotationTimer = null;
}

function clearVisibleProfile() {
  for (const id of [
    "header-account-name", "welcome-name", "account-name", "profile-name", "profile-email",
    "profile-program", "application-id", "application-status", "application-program",
    "application-term", "application-note", "rate-limit-status",
  ]) {
    const element = document.getElementById(id);
    if (element) element.textContent = "";
  }
}

function setAccountNavigation(account) {
  document.querySelector("#header-account-name").textContent = account.name;
  document.querySelector("#header-avatar").textContent = account.name.trim().slice(-1);
  document.querySelector("#my-application-link").href = `/?appId=${encodeURIComponent(account.applicationId)}`;
  returnLink.href = `/?appId=${encodeURIComponent(account.applicationId)}`;
  retryLink.href = `/?appId=${encodeURIComponent(account.applicationId)}`;
  rateLimitReturn.href = `/?appId=${encodeURIComponent(account.applicationId)}`;
  navigation.hidden = false;
}

function showSignin(message = "") {
  clearRotationTimer();
  currentAccount = null;
  clearVisibleProfile();
  signinScreen.hidden = false;
  dashboardScreen.hidden = true;
  notFoundScreen.hidden = true;
  serviceErrorScreen.hidden = true;
  rateLimitScreen.hidden = true;
  navigation.hidden = true;
  document.title = "Sign in | Northstar Student Portal";
  signinError.textContent = message;
  signinError.hidden = !message;
}

function showDashboard() {
  signinScreen.hidden = true;
  dashboardScreen.hidden = false;
  notFoundScreen.hidden = true;
  serviceErrorScreen.hidden = true;
  rateLimitScreen.hidden = true;
  document.title = "My Dashboard | Northstar Student Portal";
}

function showNotFound() {
  signinScreen.hidden = true;
  dashboardScreen.hidden = true;
  notFoundScreen.hidden = false;
  serviceErrorScreen.hidden = true;
  rateLimitScreen.hidden = true;
  document.title = "Application not found | Northstar Student Portal";
}

function showServiceError() {
  signinScreen.hidden = true;
  dashboardScreen.hidden = true;
  notFoundScreen.hidden = true;
  serviceErrorScreen.hidden = false;
  rateLimitScreen.hidden = true;
  document.title = "Service unavailable | Northstar Student Portal";
}

function showRateLimited(retryAfter = "60") {
  signinScreen.hidden = true;
  dashboardScreen.hidden = true;
  notFoundScreen.hidden = true;
  serviceErrorScreen.hidden = true;
  rateLimitScreen.hidden = false;
  document.querySelector("#rate-limit-retry").textContent = retryAfter;
  document.title = "Please wait | Northstar Student Portal";
}

function showRecord(record) {
  document.querySelector("#welcome-name").textContent = record.studentName;
  document.querySelector("#account-name").textContent = record.studentName;
  document.querySelector("#avatar-initial").textContent = record.studentName.trim().slice(-1);
  document.querySelector("#profile-name").textContent = record.studentName;
  document.querySelector("#profile-email").textContent = record.email;
  document.querySelector("#profile-program").textContent = record.program;
  document.querySelector("#application-id").textContent = record.id;
  document.querySelector("#application-status").textContent = record.status;
  document.querySelector("#application-program").textContent = record.program;
  document.querySelector("#application-term").textContent = record.term;
  document.querySelector("#application-note").textContent = record.note;
}

function showRateLimitHeaders(response) {
  const limit = response.headers.get("X-RateLimit-Limit");
  const remaining = response.headers.get("X-RateLimit-Remaining");
  const reset = response.headers.get("X-RateLimit-Reset");
  if (limit && remaining && reset) {
    document.querySelector("#rate-limit-status").textContent =
      `${remaining} of ${limit} protected requests remain in this window.`;
  }
}

async function loadApplicationFromAddress(account) {
  setAccountNavigation(account);
  const address = new URL(window.location.href);
  let appId = address.searchParams.get("appId");
  if (!appId) {
    appId = String(account.applicationId);
    address.searchParams.set("appId", appId);
    window.history.replaceState(null, "", address);
  }

  showDashboard();
  try {
    const response = await fetch(`/api/records/${encodeURIComponent(appId)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
    });
    showRateLimitHeaders(response);

    if (response.status === 401) {
      showSignin("Your session has expired. Please sign in again.");
      return;
    }
    if (response.status === 404) {
      showNotFound();
      return;
    }
    if (response.status === 429) {
      showRateLimited(response.headers.get("Retry-After") ?? "60");
      return;
    }
    if (!response.ok) {
      showServiceError();
      return;
    }

    showRecord(await response.json());
  } catch {
    showServiceError();
  }
}

function scheduleRotation(expiresIn) {
  clearRotationTimer();
  const rotateAfterMs = Math.max(1000, (expiresIn - 300) * 1000);
  rotationTimer = window.setTimeout(async () => {
    try {
      const response = await fetch("/api/session/rotate", {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
      });
      if (response.status === 401) {
        showSignin("Your session has expired. Please sign in again.");
        return;
      }
      if (!response.ok) {
        rotationTimer = window.setTimeout(() => scheduleRotation(60), 30_000);
        return;
      }
      const session = await response.json();
      currentAccount = session.account;
      setAccountNavigation(currentAccount);
      scheduleRotation(session.expiresIn);
    } catch {
      rotationTimer = window.setTimeout(() => scheduleRotation(60), 30_000);
    }
  }, rotateAfterMs);
}

async function restoreSession() {
  try {
    const response = await fetch("/api/session", {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
    });
    if (response.status === 401) {
      showSignin();
      return;
    }
    if (!response.ok) {
      showServiceError();
      return;
    }
    const session = await response.json();
    currentAccount = session.account;
    scheduleRotation(session.expiresIn);
    await loadApplicationFromAddress(currentAccount);
  } catch {
    showServiceError();
  }
}

signinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  signinError.hidden = true;
  signinSubmit.disabled = true;
  signinSubmit.textContent = "Signing in…";

  try {
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: signinEmail.value.trim(), password: signinPassword.value }),
      credentials: "same-origin",
      cache: "no-store",
    });
    if (response.status === 429) {
      signinPassword.value = "";
      showSignin(`Too many sign-in attempts. Wait ${response.headers.get("Retry-After") ?? "60"} seconds and try again.`);
      return;
    }
    if (!response.ok) {
      signinPassword.value = "";
      showSignin("We couldn't sign you in with those details. Check them and try again.");
      return;
    }

    const session = await response.json();
    if (!session.account || !Number.isSafeInteger(session.account.applicationId)) {
      showSignin("We couldn't start your session. Please try again.");
      return;
    }
    window.location.replace(`/?appId=${encodeURIComponent(session.account.applicationId)}`);
  } catch {
    showSignin("The portal is temporarily unavailable. Please try again.");
  } finally {
    signinSubmit.disabled = false;
    signinSubmit.innerHTML = 'Sign in <span aria-hidden="true">→</span>';
  }
});

document.querySelector("#signout-button").addEventListener("click", async () => {
  clearRotationTimer();
  try {
    await fetch("/api/session", {
      method: "DELETE",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
    });
    showSignin("You have signed out.");
  } catch {
    showServiceError();
  }
});

void restoreSession();
