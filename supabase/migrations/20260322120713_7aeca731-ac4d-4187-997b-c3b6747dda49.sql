
-- Test Center Tables

CREATE TABLE public.test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer NOT NULL DEFAULT 0,
  total_tests integer NOT NULL DEFAULT 0,
  passed_tests integer NOT NULL DEFAULT 0,
  failed_tests integer NOT NULL DEFAULT 0,
  warning_tests integer NOT NULL DEFAULT 0,
  environment text NOT NULL DEFAULT 'prod',
  triggered_by text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.test_runs(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  test_group text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'infrastructure',
  layer text NOT NULL DEFAULT 'infrastructure',
  status text NOT NULL DEFAULT 'pass',
  error_message text,
  error_category text,
  step_failed text,
  technical_detail text,
  solution text,
  duration_ms integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.test_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_result_id uuid REFERENCES public.test_results(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.test_runs(id) ON DELETE CASCADE,
  log_type text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.test_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cron_expression text NOT NULL DEFAULT '*/15 * * * *',
  test_layers text[] NOT NULL DEFAULT '{infrastructure}',
  enabled boolean NOT NULL DEFAULT false,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_test_results_run_id ON public.test_results(run_id);
CREATE INDEX idx_test_results_status ON public.test_results(status);
CREATE INDEX idx_test_logs_run_id ON public.test_logs(run_id);
CREATE INDEX idx_test_runs_started_at ON public.test_runs(started_at DESC);

-- RLS disabled for admin-only tables (accessed via service role)
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_schedules ENABLE ROW LEVEL SECURITY;
