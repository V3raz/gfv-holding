// ============================================================
// LAGOM GESTÃO — App Principal (Router + Shell)
// ============================================================

import * as Estoque   from "./views/estoque.js";
import * as Vendas    from "./views/vendas.js";
import * as Clientes  from "./views/clientes.js";
import * as Caderninho from "./views/caderninho.js";

// Mapa de rotas
const routes = {
  "/estoque":    { module: Estoque,    label: "Estoque"    },
  "/vendas":     { module: Vendas,     label: "Vendas"     },
  "/clientes":   { module: Clientes,   label: "Clientes"   },
  "/caderninho": { module: Caderninho, label: "Caderninho" },
};

const DEFAULT_ROUTE = "/estoque";

// ── Router ────────────────────────────────────────────────────

async function navigate(path) {
  const route = routes[path] ?? routes[DEFAULT_ROUTE];
  const finalPath = routes[path] ? path : DEFAULT_ROUTE;

  // Atualiza sidebar
  document.querySelectorAll(".nav-item").forEach(el => {
    el.classList.toggle("nav-item--active", el.dataset.route === finalPath);
  });

  // Renderiza view
  const container = document.getElementById("viewContainer");
  container.innerHTML = route.module.renderView();

  // Título da página
  document.getElementById("pageTitle").textContent = "Lagom Gestão";

  // Inicializa lógica da view
  await route.module.initView();
}

// Escuta mudanças na hash
window.addEventListener("hashchange", () => {
  const path = window.location.hash.replace("#", "") || DEFAULT_ROUTE;
  navigate(path);
});

// ── Init ──────────────────────────────────────────────────────

function initSidebar() {
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
      window.location.hash = item.dataset.route;
    });
  });
}

function initTopbar() {
  // Toggle sidebar em mobile
  document.getElementById("btnMenuToggle")?.addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("sidebar--open");
  });
}

// Arranca o app
function init() {
  initSidebar();
  initTopbar();
  const path = window.location.hash.replace("#", "") || DEFAULT_ROUTE;
  window.location.hash = path; // dispara hashchange
}

init();
