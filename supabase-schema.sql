-- Supabase Database Schema for Task Tracker (Clean Rebuild)
-- COPY AND RUN THIS ENTIRE SCRIPT IN YOUR SUPABASE SQL EDITOR to reset and recreate the tasks table.

-- WARNING: This will drop the existing tasks table and delete all its data.
DROP TABLE IF EXISTS public.tasks CASCADE;

-- Create the tasks table with all required columns
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read, insert, update, and delete access.
DROP POLICY IF EXISTS "Allow public select" ON public.tasks;
CREATE POLICY "Allow public select" ON public.tasks 
    FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Allow public insert" ON public.tasks;
CREATE POLICY "Allow public insert" ON public.tasks 
    FOR INSERT 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update" ON public.tasks;
CREATE POLICY "Allow public update" ON public.tasks 
    FOR UPDATE 
    USING (true) 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete" ON public.tasks;
CREATE POLICY "Allow public delete" ON public.tasks 
    FOR DELETE 
    USING (true);

-- Force PostgREST to reload the schema cache immediately
NOTIFY pgrst, 'reload schema';
