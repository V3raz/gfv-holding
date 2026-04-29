-- Migration 002 — Finanças: status, parcelas, transferência, conciliação
-- Aplicar no Supabase SQL Editor (Project → SQL Editor → New query → Paste → Run)
-- Idempotente: pode rodar mais de uma vez sem efeito colateral.

-- 1. Status da transação: separa o que já aconteceu do que está previsto
ALTER TABLE transacoes
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pago'
  CHECK (status IN ('pago', 'pendente', 'agendado'));

-- 2. Suporte a parcelamentos no cartão
ALTER TABLE transacoes
  ADD COLUMN IF NOT EXISTS parcela_atual    SMALLINT,
  ADD COLUMN IF NOT EXISTS total_parcelas   SMALLINT,
  ADD COLUMN IF NOT EXISTS id_grupo_parcela UUID;

-- Índice para buscar todas as parcelas de uma mesma compra
CREATE INDEX IF NOT EXISTS idx_transacoes_grupo_parcela
  ON transacoes (user_id, id_grupo_parcela)
  WHERE id_grupo_parcela IS NOT NULL;

-- 3. Vinculação de transferências entre contas (não conta como gasto real)
ALTER TABLE transacoes
  ADD COLUMN IF NOT EXISTS id_transferencia UUID;

-- 4. Flag de conciliação bancária
--    Lançamentos de ajuste não são gasto/receita real — são correções técnicas.
ALTER TABLE transacoes
  ADD COLUMN IF NOT EXISTS is_ajuste_conciliacao BOOLEAN NOT NULL DEFAULT FALSE;

-- Índice para projeções (filtra por status frequentemente)
CREATE INDEX IF NOT EXISTS idx_transacoes_status
  ON transacoes (user_id, status, data);

-- Backfill: transações existentes já estão pagas
UPDATE transacoes
  SET status = 'pago'
  WHERE status IS NULL OR status = '';
