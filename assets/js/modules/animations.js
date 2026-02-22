const AOS_OPTIONS = {
  duration: 800,
  easing: "ease-in-out",
  once: true,
};

export function initAnimations() {
  if (window.AOS && typeof window.AOS.init === "function") {
    window.AOS.init(AOS_OPTIONS);
  }

  if (window.feather && typeof window.feather.replace === "function") {
    window.feather.replace();
  }
}

export function initSmoothScroll() {
  const contactSection = document.getElementById("contact");
  if (!contactSection) {
    return;
  }

  const contactLinks = document.querySelectorAll('a[href="#contact"]');
  contactLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      contactSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  });
}
