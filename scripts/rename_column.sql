-- Script to rename a column in PostgreSQL
-- Usage: psql -d your_database_name -f rename_column.sql
-- Replace these values with your actual table and column names
BEGIN;

DO $$ 
BEGIN
    -- Check if the column exists before attempting to rename
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notification_preferences' 
        AND column_name = 'daily_fullmoon'
    ) THEN
        -- Rename the column
        ALTER TABLE public.notification_preferences 
        RENAME COLUMN daily_fullmoon TO daily_celestial_events;
        
        RAISE NOTICE 'Column renamed successfully';
    ELSE
        RAISE NOTICE 'Column does not exist';
    END IF;
END $$;

COMMIT;