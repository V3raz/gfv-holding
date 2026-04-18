import { db } from "../supabase.js";

const T = "anotacoes";

/** Busca todas as anotações, mais recentes primeiro */
export async function fetchAnotacoes() {
  const { data, error } = await db.from(T).select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Insere nova anotação */
export async function insertAnotacao(dados) {
  const { data, error } = await db.from(T).insert(dados).select().single();
  if (error) throw error;
  return data;
}

/** Atualiza anotação existente */
export async function updateAnotacao(id, dados) {
  const { data, error } = await db.from(T).update(dados).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

/** Remove anotação */
export async function deleteAnotacao(id) {
  const { error } = await db.from(T).delete().eq("id", id);
  if (error) throw error;
}
