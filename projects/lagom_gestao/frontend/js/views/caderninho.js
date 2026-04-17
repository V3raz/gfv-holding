import { db } from "../supabase.js";
import { dataBR, showToast } from "../utils.js";

// ── Template ──────────────────────────────────────────────────
export function renderView() {
  return `
    <div class="view-caderninho">
      <div class="view-header">
        <h1 class="view-title">Caderninho 📓</h1>
        <button id="btnNovaAnotacao" class="btn btn-primary">+ Nova Anotação</button>
      </div>
      <div id="anotacoesList" class="anotacoes-list">
        <div class="loading"><div class="spinner"></div></div>
      </div>

      <div id="modalAnotacao" class="modal-overlay" hidden>
        <div class="modal">
          <div class="modal-header">
            <h2 id="modalAnotacaoTitulo">Nova Anotação</h2>
            <button class="modal-close" data-close="modalAnotacao">&times;</button>
          </div>
          <form id="formAnotacao" class="modal-form">
            <div class="form-group">
              <label>Título</label>
              <input type="text" id="anotacaoTitulo" placeholder="Ex: Pedido especial Fulana..." required>
            </div>
            <div class="form-group">
              <label>Anotação</label>
              <textarea id="anotacaoTexto" rows="6" placeholder="Digite aqui..." style="resize:vertical;width:100%;padding:0.6rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:0.9rem;background:var(--bg);color:var(--text)"></textarea>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" data-close="modalAnotacao">Cancelar</button>
              <button type="submit" class="btn btn-primary">Salvar</button>
            </div>
          </form>
        </div>
      </div>
    </div>`;
}

// ── Init ──────────────────────────────────────────────────────
export async function initView() {
  await loadAnotacoes();

  document.getElementById("btnNovaAnotacao").addEventListener("click", () => {
    document.getElementById("formAnotacao").reset();
    document.getElementById("modalAnotacaoTitulo").textContent = "Nova Anotação";
    document.getElementById("modalAnotacao").hidden = false;
  });

  document.getElementById("formAnotacao").addEventListener("submit", handleSalvar);

  document.querySelectorAll("[data-close]").forEach(btn =>
    btn.addEventListener("click", () => { document.getElementById(btn.dataset.close).hidden = true; })
  );
  document.getElementById("modalAnotacao").addEventListener("click", e => {
    if (e.target.id === "modalAnotacao") document.getElementById("modalAnotacao").hidden = true;
  });
}

async function loadAnotacoes() {
  const el = document.getElementById("anotacoesList");
  try {
    const { data, error } = await db.from("anotacoes").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    const lista = data ?? [];
    if (!lista.length) {
      el.innerHTML = `<p class="empty-state">Nenhuma anotação ainda. Clique em "+ Nova Anotação".</p>`;
      return;
    }
    el.innerHTML = lista.map(a => `
      <div class="anotacao-card" data-aid="${a.id}">
        <div class="anotacao-header">
          <span class="anotacao-titulo">${a.titulo}</span>
          <span class="anotacao-data">${dataBR(a.created_at)}</span>
        </div>
        <p class="anotacao-texto">${a.texto ?? ""}</p>
        <button class="btn-rm-anotacao" data-aid="${a.id}" title="Excluir">✕</button>
      </div>`).join("");

    el.querySelectorAll(".btn-rm-anotacao").forEach(btn =>
      btn.addEventListener("click", async () => {
        await db.from("anotacoes").delete().eq("id", btn.dataset.aid);
        btn.closest(".anotacao-card").remove();
        showToast("Anotação removida.");
      })
    );
  } catch (err) {
    el.innerHTML = `<p class="empty-state">Tabela "anotacoes" não encontrada no Supabase.</p>`;
  }
}

async function handleSalvar(e) {
  e.preventDefault();
  const titulo = document.getElementById("anotacaoTitulo").value.trim();
  const texto  = document.getElementById("anotacaoTexto").value.trim();
  try {
    const { error } = await db.from("anotacoes").insert({ titulo, texto });
    if (error) throw error;
    document.getElementById("modalAnotacao").hidden = true;
    await loadAnotacoes();
    showToast("Anotação salva.");
  } catch (err) { showToast(err.message, "error"); }
}
