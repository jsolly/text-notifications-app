Here is a schema I am considering for a new lambda that helps you plan what to wear based on the weather.

# Database Schema

Below is the complete schema design in a single document, including all tables:

1. **Users**  
2. **Cities**  
3. **User_Cities** (Join Table)  
4. **CityWeather**  
5. **Notifications_Log**  

---

## 1. Users

| Field                     | Type                     | Notes                                                                                                          |
|---------------------------|--------------------------|---------------------------------------------------------------------------------------------------------------|
| **user_id** (PK)          | INT (auto-increment)     | Primary key.                                                                                                  |
| **phone_number**          | VARCHAR(...) (Unique)    | The user’s phone number. If unique, it prevents duplicate sign-ups for the same number.                       |
| **notification_time_zone**| VARCHAR(...)             | Time zone for notifications (e.g., “America/Los_Angeles”).                                                    |
| **is_active**             | BOOLEAN                  | Indicates if the user is currently subscribed/active.                                                         |
| **created_at**            | DATETIME                 | Timestamp of user sign-up.                                                                                    |
| **updated_at**            | DATETIME                 | Last time the user’s record was updated.                                                                      |

---

## 2. Cities

| Field            | Type                     | Notes                                             |
|------------------|--------------------------|----------------------------------------------------|
| **city_id** (PK) | INT (auto-increment)     | Primary key.                                      |
| **city_name**    | VARCHAR(...)             | The city’s name.                                  |
| **latitude**     | DECIMAL(...)             | Latitude of the city centroid.                    |
| **longitude**    | DECIMAL(...)             | Longitude of the city centroid.                   |
| **time_zone**    | VARCHAR(...)             | The city’s local time zone identifier.            |
| **country**      | VARCHAR(...)             | Optional, if your app handles multiple countries. |
| **created_at**   | DATETIME                 | When the city record was added.                   |
| **updated_at**   | DATETIME                 | When the city record was last updated.            |

---

## 3. User_Cities (Join Table)

| Field                     | Type                     | Notes                                                               |
|---------------------------|--------------------------|----------------------------------------------------------------------|
| **user_city_id** (PK)     | INT (auto-increment)     | Primary key.                                                         |
| **user_id** (FK)          | INT                      | References **Users.user_id**.                                        |
| **city_id** (FK)          | INT                      | References **Cities.city_id**.                                       |
| **created_at**            | DATETIME                 | When the user started tracking this city.                            |
| **updated_at**            | DATETIME                 | When this record was last updated (if the user changes preferences). |

---

## 4. CityWeather

Since we only need **the latest weather** for each city (no historical data or multiple forecasts), each city has exactly one row in **CityWeather**.

| Field                     | Type                     | Notes                                                                                                                  |
|---------------------------|--------------------------|-----------------------------------------------------------------------------------------------------------------------|
| **city_id** (PK, FK)      | INT                      | **Primary Key** referencing **Cities.city_id**. One record per city for the latest weather data.                       |
| **weather_description**   | TEXT                     | Raw weather description from NOAA, e.g. "SCATTERED_CLOUDS".                                                           |
| **humanized_description** | TEXT                     | Human-friendly weather description, e.g. "Partly cloudy with a gentle breeze".                                        |
| **temperature**           | DECIMAL(...) or FLOAT    | Current temperature.                                                                                                  |
| **feels_like_temp**       | DECIMAL(...) or FLOAT    | "Feels like" temperature (sometimes called "apparent temperature").                                                   |
| **humidity**              | INT                      | Humidity percentage.                                                                                                  |
| **cloud_coverage**        | INT                      | How sunny it is, usually represented by cloud coverage (0–100).                                                       |
| **wind_speed**            | DECIMAL(...) or FLOAT    | Average wind speed (units could be mph, km/h, etc.—ensure consistency).                                               |
| **updated_at**            | DATETIME                 | When this row was last updated (when fresh data was fetched).                                                         |

---

## 5. Notifications_Log

| Field                       | Type                     | Notes                                                                                                                   |
|----------------------------|--------------------------|------------------------------------------------------------------------------------------------------------------------|
| **notification_id** (PK)   | INT (auto-increment)     | Primary key.                                                                                                           |
| **user_id** (FK)           | INT                      | References **Users.user_id**. Identifies which user received the notification.                                         |
| **city_id** (FK)           | INT                      | References **Cities.city_id**. Identifies which city's weather was used.                                               |
| **notification_time**      | DATETIME                 | When the system *planned* or *triggered* the notification.                                                             |
| **sent_time**              | DATETIME                 | Actual time the message was sent (if different from `notification_time`).                                             |
| **message_content**        | TEXT                     | The complete message sent, including weather info and outfit recommendation.                                           |
| **delivery_status**        | VARCHAR(...)             | Status from your SMS provider (e.g. "SENT," "DELIVERED," "FAILED").                                                    |
| **response_message**       | TEXT                     | If the SMS provider returns an error or user replies; optional.                                                        |
| **created_at**             | DATETIME                 | When this log entry was created (i.e., upon sending).                                                                  |

---

### Indexing and Constraints (Summary)

- **Users**  
  - `PRIMARY KEY (user_id)`
  - `UNIQUE (phone_number)` (optional, if business logic requires unique numbers)  
  - Could index on `is_active` for fast lookups.  

- **Cities**  
  - `PRIMARY KEY (city_id)`  
  - Potential indexes on `city_name, country` if searching by city name/country is frequent.

- **User_Cities**  
  - `PRIMARY KEY (user_city_id)`  
  - `FOREIGN KEY (user_id) REFERENCES Users(user_id)`  
  - `FOREIGN KEY (city_id) REFERENCES Cities(city_id)`  
  - Index `(user_id, city_id)` might be beneficial for queries like “which cities does user X track?”

- **CityWeather**  
  - `PRIMARY KEY (city_id)`  
  - `FOREIGN KEY (city_id) REFERENCES Cities(city_id)` (on delete/update as needed).  

- **Notifications_Log**  
  - `PRIMARY KEY (notification_id)`  
  - `FOREIGN KEY (user_id) REFERENCES Users(user_id)`  
  - `FOREIGN KEY (city_id) REFERENCES Cities(city_id)`  
  - Index on `delivery_status` could help if you query by status.