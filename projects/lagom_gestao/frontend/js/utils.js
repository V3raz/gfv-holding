/** Formata número como moeda BRL */
export const brl = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

/** Formata data BR curta */
export const dataBR = (iso) =>
  new Date(iso).toLocaleDateString("pt-BR");

/** Gera SKU no formato LW-XXXX */
export const gerarSKU = () => `LW-${String(Math.floor(Math.random() * 9000) + 1000)}`;

/** Exibe toast global */
export function showToast(msg, type = "success") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast toast--${type} toast--show`;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("toast--show"), 3000);
}

/** Converte File para dataURL */
export const fileToDataUrl = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

/** Cria elemento a partir de HTML string */
export function html(str) {
  const t = document.createElement("template");
  t.innerHTML = str.trim();
  return t.content.firstElementChild;
}
