import { db } from "../supabase.js";
import { descontarEstoque } from "./estoque.js";
import { adicionarDebito } from "./clientes.js";

/** Busca pedidos ativos (não finalizados) */
export async function fetchPedidosAtivos() {
  const { data, error } = await db
    .from("pedidos")
    .select("*, clientes(nome), itens_pedido(id)")
    .eq("status", "ativo")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Cria novo pedido */
export async function createPedido({ tipo = "balcao", clienteId = null } = {}) {
  const { data, error } = await db
    .from("pedidos")
    .insert({ tipo, cliente_id: clienteId, status: "ativo" })
    .select("*, clientes(nome)")
    .single();
  if (error) throw error;
  return data;
}

/** Busca itens de um pedido com detalhes da roupa */
export async function fetchItensPedido(pedidoId) {
  const { data, error } = await db
    .from("itens_pedido")
    .select("*, roupas(id, sku, nome, tamanho, cor, preco, imagem_url)")
    .eq("pedido_id", pedidoId);
  if (error) throw error;
  return data ?? [];
}

/** Adiciona item ao pedido e desconta do estoque */
export async function addItemPedido(pedidoId, roupa) {
  // Verifica se já existe item dessa roupa no pedido
  const { data: existente } = await db
    .from("itens_pedido")
    .select("id, quantidade")
    .eq("pedido_id", pedidoId)
    .eq("roupa_id", roupa.id)
    .maybeSingle();

  if (existente) {
    // Incrementa quantidade
    const { data, error } = await db
      .from("itens_pedido")
      .update({ quantidade: existente.quantidade + 1 })
      .eq("id", existente.id)
      .select("*, roupas(id, sku, nome, tamanho, cor, preco, imagem_url)")
      .single();
    if (error) throw error;
    await descontarEstoque(roupa.id, 1);
    return data;
  }

  // Insere novo item
  const { data, error } = await db
    .from("itens_pedido")
    .insert({ pedido_id: pedidoId, roupa_id: roupa.id, quantidade: 1, preco_unitario: roupa.preco })
    .select("*, roupas(id, sku, nome, tamanho, cor, preco, imagem_url)")
    .single();
  if (error) throw error;
  await descontarEstoque(roupa.id, 1);
  return data;
}

/** Remove item do pedido e devolve ao estoque */
export async function removeItemPedido(itemId, roupaId, quantidade) {
  const { error } = await db.from("itens_pedido").delete().eq("id", itemId);
  if (error) throw error;
  // Devolve ao estoque
  const { data: roupa, error: e2 } = await db.from("roupas").select("quantidade").eq("id", roupaId).single();
  if (!e2) await db.from("roupas").update({ quantidade: roupa.quantidade + quantidade }).eq("id", roupaId);
}

/** Atualiza desconto do pedido */
export async function updateDesconto(pedidoId, descPct) {
  const { data, error } = await db
    .from("pedidos").update({ desconto_pct: descPct }).eq("id", pedidoId).select().single();
  if (error) throw error;
  return data;
}

/** Finaliza pedido: salva total, forma de pagamento, timestamp */
export async function finalizarPedido(pedidoId, { formaPagamento, total, clienteId }) {
  const { data, error } = await db
    .from("pedidos")
    .update({ status: "finalizado", forma_pagamento: formaPagamento, total, finalizado_at: new Date().toISOString() })
    .eq("id", pedidoId)
    .select()
    .single();
  if (error) throw error;

  // Se pagamento anotado, acumula débito no cliente
  if (formaPagamento === "anotado" && clienteId) {
    await adicionarDebito(clienteId, total);
  }
  return data;
}

/** Cancela pedido e devolve itens ao estoque */
export async function cancelarPedido(pedidoId) {
  const itens = await fetchItensPedido(pedidoId);
  for (const item of itens) {
    const { data: r } = await db.from("roupas").select("quantidade").eq("id", item.roupa_id).single();
    if (r) await db.from("roupas").update({ quantidade: r.quantidade + item.quantidade }).eq("id", item.roupa_id);
  }
  const { error } = await db.from("pedidos").update({ status: "cancelado" }).eq("id", pedidoId);
  if (error) throw error;
}
