/*==============================================================*/
/* DOMAINS & CUSTOM TYPES                                        */
/*==============================================================*/
-- Temperatures are in Celsius (Convert to Fahrenheit during runtime/client/display if needed)
-- Approximately -76°F to 140°F to cover extreme climates
-- Drop existing domains if they exist
DO $$ 
BEGIN
    -- Drop existing domains
    DROP DOMAIN IF EXISTS temperature_preference CASCADE;
    DROP DOMAIN IF EXISTS percentage_preference CASCADE;
    DROP DOMAIN IF EXISTS language_preference CASCADE;
    DROP DOMAIN IF EXISTS unit_preference CASCADE;
    DROP DOMAIN IF EXISTS timezone_preference CASCADE;
    DROP DOMAIN IF EXISTS notification_time_preference CASCADE;
    DROP DOMAIN IF EXISTS delivery_status CASCADE;
    DROP DOMAIN IF EXISTS utc_notification_time CASCADE;
END $$;

-- Create domains
CREATE DOMAIN temperature_preference AS DECIMAL(5, 2) CHECK (VALUE BETWEEN -60 AND 60);

CREATE DOMAIN percentage_preference AS INTEGER CHECK (VALUE BETWEEN 0 AND 100);

CREATE DOMAIN language_preference AS VARCHAR(5) CHECK (VALUE IN ('en', 'es', 'fr'));

CREATE DOMAIN unit_preference AS VARCHAR(10) CHECK (VALUE IN ('imperial', 'metric'));

CREATE DOMAIN time_format_preference AS VARCHAR(20) CHECK (VALUE IN ('24h', '12h'));

CREATE DOMAIN notification_time_preference AS VARCHAR(20) CHECK (VALUE IN ('morning', 'afternoon', 'evening'));

CREATE DOMAIN delivery_status AS VARCHAR(20) CHECK (VALUE IN ('sent', 'failed'));

CREATE DOMAIN utc_notification_time AS TIME WITHOUT TIME ZONE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- All US Timezones for now
CREATE DOMAIN timezone_preference AS TEXT CHECK (
    VALUE IN (
        'America/Adak',
        'America/Anchorage',
        'America/Boise',
        'America/Chicago',
        'America/Denver',
        'America/Detroit',
        'America/Indiana/Indianapolis',
        'America/Indiana/Knox',
        'America/Indiana/Marengo',
        'America/Indiana/Petersburg',
        'America/Indiana/Tell_City',
        'America/Indiana/Vevay',
        'America/Indiana/Vincennes',
        'America/Indiana/Winamac',
        'America/Juneau',
        'America/Kentucky/Louisville',
        'America/Kentucky/Monticello',
        'America/Los_Angeles',
        'America/Menominee',
        'America/Metlakatla',
        'America/New_York',
        'America/Nome',
        'America/North_Dakota/Beulah',
        'America/North_Dakota/Center',
        'America/North_Dakota/New_Salem',
        'America/Phoenix',
        'America/Puerto_Rico',
        'America/Sitka',
        'America/Yakutat',
        'Asia/Magadan',
        'Pacific/Honolulu'
    )
);

/*==============================================================*/
/* COMMON FUNCTIONS                                              */
/*==============================================================*/
-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS update_updated_at_column () CASCADE;

DROP FUNCTION IF EXISTS cleanup_expired_apod_photos () CASCADE;

DROP FUNCTION IF EXISTS insert_users_from_json (jsonb) CASCADE;

DROP FUNCTION IF EXISTS calculate_utc_notification_time (timezone_preference, notification_time_preference) CASCADE;

-- Create the common function used by multiple tables
CREATE OR REPLACE FUNCTION update_updated_at_column () RETURNS TRIGGER AS $$
BEGIN 
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate UTC notification time based on city timezone and preference
-- This uses PostgreSQL's built-in timezone conversion capabilities
-- Eventually, we need an additional function to handle daylight savings time transitions
-- Currently, the database stays fixed to the local time of the city when the user is created/updated
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
        ELSE RAISE EXCEPTION 'Invalid notification_time: %', time_pref;
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

-- Function to insert users from JSON
CREATE OR REPLACE FUNCTION insert_users_from_json (json_data JSONB) RETURNS void AS $$
DECLARE
    user_record JSONB;
    existing_user RECORD;
BEGIN
    FOR user_record IN SELECT * FROM jsonb_array_elements(json_data)
    LOOP
        -- Log the incoming data
        RAISE NOTICE 'Processing user with phone: % %', user_record->>'phone_country_code', user_record->>'phone_number';
        RAISE NOTICE 'Incoming data: %', user_record;

        -- Check if user exists
        SELECT * INTO existing_user 
        FROM users 
        WHERE phone_country_code = user_record->>'phone_country_code' 
        AND phone_number = user_record->>'phone_number';

        IF existing_user IS NOT NULL THEN
            RAISE NOTICE 'User exists with ID: %', existing_user.id;
            RAISE NOTICE 'Current values: name=%, language=%, unit=%, time_format=%, notification_time=%, utc_notification_time=%, is_active=%',
                existing_user.name,
                existing_user.language,
                existing_user.unit,
                existing_user.time_format,
                existing_user.notification_time,
                existing_user.utc_notification_time,
                existing_user.is_active;
        ELSE
            RAISE NOTICE 'User does not exist, will create new user';
        END IF;

        -- Insert into users table
        INSERT INTO users (
            id,
            city_id,
            name,
            language,
            phone_country_code,
            phone_number,
            unit,
            time_format,
            notification_time,
            is_active
        ) VALUES (
            (user_record->>'user_id')::UUID,
            (user_record->>'city_id')::bigint,
            user_record->>'name_preference',
            (user_record->>'language_preference')::language_preference,
            user_record->>'phone_country_code',
            user_record->>'phone_number',
            (user_record->>'unit_preference')::unit_preference,
            (user_record->>'time_format_preference')::time_format_preference,
            (user_record->>'notification_time_preference')::notification_time_preference,
            (user_record->>'is_active')::boolean
        )
        ON CONFLICT (phone_country_code, phone_number) 
        DO UPDATE SET
            name = EXCLUDED.name,
            language = EXCLUDED.language,
            unit = EXCLUDED.unit,
            time_format = EXCLUDED.time_format,
            notification_time = EXCLUDED.notification_time,
            is_active = EXCLUDED.is_active
        RETURNING * INTO existing_user;

        RAISE NOTICE 'Final user state: name=%, language=%, unit=%, time_format=%, notification_time=%, utc_notification_time=%, is_active=%',
            existing_user.name,
            existing_user.language,
            existing_user.unit,
            existing_user.time_format,
            existing_user.notification_time,
            existing_user.utc_notification_time,
            existing_user.is_active;

        -- Insert default notification preferences
        INSERT INTO notification_preferences (
            user_id,
            astronomy_photo,
            celestial_events,
            weather_outfits,
            recipes,
            sunset_alerts
        ) VALUES (
            (user_record->>'user_id')::UUID,
            false,
            false,
            false,
            false,
            false
        )
        ON CONFLICT (user_id) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

/*==============================================================*/
/* REFERENCE & SUPPORT TABLES                                    */
/*==============================================================*/
-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_cities_updated_at ON public.cities;

DROP TRIGGER IF EXISTS update_city_weather_updated_at ON public.city_weather;

DROP TRIGGER IF EXISTS update_notifications_log_updated_at ON public.notifications_log;

DROP TRIGGER IF EXISTS trigger_cleanup_expired_apod_photos ON public.nasa_apod;

-- Drop existing tables if they exist
DO $$ 
BEGIN
    -- Drop tables in correct order due to dependencies
    DROP TABLE IF EXISTS public.notifications_log CASCADE;
    DROP TABLE IF EXISTS public.notification_preferences CASCADE;
    DROP TABLE IF EXISTS public.city_weather CASCADE;
    DROP TABLE IF EXISTS public.users CASCADE;
    DROP TABLE IF EXISTS public.cities CASCADE;
    DROP TABLE IF EXISTS public.nasa_apod CASCADE;
END $$;

-- Drop existing indexes if they exist
DO $$ 
BEGIN
    -- Drop indexes for cities table
    DROP INDEX IF EXISTS public.idx_cities_state_id;
    DROP INDEX IF EXISTS public.idx_cities_country_id;
    
    -- Drop indexes for users table
    DROP INDEX IF EXISTS public.idx_users_phone;
    DROP INDEX IF EXISTS public.idx_users_active;
    
    -- Drop indexes for notifications_log table
    DROP INDEX IF EXISTS public.idx_notifications_log_user_id;
    DROP INDEX IF EXISTS public.idx_notifications_log_city_id;
    DROP INDEX IF EXISTS public.idx_notifications_log_notification_time;
END $$;

/*==============================================================*/
/* CORE APPLICATION TABLES                                       */
/*==============================================================*/
CREATE TABLE public.cities (
    id bigint NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state_id bigint NOT NULL,
    state_code VARCHAR(255) NOT NULL,
    country_id bigint NOT NULL,
    country_code CHAR(2) NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
    latitude NUMERIC(10, 8) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude NUMERIC(11, 8) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    timezone timezone_preference NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    wikidata_id VARCHAR(255)
);

-- For querying cities by state_id
CREATE INDEX idx_cities_state_id ON public.cities (state_id);

-- For querying cities by country_id (Will be useful in the future when we have more than just US cities)
CREATE INDEX idx_cities_country_id ON public.cities (country_id);

-- Update the updated_at column for the Cities table when a city is updated
CREATE TRIGGER update_cities_updated_at BEFORE
UPDATE ON public.cities FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column ();

CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    city_id bigint NOT NULL REFERENCES public.cities (id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL DEFAULT 'User',
    language language_preference NOT NULL,
    phone_country_code VARCHAR(5) NOT NULL CHECK (phone_country_code ~ '^\+[1-9][0-9]{0,3}$'),
    phone_number VARCHAR(15) NOT NULL CHECK (length(phone_number) BETWEEN 5 AND 15),
    full_phone VARCHAR(20) GENERATED ALWAYS AS (phone_country_code || phone_number) STORED,
    unit unit_preference NOT NULL,
    time_format time_format_preference NOT NULL,
    notification_time notification_time_preference NOT NULL,
    utc_notification_time utc_notification_time,
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (phone_country_code, phone_number)
);

-- Trigger to automatically set utc_notification_time when a user is created or updated
CREATE OR REPLACE FUNCTION update_utc_notification_time () RETURNS TRIGGER AS $$
DECLARE
    city_timezone timezone_preference;
BEGIN
    -- Get the timezone from the city
    SELECT timezone INTO city_timezone
    FROM cities
    WHERE id = NEW.city_id;
    
    -- Calculate and set the UTC notification time
    NEW.utc_notification_time := calculate_utc_notification_time(city_timezone, NEW.notification_time);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_utc_notification_time BEFORE INSERT
OR
UPDATE OF city_id,
notification_time ON users FOR EACH ROW
EXECUTE FUNCTION update_utc_notification_time ();

-- For Querying users by city_id
CREATE INDEX idx_users_city_id ON public.users (city_id);

CREATE TABLE public.city_weather (
    city_id bigint PRIMARY KEY REFERENCES public.cities (id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    min_temp temperature_preference NOT NULL,
    max_temp temperature_preference NOT NULL,
    apparent_temp temperature_preference NOT NULL,
    humidity percentage_preference NOT NULL,
    cloud_cover percentage_preference NOT NULL,
    report_date DATE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT temperature_range_check CHECK (max_temp >= min_temp)
);

-- For querying city_weather by report_date
CREATE INDEX idx_city_weather_report_date ON public.city_weather (report_date);

-- Update the updated_at column for the City_Weather table when the weather is updated
CREATE TRIGGER update_city_weather_updated_at BEFORE
UPDATE ON public.city_weather FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column ();

CREATE TABLE public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
    astronomy_photo BOOLEAN NOT NULL DEFAULT false,
    celestial_events BOOLEAN NOT NULL DEFAULT false,
    weather_outfits BOOLEAN NOT NULL DEFAULT false,
    recipes BOOLEAN NOT NULL DEFAULT false,
    sunset_alerts BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE public.notifications_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
    city_id bigint NOT NULL REFERENCES public.cities (id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status delivery_status,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for notifications_log table
CREATE INDEX idx_notifications_log_user_id ON public.notifications_log (user_id);

CREATE INDEX idx_notifications_log_city_id ON public.notifications_log (city_id);

CREATE INDEX idx_notifications_log_sent_at ON public.notifications_log (sent_at);

CREATE INDEX idx_notifications_log_status ON public.notifications_log (status);

CREATE INDEX idx_notifications_log_type ON public.notifications_log (type);

-- Update the updated_at column for the Notifications_Log table when the notification is updated
CREATE TRIGGER update_notifications_log_updated_at BEFORE
UPDATE ON public.notifications_log FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column ();

CREATE TABLE public.nasa_apod (
    date DATE PRIMARY KEY,
    title TEXT NOT NULL,
    explanation TEXT NOT NULL,
    media_type VARCHAR(20) NOT NULL,
    original_url TEXT NOT NULL,
    s3_object_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

CREATE INDEX idx_nasa_apod_expires_at ON public.nasa_apod (expires_at);

-- Cleanup expired NASA photos after 30 days
CREATE OR REPLACE FUNCTION cleanup_expired_apod_photos () RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.nasa_apod WHERE expires_at < CURRENT_TIMESTAMP;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_expired_apod_photos
AFTER INSERT ON public.nasa_apod
EXECUTE FUNCTION cleanup_expired_apod_photos ();