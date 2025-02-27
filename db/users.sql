-- Populate Cities
INSERT INTO
    Cities (
        city_name,
        state_code,
        state_name,
        country_code,
        country_name,
        latitude,
        longitude,
        timezone
    )
VALUES
    (
        'Drexel Hill',
        'PA',
        'Pennsylvania',
        'US',
        'United States',
        39.9471,
        -75.2938,
        'America/New_York'
    ),
    (
        'Philadelphia',
        'PA',
        'Pennsylvania',
        'US',
        'United States',
        39.9526,
        -75.1652,
        'America/New_York'
    );