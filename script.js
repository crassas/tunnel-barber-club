const nav = document.querySelector(".nav");
const menu = document.querySelector(".menu-toggle");
function closeMenu() {
  nav.classList.remove("open");
  menu.setAttribute("aria-expanded", "false");
}
menu.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menu.setAttribute("aria-expanded", String(open));
});
nav
  .querySelectorAll("a")
  .forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && nav.classList.contains("open")) {
    closeMenu();
    menu.focus();
  }
});
window.matchMedia("(min-width: 701px)").addEventListener("change", closeMenu);
const modal = document.getElementById("serviceModal");
const title = document.getElementById("modalTitle");
const price = document.getElementById("modalPrice");
const description = document.getElementById("modalDescription");
document.querySelectorAll(".service-details").forEach((button) => {
  button.addEventListener("click", () => {
    title.textContent = button.dataset.service;
    price.textContent = button.dataset.price;
    description.textContent = button.dataset.description;
    modal.showModal();
  });
});
document
  .querySelector(".modal-close")
  .addEventListener("click", () => modal.close());
document
  .querySelector(".modal-book")
  .addEventListener("click", () => modal.close());
modal.addEventListener("click", (event) => {
  if (event.target !== modal) return;
  const rect = modal.getBoundingClientRect();
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    modal.close();
});
