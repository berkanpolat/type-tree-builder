
ALTER TABLE public.test_results ADD COLUMN IF NOT EXISTS proof_metadata jsonb DEFAULT NULL;
ALTER TABLE public.test_runs ADD COLUMN IF NOT EXISTS overall_status text DEFAULT 'pending';
ALTER TABLE public.test_runs ADD COLUMN IF NOT EXISTS layers text[] DEFAULT '{}'::text[];
