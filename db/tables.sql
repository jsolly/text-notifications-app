-- Populate Countries
INSERT INTO
    Countries (country_code, country_name)
VALUES
    ('US', 'United States');

-- Populate Cities
INSERT INTO
    Cities (
        city_name,
        country_code,
        latitude,
        longitude,
        timezone
    )
VALUES
    (
        'Drexel Hill',
        'US',
        39.9471,
        -75.2938,
        'America/New_York'
    );