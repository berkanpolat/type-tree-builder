
-- Performance test runs
CREATE TABLE public.performance_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_type text NOT NULL DEFAULT 'manual', -- manual, scheduled
  status text NOT NULL DEFAULT 'running', -- running, completed, failed
  overall_score integer DEFAULT 0, -- 0-100
  system_status text DEFAULT 'healthy', -- healthy, warning, critical
  avg_response_time numeric DEFAULT 0,
  max_response_time numeric DEFAULT 0,
  error_rate numeric DEFAULT 0,
  total_endpoints integer DEFAULT 0,
  failed_endpoints integer DEFAULT 0,
  summary jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Individual test results per endpoint/page
CREATE TABLE public.performance_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.performance_tests(id) ON DELETE CASCADE,
  module text NOT NULL, -- api_health, page_performance, user_scenario, load_test
  endpoint text NOT NULL,
  response_time numeric DEFAULT 0,
  status_code integer,
  success boolean DEFAULT true,
  error_message text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Performance alerts
CREATE TABLE public.performance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid REFERENCES public.performance_tests(id) ON DELETE SET NULL,
  alert_type text NOT NULL, -- slow_response, high_error_rate, system_down
  severity text NOT NULL DEFAULT 'warning', -- warning, critical
  message text NOT NULL,
  endpoint text,
  value numeric,
  threshold numeric,
  acknowledged boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Scheduled test config
CREATE TABLE public.performance_test_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interval_minutes integer NOT NULL, -- 5, 15, 60, 1440
  enabled boolean DEFAULT false,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_perf_tests_created ON public.performance_tests(created_at DESC);
CREATE INDEX idx_perf_results_test_id ON public.performance_test_results(test_id);
CREATE INDEX idx_perf_alerts_created ON public.performance_alerts(created_at DESC);

-- RLS disabled - admin only via edge function
ALTER TABLE public.performance_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_test_schedules ENABLE ROW LEVEL SECURITY;

-- Insert default schedule options
INSERT INTO public.performance_test_schedules (interval_minutes, enabled) VALUES
(5, false),
(15, false),
(60, false),
(1440, false);
