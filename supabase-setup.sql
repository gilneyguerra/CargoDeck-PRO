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
