import { fetchRoupas, reporEstoque, deleteRoupa, insertRoupa } from "../db/estoque.js";
import { brl, gerarSKU, showToast, fileToDataUrl } from "../utils.js";

// ── Estado ────────────────────────────────────────────────────
let allProducts = [];

// ── Template da view ──────────────────────────────────────────
export function renderView() {
  return `
    <div class="view-estoque">

      <!-- Cabeçalho da view -->
      <div class="view-header">
        <h1 class="view-title">Estoque Disponível <span class="sun-icon">✦</span></h1>
        <div class="view-controls">
          <div class="search-wrap">
            <svg class="search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="8.5" cy="8.5" r="5.5"/><path d="M17 17l-4-4"/>
            </svg>
            <input type="text" id="estoqueSearch" class="search-input" placeholder="SKU / Nome">
          </div>
          <select id="filterTam" class="filter-select"><option value="">Tamanho</option>
            <option>PP</option><option>P</option><option>M</option><option>G</option>
            <option>GG</option><option>XGG</option><option>34</option><option>36</option>
            <option>38</option><option>40</option><option>42</option><option>44</option><option>46</option>
          </select>
          <select id="filterCor" class="filter-select"><option value="">Cor</option>
            <option>Preto</option><option>Branco</option><option>Azul</option><option>Vermelho</option>
            <option>Verde</option><option>Rosa</option><option>Bege</option><option>Marrom</option>
            <option>Cinza</option><option>Amarelo</option><option>Outra</option>
          </select>
          <select id="filterCat" class="filter-select"><option value="">Categoria</option>
            <option>Camiseta</option><option>Calça</option><option>Vestido</option><option>Short</option>
            <option>Blusa</option><option>Jaqueta</option><option>Saia</option><option>Moletom</option>
            <option>Acessório</option>
          </select>
        </div>
      </div>

      <!-- Grid de produtos -->
      <div id="estoqueGrid" class="product-grid">
        <div class="loading"><div class="spinner"></div></div>
      </div>
      <p id="estoqueCount" class="grid-count"></p>

      <!-- FAB Adicionar -->
      <button id="fabEstoque" class="fab" title="Adicionar produto" aria-label="Adicionar produto">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <rect x="2" y="4" width="3" height="16"/><rect x="7" y="4" width="1.5" height="16"/>
          <rect x="11" y="4" width="3" height="16"/><rect x="16.5" y="4" width="1.5" height="16"/>
          <rect x="20" y="4" width="2" height="16"/>
        </svg>
      </button>

      <!-- Modal Adicionar Produto -->
      <div id="modalEstoque" class="modal-overlay" hidden>
        <div class="modal">
          <div class="modal-header">
            <h2>Novo Produto</h2>
            <button class="modal-close" data-close="modalEstoque">&times;</button>
          </div>
          <form id="formEstoque" class="modal-form" novalidate>
            <div class="form-group">
              <label>Código de Barras</label>
              <input type="text" id="fBarcode" placeholder="Escanear ou digitar...">
            </div>
            <div class="form-group">
              <label>Nome da Peça <span class="req">*</span></label>
              <input type="text" id="fNome" required placeholder="Ex: Vestido Floral">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>SKU</label>
                <div class="input-addon">
                  <input type="text" id="fSKU" placeholder="LW-0000">
                  <button type="button" id="btnGerarSKU" class="btn-icon" title="Gerar SKU">↻</button>
                </div>
              </div>
              <div class="form-group">
                <label>Categoria <span class="req">*</span></label>
                <select id="fCategoria" required>
                  <option value="">Selecionar...</option>
                  <option>Camiseta</option><option>Calça</option><option>Vestido</option>
                  <option>Short</option><option>Blusa</option><option>Jaqueta</option>
                  <option>Saia</option><option>Moletom</option><option>Acessório</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Tamanho <span class="req">*</span></label>
                <select id="fTamanho" required>
                  <option value="">Selecionar...</option>
                  <option>PP</option><option>P</option><option>M</option><option>G</option>
                  <option>GG</option><option>XGG</option><option>34</option><option>36</option>
                  <option>38</option><option>40</option><option>42</option><option>44</option><option>46</option>
                </select>
              </div>
              <div class="form-group">
                <label>Cor <span class="req">*</span></label>
                <select id="fCor" required>
                  <option value="">Selecionar...</option>
                  <option>Preto</option><option>Branco</option><option>Azul</option><option>Vermelho</option>
                  <option>Verde</option><option>Rosa</option><option>Bege</option><option>Marrom</option>
                  <option>Cinza</option><option>Amarelo</option><option>Outra</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Preço (R$) <span class="req">*</span></label>
                <input type="number" id="fPreco" required min="0" step="0.01" placeholder="0,00">
              </div>
              <div class="form-group">
                <label>Quantidade <span class="req">*</span></label>
                <input type="number" id="fQtd" required min="0" step="1" placeholder="0">
              </div>
            </div>
            <div class="form-group">
              <label>Imagem</label>
              <input type="url" id="fImgUrl" placeholder="https://... ou escolha arquivo abaixo">
              <input type="file" id="fImgFile" accept="image/*" style="margin-top:0.4rem">
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" data-close="modalEstoque">Cancelar</button>
              <button type="submit" id="btnSalvarProduto" class="btn btn-primary">Salvar Produto</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Repor -->
      <div id="modalRepor" class="modal-overlay" hidden>
        <div class="modal modal-sm">
          <div class="modal-header">
            <h2>Repor Estoque</h2>
            <button class="modal-close" data-close="modalRepor">&times;</button>
          </div>
          <div class="modal-form">
            <p id="reporNome" style="font-weight:600;margin-bottom:1rem;color:var(--text)"></p>
            <div class="form-group">
              <label>Quantidade a Adicionar</label>
              <input type="number" id="reporQtd" min="1" step="1" value="1" class="input-lg">
            </div>
            <div class="modal-actions">
              <button class="btn btn-secondary" data-close="modalRepor">Cancelar</button>
              <button id="btnConfirmarRepor" class="btn btn-primary">+ Adicionar</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Confirm Deletar -->
      <div id="modalConfirmDel" class="modal-overlay" hidden>
        <div class="modal modal-sm">
          <p class="confirm-text">Remover este produto do estoque?</p>
          <div class="modal-actions">
            <button class="btn btn-secondary" data-close="modalConfirmDel">Cancelar</button>
            <button id="btnConfirmDel" class="btn btn-danger">Deletar</button>
          </div>
        </div>
      </div>

    </div>`;
}

// ── Init da view ──────────────────────────────────────────────
export async function initView() {
  // Carrega produtos
  await loadProducts();

  // Filtros
  let searchTimer;
  document.getElementById("estoqueSearch").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilters, 250);
  });
  ["filterTam", "filterCor", "filterCat"].forEach(id =>
    document.getElementById(id).addEventListener("change", applyFilters)
  );

  // FAB → abre modal
  document.getElementById("fabEstoque").addEventListener("click", () => openModal());

  // Gerar SKU
  document.getElementById("btnGerarSKU").addEventListener("click", () => {
    document.getElementById("fSKU").value = gerarSKU();
  });

  // Submit form novo produto
  document.getElementById("formEstoque").addEventListener("submit", handleSubmitProduto);

  // Delegação de eventos no grid (Repor / Deletar)
  document.getElementById("estoqueGrid").addEventListener("click", handleGridClick);

  // Botões de fechar modal
  document.querySelectorAll("[data-close]").forEach(btn =>
    btn.addEventListener("click", () => closeModal(btn.dataset.close))
  );

  // Fechar overlay ao clicar fora
  ["modalEstoque", "modalRepor", "modalConfirmDel"].forEach(id => {
    document.getElementById(id)?.addEventListener("click", e => {
      if (e.target.id === id) closeModal(id);
    });
  });
}

// ── Funções internas ──────────────────────────────────────────

async function loadProducts() {
  const grid = document.getElementById("estoqueGrid");
  grid.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  try {
    allProducts = await fetchRoupas();
    renderGrid(allProducts);
  } catch (err) {
    showToast(err.message, "error");
    grid.innerHTML = "";
  }
}

function applyFilters() {
  const search   = document.getElementById("estoqueSearch").value.toLowerCase();
  const tamanho  = document.getElementById("filterTam").value;
  const cor      = document.getElementById("filterCor").value;
  const categoria= document.getElementById("filterCat").value;
  const filtered = allProducts.filter(p =>
    (!search   || p.nome.toLowerCase().includes(search) || p.sku?.toLowerCase().includes(search)) &&
    (!tamanho  || p.tamanho === tamanho) &&
    (!cor      || p.cor === cor) &&
    (!categoria|| p.categoria === categoria)
  );
  renderGrid(filtered);
}

function renderGrid(produtos) {
  const grid  = document.getElementById("estoqueGrid");
  const count = document.getElementById("estoqueCount");
  grid.innerHTML = "";

  if (!produtos.length) {
    grid.innerHTML = `<p class="empty-state">Nenhum produto encontrado.</p>`;
    count.textContent = "";
    return;
  }

  count.textContent = `Mostrando ${produtos.length} de ${allProducts.length} produtos`;
  const frag = document.createDocumentFragment();
  produtos.forEach(p => frag.appendChild(buildCard(p)));
  grid.appendChild(frag);
}

function buildCard(p) {
  const unavail = p.quantidade <= 0;
  const card = document.createElement("article");
  card.className = `pcard${unavail ? " pcard--unavail" : ""}`;
  card.dataset.id  = p.id;
  card.dataset.qty = p.quantidade;

  const img = p.imagem_url
    ? `<img src="${p.imagem_url}" alt="${p.nome}" class="pcard-img" loading="lazy" onerror="this.outerHTML='<div class=\\'pcard-img pcard-img--empty\\'>👗</div>'">`
    : `<div class="pcard-img pcard-img--empty">👗</div>`;

  card.innerHTML = `
    ${img}
    ${unavail ? `<span class="unavail-badge">Indisponível</span>` : ""}
    <div class="pcard-body">
      <span class="pcard-sku">${p.sku || "—"}</span>
      <span class="pcard-name" title="${p.nome}">${p.nome}</span>
      <span class="pcard-meta">TAM: ${p.tamanho} &nbsp;|&nbsp; COR: ${p.cor}</span>
      <div class="pcard-row">
        <span class="pcard-qty ${unavail ? "pcard-qty--zero" : ""}">QTD: ${p.quantidade}</span>
        <span class="pcard-price">${brl(p.preco)}</span>
      </div>
    </div>
    <div class="pcard-footer">
      <button class="pcard-btn btn-repor" data-id="${p.id}" data-nome="${p.nome}" data-qty="${p.quantidade}">+ Repor</button>
      <button class="pcard-btn pcard-btn--danger btn-deletar" data-id="${p.id}">🗑 Deletar</button>
    </div>`;
  return card;
}

function openModal() {
  const form = document.getElementById("formEstoque");
  form.reset();
  document.getElementById("fSKU").value = gerarSKU();
  document.getElementById("modalEstoque").hidden = false;
  document.getElementById("fNome").focus();
}

function closeModal(id) {
  document.getElementById(id).hidden = true;
}

// Estado para repor/deletar pendente
let pendingReporId = null;
let pendingReporQtyBase = 0;
let pendingDelId = null;

function handleGridClick(e) {
  const btnRepor  = e.target.closest(".btn-repor");
  const btnDel    = e.target.closest(".btn-deletar");
  if (btnRepor) {
    pendingReporId = btnRepor.dataset.id;
    pendingReporQtyBase = parseInt(btnRepor.dataset.qty, 10);
    document.getElementById("reporNome").textContent = btnRepor.dataset.nome;
    document.getElementById("reporQtd").value = 1;
    document.getElementById("modalRepor").hidden = false;
    document.getElementById("reporQtd").focus();
  }
  if (btnDel) {
    pendingDelId = btnDel.dataset.id;
    document.getElementById("modalConfirmDel").hidden = false;
  }
}

// Confirmar repor
document.addEventListener("click", async (e) => {
  if (e.target.id === "btnConfirmarRepor") {
    const add = parseInt(document.getElementById("reporQtd").value, 10);
    if (!add || add <= 0) { showToast("Quantidade inválida", "error"); return; }
    try {
      const updated = await reporEstoque(pendingReporId, add);
      // Atualiza cache
      const idx = allProducts.findIndex(p => p.id === pendingReporId);
      if (idx !== -1) allProducts[idx] = updated;
      applyFilters();
      closeModal("modalRepor");
      showToast(`+${add} unidades adicionadas.`);
    } catch (err) { showToast(err.message, "error"); }
  }

  if (e.target.id === "btnConfirmDel") {
    try {
      await deleteRoupa(pendingDelId);
      allProducts = allProducts.filter(p => p.id !== pendingDelId);
      applyFilters();
      closeModal("modalConfirmDel");
      showToast("Produto removido.");
    } catch (err) { showToast(err.message, "error"); }
  }
});

async function handleSubmitProduto(e) {
  e.preventDefault();
  if (!e.target.checkValidity()) { e.target.reportValidity(); return; }

  const btn = document.getElementById("btnSalvarProduto");
  btn.disabled = true; btn.textContent = "Salvando...";

  let imagem_url = document.getElementById("fImgUrl").value.trim() || null;
  const file = document.getElementById("fImgFile").files[0];
  if (file) imagem_url = await fileToDataUrl(file);

  try {
    const novo = await insertRoupa({
      sku:       document.getElementById("fSKU").value.trim() || gerarSKU(),
      nome:      document.getElementById("fNome").value.trim(),
      categoria: document.getElementById("fCategoria").value,
      tamanho:   document.getElementById("fTamanho").value,
      cor:       document.getElementById("fCor").value,
      preco:     parseFloat(document.getElementById("fPreco").value),
      quantidade:parseInt(document.getElementById("fQtd").value, 10),
      imagem_url,
    });
    allProducts.push(novo);
    allProducts.sort((a, b) => a.nome.localeCompare(b.nome));
    applyFilters();
    closeModal("modalEstoque");
    showToast(`"${novo.nome}" adicionado ao estoque.`);
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false; btn.textContent = "Salvar Produto";
  }
}
