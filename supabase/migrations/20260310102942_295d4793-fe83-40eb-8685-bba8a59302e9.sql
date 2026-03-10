
-- Create chat-files storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to chat-files
CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-files');

-- Allow authenticated users to read chat files
CREATE POLICY "Anyone can read chat files"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'chat-files');
