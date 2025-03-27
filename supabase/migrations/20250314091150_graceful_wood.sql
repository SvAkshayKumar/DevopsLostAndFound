/*
  # Add resolved items tracking

  1. New Tables
    - `resolved_items`
      - `id` (uuid, primary key)
      - `item_id` (uuid, references items)
      - `resolver_id` (uuid, references auth.users)
      - `resolved_at` (timestamp with time zone)
      - `resolution_type` ('found' or 'claimed')

  2. Changes
    - Add `status` column to items table
    - Add policies for resolved items
*/

-- Add status to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'resolved'));

-- Create resolved items table
CREATE TABLE IF NOT EXISTS resolved_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES items NOT NULL,
  resolver_id uuid REFERENCES auth.users NOT NULL,
  resolved_at timestamptz DEFAULT now(),
  resolution_type text NOT NULL CHECK (resolution_type IN ('found', 'claimed'))
);

-- Enable RLS
ALTER TABLE resolved_items ENABLE ROW LEVEL SECURITY;

-- Policies for resolved items
CREATE POLICY "Anyone can read resolved items"
  ON resolved_items
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can resolve items they're involved with"
  ON resolved_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = item_id
      AND (
        items.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM messages
          WHERE messages.item_id = resolved_items.item_id
          AND messages.sender_id = auth.uid()
        )
      )
    )
  );

-- Create indexes
CREATE INDEX resolved_items_item_id_idx ON resolved_items(item_id);
CREATE INDEX resolved_items_resolver_id_idx ON resolved_items(resolver_id);
CREATE INDEX resolved_items_resolved_at_idx ON resolved_items(resolved_at DESC);