import { db } from "../supabase.js";

const T = "roupas";

/** Busca todos os produtos com filtros opcionais */
export async function fetchRoupas({ search = "", tamanho = "", cor = "", categoria = "" } = {}) {
  let q = db.from(T).select("*").order("nome");
  if (tamanho)   q = q.eq("tamanho", tamanho);
  if (cor)       q = q.eq("cor", cor);
  if (categoria) q = q.eq("categoria", categoria);
  if (search)    q = q.or(`nome.ilike.%${search}%,sku.ilike.%${search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Incrementa quantidade em estoque (usado pelo Repor) */
export async function reporEstoque(id, adicionar) {
  const { data: atual, error: e1 } = await db.from(T).select("quantidade").eq("id", id).single();
  if (e1) throw e1;
  const { data, error } = await db
    .from(T).update({ quantidade: atual.quantidade + adicionar }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

/** Remove um produto */
export async function deleteRoupa(id) {
  const { error } = await db.from(T).delete().eq("id", id);
  if (error) throw error;
}

/** Insere novo produto */
export async function insertRoupa(dados) {
  const { data, error } = await db.from(T).insert(dados).select().single();
  if (error) throw error;
  return data;
}

/** Desconta quantidade (chamado ao adicionar item no pedido) */
export async function descontarEstoque(id, qtd) {
  const { data: atual, error: e1 } = await db.from(T).select("quantidade").eq("id", id).single();
  if (e1) throw e1;
  const nova = Math.max(0, atual.quantidade - qtd);
  const { data, error } = await db.from(T).update({ quantidade: nova }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
