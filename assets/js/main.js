import { initAnimations, initSmoothScroll } from "./modules/animations.js";
import { initContactForm } from "./modules/contact-form.js";

document.addEventListener("DOMContentLoaded", () => {
  initAnimations();
  initContactForm();
  initSmoothScroll();
});
