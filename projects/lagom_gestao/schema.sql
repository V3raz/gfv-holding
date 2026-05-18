-- ============================================================
-- LAGOM GESTÃO — Schema Supabase
-- Execute no SQL Editor do seu projeto Supabase
-- ============================================================

-- Tabela de produtos/estoque
CREATE TABLE IF NOT EXISTS roupas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku           TEXT NOT NULL UNIQUE,
  nome          TEXT NOT NULL,
  tamanho       TEXT NOT NULL,
  cor           TEXT NOT NULL,
  categoria     TEXT NOT NULL DEFAULT 'Outro',
  quantidade    INTEGER NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  preco         NUMERIC(10,2) NOT NULL DEFAULT 0,
  imagem_url    TEXT,
  marca_id      UUID,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de marcas (margem padrão por marca)
CREATE TABLE IF NOT EXISTS marcas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          TEXT NOT NULL UNIQUE,
  margem_padrao NUMERIC(6,2) NOT NULL DEFAULT 50 CHECK (margem_padrao >= 0),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de categorias
CREATE TABLE IF NOT EXISTS categorias (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FK roupas → marcas (separada pra funcionar com IF NOT EXISTS acima)
ALTER TABLE roupas DROP CONSTRAINT IF EXISTS roupas_marca_id_fkey;
ALTER TABLE roupas
  ADD CONSTRAINT roupas_marca_id_fkey
  FOREIGN KEY (marca_id) REFERENCES marcas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_roupas_marca_id ON roupas(marca_id);

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS clientes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT NOT NULL,
  telefone        TEXT,
  debito_pendente NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero           SERIAL UNIQUE,
  cliente_id       UUID REFERENCES clientes(id) ON DELETE SET NULL,
  tipo             TEXT NOT NULL DEFAULT 'balcao', -- 'balcao' | 'cliente' | 'expresso'
  status           TEXT NOT NULL DEFAULT 'ativo',  -- 'ativo' | 'finalizado' | 'cancelado'
  desconto_pct     NUMERIC(5,2) NOT NULL DEFAULT 0,
  forma_pagamento  TEXT,                            -- 'pix' | 'cartao' | 'dinheiro' | 'anotado'
  total            NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  finalizado_at    TIMESTAMPTZ
);

-- Tabela de itens do pedido
CREATE TABLE IF NOT EXISTS itens_pedido (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id       UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  roupa_id        UUID NOT NULL REFERENCES roupas(id) ON DELETE CASCADE,
  quantidade      INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  preco_unitario  NUMERIC(10,2) NOT NULL
);

-- Índices úteis para performance
CREATE INDEX IF NOT EXISTS idx_pedidos_status      ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente     ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_id     ON itens_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_roupas_sku          ON roupas(sku);

-- Tabela Caderninho (anotacoes)
CREATE TABLE IF NOT EXISTS anotacoes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo      TEXT NOT NULL DEFAULT '',
  conteudo    TEXT NOT NULL DEFAULT '',
  cliente_id  UUID REFERENCES clientes(id) ON DELETE SET NULL,
  pedido_id   UUID REFERENCES pedidos(id) ON DELETE SET NULL,
  cor         TEXT NOT NULL DEFAULT '#facc15',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anotacoes_cliente ON anotacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_anotacoes_pedido  ON anotacoes(pedido_id);

-- RLS aberto pro anon (app usa anon key direto, sem login)
ALTER TABLE roupas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE anotacoes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE marcas       ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias   ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['roupas','clientes','pedidos','itens_pedido','anotacoes','marcas','categorias'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_all_anon" ON %I', t, t);
    EXECUTE format('CREATE POLICY "%s_all_anon" ON %I FOR ALL TO anon USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;
