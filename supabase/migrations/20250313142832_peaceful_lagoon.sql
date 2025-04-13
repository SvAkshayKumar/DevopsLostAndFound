/*
  # Create items table for lost and found items

  1. New Tables
    - `items`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `type` (text, either 'lost' or 'found')
      - `image_url` (text, nullable)
      - `user_id` (uuid, references auth.users)
      - `user_email` (text)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `items` table
    - Add policies for:
      - Anyone can read items
      - Authenticated users can create items
      - Users can update and delete their own items
*/

CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  type text NOT NULL CHECK (type IN ('lost', 'found')),
  image_url text,
  user_id uuid REFERENCES auth.users NOT NULL,
  user_email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read items
CREATE POLICY "Anyone can read items"
  ON items
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to create items
CREATE POLICY "Authenticated users can create items"
  ON items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own items
CREATE POLICY "Users can update their own items"
  ON items
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own items
CREATE POLICY "Users can delete their own items"
  ON items
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster searches
CREATE INDEX items_title_description_idx ON items USING gin(to_tsvector('english', title || ' ' || description));
CREATE INDEX items_type_idx ON items(type);
CREATE INDEX items_user_id_idx ON items(user_id);
CREATE INDEX items_created_at_idx ON items(created_at DESC);