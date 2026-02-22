function updateToggleUI(toggleContainer, toggleButton, checked) {
  if (checked) {
    toggleContainer.classList.add("bg-[#FF8C5A]");
    toggleContainer.classList.remove("bg-white/5");
    toggleButton.classList.add("translate-x-3.5");
    toggleButton.classList.remove("translate-x-0");
    return;
  }

  toggleContainer.classList.remove("bg-[#FF8C5A]");
  toggleContainer.classList.add("bg-white/5");
  toggleButton.classList.remove("translate-x-3.5");
  toggleButton.classList.add("translate-x-0");
}

function ensureStatusContainer(contactForm) {
  let statusDiv = document.getElementById("form-status");
  if (statusDiv) {
    return statusDiv;
  }

  statusDiv = document.createElement("div");
  statusDiv.id = "form-status";
  statusDiv.className = "form-status";
  contactForm.appendChild(statusDiv);

  return statusDiv;
}

function showStatus(contactForm, message, type = "success") {
  const statusDiv = ensureStatusContainer(contactForm);
  const iconPath =
    type === "success"
      ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>'
      : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>';

  statusDiv.classList.remove("form-status--success", "form-status--error", "is-visible");
  statusDiv.classList.add(type === "success" ? "form-status--success" : "form-status--error");

  statusDiv.innerHTML = `
    <div class="form-status__content">
      <svg class="form-status__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">${iconPath}</svg>
      <span class="form-status__text"></span>
    </div>
  `;

  const textNode = statusDiv.querySelector(".form-status__text");
  if (textNode) {
    textNode.textContent = message;
  }

  statusDiv.classList.add("is-visible");

  window.setTimeout(() => {
    statusDiv.classList.remove("is-visible");
  }, 5000);
}

function updateButtonState(submitButton, originalButtonText, loading = false) {
  if (loading) {
    submitButton.disabled = true;
    submitButton.innerHTML = `
      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Wird gesendet...
    `;
    return;
  }

  submitButton.disabled = false;
  submitButton.innerHTML = originalButtonText;
}

function validateForm(formData) {
  const errors = [];
  const requiredFields = ["first-name", "last-name", "email", "company", "message"];

  requiredFields.forEach((field) => {
    const value = formData.get(field);
    if (!value || String(value).trim() === "") {
      errors.push(`${field.replace("-", " ")} ist erforderlich`);
    }
  });

  const email = formData.get("email");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(String(email))) {
    errors.push("E-Mail Adresse ist ungueltig");
  }

  const privacyAccepted = formData.get("agree-to-policies");
  if (!privacyAccepted) {
    errors.push("Datenschutzerklaerung muss akzeptiert werden");
  }

  return errors;
}

function ensureHoneypotField(contactForm) {
  if (contactForm.querySelector('input[name="website_url"]')) {
    return;
  }

  const honeypot = document.createElement("input");
  honeypot.type = "text";
  honeypot.name = "website_url";
  honeypot.style.display = "none";
  honeypot.tabIndex = -1;
  honeypot.autocomplete = "off";

  contactForm.appendChild(honeypot);
}

function setupToggle(toggleSwitch) {
  if (!toggleSwitch) {
    return () => {};
  }

  const toggleContainer = toggleSwitch.closest(".group");
  const toggleButton = toggleContainer ? toggleContainer.querySelector("span") : null;

  if (!toggleContainer || !toggleButton) {
    return () => {};
  }

  const render = (checked) => {
    updateToggleUI(toggleContainer, toggleButton, checked);
  };

  render(toggleSwitch.checked);

  toggleSwitch.addEventListener("change", () => {
    render(toggleSwitch.checked);
  });

  toggleContainer.addEventListener("click", (event) => {
    if (event.target === toggleSwitch) {
      return;
    }

    toggleSwitch.checked = !toggleSwitch.checked;
    render(toggleSwitch.checked);
  });

  return render;
}

export function initContactForm() {
  const contactForm = document.getElementById("contact-form");
  if (!contactForm) {
    return;
  }

  const submitButton = contactForm.querySelector('button[type="submit"]');
  if (!submitButton) {
    return;
  }

  const toggleSwitch = document.getElementById("agree-to-policies");
  const renderToggle = setupToggle(toggleSwitch);
  const originalButtonText = submitButton.innerHTML;

  ensureHoneypotField(contactForm);

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const validationErrors = validateForm(formData);

    if (validationErrors.length > 0) {
      showStatus(contactForm, `Fehler: ${validationErrors.join(", ")}`, "error");
      return;
    }

    updateButtonState(submitButton, originalButtonText, true);

    try {
      const jsonData = {};
      for (const [key, value] of formData.entries()) {
        jsonData[key] = value;
      }

      const response = await fetch("/contact-handler.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jsonData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Ein Fehler ist aufgetreten");
      }

      showStatus(contactForm, result.message || "Nachricht erfolgreich gesendet.", "success");
      contactForm.reset();
      renderToggle(false);

      if (typeof window.gtag !== "undefined") {
        window.gtag("event", "form_submit", {
          event_category: "Contact",
          event_label: "Contact Form Submitted",
        });
      }
    } catch (error) {
      console.error("Contact form error:", error);
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      showStatus(contactForm, `Fehler beim Senden der Nachricht: ${message}`, "error");
    } finally {
      updateButtonState(submitButton, originalButtonText, false);
    }
  });
}
