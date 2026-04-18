import { fetchClientes, insertCliente, fetchPedidosCliente, abaterDebito } from "../db/clientes.js";
import { brl, dataBR, showToast } from "../utils.js";

// ── Estado ────────────────────────────────────────────────────
let allClientes = [];

// ── Template ──────────────────────────────────────────────────
export function renderView() {
  return `
    <div class="view-clientes">
      <div class="view-header">
        <h1 class="view-title">Clientes</h1>
        <div class="view-controls">
          <div class="search-wrap">
            <svg class="search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="8.5" cy="8.5" r="5.5"/><path d="M17 17l-4-4"/>
            </svg>
            <input type="text" id="clientesSearch" class="search-input" placeholder="Nome / Telefone">
          </div>
        </div>
      </div>

      <!-- Lista de clientes -->
      <div id="clientesList" class="clientes-list">
        <div class="loading"><div class="spinner"></div></div>
      </div>

      <!-- FAB Adicionar -->
      <button id="fabClientes" class="fab" title="Novo cliente" aria-label="Novo cliente">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>

      <!-- Modal Novo Cliente -->
      <div id="modalCliente" class="modal-overlay" hidden>
        <div class="modal">
          <div class="modal-header">
            <h2>Novo Cliente</h2>
            <button class="modal-close" data-close="modalCliente">&times;</button>
          </div>
          <form id="formCliente" class="modal-form" novalidate>
            <div class="form-group">
              <label>Nome <span class="req">*</span></label>
              <input type="text" id="cNome" required placeholder="Nome completo">
            </div>
            <div class="form-group">
              <label>Telefone</label>
              <input type="tel" id="cTelefone" placeholder="(00) 00000-0000">
            </div>
            <div class="form-group">
              <label>Observação</label>
              <textarea id="cObs" rows="3" placeholder="Observações..." style="resize:vertical;width:100%;padding:0.6rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:0.9rem;background:var(--bg);color:var(--text)"></textarea>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" data-close="modalCliente">Cancelar</button>
              <button type="submit" id="btnSalvarCliente" class="btn btn-primary">Salvar Cliente</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Detalhes / Histórico -->
      <div id="modalDetalhesCliente" class="modal-overlay" hidden>
        <div class="modal">
          <div class="modal-header">
            <h2 id="detalheNome">Cliente</h2>
            <button class="modal-close" data-close="modalDetalhesCliente">&times;</button>
          </div>
          <div id="detalheContent" class="modal-form">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
      </div>

    </div>`;
}

// ── Init ──────────────────────────────────────────────────────
export async function initView() {
  await loadClientes();

  // Busca em tempo real
  let searchTimer;
  document.getElementById("clientesSearch").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilter, 250);
  });

  // FAB → abre modal
  document.getElementById("fabClientes").addEventListener("click", () => {
    document.getElementById("formCliente").reset();
    document.getElementById("modalCliente").hidden = false;
    document.getElementById("cNome").focus();
  });

  // Submit novo cliente
  document.getElementById("formCliente").addEventListener("submit", handleSubmitCliente);

  // Fechar modais
  document.querySelectorAll("[data-close]").forEach(btn =>
    btn.addEventListener("click", () => {
      document.getElementById(btn.dataset.close).hidden = true;
    })
  );

  // Fechar ao clicar fora
  ["modalCliente", "modalDetalhesCliente"].forEach(id => {
    document.getElementById(id)?.addEventListener("click", e => {
      if (e.target.id === id) document.getElementById(id).hidden = true;
    });
  });

  // Delegação: abrir detalhes / abater débito
  document.getElementById("clientesList").addEventListener("click", handleListClick);
}

// ── Funções internas ──────────────────────────────────────────

async function loadClientes() {
  const el = document.getElementById("clientesList");
  el.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  try {
    allClientes = await fetchClientes();
    renderList(allClientes);
  } catch (err) {
    showToast(err.message, "error");
    el.innerHTML = "";
  }
}

function applyFilter() {
  const q = document.getElementById("clientesSearch").value.toLowerCase();
  const filtered = allClientes.filter(c =>
    c.nome.toLowerCase().includes(q) ||
    (c.telefone ?? "").toLowerCase().includes(q)
  );
  renderList(filtered);
}

function renderList(clientes) {
  const el = document.getElementById("clientesList");
  if (!clientes.length) {
    el.innerHTML = `<p class="empty-state">Nenhum cliente encontrado.</p>`;
    return;
  }
  el.innerHTML = clientes.map(c => `
    <div class="cliente-card" data-id="${c.id}">
      <div class="cliente-info">
        <span class="cliente-nome">${c.nome}</span>
        <span class="cliente-tel">${c.telefone ?? "—"}</span>
      </div>
      <div class="cliente-meta">
        ${c.debito_pendente > 0
          ? `<span class="debito-badge">Débito: ${brl(c.debito_pendente)}</span>`
          : `<span class="debito-ok">Sem débito</span>`}
        <button class="btn btn-secondary btn-sm btn-historico" data-id="${c.id}" data-nome="${c.nome}">Histórico</button>
        ${c.debito_pendente > 0
          ? `<button class="btn btn-primary btn-sm btn-abater" data-id="${c.id}" data-debito="${c.debito_pendente}">Abater</button>`
          : ""}
      </div>
    </div>`).join("");
}

async function handleListClick(e) {
  const btnHistorico = e.target.closest(".btn-historico");
  const btnAbater    = e.target.closest(".btn-abater");

  if (btnHistorico) {
    const id   = btnHistorico.dataset.id;
    const nome = btnHistorico.dataset.nome;
    document.getElementById("detalheNome").textContent = nome;
    document.getElementById("detalheContent").innerHTML =
      `<div class="loading"><div class="spinner"></div></div>`;
    document.getElementById("modalDetalhesCliente").hidden = false;
    try {
      const pedidos = await fetchPedidosCliente(id);
      if (!pedidos.length) {
        document.getElementById("detalheContent").innerHTML =
          `<p class="empty-state">Nenhum pedido finalizado ainda.</p>`;
        return;
      }
      document.getElementById("detalheContent").innerHTML = pedidos.map(p => `
        <div style="border-bottom:1px solid var(--border);padding:0.75rem 0">
          <div style="display:flex;justify-content:space-between;font-weight:600">
            <span>Pedido #${String(p.id).slice(-6).toUpperCase()}</span>
            <span>${brl(p.total)}</span>
          </div>
          <div style="font-size:0.8rem;color:var(--text-muted)">${dataBR(p.finalizado_at ?? p.created_at)}</div>
        </div>`).join("");
    } catch (err) {
      document.getElementById("detalheContent").innerHTML =
        `<p class="empty-state">Erro ao carregar histórico.</p>`;
      showToast(err.message, "error");
    }
  }

  if (btnAbater) {
    const id     = btnAbater.dataset.id;
    const debito = parseFloat(btnAbater.dataset.debito);
    const valor  = parseFloat(prompt(`Abater quanto do débito de ${brl(debito)}?`) ?? "");
    if (!valor || valor <= 0 || isNaN(valor)) return;
    try {
      await abaterDebito(id, valor);
      showToast(`${brl(valor)} abatido do débito.`);
      await loadClientes();
    } catch (err) {
      showToast(err.message, "error");
    }
  }
}

async function handleSubmitCliente(e) {
  e.preventDefault();
  if (!e.target.checkValidity()) { e.target.reportValidity(); return; }

  const btn = document.getElementById("btnSalvarCliente");
  btn.disabled = true; btn.textContent = "Salvando...";

  try {
    const novo = await insertCliente({
      nome:     document.getElementById("cNome").value.trim(),
      telefone: document.getElementById("cTelefone").value.trim() || null,
      obs:      document.getElementById("cObs").value.trim() || null,
      debito_pendente: 0,
    });
    allClientes.push(novo);
    allClientes.sort((a, b) => a.nome.localeCompare(b.nome));
    renderList(allClientes);
    document.getElementById("modalCliente").hidden = true;
    showToast(`"${novo.nome}" adicionado.`);
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false; btn.textContent = "Salvar Cliente";
  }
}
