// This fixed token represents an already-authenticated Student A in the local
// training lab. It is a public fixture, not a production credential.
const SESSION_TOKEN = "lab-session-user-a";
const DEFAULT_APPLICATION_ID = "104";

const dashboardScreen = document.querySelector("#dashboard-screen");
const notFoundScreen = document.querySelector("#not-found-screen");
const returnLink = document.querySelector("#return-to-application");

function showDashboard() {
  dashboardScreen.hidden = false;
  notFoundScreen.hidden = true;
  document.title = "My Dashboard | Northstar Student Portal";
}

function showNotFound() {
  dashboardScreen.hidden = true;
  notFoundScreen.hidden = false;
  document.title = "Application not found | Northstar Student Portal";
  returnLink.href = `/?appId=${DEFAULT_APPLICATION_ID}`;
}

function showRecord(record) {
  document.querySelector("#welcome-name").textContent = record.studentName;
  document.querySelector("#account-name").textContent = record.studentName;
  document.querySelector("#avatar-initial").textContent = record.studentName.slice(-1);
  document.querySelector("#profile-name").textContent = record.studentName;
  document.querySelector("#profile-email").textContent = record.email;
  document.querySelector("#profile-program").textContent = record.program;
  document.querySelector("#application-id").textContent = record.id;
  document.querySelector("#application-status").textContent = record.status;
  document.querySelector("#application-program").textContent = record.program;
  document.querySelector("#application-term").textContent = record.term;
  document.querySelector("#application-note").textContent = record.note;
}

async function loadApplicationFromAddress() {
  const address = new URL(window.location.href);
  let appId = address.searchParams.get("appId");

  if (!appId) {
    appId = DEFAULT_APPLICATION_ID;
    address.searchParams.set("appId", appId);
    window.history.replaceState(null, "", address);
  }

  showDashboard();

  try {
    const response = await fetch(`/api/records/${encodeURIComponent(appId)}`, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${SESSION_TOKEN}` },
      cache: "no-store",
    });

    if (!response.ok) {
      showNotFound();
      return;
    }

    showRecord(await response.json());
  } catch {
    showNotFound();
  }
}

loadApplicationFromAddress();
