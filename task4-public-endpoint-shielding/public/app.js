const form = document.querySelector("#lookup-form");
const input = document.querySelector("#reference-id");
const submitButton = document.querySelector("#submit-button");
const buttonLabel = document.querySelector(".button-label");
const feedback = document.querySelector("#feedback");
const resultPanel = document.querySelector("#result-panel");
const statusPill = document.querySelector("#credential-status");

function clearMessages() {
  feedback.hidden = true;
  feedback.textContent = "";
  feedback.classList.remove("is-neutral");
  resultPanel.hidden = true;
}

function showMessage(message, kind = "error") {
  resultPanel.hidden = true;
  feedback.textContent = message;
  feedback.classList.toggle("is-neutral", kind === "neutral");
  feedback.hidden = false;
}

function renderResult(record) {
  const isVerified = record.status === "verified";
  statusPill.textContent = isVerified ? "Verified" : "Pending review";
  statusPill.className = isVerified ? "status-pill" : "status-pill is-pending";
  document.querySelector("#result-reference").textContent = `REF ${record.referenceId}`;
  document.querySelector("#credential-type").textContent = record.credentialType;
  document.querySelector("#issued-year").textContent = String(record.issuedYear);
  document.querySelector("#masked-email").textContent = record.contact.email;
  document.querySelector("#masked-phone").textContent = record.contact.phone;
  resultPanel.hidden = false;
  feedback.hidden = true;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessages();

  if (!form.reportValidity()) return;

  const referenceId = input.value.trim().toUpperCase();
  input.value = referenceId;
  submitButton.disabled = true;
  buttonLabel.textContent = "Checking…";
  form.setAttribute("aria-busy", "true");

  try {
    const response = await fetch(`/api/public/lookup/${encodeURIComponent(referenceId)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });

    if (response.status === 404) {
      showMessage("No public credential matched that reference. Check it and try again.");
      return;
    }

    if (response.status === 400) {
      showMessage("Enter a valid credential reference and try again.");
      return;
    }

    if (!response.ok) {
      showMessage("The verification service is temporarily unavailable. Please try again.");
      return;
    }

    const record = await response.json();
    renderResult(record);
  } catch {
    showMessage("The verification service could not be reached. Please try again.");
  } finally {
    submitButton.disabled = false;
    buttonLabel.textContent = "Check credential";
    form.removeAttribute("aria-busy");
  }
});
