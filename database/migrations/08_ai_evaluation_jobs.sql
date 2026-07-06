-- Create table for AI Evaluation Jobs
CREATE TABLE IF NOT EXISTS ai_evaluation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,
    user_id UUID,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, error
    progress INT NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create table for AI Evaluation Results (Sections)
CREATE TABLE IF NOT EXISTS ai_evaluation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES ai_evaluation_jobs(id) ON DELETE CASCADE,
    section_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, error
    result_json JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id, section_name)
);

-- Enable RLS
ALTER TABLE ai_evaluation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_evaluation_results ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY "Users can view their own jobs" 
    ON ai_evaluation_jobs FOR SELECT 
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own jobs" 
    ON ai_evaluation_jobs FOR INSERT 
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own jobs" 
    ON ai_evaluation_jobs FOR UPDATE 
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view results for their jobs" 
    ON ai_evaluation_results FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM ai_evaluation_jobs 
            WHERE ai_evaluation_jobs.id = ai_evaluation_results.job_id 
            AND (auth.uid() = ai_evaluation_jobs.user_id OR ai_evaluation_jobs.user_id IS NULL)
        )
    );

CREATE POLICY "Users can insert results for their jobs" 
    ON ai_evaluation_results FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM ai_evaluation_jobs 
            WHERE ai_evaluation_jobs.id = ai_evaluation_results.job_id 
            AND (auth.uid() = ai_evaluation_jobs.user_id OR ai_evaluation_jobs.user_id IS NULL)
        )
    );

CREATE POLICY "Users can update results for their jobs" 
    ON ai_evaluation_results FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM ai_evaluation_jobs 
            WHERE ai_evaluation_jobs.id = ai_evaluation_results.job_id 
            AND (auth.uid() = ai_evaluation_jobs.user_id OR ai_evaluation_jobs.user_id IS NULL)
        )
    );
