/*
  # Fix Storage and Messages

  1. Changes
    - Create proper storage buckets
    - Fix storage policies
    - Update message policies
*/

-- Create storage buckets if they don't exist
DO $$
BEGIN
  -- Create avatar-images bucket
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatar-images', 'avatar-images', true)
  ON CONFLICT (id) DO NOTHING;

  -- Create item-images bucket
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('item-images', 'item-images', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view public images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can read messages for their items" ON messages;

-- Create new storage policies
CREATE POLICY "Anyone can view public images"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('avatar-images', 'item-images'));

CREATE POLICY "Users can upload their own images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('avatar-images', 'item-images') AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create new messages policy
CREATE POLICY "Users can read messages for items"
  ON messages FOR SELECT
  TO authenticated
  USING (
    sender_id = auth.uid() OR
    item_id IN (
      SELECT id FROM items WHERE user_id = auth.uid()
    )
  );