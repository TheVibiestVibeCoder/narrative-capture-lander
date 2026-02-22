const AOS_OPTIONS = {
  duration: 800,
  easing: "ease-in-out",
  once: true,
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const MOBILE_MENU_CLOSE_DURATION = 340;
const SECTION_FLASH_DURATION = 980;

let scrollRafId = null;

function prefersReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getHashTarget(hash) {
  if (!hash || !hash.startsWith("#") || hash.length < 2) {
    return null;
  }

  const id = decodeURIComponent(hash.slice(1));
  return document.getElementById(id);
}

function getHeaderOffset() {
  const nav = document.querySelector("header nav");
  if (!nav) {
    return 72;
  }

  const navHeight = nav.getBoundingClientRect().height;
  return Math.max(72, Math.round(navHeight + 28));
}

function easeOutQuint(progress) {
  return 1 - Math.pow(1 - progress, 5);
}

function cancelScrollAnimation() {
  if (scrollRafId !== null) {
    window.cancelAnimationFrame(scrollRafId);
    scrollRafId = null;
  }
}

function animateWindowScroll(targetY, durationMs) {
  cancelScrollAnimation();

  const startY = window.scrollY;
  const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const finalY = Math.min(Math.max(targetY, 0), maxY);
  const distance = finalY - startY;

  if (Math.abs(distance) < 2) {
    window.scrollTo(0, finalY);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const startTime = performance.now();

    const step = (timestamp) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = easeOutQuint(progress);
      const cinematicDrift = Math.sin(Math.PI * progress) * 0.012 * (1 - progress);
      const nextY = startY + distance * (eased + cinematicDrift);

      window.scrollTo(0, nextY);

      if (progress < 1) {
        scrollRafId = window.requestAnimationFrame(step);
        return;
      }

      window.scrollTo(0, finalY);
      scrollRafId = null;
      resolve();
    };

    scrollRafId = window.requestAnimationFrame(step);
  });
}

function triggerSectionArrival(target) {
  if (!(target instanceof HTMLElement)) {
    return;
  }

  target.classList.remove("section-arrival");
  // Force reflow so replaying the same class retriggers the keyframes.
  void target.offsetWidth;
  target.classList.add("section-arrival");

  window.setTimeout(() => {
    target.classList.remove("section-arrival");
  }, SECTION_FLASH_DURATION);
}

function triggerLinkPress(link) {
  if (!(link instanceof HTMLElement)) {
    return;
  }

  link.classList.remove("is-nav-press");
  void link.offsetWidth;
  link.classList.add("is-nav-press");

  window.setTimeout(() => {
    link.classList.remove("is-nav-press");
  }, 420);
}

async function navigateToHashTarget(target, hash, sourceLink) {
  if (!(target instanceof HTMLElement)) {
    return;
  }

  triggerLinkPress(sourceLink);

  const targetY = target.getBoundingClientRect().top + window.scrollY - getHeaderOffset();
  const distance = Math.abs(targetY - window.scrollY);
  const durationMs = Math.max(760, Math.min(1450, Math.round(distance * 0.62)));

  document.body.classList.add("is-cinematic-scrolling");

  try {
    if (prefersReducedMotion()) {
      window.scrollTo(0, targetY);
    } else {
      await animateWindowScroll(targetY, durationMs);
    }
  } finally {
    document.body.classList.remove("is-cinematic-scrolling");
  }

  if (hash && window.location.hash !== hash) {
    window.history.pushState(null, "", hash);
  }

  triggerSectionArrival(target);
}

function initPremiumAnchorScroll() {
  const hashLinks = document.querySelectorAll('a[href^="#"]:not([href="#"])');

  hashLinks.forEach((link) => {
    if (link.closest("#mobile-menu")) {
      return;
    }

    link.addEventListener("click", (event) => {
      const hash = link.getAttribute("href") || "";
      const target = getHashTarget(hash);

      if (!(target instanceof HTMLElement)) {
        return;
      }

      event.preventDefault();
      navigateToHashTarget(target, hash, link);
    });
  });
}

function initMobileMenuAnimations() {
  const dialog = document.getElementById("mobile-menu");
  if (!(dialog instanceof HTMLDialogElement)) {
    return;
  }

  const dialogShell = dialog.querySelector("div.fixed.inset-0");
  const dialogPanel = dialog.querySelector("el-dialog-panel");
  const openButton = document.querySelector('[command="show-modal"][commandfor="mobile-menu"]');
  const closeButton = dialog.querySelector('[command="close"][commandfor="mobile-menu"]');
  const menuLinks = dialog.querySelectorAll('a[href^="#"]:not([href="#"])');

  if (dialogShell instanceof HTMLElement) {
    dialogShell.classList.add("mobile-menu-backdrop");
  }

  if (dialogPanel instanceof HTMLElement) {
    dialogPanel.classList.add("mobile-menu-panel");
  }

  menuLinks.forEach((link, index) => {
    if (!(link instanceof HTMLElement)) {
      return;
    }

    link.classList.add("mobile-menu-link");
    link.style.setProperty("--item-delay", `${index * 55}ms`);
  });

  let closeTimer = null;
  let isClosing = false;

  const clearCloseTimer = () => {
    if (closeTimer !== null) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }
  };

  const setMenuState = (state) => {
    dialog.dataset.state = state;
  };

  const onMenuOpened = () => {
    clearCloseTimer();
    isClosing = false;
    setMenuState("opening");
    document.body.classList.add("mobile-menu-open");
    window.requestAnimationFrame(() => {
      setMenuState("open");
    });
  };

  const onMenuClosed = () => {
    clearCloseTimer();
    isClosing = false;
    setMenuState("closed");
    document.body.classList.remove("mobile-menu-open");

    menuLinks.forEach((link) => {
      if (link instanceof HTMLElement) {
        link.classList.remove("is-selected");
      }
    });
  };

  const closeMenuWithAnimation = (returnValue = "") => {
    if (!dialog.open || isClosing) {
      return;
    }

    if (prefersReducedMotion()) {
      dialog.close(returnValue);
      return;
    }

    isClosing = true;
    setMenuState("closing");
    document.body.classList.remove("mobile-menu-open");
    clearCloseTimer();

    closeTimer = window.setTimeout(() => {
      dialog.close(returnValue);
      isClosing = false;
      closeTimer = null;
    }, MOBILE_MENU_CLOSE_DURATION);
  };

  const observeMenuState = new MutationObserver(() => {
    if (dialog.open) {
      onMenuOpened();
      return;
    }

    onMenuClosed();
  });

  observeMenuState.observe(dialog, {
    attributes: true,
    attributeFilter: ["open"],
  });

  if (dialog.open) {
    onMenuOpened();
  } else {
    onMenuClosed();
  }

  if (openButton instanceof HTMLElement) {
    openButton.classList.add("mobile-menu-trigger");

    openButton.addEventListener("click", () => {
      triggerLinkPress(openButton);
      window.setTimeout(() => {
        // Fallback in case commandfor/show-modal is unavailable.
        if (!dialog.open && typeof dialog.showModal === "function") {
          dialog.showModal();
        }
      }, 0);
    });
  }

  if (closeButton instanceof HTMLElement) {
    closeButton.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeMenuWithAnimation("close");
      },
      true,
    );
  }

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeMenuWithAnimation("cancel");
  });

  dialog.addEventListener("click", (event) => {
    if (!(dialogPanel instanceof HTMLElement)) {
      return;
    }

    if (!(event.target instanceof Node)) {
      return;
    }

    if (!dialogPanel.contains(event.target)) {
      event.preventDefault();
      closeMenuWithAnimation("backdrop");
    }
  });

  menuLinks.forEach((link) => {
    link.addEventListener(
      "click",
      (event) => {
        const hash = link.getAttribute("href") || "";
        const target = getHashTarget(hash);

        if (!(target instanceof HTMLElement)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        triggerLinkPress(link);
        link.classList.add("is-selected");

        if (prefersReducedMotion()) {
          closeMenuWithAnimation("navigate");
          window.setTimeout(() => {
            navigateToHashTarget(target, hash, link);
          }, 20);
          return;
        }

        closeMenuWithAnimation("navigate");
        window.setTimeout(() => {
          navigateToHashTarget(target, hash, link);
        }, MOBILE_MENU_CLOSE_DURATION - 60);
      },
      true,
    );
  });
}

export function initAnimations() {
  if (window.AOS && typeof window.AOS.init === "function") {
    window.AOS.init(AOS_OPTIONS);
  }

  if (window.feather && typeof window.feather.replace === "function") {
    window.feather.replace();
  }
}

export function initSmoothScroll() {
  initPremiumAnchorScroll();
  initMobileMenuAnimations();
}
