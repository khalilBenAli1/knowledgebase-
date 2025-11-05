-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create roles if they don't exist
DO $$
BEGIN
    -- Insert default roles
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'roles') THEN
        -- Table will be created by TypeORM, so we'll insert data after first run
        RAISE NOTICE 'Roles table not yet created. Will be created by TypeORM.';
    END IF;
END$$;

-- You can add more initialization SQL here if needed
