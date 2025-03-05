-- Update insert_users_from_json function
CREATE OR REPLACE FUNCTION insert_users_from_json (json_data JSONB) RETURNS void AS $$
DECLARE
    user_record JSONB;
BEGIN
    FOR user_record IN SELECT * FROM jsonb_array_elements(json_data)
    LOOP
        -- Insert into users table
        INSERT INTO users (
            user_id,
            city_id,
            preferred_name,
            preferred_language,
            phone_country_code,
            phone_number,
            unit_preference,
            time_format,
            daily_notification_time,
            is_active
        ) VALUES (
            (user_record->>'user_id')::UUID,
            (user_record->>'city_id')::bigint,
            user_record->>'preferred_name',
            (user_record->>'preferred_language')::language_type,
            user_record->>'phone_country_code',
            user_record->>'phone_number',
            (user_record->>'unit_preference')::unit_type,
            (user_record->>'time_format')::time_format_type,
            (user_record->>'daily_notification_time')::notification_time_type,
            (user_record->>'is_active')::boolean
        )
        ON CONFLICT (phone_country_code, phone_number) 
        DO UPDATE SET
            preferred_name = EXCLUDED.preferred_name,
            preferred_language = EXCLUDED.preferred_language,
            unit_preference = EXCLUDED.unit_preference,
            time_format = EXCLUDED.time_format,
            daily_notification_time = EXCLUDED.daily_notification_time,
            is_active = EXCLUDED.is_active;

        -- Insert default notification preferences
        INSERT INTO notification_preferences (
            user_id,
            daily_nasa,
            daily_celestial_events,
            daily_weather_outfit,
            daily_recipe,
            instant_sunset
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