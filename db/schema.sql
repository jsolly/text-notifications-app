/*==============================================================*/
/* DOMAINS & CUSTOM TYPES                                        */
/*==============================================================*/
-- Temperatures are in Celsius (Convert to Fahrenheit during runtime/client/display if needed)
-- Approximately -76°F to 140°F to coverxs extreme climates
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
END $$;

-- Create domains
CREATE DOMAIN temperature_type AS DECIMAL(5, 2) CHECK (VALUE BETWEEN -60 AND 60);

CREATE DOMAIN percentage_type AS INTEGER CHECK (VALUE BETWEEN 0 AND 100);

CREATE DOMAIN language_type AS VARCHAR(5) CHECK (VALUE IN ('en', 'es', 'fr'));

CREATE DOMAIN unit_type AS VARCHAR(10) CHECK (VALUE IN ('imperial', 'metric'));

CREATE DOMAIN delivery_status_type AS VARCHAR(20) CHECK (
    VALUE IN ('pending', 'sent', 'failed', 'delivered')
);

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create timezone_type with proper validation
CREATE DOMAIN timezone_type AS TEXT CHECK (VALUE IN ('America/New_York'));

/*==============================================================*/
/* REFERENCE & SUPPORT TABLES                                    */
/*==============================================================*/
-- Drop existing tables if they exist
DO $$ 
BEGIN
    -- Drop tables in correct order due to dependencies
    DROP TABLE IF EXISTS Notifications_Log CASCADE;
    DROP TABLE IF EXISTS Notification_Preferences CASCADE;
    DROP TABLE IF EXISTS City_Weather CASCADE;
    DROP TABLE IF EXISTS User_Cities CASCADE;
    DROP TABLE IF EXISTS Cities CASCADE;
    DROP TABLE IF EXISTS Users CASCADE;
    DROP TABLE IF EXISTS NASA_APOD CASCADE;
END $$;

CREATE TABLE Cities (
    city_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    city_name VARCHAR(100) NOT NULL,
    state_code CHAR(2) CHECK (state_code ~ '^[A-Z]{2}$'),
    state_name VARCHAR(100), -- A country might not have any states (e.g Vatican City, Monaco, etc.)
    country_code CHAR(2) NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
    country_name VARCHAR(100) NOT NULL,
    latitude NUMERIC(9, 6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude NUMERIC(9, 6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    timezone timezone_type NOT NULL,
    UNIQUE (city_name, country_code)
);

/*==============================================================*/
/* CORE APPLICATION TABLES                                       */
/*==============================================================*/
CREATE TABLE Users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    preferred_name VARCHAR(100),
    preferred_language language_type NOT NULL DEFAULT 'en',
    phone_number VARCHAR(20) UNIQUE NOT NULL CHECK (
        phone_number ~ '^\+[1-9]\d{0,2}\d{7,12}$'
        AND length(phone_number) BETWEEN 9 AND 16
    ),
    notification_timezone timezone_type NOT NULL,
    unit_preference unit_type NOT NULL DEFAULT 'metric',
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- User_Cities join table
CREATE TABLE User_Cities (
    user_id UUID NOT NULL REFERENCES Users (user_id) ON DELETE CASCADE,
    city_id UUID NOT NULL REFERENCES Cities (city_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, city_id) -- There can only be one user-city pair
);

-- CityWeather table
CREATE TABLE City_Weather (
    city_id UUID PRIMARY KEY REFERENCES Cities (city_id) ON DELETE CASCADE,
    weather_description TEXT NOT NULL,
    min_temperature temperature_type NOT NULL,
    max_temperature temperature_type NOT NULL,
    apparent_temperature temperature_type NOT NULL,
    relative_humidity percentage_type NOT NULL,
    cloud_coverage percentage_type NOT NULL,
    weather_report_date DATE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- Keep track of when the weather was last updated for a given city
    CONSTRAINT temperature_range_check CHECK (max_temperature >= min_temperature)
);

-- NotificationPreferences table
CREATE TABLE Notification_Preferences (
    user_id UUID PRIMARY KEY REFERENCES Users (user_id) ON DELETE CASCADE,
    daily_fullmoon BOOLEAN NOT NULL DEFAULT false,
    daily_nasa BOOLEAN NOT NULL DEFAULT false,
    daily_weather_outfit BOOLEAN NOT NULL DEFAULT true,
    daily_recipe BOOLEAN NOT NULL DEFAULT false,
    instant_sunset BOOLEAN NOT NULL DEFAULT false,
    daily_notification_time TIME NOT NULL
);

-- Notifications_Log table
CREATE TABLE Notifications_Log (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID REFERENCES Users (user_id) ON DELETE CASCADE,
    city_id UUID REFERENCES Cities (city_id) ON DELETE CASCADE,
    notification_time TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_time TIMESTAMP WITH TIME ZONE,
    delivery_status delivery_status_type NOT NULL DEFAULT 'pending',
    response_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- NASA_APOD table
CREATE TABLE NASA_APOD (
    date DATE PRIMARY KEY,
    title TEXT NOT NULL,
    explanation TEXT NOT NULL,
    media_type VARCHAR(20) NOT NULL,
    original_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Auto-delete records after 30 days
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

/*==============================================================*/
/* INDEXES                                                       */
/*==============================================================*/
-- For querying users by phone number
CREATE INDEX idx_users_phone ON Users (phone_number);

-- For querying active users
CREATE INDEX idx_users_active ON Users (user_id)
WHERE
    is_active = true;

/*==============================================================*/
/* TRIGGERS & FUNCTIONS                                          */
/*==============================================================*/
CREATE OR REPLACE FUNCTION update_updated_at_column () RETURNS TRIGGER AS $$
BEGIN 
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notifications_log_updated_at BEFORE
UPDATE ON Notifications_Log FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column ();

CREATE TRIGGER update_city_weather_updated_at BEFORE
UPDATE ON City_Weather FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column ();

-- Add trigger to auto-cleanup expired records
CREATE OR REPLACE FUNCTION cleanup_expired_nasa_photos () RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM NASA_APOD WHERE expires_at < CURRENT_TIMESTAMP;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_expired_nasa_photos
AFTER INSERT ON NASA_APOD
EXECUTE FUNCTION cleanup_expired_nasa_photos ();