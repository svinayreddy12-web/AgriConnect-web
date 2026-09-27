import React, { useEffect, useState } from "react";
import {
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";

function Weather({ onBack }) {
  const firebaseUser = auth.currentUser;
  const userEmail = firebaseUser?.email || "";
  const userUid = firebaseUser?.uid || "";

  const userId = encodeURIComponent(
    userUid || userEmail || "guest"
  );

  const [location, setLocation] = useState(
    localStorage.getItem("agriWeatherLocation") ||
      "Bengaluru"
  );

  const [searchLocation, setSearchLocation] =
    useState(
      localStorage.getItem("agriWeatherLocation") ||
        "Bengaluru"
    );

  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [placeName, setPlaceName] = useState(
    localStorage.getItem("agriWeatherLocation") ||
      "Bengaluru"
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // WEATHER TEXT
  // --------------------------------------------------

  const weatherCodeText = (code) => {
    if (code === 0) return "Clear Sky";
    if (code <= 3) return "Partly Cloudy";
    if (code <= 48) return "Foggy";
    if (code <= 57) return "Drizzle";
    if (code <= 67) return "Rain";
    if (code <= 77) return "Snow";
    if (code <= 82) return "Rain Showers";
    if (code <= 86) return "Snow Showers";
    if (code >= 95) return "Thunderstorm";

    return "Unknown";
  };

  // --------------------------------------------------
  // WEATHER ICON
  // --------------------------------------------------

  const weatherIcon = (code) => {
    if (code === 0) return "☀️";
    if (code <= 3) return "⛅";
    if (code <= 48) return "🌫️";
    if (code <= 67) return "🌧️";
    if (code <= 77) return "❄️";
    if (code <= 82) return "🌦️";
    if (code <= 86) return "🌨️";
    if (code >= 95) return "⛈️";

    return "🌤️";
  };

  // --------------------------------------------------
  // SAVE LOCATION TO FIRESTORE
  // --------------------------------------------------

  const saveLocationToFirestore = async (
    cityName,
    fullPlaceName
  ) => {
    if (!userEmail) return;

    try {
      await setDoc(
        doc(db, "userSettings", userId),
        {
          ownerUid: userUid,
          ownerEmail: userEmail,
          weatherLocation: cityName,
          weatherPlaceName: fullPlaceName,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error(
        "Unable to sync weather location:",
        err
      );
    }
  };

  // --------------------------------------------------
  // SAVE WEATHER ALERT TO FIRESTORE
  // --------------------------------------------------

  const saveWeatherAlert = async (message) => {
    if (!userEmail) return;

    try {
      await setDoc(
        doc(db, "weatherAlerts", userId),
        {
          ownerUid: userUid,
          ownerEmail: userEmail,
          message: message || "",
          active: Boolean(message),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error(
        "Unable to sync weather alert:",
        err
      );
    }
  };

  // --------------------------------------------------
  // GET WEATHER
  // --------------------------------------------------

  const getWeather = async (
    searchValue = location
  ) => {
    if (!searchValue.trim()) {
      setError("Please enter a location.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // LOCATION SEARCH
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          searchValue
        )}&count=1&language=en&format=json`
      );

      if (!geoResponse.ok) {
        throw new Error(
          "Location search failed."
        );
      }

      const geoData = await geoResponse.json();

      if (
        !geoData.results ||
        geoData.results.length === 0
      ) {
        throw new Error(
          "Location not found. Try another city."
        );
      }

      const place = geoData.results[0];

      const latitude = place.latitude;
      const longitude = place.longitude;

      // WEATHER API
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,rain_sum&timezone=auto&forecast_days=7`
      );

      if (!weatherResponse.ok) {
        throw new Error(
          "Unable to fetch weather data."
        );
      }

      const data = await weatherResponse.json();

      // PLACE NAME
      const fullPlaceName =
        `${place.name}${
          place.admin1
            ? `, ${place.admin1}`
            : ""
        }`;

      // CURRENT WEATHER
      setWeather(data.current);

      // FORECAST
      const daily = data.daily;

      const forecastData =
        daily?.time?.map((date, index) => ({
          date,
          weatherCode:
            daily.weather_code?.[index] ?? 0,
          maxTemperature:
            daily.temperature_2m_max?.[index],
          minTemperature:
            daily.temperature_2m_min?.[index],
          rainProbability:
            daily
              .precipitation_probability_max?.[
              index
            ],
          rainSum:
            daily.rain_sum?.[index],
        })) || [];

      setForecast(forecastData);

      // UPDATE STATE
      setPlaceName(fullPlaceName);
      setLocation(place.name);
      setSearchLocation(place.name);

      // LOCAL STORAGE CACHE
      localStorage.setItem(
        "agriWeatherLocation",
        place.name
      );

      localStorage.setItem(
        "agriWeatherData",
        JSON.stringify(data)
      );

      // Save the latest weather data to Firestore so Dashboard can use it.
      if (userEmail) {
        try {
          await setDoc(
            doc(db, "userSettings", userId),
            {
              ownerUid: userUid,
              ownerEmail: userEmail,
              weatherData: data,
              weatherLocation: place.name,
              weatherPlaceName: fullPlaceName,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (syncError) {
          console.error("Unable to sync weather data:", syncError);
        }
      }

      // WEATHER ALERT
      let alertMessage = "";

      if (
        Number(data.current?.rain || 0) > 0 ||
        Number(
          data.current?.precipitation || 0
        ) > 0
      ) {
        alertMessage =
          "Rain is currently expected. Check your crops and field conditions.";

        localStorage.setItem(
          "agriWeatherAlert",
          alertMessage
        );
      } else {
        localStorage.removeItem(
          "agriWeatherAlert"
        );
      }

      // FIRESTORE SYNC
      await saveLocationToFirestore(
        place.name,
        fullPlaceName
      );

      await saveWeatherAlert(alertMessage);
    } catch (err) {
      setError(
        err.message ||
          "Something went wrong while loading weather."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // LOAD WEATHER WHEN PAGE OPENS
  // --------------------------------------------------

  useEffect(() => {
    const savedData =
      localStorage.getItem(
        "agriWeatherData"
      );

    if (savedData) {
      try {
        const data = JSON.parse(savedData);

        if (data.current) {
          setWeather(data.current);
        }

        if (data.daily?.time) {
          const daily = data.daily;

          const savedForecast =
            daily.time.map((date, index) => ({
              date,
              weatherCode:
                daily.weather_code?.[index] ?? 0,
              maxTemperature:
                daily.temperature_2m_max?.[
                  index
                ],
              minTemperature:
                daily.temperature_2m_min?.[
                  index
                ],
              rainProbability:
                daily
                  .precipitation_probability_max?.[
                  index
                ],
              rainSum:
                daily.rain_sum?.[index],
            }));

          setForecast(savedForecast);
        }
      } catch {
        // Ignore invalid saved data
      }
    }

    getWeather(location);
  }, []);

  // --------------------------------------------------
  // FIRESTORE LOCATION SYNC
  // --------------------------------------------------

  useEffect(() => {
    if (!userEmail) return;

    const settingsRef = doc(
      db,
      "userSettings",
      userId
    );

    const unsubscribe = onSnapshot(
      settingsRef,
      (snapshot) => {
        if (!snapshot.exists()) return;

        const data = snapshot.data();

        const remoteLocation =
          data.weatherLocation;

        const remotePlaceName =
          data.weatherPlaceName;

        if (
          remoteLocation &&
          remoteLocation !== location
        ) {
          setLocation(remoteLocation);
          setSearchLocation(remoteLocation);

          if (remotePlaceName) {
            setPlaceName(remotePlaceName);
          }

          getWeather(remoteLocation);
        }
      },
      (err) => {
        console.error(
          "Weather settings sync error:",
          err
        );
      }
    );

    return () => unsubscribe();
  }, [userEmail, userUid]);

  // --------------------------------------------------
  // SEARCH
  // --------------------------------------------------

  const handleSearch = (e) => {
    e.preventDefault();

    if (loading) return;

    getWeather(searchLocation);
  };

  // --------------------------------------------------
  // DATE FORMAT
  // --------------------------------------------------

  const formatDate = (date) => {
    const d = new Date(date);

    return d.toLocaleDateString(
      "en-IN",
      {
        weekday: "short",
        day: "numeric",
        month: "short",
      }
    );
  };

  // --------------------------------------------------
  // RECOMMENDATION
  // --------------------------------------------------

  const getRecommendation = () => {
    if (!weather) {
      return {
        icon: "🌾",
        title: "Checking weather",
        text: "Weather information will appear shortly.",
      };
    }

    const temperature =
      Number(weather.temperature_2m);

    const rain =
      Number(weather.rain || 0);

    if (rain > 0) {
      return {
        icon: "🌧️",
        title: "Rainy conditions",
        text: "Avoid unnecessary irrigation and check drainage around your crops.",
      };
    }

    if (temperature >= 35) {
      return {
        icon: "☀️",
        title: "High temperature",
        text: "Provide adequate irrigation and monitor crops for heat stress.",
      };
    }

    if (temperature <= 15) {
      return {
        icon: "❄️",
        title: "Cool conditions",
        text: "Protect temperature-sensitive crops and monitor for cold stress.",
      };
    }

    return {
      icon: "🌱",
      title: "Good farming conditions",
      text: "Weather conditions look suitable for normal field activities.",
    };
  };

  const recommendation =
    getRecommendation();

  return (
    <div style={styles.page}>
      <style>
        {`
          @media (max-width: 700px) {
            .weather-page {
              padding: 15px !important;
            }

            .weather-header {
              flex-direction: column !important;
              align-items: stretch !important;
            }

            .weather-header button {
              width: 100%;
            }

            .weather-search {
              flex-direction: column !important;
            }

            .weather-search input,
            .weather-search button {
              width: 100% !important;
            }

            .weather-main {
              grid-template-columns: 1fr !important;
            }

            .weather-details {
              grid-template-columns: 1fr 1fr !important;
            }

            .forecast-grid {
              grid-template-columns: 1fr 1fr !important;
            }
          }

          @media (max-width: 420px) {
            .weather-details,
            .forecast-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>

      <div
        className="weather-page"
        style={styles.container}
      >
        {/* HEADER */}

        <div
          className="weather-header"
          style={styles.header}
        >
          <div>
            <h1 style={styles.title}>
              🌦️ Weather
            </h1>

            <p style={styles.subtitle}>
              Weather information for your
              farming activities.
            </p>
          </div>

          <button
            onClick={onBack}
            style={styles.backButton}
          >
            ← Back
          </button>
        </div>

        {/* SEARCH */}

        <form
          className="weather-search"
          onSubmit={handleSearch}
          style={styles.searchBox}
        >
          <input
            value={searchLocation}
            onChange={(e) =>
              setSearchLocation(
                e.target.value
              )
            }
            placeholder="Enter city or location"
            style={styles.searchInput}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.searchButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading
                ? "not-allowed"
                : "pointer",
              transition: "none",
              transform: "none",
            }}
          >
            {loading
              ? "Loading..."
              : "🔍 Search Weather"}
          </button>

          <button
            type="button"
            onClick={() =>
              getWeather(location)
            }
            disabled={loading}
            style={{
              ...styles.refreshButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading
                ? "not-allowed"
                : "pointer",
              transition: "none",
              transform: "none",
            }}
          >
            🔄 Refresh
          </button>
        </form>

        {/* ERROR */}

        {error && (
          <div style={styles.error}>
            ⚠️ {error}
          </div>
        )}

        {weather && (
          <>
            {/* CURRENT WEATHER */}

            <div
              className="weather-main"
              style={styles.mainGrid}
            >
              <div style={styles.currentCard}>
                <p style={styles.location}>
                  📍 {placeName}
                </p>

                <div
                  style={styles.temperatureRow}
                >
                  <span
                    style={styles.bigIcon}
                  >
                    {weatherIcon(
                      weather.weather_code
                    )}
                  </span>

                  <div>
                    <div
                      style={
                        styles.temperature
                      }
                    >
                      {Math.round(
                        weather.temperature_2m
                      )}
                      °C
                    </div>

                    <div
                      style={styles.condition}
                    >
                      {weatherCodeText(
                        weather.weather_code
                      )}
                    </div>
                  </div>
                </div>

                <p style={styles.feelsLike}>
                  Feels like{" "}
                  {Math.round(
                    weather.apparent_temperature
                  )}
                  °C
                </p>
              </div>

              {/* CURRENT CONDITIONS */}

              <div
                style={styles.detailsCard}
              >
                <h2
                  style={styles.cardTitle}
                >
                  📊 Current Conditions
                </h2>

                <div
                  className="weather-details"
                  style={styles.detailsGrid}
                >
                  <div
                    style={styles.detail}
                  >
                    <span
                      style={
                        styles.detailIcon
                      }
                    >
                      💧
                    </span>

                    <small
                      style={
                        styles.detailLabel
                      }
                    >
                      Humidity
                    </small>

                    <strong>
                      {
                        weather.relative_humidity_2m
                      }
                      %
                    </strong>
                  </div>

                  <div
                    style={styles.detail}
                  >
                    <span
                      style={
                        styles.detailIcon
                      }
                    >
                      💨
                    </span>

                    <small
                      style={
                        styles.detailLabel
                      }
                    >
                      Wind
                    </small>

                    <strong>
                      {Math.round(
                        weather.wind_speed_10m
                      )}{" "}
                      km/h
                    </strong>
                  </div>

                  <div
                    style={styles.detail}
                  >
                    <span
                      style={
                        styles.detailIcon
                      }
                    >
                      🌧️
                    </span>

                    <small
                      style={
                        styles.detailLabel
                      }
                    >
                      Rain
                    </small>

                    <strong>
                      {weather.rain || 0}{" "}
                      mm
                    </strong>
                  </div>

                  <div
                    style={styles.detail}
                  >
                    <span
                      style={
                        styles.detailIcon
                      }
                    >
                      💦
                    </span>

                    <small
                      style={
                        styles.detailLabel
                      }
                    >
                      Precipitation
                    </small>

                    <strong>
                      {weather.precipitation ||
                        0}{" "}
                      mm
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* RECOMMENDATION */}

            <div
              style={styles.recommendation}
            >
              <div
                style={
                  styles.recommendationIcon
                }
              >
                {recommendation.icon}
              </div>

              <div>
                <h3
                  style={
                    styles.recommendationTitle
                  }
                >
                  {recommendation.title}
                </h3>

                <p
                  style={
                    styles.recommendationText
                  }
                >
                  {recommendation.text}
                </p>
              </div>
            </div>

            {/* FORECAST */}

            <h2
              style={styles.sectionTitle}
            >
              📅 7-Day Forecast
            </h2>

            <div
              className="forecast-grid"
              style={styles.forecastGrid}
            >
              {forecast.map(
                (day, index) => (
                  <div
                    key={day.date}
                    style={
                      styles.forecastCard
                    }
                  >
                    <strong>
                      {index === 0
                        ? "Today"
                        : formatDate(
                            day.date
                          )}
                    </strong>

                    <div
                      style={
                        styles.forecastIcon
                      }
                    >
                      {weatherIcon(
                        day.weatherCode
                      )}
                    </div>

                    <span
                      style={
                        styles.forecastCondition
                      }
                    >
                      {weatherCodeText(
                        day.weatherCode
                      )}
                    </span>

                    <div
                      style={
                        styles.forecastTemperature
                      }
                    >
                      <strong>
                        {day.maxTemperature !==
                        undefined
                          ? Math.round(
                              day.maxTemperature
                            )
                          : "--"}
                        °
                      </strong>

                      <span>
                        {" "}
                        /{" "}
                        {day.minTemperature !==
                        undefined
                          ? Math.round(
                              day.minTemperature
                            )
                          : "--"}
                        °
                      </span>
                    </div>

                    <small
                      style={
                        styles.forecastRain
                      }
                    >
                      🌧️{" "}
                      {day.rainProbability ??
                        0}
                      %
                    </small>
                  </div>
                )
              )}
            </div>
          </>
        )}

        {/* FARMER TIP */}

        <div style={styles.tipCard}>
          <h2 style={styles.tipTitle}>
            🌾 Farmer's Weather Tip
          </h2>

          <p style={styles.tipText}>
            Check the weather before irrigation,
            spraying pesticides, applying
            fertilizers, or harvesting crops.
            Planning farm work around rainfall
            and temperature can help reduce crop
            losses.
          </p>
        </div>

        {/* WEATHER ALERT */}

        <div style={styles.alertCard}>
          <h2 style={styles.alertTitle}>
            ⚠️ Weather Alert
          </h2>

          <p style={styles.alertText}>
            {weather &&
            Number(weather.rain || 0) > 0
              ? "Rain is currently being recorded. Avoid unnecessary irrigation and check your field drainage."
              : "No significant rainfall is currently recorded. Continue monitoring the forecast before major farm activities."}
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f8f3",
    padding: "20px",
  },

  container: {
    maxWidth: "1100px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "25px",
  },

  title: {
    margin: "0 0 6px",
    color: "#1b5e20",
    fontSize: "30px",
  },

  subtitle: {
    margin: 0,
    color: "#666",
  },

  backButton: {
    border: "none",
    background: "#e9f5eb",
    color: "#176b36",
    padding: "0 20px",
    borderRadius: "14px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "17px",
    minHeight: "50px",
    minWidth: "121px",
    transition: "none",
    transform: "none",
  },

  searchBox: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
  },

  searchInput: {
    flex: 1,
    padding: "12px 14px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    outline: "none",
    background: "white",
  },

  searchButton: {
    border: "none",
    background: "#2e7d32",
    color: "white",
    padding: "12px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "none",
    transform: "none",
  },

  refreshButton: {
    border: "1px solid #2e7d32",
    background: "white",
    color: "#2e7d32",
    padding: "12px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "none",
    transform: "none",
  },

  error: {
    background: "#ffebee",
    color: "#c62828",
    padding: "13px",
    borderRadius: "8px",
    marginBottom: "20px",
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1.3fr",
    gap: "18px",
    marginBottom: "18px",
  },

  currentCard: {
    background:
      "linear-gradient(135deg, #2e7d32, #66bb6a)",
    color: "white",
    borderRadius: "15px",
    padding: "25px",
    boxShadow:
      "0 5px 15px rgba(0,0,0,0.10)",
  },

  location: {
    margin: "0 0 25px",
    fontSize: "15px",
  },

  temperatureRow: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
  },

  bigIcon: {
    fontSize: "65px",
  },

  temperature: {
    fontSize: "48px",
    fontWeight: "bold",
    lineHeight: 1,
  },

  condition: {
    marginTop: "8px",
    fontSize: "17px",
  },

  feelsLike: {
    marginTop: "25px",
    marginBottom: 0,
    opacity: 0.9,
  },

  detailsCard: {
    background: "white",
    borderRadius: "15px",
    padding: "22px",
    boxShadow:
      "0 5px 15px rgba(0,0,0,0.06)",
  },

  cardTitle: {
    margin: "0 0 18px",
    color: "#2e7d32",
    fontSize: "20px",
  },

  detailsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, 1fr)",
    gap: "15px",
  },

  detail: {
    background: "#f7faf7",
    borderRadius: "10px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },

  detailIcon: {
    fontSize: "24px",
  },

  detailLabel: {
    color: "#777",
  },

  recommendation: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    background: "#e8f5e9",
    borderLeft: "5px solid #2e7d32",
    borderRadius: "10px",
    padding: "17px",
    marginBottom: "25px",
  },

  recommendationIcon: {
    fontSize: "35px",
  },

  recommendationTitle: {
    margin: "0 0 5px",
    color: "#2e7d32",
  },

  recommendationText: {
    margin: 0,
    color: "#555",
    lineHeight: 1.5,
  },

  sectionTitle: {
    color: "#2e7d32",
    marginBottom: "15px",
  },

  forecastGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(7, 1fr)",
    gap: "10px",
    marginBottom: "25px",
  },

  forecastCard: {
    background: "white",
    borderRadius: "11px",
    padding: "15px 8px",
    textAlign: "center",
    boxShadow:
      "0 3px 10px rgba(0,0,0,0.06)",
  },

  forecastIcon: {
    fontSize: "32px",
    margin: "12px 0 7px",
  },

  forecastCondition: {
    display: "block",
    fontSize: "12px",
    color: "#555",
    minHeight: "30px",
  },

  forecastTemperature: {
    marginTop: "8px",
    fontSize: "15px",
    color: "#2e7d32",
  },

  forecastRain: {
    display: "block",
    marginTop: "7px",
    color: "#1976d2",
  },

  tipCard: {
    background: "white",
    borderRadius: "13px",
    padding: "20px",
    marginBottom: "18px",
    boxShadow:
      "0 3px 12px rgba(0,0,0,0.06)",
  },

  tipTitle: {
    margin: "0 0 10px",
    color: "#2e7d32",
  },

  tipText: {
    margin: 0,
    color: "#555",
    lineHeight: 1.6,
  },

  alertCard: {
    background: "#fff8e1",
    borderLeft: "5px solid #f9a825",
    borderRadius: "10px",
    padding: "18px",
    marginBottom: "25px",
  },

  alertTitle: {
    margin: "0 0 8px",
    color: "#f57f17",
  },

  alertText: {
    margin: 0,
    color: "#6d4c41",
    lineHeight: 1.5,
  },
};

export default Weather;