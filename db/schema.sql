/*==============================================================*/
/* DOMAINS & CUSTOM TYPES                                        */
/*==============================================================*/
-- Temperatures are in Celsius (Convert to Fahrenheit during runtime/client/display if needed)
-- Approximately -76°F to 140°F to cover extreme climates
-- Drop existing domains if they exist
DO $$ 
BEGIN
    -- Drop existing domains
    DROP DOMAIN IF EXISTS temperature_type CASCADE;
    DROP DOMAIN IF EXISTS percentage_type CASCADE;
    DROP DOMAIN IF EXISTS language_type CASCADE;
    DROP DOMAIN IF EXISTS unit_type CASCADE;
    DROP DOMAIN IF EXISTS delivery_status_type CASCADE;
    DROP DOMAIN IF EXISTS timezone_type CASCADE;
    DROP DOMAIN IF EXISTS notification_time_type CASCADE;
END $$;

-- Create domains
CREATE DOMAIN temperature_type AS DECIMAL(5, 2) CHECK (VALUE BETWEEN -60 AND 60);

CREATE DOMAIN percentage_type AS INTEGER CHECK (VALUE BETWEEN 0 AND 100);

CREATE DOMAIN language_type AS VARCHAR(5) CHECK (VALUE IN ('en', 'es', 'fr'));

CREATE DOMAIN unit_type AS VARCHAR(10) CHECK (VALUE IN ('imperial', 'metric'));

CREATE DOMAIN delivery_status_type AS VARCHAR(20) CHECK (
    VALUE IN ('pending', 'sent', 'failed', 'delivered')
);

CREATE DOMAIN time_format_type AS VARCHAR(20) CHECK (VALUE IN ('24h', '12h'));

CREATE DOMAIN notification_time_type AS VARCHAR(20) CHECK (VALUE IN ('morning', 'afternoon', 'evening'));

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- All US Timezones for now
CREATE DOMAIN timezone_type AS TEXT CHECK (
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

DROP FUNCTION IF EXISTS cleanup_expired_nasa_photos () CASCADE;

-- Create the common function used by multiple tables
CREATE OR REPLACE FUNCTION update_updated_at_column () RETURNS TRIGGER AS $$
BEGIN 
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

/*==============================================================*/
/* REFERENCE & SUPPORT TABLES                                    */
/*==============================================================*/
-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_cities_updated_at ON public.cities;

DROP TRIGGER IF EXISTS update_city_weather_updated_at ON public.city_weather;

DROP TRIGGER IF EXISTS update_notifications_log_updated_at ON public.notifications_log;

DROP TRIGGER IF EXISTS trigger_cleanup_expired_nasa_photos ON public.nasa_apod;

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
    timezone timezone_type NOT NULL,
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
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    city_id bigint NOT NULL REFERENCES public.cities (id) ON DELETE RESTRICT,
    preferred_name VARCHAR(100) NOT NULL DEFAULT 'User',
    preferred_language language_type NOT NULL,
    phone_country_code VARCHAR(5) NOT NULL CHECK (phone_country_code ~ '^\+[1-9][0-9]{0,3}$'),
    phone_number VARCHAR(15) NOT NULL CHECK (length(phone_number) BETWEEN 5 AND 15),
    full_phone VARCHAR(20) GENERATED ALWAYS AS (phone_country_code || phone_number) STORED,
    unit_preference unit_type NOT NULL,
    time_format time_format_type NOT NULL,
    daily_notification_time notification_time_type NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (phone_country_code, phone_number)
);

-- For Querying users by city_id
CREATE INDEX idx_users_city_id ON public.users (city_id);

CREATE TABLE public.city_weather (
    city_id bigint PRIMARY KEY REFERENCES public.cities (id) ON DELETE CASCADE,
    weather_description TEXT NOT NULL,
    min_temperature temperature_type NOT NULL,
    max_temperature temperature_type NOT NULL,
    apparent_temperature temperature_type NOT NULL,
    relative_humidity percentage_type NOT NULL,
    cloud_coverage percentage_type NOT NULL,
    weather_report_date DATE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Keep track of when the weather was last updated for a given city
    CONSTRAINT temperature_range_check CHECK (max_temperature >= min_temperature)
);

-- For querying city_weather by weather_report_date
CREATE INDEX idx_city_weather_report_date ON public.city_weather (weather_report_date);

-- Update the updated_at column for the City_Weather table when the weather is updated
CREATE TRIGGER update_city_weather_updated_at BEFORE
UPDATE ON public.city_weather FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column ();

CREATE TABLE public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.users (user_id) ON DELETE CASCADE,
    daily_fullmoon BOOLEAN NOT NULL DEFAULT false,
    daily_nasa BOOLEAN NOT NULL DEFAULT false,
    daily_weather_outfit BOOLEAN NOT NULL DEFAULT false,
    daily_recipe BOOLEAN NOT NULL DEFAULT false,
    instant_sunset BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE public.notifications_log (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID NOT NULL REFERENCES public.users (user_id) ON DELETE CASCADE,
    city_id bigint NOT NULL REFERENCES public.cities (id) ON DELETE CASCADE,
    notification_time TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_time TIMESTAMP WITH TIME ZONE,
    delivery_status delivery_status_type NOT NULL DEFAULT 'pending',
    response_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for notifications_log table
CREATE INDEX idx_notifications_log_user_id ON public.notifications_log (user_id);

CREATE INDEX idx_notifications_log_city_id ON public.notifications_log (city_id);

CREATE INDEX idx_notifications_log_notification_time ON public.notifications_log (notification_time);

CREATE INDEX idx_notifications_log_delivery_status ON public.notifications_log (delivery_status);

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
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Auto-delete records after 30 days
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

CREATE INDEX idx_nasa_apod_expires_at ON public.nasa_apod (expires_at);

-- Cleanup expired NASA photos after 30 days
CREATE OR REPLACE FUNCTION cleanup_expired_nasa_photos () RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.nasa_apod WHERE expires_at < CURRENT_TIMESTAMP;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_expired_nasa_photos
AFTER INSERT ON public.nasa_apod
EXECUTE FUNCTION cleanup_expired_nasa_photos ();