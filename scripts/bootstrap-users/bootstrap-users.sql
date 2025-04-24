-- Function to insert users from JSON
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
            name_preference,
            language_preference,
            phone_country_code,
            phone_number,
            unit_preference,
            time_format_preference,
            notification_time_preference,
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
            name_preference = EXCLUDED.name_preference,
            language_preference = EXCLUDED.language_preference,
            unit_preference = EXCLUDED.unit_preference,
            time_format_preference = EXCLUDED.time_format_preference,
            notification_time_preference = EXCLUDED.notification_time_preference,
            is_active = EXCLUDED.is_active;

        -- Insert default notification preferences
        INSERT INTO notification_preferences (
            user_id,
            astronomy_photo_of_the_day,
            celestial_events,
            weather_outfit_suggestions,
            recipe_suggestions,
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