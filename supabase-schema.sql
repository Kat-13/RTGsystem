-- RTG Database Schema for Supabase
-- Run this in your Supabase SQL Editor 

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'Team Member',
    active BOOLEAN DEFAULT true,
    trial_ends_at TIMESTAMPTZ,
    subscription_status VARCHAR(50) DEFAULT 'trial',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'Active',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Streams table
CREATE TABLE IF NOT EXISTS streams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    collapsed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Functional deliverables table
CREATE TABLE IF NOT EXISTS functional_deliverables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_date DATE,
    original_date DATE,
    assigned_user VARCHAR(255),
    owner VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Not Started',
    priority VARCHAR(20) DEFAULT 'Medium',
    planning_accuracy_score INTEGER DEFAULT 100,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklist items table
CREATE TABLE IF NOT EXISTS checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deliverable_id UUID REFERENCES functional_deliverables(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    done BOOLEAN DEFAULT false,
    done_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_streams_project_id ON streams(project_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_project_id ON functional_deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_stream_id ON functional_deliverables(stream_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_status ON functional_deliverables(status);
CREATE INDEX IF NOT EXISTS idx_checklist_deliverable_id ON checklist_items(deliverable_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE functional_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic policies - adjust as needed)
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view all projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Users can create projects" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update projects" ON projects FOR UPDATE USING (true);

CREATE POLICY "Users can view all streams" ON streams FOR SELECT USING (true);
CREATE POLICY "Users can manage streams" ON streams FOR ALL USING (true);

CREATE POLICY "Users can view all deliverables" ON functional_deliverables FOR SELECT USING (true);
CREATE POLICY "Users can manage deliverables" ON functional_deliverables FOR ALL USING (true);

CREATE POLICY "Users can view all checklist items" ON checklist_items FOR SELECT USING (true);
CREATE POLICY "Users can manage checklist items" ON checklist_items FOR ALL USING (true);

-- Insert a default project
INSERT INTO projects (id, name, description, status)
VALUES ('default-project-id'::uuid, 'Default Project', 'Default project for RTG system', 'Active')
ON CONFLICT (id) DO NOTHING;

-- Verify the schema
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'projects', 'streams', 'functional_deliverables', 'checklist_items')
ORDER BY tablename;

