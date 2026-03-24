
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS deleted_by uuid[] NOT NULL DEFAULT '{}';
