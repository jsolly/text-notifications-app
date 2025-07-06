-- Function to insert users from JSON
CREATE OR REPLACE FUNCTION insert_users_from_json (json_data JSONB) RETURNS void AS $$
DECLARE
    user_record JSONB;
BEGIN
    FOR user_record IN SELECT * FROM jsonb_array_elements(json_data)
    LOOP
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
            is_active = EXCLUDED.is_active;

        -- Insert default notification preferences
        INSERT INTO notification_preferences (
            user_id,
            weather
        ) VALUES (
            (user_record->>'user_id')::UUID,
            false
        )
        ON CONFLICT (user_id) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;