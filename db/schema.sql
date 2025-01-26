/*==============================================================*/
/* DOMAINS & CUSTOM TYPES                                        */
/*==============================================================*/
-- Temperatures are in Celsius (Convert to Fahrenheit during runtime/client/display if needed)
-- Approximately -49°F to 122°F (Don't expect temperatures outside of this range!)
CREATE DOMAIN temperature_type AS DECIMAL(5, 2) CHECK (VALUE BETWEEN -45 AND 50);

CREATE DOMAIN percentage_type AS INTEGER CHECK (VALUE BETWEEN 0 AND 100);

CREATE DOMAIN language_type AS VARCHAR(5) CHECK (VALUE IN ('en', 'es', 'fr'));

CREATE DOMAIN unit_type AS VARCHAR(10) CHECK (VALUE IN ('imperial', 'metric'));

CREATE DOMAIN delivery_status_type AS VARCHAR(20) CHECK (
    VALUE IN ('pending', 'sent', 'failed', 'delivered')
);

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE DOMAIN timezone_type AS TEXT CHECK (
    EXISTS (
        SELECT
            1
        FROM
            pg_timezone_names
        WHERE
            name = VALUE
    )
);

/*==============================================================*/
/* REFERENCE & SUPPORT TABLES                                    */
/*==============================================================*/
SELECT
    create_timestamp_columns ();

CREATE TABLE SupportedCountries (
    country_code CHAR(2) PRIMARY KEY,
    country_name VARCHAR(100) NOT NULL
);

CREATE TABLE SupportedCities (
    city_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    city_name VARCHAR(100) NOT NULL,
    country_code CHAR(2) REFERENCES SupportedCountries (country_code),
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
    notification_timezone timezone_type NOT NULL DEFAULT 'UTC',
    unit_preference unit_type NOT NULL DEFAULT 'metric',
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Cities table
CREATE TABLE Cities (
    city_id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    supported_city_id UUID NOT NULL REFERENCES SupportedCities (city_id),
    latitude NUMERIC(9, 6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude NUMERIC(9, 6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    timezone timezone_type NOT NULL,
    country_code CHAR(2) NOT NULL REFERENCES SupportedCountries (country_code)
);

-- User_Cities join table
CREATE TABLE User_Cities (
    user_id UUID NOT NULL REFERENCES Users (user_id) ON DELETE CASCADE,
    city_id UUID NOT NULL REFERENCES Cities (city_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, city_id) -- There can only be one user-city pair (Composite key)
);

-- CityWeather table
CREATE TABLE CityWeather (
    city_id UUID PRIMARY KEY REFERENCES Cities (city_id) ON DELETE CASCADE,
    weather_description TEXT NOT NULL,
    min_temperature temperature_type NOT NULL,
    max_temperature temperature_type NOT NULL,
    apparent_temperature temperature_type NOT NULL,
    relative_humidity percentage_type NOT NULL,
    cloud_coverage percentage_type NOT NULL,
    weather_report_date DATE NOT NULL,
    CONSTRAINT temperature_range_check CHECK (max_temperature >= min_temperature)
);

-- NotificationPreferences table
CREATE TABLE NotificationPreferences (
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
    user_id UUID REFERENCES Users (user_id) ON DELETE SET NULL,
    city_id UUID REFERENCES Cities (city_id) ON DELETE SET NULL,
    notification_time TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_time TIMESTAMP WITH TIME ZONE,
    delivery_status delivery_status_type NOT NULL DEFAULT 'pending',
    response_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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