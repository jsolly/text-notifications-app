Here is a schema I am considering for a new lambda that helps you plan what to wear based on the weather.

# Database Schema

Below is the complete schema design in a single document, including all tables:

1. **Users**  
2. **Cities**  
3. **CityWeather**  
4. **Notifications_Log**  

---

## 1. Users

| Field                       | Type                  | Notes                                                                                   |
| --------------------------- | --------------------- | --------------------------------------------------------------------------------------- |
| **user_id** (PK)            | INT (auto-increment)  | Primary key.                                                                            |
| **phone_number**            | VARCHAR(...) (Unique) | The user’s phone number. If unique, it prevents duplicate sign-ups for the same number. |
| **notification_time_zone**  | VARCHAR(...)          | Time zone for notifications (e.g., “America/Los_Angeles”).                              |
| **daily_notification_time** | TIME                  | Single notification time for all daily notifications                                    |
| **daily_fullmoon**          | BOOLEAN               | Whether to receive full moon notifications                                              |
| **daily_nasa**              | BOOLEAN               | Whether to receive NASA image of the day                                                |
| **daily_weather_outfit**    | BOOLEAN               | Whether to receive weather & outfit planning                                            |
| **daily_recipe**            | BOOLEAN               | Whether to receive daily recipe suggestions                                             |
| **instant_sunset**          | BOOLEAN               | Whether to receive instant sunset alerts                                                |
| **is_active**               | BOOLEAN               | Indicates if the user is currently subscribed/active.                                   |
| **created_at**              | DATETIME              | Timestamp of user sign-up.                                                              |
| **updated_at**              | DATETIME              | Last time the user’s record was updated.                                                |

---

## 2. Cities

| Field            | Type                 | Notes                                  |
| ---------------- | -------------------- | -------------------------------------- |
| **city_id** (PK) | INT (auto-increment) | Primary key.                           |
| **city_name**    | VARCHAR(...)         | The city’s name.                       |
| **latitude**     | DECIMAL(...)         | Latitude of the city centroid.         |
| **longitude**    | DECIMAL(...)         | Longitude of the city centroid.        |
| **time_zone**    | VARCHAR(...)         | The city’s local time zone identifier. |
| **country**      | VARCHAR(...)         | The city’s country.                    |
---

## 3. CityWeather

Since we only need **the latest weather** for each city (no historical data or multiple forecasts), each city has exactly one row in **CityWeather**.

| Field                   | Type                  | Notes                                                                                            |
| ----------------------- | --------------------- | ------------------------------------------------------------------------------------------------ |
| **city_id** (PK, FK)    | INT                   | **Primary Key** referencing **Cities.city_id**. One record per city for the latest weather data. |
| **weather_description** | TEXT                  | Raw weather description from NOAA, e.g. "SCATTERED_CLOUDS"                                       |
| **temperature**         | DECIMAL(...) or FLOAT | Current temperature                                                                              |
| **feels_like_temp**     | DECIMAL(...) or FLOAT | "Feels like" temperature                                                                         |
| **humidity**            | INT                   | Humidity percentage                                                                              |
| **cloud_coverage**      | INT                   | Cloud coverage (0–100)                                                                           |
| **wind_speed**          | DECIMAL(...) or FLOAT | Average wind speed                                                                               |
| **uv_index**            | DECIMAL(...) or FLOAT | UV index (0–11)                                                                                  |
| **visibility**          | INT                   | Visibility in meters                                                                             |
| **sunrise_time**        | DATETIME              | Sunrise time in local time zone                                                                  |
| **sunset_time**         | DATETIME              | Sunset time in local time zone                                                                   |
| **updated_at**          | DATETIME              | When this row was last updated                                                                   |

---

## 4. Notifications_Log

| Field                    | Type                 | Notes                                                                       |
| ------------------------ | -------------------- | --------------------------------------------------------------------------- |
| **notification_id** (PK) | INT (auto-increment) | Primary key                                                                 |
| **user_id** (FK)         | INT                  | References **Users.user_id**                                                |
| **city_id** (FK)         | INT                  | References **Cities.city_id**                                               |
| **notification_type**    | VARCHAR(50)          | Type of notification ('weather_outfit', 'nasa_daily', 'fullmoon', 'sunset') |
| **notification_time**    | DATETIME             | When the notification was triggered                                         |
| **sent_time**            | DATETIME             | Actual time the message was sent                                            |
| **message_content**      | TEXT                 | The complete message sent                                                   |
| **delivery_status**      | VARCHAR(...)         | Status from SMS provider (e.g. "SENT," "DELIVERED," "FAILED")               |
| **created_at**           | DATETIME             | When this log entry was created                                             |

---