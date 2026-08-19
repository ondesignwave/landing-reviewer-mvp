-- Landing Reviewer MVP — Initial Schema
-- Run in Supabase SQL Editor or via `supabase db push`

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'single', 'pro')),
    subscription_expires TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects table
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('figma', 'url', 'files')),
    source_url TEXT,
    figma_file_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Versions table (v1, v2, v3... per project)
CREATE TABLE public.versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    version_num INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
    screenshots JSONB,
    screenshot_urls TEXT[],
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, version_num)
);

-- Reports table (AI analysis results)
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_id UUID NOT NULL REFERENCES public.versions(id) ON DELETE CASCADE,
    criteria_scores JSONB NOT NULL, -- {hierarchy: 7, typography: 6, cta_scenario: 8, responsive: 5, conversion_blocks: 7}
    issues JSONB NOT NULL, -- {hierarchy: [...], typography: [...], ...}
    checklist JSONB NOT NULL, -- [{priority: 1, text: "...", criterion: "hierarchy"}, ...]
    overall_score NUMERIC(3,1) NOT NULL,
    pdf_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comparisons table (v1 vs v2 diff)
CREATE TABLE public.comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    v1_version_id UUID NOT NULL REFERENCES public.versions(id) ON DELETE CASCADE,
    v2_version_id UUID NOT NULL REFERENCES public.versions(id) ON DELETE CASCADE,
    diff JSONB NOT NULL, -- {improved: [...], degraded: [...], unchanged: [...], score_delta: 1.2}
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Share links (public view-only links)
CREATE TABLE public.share_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chat sessions (Ask Art Director)
CREATE TABLE public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    messages JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscriptions (payment records)
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tier TEXT NOT NULL CHECK (tier IN ('free', 'single', 'pro')),
    provider TEXT NOT NULL CHECK (provider IN ('yookassa', 'stripe')),
    provider_sub_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_versions_project_id ON public.versions(project_id);
CREATE INDEX idx_reports_version_id ON public.reports(version_id);
CREATE INDEX idx_share_links_token ON public.share_links(token);
CREATE INDEX idx_chat_sessions_report_id ON public.chat_sessions(report_id);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);

-- Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: can read/update own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Projects: users can CRUD own projects, anon can create (for preview)
CREATE POLICY "Users can view own projects" ON public.projects
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can update own projects" ON public.projects
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.projects
    FOR DELETE USING (auth.uid() = user_id);

-- Versions: users can view versions of own projects
CREATE POLICY "Users can view versions of own projects" ON public.versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id AND (p.user_id = auth.uid() OR p.user_id IS NULL)
        )
    );
CREATE POLICY "Users can insert versions to own projects" ON public.versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id AND (p.user_id = auth.uid() OR p.user_id IS NULL)
        )
    );
CREATE POLICY "Users can update versions of own projects" ON public.versions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id AND (p.user_id = auth.uid() OR p.user_id IS NULL)
        )
    );

-- Reports: users can view reports of own versions
CREATE POLICY "Users can view reports of own versions" ON public.reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.versions v
            JOIN public.projects p ON p.id = v.project_id
            WHERE v.id = version_id AND (p.user_id = auth.uid() OR p.user_id IS NULL)
        )
    );
CREATE POLICY "System can insert reports" ON public.reports
    FOR INSERT WITH CHECK (true); -- Service role

-- Comparisons
CREATE POLICY "Users can view comparisons of own projects" ON public.comparisons
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id AND (p.user_id = auth.uid() OR p.user_id IS NULL)
        )
    );

-- Share links: public read by token, users can create for own reports
CREATE POLICY "Public can view share links by token" ON public.share_links
    FOR SELECT USING (true);
CREATE POLICY "Users can create share links for own reports" ON public.share_links
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.reports r
            JOIN public.versions v ON v.id = r.version_id
            JOIN public.projects p ON p.id = v.project_id
            WHERE r.id = report_id AND p.user_id = auth.uid()
        )
    );

-- Chat sessions
CREATE POLICY "Users can view own chat sessions" ON public.chat_sessions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chat sessions" ON public.chat_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chat sessions" ON public.chat_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage subscriptions" ON public.subscriptions
    FOR ALL USING (true); -- Service role for webhooks

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER versions_updated_at BEFORE UPDATE ON public.versions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER reports_updated_at BEFORE UPDATE ON public.reports
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER chat_sessions_updated_at BEFORE UPDATE ON public.chat_sessions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Helper function: get user's current tier
CREATE OR REPLACE FUNCTION public.get_user_tier(user_uuid UUID)
RETURNS TEXT LANGUAGE sql STABLE AS $$
    SELECT subscription_tier FROM public.users WHERE id = user_uuid;
$$;

-- Helper function: check if user can analyze (free tier limits)
CREATE OR REPLACE FUNCTION public.can_user_analyze(user_uuid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT CASE
        WHEN user_uuid IS NULL THEN TRUE -- anon gets preview only
        ELSE (
            SELECT subscription_tier FROM public.users WHERE id = user_uuid
        ) IN ('single', 'pro') OR (
            SELECT subscription_tier FROM public.users WHERE id = user_uuid
        ) = 'free' AND (
            SELECT COUNT(*) FROM public.versions v
            JOIN public.projects p ON p.id = v.project_id
            WHERE p.user_id = user_uuid
            AND v.created_at > NOW() - INTERVAL '7 days'
        ) < 1
    END;
$$;