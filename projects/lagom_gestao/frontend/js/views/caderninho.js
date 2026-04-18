import { fetchAnotacoes, insertAnotacao, updateAnotacao, deleteAnotacao } from "../db/anotacoes.js";
import { dataBR, showToast } from "../utils.js";

// ——— Template ——————————————————————————————————————————————————
export function renderView() {
  return `
    <div class="view-caderninho">
      <div class="view-header">
        <h1 class="view-title">Caderninho</h1>
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

// ——— Init ——————————————————————————————————————————————————
export async function initView() {
  await loadAnotacoes();

  // Event listener para abrir o modal de nova anotação
  document.getElementById("btnNovaAnotacao").addEventListener("click", () => {
    const formAnotacao = document.getElementById("formAnotacao");
    formAnotacao.reset(); // Limpa o formulário
    delete formAnotacao.dataset.editingId; // Remove o ID de edição
    document.getElementById("modalAnotacaoTitulo").textContent = "Nova Anotação"; // Define o título do modal
    document.getElementById("modalAnotacao").hidden = false; // Exibe o modal
  });

  // Event listener para o envio do formulário de anotação
  document.getElementById("formAnotacao").addEventListener("submit", handleSalvar);

  // Event listeners para fechar modais
  document.querySelectorAll("[data-close]").forEach(btn =>
    btn.addEventListener("click", () => { document.getElementById(btn.dataset.close).hidden = true; })
  );
  // Fechar modal ao clicar fora
  document.getElementById("modalAnotacao").addEventListener("click", e => {
    if (e.target.id === "modalAnotacao") document.getElementById("modalAnotacao").hidden = true;
  });
}

// Carrega e renderiza as anotações
async function loadAnotacoes() {
  const el = document.getElementById("anotacoesList");
  el.innerHTML = `<div class="loading"><div class="spinner"></div></div>`; // Mostrar spinner de carregamento
  try {
    const lista = await fetchAnotacoes(); // Busca as anotações usando a nova função
    
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
        <div class="anotacao-actions">
            <button class="btn-edit-anotacao" 
                    data-aid="${a.id}" 
                    data-titulo="${a.titulo}" 
                    data-texto="${a.texto ?? ''}" 
                    title="Editar">Editar</button>
            <button class="btn-rm-anotacao" data-aid="${a.id}" title="Excluir">Excluir</button>
        </div>
      </div>`).join("");

    // Event listener para botões de remoção
    el.querySelectorAll(".btn-rm-anotacao").forEach(btn =>
      btn.addEventListener("click", async () => {
        if (confirm("Tem certeza que deseja excluir esta anotação?")) {
            try {
                await deleteAnotacao(btn.dataset.aid); // Chama a nova função de deleção
                btn.closest(".anotacao-card").remove();
                showToast("Anotação removida.");
                // Se não houver mais anotações, exibe a mensagem de estado vazio
                if (el.children.length === 0) {
                    el.innerHTML = `<p class="empty-state">Nenhuma anotação ainda. Clique em "+ Nova Anotação".</p>`;
                }
            } catch (err) {
                showToast(`Erro ao remover anotação: ${err.message}`, "error");
            }
        }
      })
    );

    // Event listener para botões de edição
    el.querySelectorAll(".btn-edit-anotacao").forEach(btn =>
        btn.addEventListener("click", () => {
            const formAnotacao = document.getElementById("formAnotacao");
            document.getElementById("modalAnotacaoTitulo").textContent = "Editar Anotação";
            document.getElementById("anotacaoTitulo").value = btn.dataset.titulo;
            document.getElementById("anotacaoTexto").value = btn.dataset.texto;
            formAnotacao.dataset.editingId = btn.dataset.aid; // Armazena o ID da anotação sendo editada
            document.getElementById("modalAnotacao").hidden = false;
        })
    );

  } catch (err) {
    // A camada db já trata erros, então aqui podemos mostrar uma mensagem genérica ou logar
    console.error("Erro ao carregar anotações:", err);
    el.innerHTML = `<p class="empty-state">Erro ao carregar anotações. Tente novamente mais tarde.</p>`;
    showToast(`Erro ao carregar anotações: ${err.message}`, "error");
  }
}

// Lida com o salvamento (inserção ou atualização) de uma anotação
async function handleSalvar(e) {
  e.preventDefault();
  const formAnotacao = document.getElementById("formAnotacao");
  const titulo = document.getElementById("anotacaoTitulo").value.trim();
  const texto  = document.getElementById("anotacaoTexto").value.trim();
  const id = formAnotacao.dataset.editingId; // Pega o ID se estiver editando

  try {
    if (id) {
      // Se houver um ID, atualiza a anotação existente
      await updateAnotacao(id, { titulo, texto });
      showToast("Anotação atualizada.");
    } else {
      // Caso contrário, insere uma nova anotação
      await insertAnotacao({ titulo, texto });
      showToast("Anotação salva.");
    }
    document.getElementById("modalAnotacao").hidden = true; // Esconde o modal
    delete formAnotacao.dataset.editingId; // Limpa o ID de edição
    await loadAnotacoes(); // Recarrega a lista de anotações
  } catch (err) { 
    showToast(`Erro ao salvar anotação: ${err.message}`, "error"); 
  }
}