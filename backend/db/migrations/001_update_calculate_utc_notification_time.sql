-- Migration: Update calculate_utc_notification_time function
-- Description: Updates the function to ensure proper timezone conversion
-- Drop the existing function
DROP FUNCTION IF EXISTS calculate_utc_notification_time (timezone_preference, notification_time_preference);

-- Recreate the function with updated implementation
CREATE OR REPLACE FUNCTION calculate_utc_notification_time (
    tz timezone_preference,
    time_pref notification_time_preference
) RETURNS TIME WITHOUT TIME ZONE AS $$
DECLARE
    local_time VARCHAR;
    local_timestamp TIMESTAMP;
    utc_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Set local time based on preference
    CASE time_pref
        WHEN 'morning' THEN local_time := '08:00:00';
        WHEN 'afternoon' THEN local_time := '14:00:00';
        WHEN 'evening' THEN local_time := '20:00:00';
        ELSE RAISE EXCEPTION 'Invalid notification_time_preference: %', time_pref;
    END CASE;
    
    -- Create a timestamp for the current date at the specified local time
    local_timestamp := (CURRENT_DATE || ' ' || local_time)::TIMESTAMP;
    
    -- First interpret this timestamp as being in the specified timezone
    -- Then convert it to UTC to get the correct offset that accounts for DST
    -- For example:
    -- '2025-04-24 08:00:00' interpreted as America/New_York time during DST 
    -- becomes '2025-04-24 12:00:00 UTC'
    utc_timestamp := local_timestamp AT TIME ZONE tz AT TIME ZONE 'UTC';
    
    -- Return just the time component
    RETURN utc_timestamp::TIME;
END;
$$ LANGUAGE plpgsql;

-- Update the utc_notification_time for all existing users to ensure consistency
DO $$
DECLARE
    user_rec RECORD;
    city_timezone timezone_preference;
BEGIN
    FOR user_rec IN SELECT user_id, city_id, notification_time_preference FROM users
    LOOP
        -- Get the timezone from the city
        SELECT timezone INTO city_timezone
        FROM cities
        WHERE id = user_rec.city_id;
        
        -- Update the UTC notification time
        UPDATE users 
        SET utc_notification_time = calculate_utc_notification_time(city_timezone, notification_time_preference)
        WHERE user_id = user_rec.user_id;
    END LOOP;
END;
$$;