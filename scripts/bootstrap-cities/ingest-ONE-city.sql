-- SQL script to ingest a sample city to the database
-- Values: (127407, 'Tampa', 1436, 'FL', 233, 'US', 27.94752000, -82.45843000, 'America/New_York')
-- First check if the city already exists to avoid duplicates
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.cities WHERE id = 127407) THEN
        INSERT INTO public.cities (
            id, 
            name, 
            state_id, 
            state_code, 
            country_id, 
            country_code, 
            latitude, 
            longitude, 
            timezone,
            created_at,
            updated_at,
            wikidata_id
        ) VALUES (
            127407, 
            'Tampa', 
            1436, 
            'FL', 
            233, 
            'US', 
            27.94752000, 
            -82.45843000, 
            'America/New_York',
            '2019-10-05 23:36:38',
            '2019-10-05 23:36:38',
            'Q49255'
        );
        
        RAISE NOTICE 'Sample city, Tampa, has been added to the cities table.';
    ELSE
        RAISE NOTICE 'Sample city, Tampa, already exists in the cities table.';
    END IF;
END
$$;

-- Verify the city was added
SELECT
    id,
    name,
    state_code,
    country_code,
    latitude,
    longitude,
    timezone
FROM
    public.cities
WHERE
    id = 127407;