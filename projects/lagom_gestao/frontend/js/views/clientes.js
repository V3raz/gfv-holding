import { fetchClientes, fetchClienteById, fetchPedidosCliente, insertCliente, abaterDebito } from "../db/clientes.js";
import { createPedido } from "../db/vendas.js";
import { brl, dataBR, showToast } from "../utils.js";

// ── Estado ────────────────────────────────────────────────────
let clientes       = [];
let clienteSelecionado = null;

// ── Template ──────────────────────────────────────────────────
export function renderView() {
  return `
    <div class="view-clientes">

      <!-- Painel esquerdo: lista -->
      <div class="panel-left">
        <h2 class="panel-title">Lista de Clientes</h2>
        <div class="search-wrap" style="margin-bottom:1rem">
          <svg class="search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="8.5" cy="8.5" r="5.5"/><path d="M17 17l-4-4"/>
          </svg>
          <input type="text" id="clienteSearch" class="search-input" placeholder="Encontrar cliente ou telefone...">
          <button id="btnScanCliente" class="btn-icon" title="Escanear">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <rect x="1" y="4" width="2.5" height="16"/><rect x="5" y="4" width="1" height="16"/>
              <rect x="8" y="4" width="2.5" height="16"/><rect x="13" y="4" width="1" height="16"/>
              <rect x="16.5" y="4" width="1" height="16"/><rect x="20" y="4" width="2" height="16"/>
            </svg>
          </button>
        </div>
        <div id="clientesListEl" class="clientes-list">
          <div class="loading"><div class="spinner"></div></div>
        </div>
        <button id="btnNovoCliente" class="btn btn-secondary btn-full" style="margin-top:1rem">+ Novo Cliente</button>
      </div>

      <!-- Painel direito: perfil -->
      <div class="panel-right" id="clientePanelRight">
        <div class="no-pedido"><span>Selecione um cliente</span></div>
      </div>

      <!-- Modal Novo Cliente -->
      <div id="modalNovoCliente" class="modal-overlay" hidden>
        <div class="modal modal-sm">
          <div class="modal-header">
            <h2>Novo Cliente</h2>
            <button class="modal-close" data-close="modalNovoCliente">&times;</button>
          </div>
          <form id="formNovoCliente" class="modal-form" novalidate>
            <div class="form-group">
              <label>Nome <span class="req">*</span></label>
              <input type="text" id="cliNome" required placeholder="Nome completo">
            </div>
            <div class="form-group">
              <label>Telefone</label>
              <input type="tel" id="cliTel" placeholder="+55 67 9xxxx-xxxx">
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" data-close="modalNovoCliente">Cancelar</button>
              <button type="submit" class="btn btn-primary">Cadastrar</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Abater Dívida -->
      <div id="modalAbaterDebito" class="modal-overlay" hidden>
        <div class="modal modal-sm">
          <div class="modal-header">
            <h2>Abater Dívida</h2>
            <button class="modal-close" data-close="modalAbaterDebito">&times;</button>
          </div>
          <div class="modal-form">
            <p id="abaterDebitoTexto" class="confirm-text" style="margin-bottom:1rem"></p>
            <div class="form-group">
              <label>Valor a Abater (R$)</label>
              <input type="number" id="abaterValor" min="0.01" step="0.01" class="input-lg" placeholder="0,00">
            </div>
            <div class="modal-actions">
              <button class="btn btn-secondary" data-close="modalAbaterDebito">Cancelar</button>
              <button id="btnConfirmarAbater" class="btn btn-primary">Confirmar</button>
            </div>
          </div>
        </div>
      </div>

    </div>`;
}

// ── Init ──────────────────────────────────────────────────────
export async function initView() {
  await loadClientes();

  // Busca
  let timer;
  document.getElementById("clienteSearch").addEventListener("input", e => {
    clearTimeout(timer);
    timer = setTimeout(() => filterClientes(e.target.value), 250);
  });

  document.getElementById("btnNovoCliente").addEventListener("click", () => {
    document.getElementById("formNovoCliente").reset();
    document.getElementById("modalNovoCliente").hidden = false;
  });

  document.getElementById("formNovoCliente").addEventListener("submit", handleCadastrar);
  document.getElementById("btnConfirmarAbater").addEventListener("click", handleAbater);

  // Fechar modals
  document.querySelectorAll("[data-close]").forEach(btn =>
    btn.addEventListener("click", () => { document.getElementById(btn.dataset.close).hidden = true; })
  );
  ["modalNovoCliente", "modalAbaterDebito"].forEach(id =>
    document.getElementById(id)?.addEventListener("click", e => {
      if (e.target.id === id) document.getElementById(id).hidden = true;
    })
  );
}

// ── Funções ───────────────────────────────────────────────────

async function loadClientes(search = "") {
  try {
    clientes = await fetchClientes(search);
    renderClientesList(clientes);
  } catch (err) { showToast(err.message, "error"); }
}

function filterClientes(query) {
  const q = query.toLowerCase();
  const filtered = clientes.filter(c =>
    c.nome.toLowerCase().includes(q) || (c.telefone && c.telefone.includes(q))
  );
  renderClientesList(filtered);
}

function renderClientesList(lista) {
  const el = document.getElementById("clientesListEl");
  if (!lista.length) {
    el.innerHTML = `<p class="empty-state" style="padding:1rem">Nenhum cliente encontrado.</p>`;
    return;
  }
  el.innerHTML = lista.map(c => `
    <div class="cliente-item ${clienteSelecionado?.id === c.id ? "cliente-item--ativo" : ""}" data-cid="${c.id}">
      <div class="cliente-item-info">
        <span class="cliente-item-nome">${c.nome}</span>
        <span class="cliente-item-id">ID: ${c.nome}</span>
        <span class="cliente-item-tel">${c.telefone ? maskTel(c.telefone) : "—"}</span>
      </div>
    </div>`).join("");

  el.querySelectorAll(".cliente-item").forEach(item =>
    item.addEventListener("click", () => selectCliente(item.dataset.cid))
  );
}

async function selectCliente(id) {
  clienteSelecionado = clientes.find(c => c.id === id) ?? null;
  if (!clienteSelecionado) return;
  renderClientesList(clientes); // re-render para marcar ativo
  await renderClientePerfil();
}

async function renderClientePerfil() {
  const panel = document.getElementById("clientePanelRight");
  const c = clienteSelecionado;
  let pedidosHist = [];
  try { pedidosHist = await fetchPedidosCliente(c.id); } catch (_) {}

  panel.innerHTML = `
    <div class="cliente-perfil">
      <h2 class="panel-title">Perfil da Cliente: ${c.nome}</h2>

      <div class="perfil-top">
        <div class="perfil-card">
          <div class="perfil-avatar">👤</div>
          <div class="perfil-info">
            <span><strong>ID:</strong> ${c.nome}</span>
            <span><strong>Telefone:</strong> ${c.telefone ? maskTel(c.telefone) : "—"}</span>
            <span><strong>Cadastro da:</strong> ${dataBR(c.created_at)}</span>
          </div>
        </div>
        <button id="btnFazerVendaTop" class="btn btn-primary btn-nova-venda">
          📋 Fazer Nova Venda
        </button>
      </div>

      ${c.debito_pendente > 0 ? `
        <div class="debito-card">
          <span class="debito-label">Débito Pendente</span>
          <span class="debito-valor">${brl(c.debito_pendente)}</span>
        </div>` : `
        <div class="debito-card debito-card--ok">
          <span class="debito-label">Sem débito pendente</span>
          <span class="debito-valor">✓</span>
        </div>`}

      <h3 class="section-title">Histórico de Compras (Últimos Pedidos)</h3>
      <div class="historico-list">
        ${pedidosHist.length
          ? pedidosHist.map(p => `
            <div class="hist-item">
              <div class="hist-info">
                <span class="hist-data">${dataBR(p.finalizado_at)}</span>
                <span class="hist-num">Pedido #${p.numero}</span>
                <span class="hist-val">${brl(p.total)}</span>
              </div>
              ${p.itens_pedido?.[0]?.roupas?.imagem_url
                ? `<img src="${p.itens_pedido[0].roupas.imagem_url}" class="hist-thumb" alt="">`
                : `<div class="hist-thumb hist-thumb--empty">👗</div>`}
            </div>`).join("")
          : `<p class="empty-state">Sem histórico de compras.</p>`}
      </div>

      <div class="perfil-actions">
        ${c.debito_pendente > 0
          ? `<button id="btnAbaterDebito" class="btn btn-primary">Abater Dívida</button>` : ""}
        <button id="btnFazerVenda" class="btn btn-primary">Fazer Nova Venda</button>
      </div>
    </div>`;

  document.getElementById("btnFazerVendaTop")?.addEventListener("click", () => fazerNovaVenda());
  document.getElementById("btnFazerVenda")?.addEventListener("click", () => fazerNovaVenda());
  document.getElementById("btnAbaterDebito")?.addEventListener("click", () => {
    document.getElementById("abaterDebitoTexto").textContent =
      `Débito atual de ${c.nome}: ${brl(c.debito_pendente)}`;
    document.getElementById("abaterValor").value = "";
    document.getElementById("modalAbaterDebito").hidden = false;
  });
}

async function fazerNovaVenda() {
  try {
    const pedido = await createPedido({ tipo: "cliente", clienteId: clienteSelecionado.id });
    showToast(`Pedido #${pedido.numero} criado. Acesse Vendas.`);
    // Navega para vendas
    window.location.hash = "#/vendas";
  } catch (err) { showToast(err.message, "error"); }
}

async function handleCadastrar(e) {
  e.preventDefault();
  if (!e.target.checkValidity()) { e.target.reportValidity(); return; }
  try {
    const novo = await insertCliente({
      nome: document.getElementById("cliNome").value.trim(),
      telefone: document.getElementById("cliTel").value.trim() || null,
    });
    clientes.unshift(novo);
    renderClientesList(clientes);
    document.getElementById("modalNovoCliente").hidden = true;
    showToast(`${novo.nome} cadastrado.`);
  } catch (err) { showToast(err.message, "error"); }
}

async function handleAbater() {
  const valor = parseFloat(document.getElementById("abaterValor").value);
  if (!valor || valor <= 0) { showToast("Valor inválido.", "error"); return; }
  try {
    const updated = await abaterDebito(clienteSelecionado.id, valor);
    clienteSelecionado.debito_pendente = updated.debito_pendente;
    const idx = clientes.findIndex(c => c.id === clienteSelecionado.id);
    if (idx !== -1) clientes[idx] = updated;
    document.getElementById("modalAbaterDebito").hidden = false;
    document.getElementById("modalAbaterDebito").hidden = true;
    await renderClientePerfil();
    showToast(`${brl(valor)} abatido do débito.`);
  } catch (err) { showToast(err.message, "error"); }
}

function maskTel(tel) {
  return tel.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, "+$1 $2 $3-$4").replace(/\d(?=\d{4})/g, (m, i, s) =>
    i > 4 && i < s.length - 4 ? "*" : m
  ) || tel;
}
