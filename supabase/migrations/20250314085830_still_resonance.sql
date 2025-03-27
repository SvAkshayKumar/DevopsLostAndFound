/*
  # Add messages table for chat functionality

  1. New Tables
    - `messages`
      - `id` (uuid, primary key)
      - `item_id` (uuid, references items)
      - `sender_id` (uuid, references auth.users)
      - `sender_email` (text)
      - `content` (text)
      - `image_url` (text, nullable)
      - `created_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `messages` table
    - Add policies for:
      - Users can read messages for items they're involved with
      - Authenticated users can create messages
      - Users can delete their own messages
*/

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES items NOT NULL,
  sender_id uuid REFERENCES auth.users NOT NULL,
  sender_email text NOT NULL,
  content text,
  image_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow users to read messages for items they're involved with
CREATE POLICY "Users can read messages for their items"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM items
      WHERE items.id = messages.item_id
      AND (
        items.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM messages m2
          WHERE m2.item_id = messages.item_id
          AND m2.sender_id = auth.uid()
        )
      )
    )
  );

-- Allow authenticated users to create messages
CREATE POLICY "Authenticated users can create messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Allow users to delete their own messages
CREATE POLICY "Users can delete their own messages"
  ON messages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);

-- Create indexes for better performance
CREATE INDEX messages_item_id_idx ON messages(item_id);
CREATE INDEX messages_sender_id_idx ON messages(sender_id);
CREATE INDEX messages_created_at_idx ON messages(created_at DESC);