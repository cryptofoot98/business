/*
  # Create chat_messages table

  1. New Tables
    - `chat_messages`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, cascade delete)
      - `role` (text, either 'user' or 'assistant')
      - `content` (text, the message text)
      - `action` (jsonb, nullable — structured fill action from AI)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `chat_messages`
    - Users can only SELECT, INSERT, DELETE their own messages

  3. Notes
    - Each row is one chat turn (user or assistant)
    - The `action` column stores the parsed form-fill payload when the AI produces one
    - Messages are ordered by `created_at` ascending for rendering
*/

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL DEFAULT '',
  action jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS chat_messages_user_id_created_at_idx
  ON chat_messages (user_id, created_at ASC);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat messages"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
