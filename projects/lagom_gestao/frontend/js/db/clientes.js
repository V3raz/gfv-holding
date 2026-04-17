import { db } from "../supabase.js";

const T = "clientes";

/** Busca clientes por nome ou telefone */
export async function fetchClientes(search = "") {
  let q = db.from(T).select("*").order("nome");
  if (search) q = q.or(`nome.ilike.%${search}%,telefone.ilike.%${search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Busca cliente por ID com histórico de pedidos */
export async function fetchClienteById(id) {
  const { data, error } = await db.from(T).select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

/** Busca últimos pedidos de um cliente */
export async function fetchPedidosCliente(clienteId, limit = 10) {
  const { data, error } = await db
    .from("pedidos")
    .select(`*, itens_pedido(id, quantidade, preco_unitario, roupas(nome, imagem_url))`)
    .eq("cliente_id", clienteId)
    .eq("status", "finalizado")
    .order("finalizado_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** Insere novo cliente */
export async function insertCliente(dados) {
  const { data, error } = await db.from(T).insert(dados).select().single();
  if (error) throw error;
  return data;
}

/** Abate valor do débito pendente */
export async function abaterDebito(clienteId, valor) {
  const { data: cli, error: e1 } = await db.from(T).select("debito_pendente").eq("id", clienteId).single();
  if (e1) throw e1;
  const novoDebito = Math.max(0, cli.debito_pendente - valor);
  const { data, error } = await db.from(T).update({ debito_pendente: novoDebito }).eq("id", clienteId).select().single();
  if (error) throw error;
  return data;
}

/** Adiciona débito ao cliente (quando pagamento é 'anotado') */
export async function adicionarDebito(clienteId, valor) {
  const { data: cli, error: e1 } = await db.from(T).select("debito_pendente").eq("id", clienteId).single();
  if (e1) throw e1;
  const { data, error } = await db
    .from(T).update({ debito_pendente: cli.debito_pendente + valor }).eq("id", clienteId).select().single();
  if (error) throw error;
  return data;
}
