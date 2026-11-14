CREATE TABLE IF NOT EXISTS public.fullstack_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    assessment_completed BOOLEAN DEFAULT false,
    fullstack_level TEXT,
    overall_score INTEGER DEFAULT 0,
    frontend_score INTEGER DEFAULT 0,
    backend_score INTEGER DEFAULT 0,
    devops_score INTEGER DEFAULT 0,
    system_design_score INTEGER DEFAULT 0,
    problem_solving_score INTEGER DEFAULT 0,
    code_quality_score INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fullstack_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own fullstack_profile"
ON public.fullstack_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fullstack_profile"
ON public.fullstack_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fullstack_profile"
ON public.fullstack_profiles FOR UPDATE
USING (auth.uid() = user_id);
