-- CargoDeck-PRO Database Setup
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create stowage_plans table
CREATE TABLE IF NOT EXISTS stowage_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ship_code TEXT NOT NULL DEFAULT 'DEFAULT',
  state_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, ship_code)
);

-- Create cargo_items table
CREATE TABLE IF NOT EXISTS cargo_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE stowage_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargo_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stowage_plans
CREATE POLICY "Users can view their own stowage plans"
  ON stowage_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stowage plans"
  ON stowage_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stowage plans"
  ON stowage_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stowage plans"
  ON stowage_plans FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for cargo_items
CREATE POLICY "Users can view their own cargo items"
  ON cargo_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cargo items"
  ON cargo_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cargo items"
  ON cargo_items FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stowage_plans_user_id ON stowage_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_stowage_plans_user_ship ON stowage_plans(user_id, ship_code);
CREATE INDEX IF NOT EXISTS idx_cargo_items_user_id ON cargo_items(user_id);

-- =============================================================================
-- Containerização DANFE (cargas fiscais)
-- =============================================================================
-- Estas tabelas suportam a feature de unidades de transporte (containers,
-- cestas, skids, caixas) com itens DANFE (15 colunas regulatórias da NF-e).
-- Não confundir com a tabela cargo_items acima (cargas offshore), que continua
-- existindo e operando independentemente.
-- =============================================================================

-- Tabela: containers
-- Unidades de transporte criadas pelo usuário. Identificadas por nome único
-- por usuário, com tipo categórico e status ativo/inativo.
CREATE TABLE IF NOT EXISTS containers (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('container','cesta','skid','caixa','outro')),
  status      TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo','Inativo')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Tabela: container_items
-- 15 colunas DANFE conforme regulamentação NF-e. Numeric com escala adequada:
-- valores monetários em (15,2), quantidades em (15,4), alíquotas em (5,2).
CREATE TABLE IF NOT EXISTS container_items (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  container_id  UUID NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cod_prod      TEXT NOT NULL,
  descricao     TEXT NOT NULL,
  ncm_sh        TEXT,
  cst           TEXT,
  cfop          TEXT,
  unid          TEXT,
  qtde          NUMERIC(15,4) NOT NULL DEFAULT 0,
  vl_unitario   NUMERIC(15,4) NOT NULL DEFAULT 0,
  vl_total      NUMERIC(15,2) NOT NULL DEFAULT 0,
  vl_desconto   NUMERIC(15,2) NOT NULL DEFAULT 0,
  bc_icms       NUMERIC(15,2) NOT NULL DEFAULT 0,
  vl_icms       NUMERIC(15,2) NOT NULL DEFAULT 0,
  vl_ipi        NUMERIC(15,2) NOT NULL DEFAULT 0,
  aliq_icms     NUMERIC(5,2)  NOT NULL DEFAULT 0,
  aliq_ipi      NUMERIC(5,2)  NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE container_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own containers"
  ON containers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own containers"
  ON containers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own containers"
  ON containers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own containers"
  ON containers FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own container_items"
  ON container_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own container_items"
  ON container_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own container_items"
  ON container_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own container_items"
  ON container_items FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_containers_user_id ON containers(user_id);
CREATE INDEX IF NOT EXISTS idx_container_items_user_id ON container_items(user_id);
CREATE INDEX IF NOT EXISTS idx_container_items_container ON container_items(container_id);
