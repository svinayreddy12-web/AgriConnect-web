import React, { useEffect, useMemo, useState } from "react";

import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase";

function Dashboard({
  user,
  onLogout,
  onProfile,
  onCrops,
  onMarketplace,
  onMarketPrices,
  onOrders,
  onWeather,
  onNotifications,
  onHelp,
  onHarvest,
}) {
  /* =========================================================
     STATE
  ========================================================= */

  const [crops, setCrops] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [marketPrices, setMarketPrices] = useState([]);
  const [weather, setWeather] = useState(null);

  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const firebaseUser = auth.currentUser;

  const userEmail =
    firebaseUser?.email ||
    user?.email ||
    "";

  const userUid =
    firebaseUser?.uid ||
    user?.uid ||
    "";

  /* =========================================================
     FIRESTORE DATA
  ========================================================= */

  useEffect(() => {
    if (!userEmail) {
      setCrops([]);
      setProducts([]);
      setOrders([]);
      setHarvests([]);
      setNotifications([]);
      setMarketPrices([]);
      setWeather(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribers = [];

    /* -------------------------
       CROPS
    ------------------------- */

    try {
      const cropsQuery = query(
        collection(db, "crops"),
        where("ownerEmail", "==", userEmail)
      );

      const unsubscribeCrops = onSnapshot(
        cropsQuery,
        (snapshot) => {
          const data = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));

          setCrops(data);
          setLoading(false);
        },
        (error) => {
          console.error(
            "Dashboard crops error:",
            error
          );

          setCrops([]);
          setLoading(false);
        }
      );

      unsubscribers.push(unsubscribeCrops);
    } catch (error) {
      console.error(
        "Crops listener error:",
        error
      );
    }

    /* -------------------------
       PRODUCTS
    ------------------------- */

    try {
      const productsQuery = query(
        collection(db, "products"),
        where("ownerEmail", "==", userEmail)
      );

      const unsubscribeProducts = onSnapshot(
        productsQuery,
        (snapshot) => {
          const data = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));

          setProducts(data);
        },
        (error) => {
          console.error(
            "Dashboard products error:",
            error
          );

          setProducts([]);
        }
      );

      unsubscribers.push(unsubscribeProducts);
    } catch (error) {
      console.error(
        "Products listener error:",
        error
      );
    }

    /* -------------------------
       ORDERS
    ------------------------- */

    try {
      const ordersQuery = query(
        collection(db, "orders"),
        where("ownerEmail", "==", userEmail)
      );

      const unsubscribeOrders = onSnapshot(
        ordersQuery,
        (snapshot) => {
          const data = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));

          setOrders(data);
        },
        (error) => {
          console.error(
            "Dashboard orders error:",
            error
          );

          setOrders([]);
        }
      );

      unsubscribers.push(unsubscribeOrders);
    } catch (error) {
      console.error(
        "Orders listener error:",
        error
      );
    }

    /* -------------------------
       HARVEST RECORDS
    ------------------------- */

    try {
      const harvestQuery = query(
        collection(db, "harvestRecords"),
        where("ownerEmail", "==", userEmail)
      );

      const unsubscribeHarvests = onSnapshot(
        harvestQuery,
        (snapshot) => {
          const data = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));

          setHarvests(data);
        },
        (error) => {
          console.error(
            "Dashboard harvest error:",
            error
          );

          setHarvests([]);
        }
      );

      unsubscribers.push(unsubscribeHarvests);
    } catch (error) {
      console.error(
        "Harvest listener error:",
        error
      );
    }

    /* -------------------------
       NOTIFICATIONS
    ------------------------- */

    try {
      const notificationsQuery = query(
        collection(db, "notifications"),
        where("ownerEmail", "==", userEmail)
      );

      const unsubscribeNotifications =
        onSnapshot(
          notificationsQuery,
          (snapshot) => {
            const data = snapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data(),
              })
            );

            setNotifications(data);
          },
          (error) => {
            console.error(
              "Dashboard notifications error:",
              error
            );

            setNotifications([]);
          }
        );

      unsubscribers.push(
        unsubscribeNotifications
      );
    } catch (error) {
      console.error(
        "Notifications listener error:",
        error
      );
    }

    /* -------------------------
       MARKET PRICES
       Existing structure:
       marketPrices/main
    ------------------------- */

    try {
      const marketRef = doc(
        db,
        "marketPrices",
        "main"
      );

      const unsubscribeMarket = onSnapshot(
        marketRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            setMarketPrices([]);
            return;
          }

          const data = snapshot.data();

          let prices = [];

          if (Array.isArray(data.prices)) {
            prices = data.prices;
          } else if (
            Array.isArray(data.marketPrices)
          ) {
            prices = data.marketPrices;
          } else if (
            Array.isArray(data.data)
          ) {
            prices = data.data;
          }

          setMarketPrices(prices);
        },
        (error) => {
          console.error(
            "Dashboard market price error:",
            error
          );

          setMarketPrices([]);
        }
      );

      unsubscribers.push(unsubscribeMarket);
    } catch (error) {
      console.error(
        "Market price listener error:",
        error
      );
    }

    /* -------------------------
       WEATHER
       Existing structure:
       userSettings/{uid}
    ------------------------- */

    if (userUid) {
      try {
        const weatherRef = doc(
          db,
          "userSettings",
          userUid
        );

        const unsubscribeWeather = onSnapshot(
          weatherRef,
          (snapshot) => {
            if (!snapshot.exists()) {
              setWeather(null);
              return;
            }

            const data = snapshot.data();

            setWeather({
              ...data,
              ...(data.weatherData || {}),
            });
          },
          (error) => {
            console.error(
              "Dashboard weather error:",
              error
            );

            setWeather(null);
          }
        );

        unsubscribers.push(unsubscribeWeather);
      } catch (error) {
        console.error(
          "Weather listener error:",
          error
        );
      }
    }

    return () => {
      unsubscribers.forEach(
        (unsubscribe) => {
          if (typeof unsubscribe === "function") {
            unsubscribe();
          }
        }
      );
    };
  }, [userEmail, userUid]);

  /* =========================================================
     GENERAL HELPERS
  ========================================================= */

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return "Good Morning";
    }

    if (hour < 17) {
      return "Good Afternoon";
    }

    return "Good Evening";
  };

  const formatNumber = (value) => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "0";
    }

    return number.toLocaleString("en-IN");
  };

  const formatCurrency = (value) => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "₹0";
    }

    return `₹${number.toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })}`;
  };

  const parseDate = (value) => {
    if (!value) {
      return null;
    }

    if (
      value?.seconds !== undefined
    ) {
      return new Date(
        value.seconds * 1000
      );
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  };

  const getDateValue = (item) => {
    return (
      item?.date ||
      item?.harvestDate ||
      item?.createdAt ||
      item?.updatedAt ||
      item?.timestamp ||
      null
    );
  };

  const getQuantity = (item) => {
    const candidates = [
      item?.quantity,
      item?.qty,
      item?.amount,
      item?.totalQuantity,
    ];

    for (const value of candidates) {
      const number = Number(value);

      if (
        Number.isFinite(number) &&
        number >= 0
      ) {
        return number;
      }
    }

    return 0;
  };

  const getEarnings = (item) => {
    const directValues = [
      item?.earnings,
      item?.earning,
      item?.totalEarnings,
      item?.totalAmount,
      item?.amount,
      item?.revenue,
      item?.income,
    ];

    for (const value of directValues) {
      const number = Number(value);

      if (
        Number.isFinite(number) &&
        number >= 0
      ) {
        return number;
      }
    }

    const quantity = Number(
      item?.quantity ||
      item?.qty ||
      item?.harvestQuantity ||
      0
    );

    const price = Number(
      item?.price ||
      item?.sellingPrice ||
      item?.rate ||
      0
    );

    if (
      Number.isFinite(quantity) &&
      Number.isFinite(price)
    ) {
      return quantity * price;
    }

    return 0;
  };

  /* =========================================================
     STATISTICS
  ========================================================= */

  const unreadNotifications =
    useMemo(() => {
      return notifications.filter(
        (item) =>
          item.read !== true
      ).length;
    }, [notifications]);

  const totalHarvestQuantity =
    useMemo(() => {
      return harvests.reduce(
        (total, item) =>
          total + getQuantity(item),
        0
      );
    }, [harvests]);

  const totalHarvestEarnings =
    useMemo(() => {
      return harvests.reduce(
        (total, item) =>
          total + getEarnings(item),
        0
      );
    }, [harvests]);

  const pendingOrders =
    useMemo(() => {
      return orders.filter(
        (order) =>
          String(
            order.status || ""
          ).toLowerCase() === "pending"
      ).length;
    }, [orders]);

  /* =========================================================
     CROP CHART DATA
  ========================================================= */

  const cropChartData = useMemo(() => {
    const grouped = {};

    crops.forEach((crop) => {
      const name =
        crop.name ||
        crop.cropName ||
        crop.crop ||
        "Other";

      const quantity = getQuantity(crop);

      if (!grouped[name]) {
        grouped[name] = 0;
      }

      grouped[name] += quantity;
    });

    return Object.entries(grouped)
      .map(([name, quantity]) => ({
        name,
        quantity,
      }))
      .sort(
        (a, b) =>
          b.quantity - a.quantity
      )
      .slice(0, 6);
  }, [crops]);

  const maxCropQuantity =
    useMemo(() => {
      if (!cropChartData.length) {
        return 1;
      }

      return Math.max(
        ...cropChartData.map(
          (item) => item.quantity
        ),
        1
      );
    }, [cropChartData]);

  /* =========================================================
     HARVEST EARNINGS CHART
  ========================================================= */

  const harvestChartData =
    useMemo(() => {
      const grouped = {};

      harvests.forEach((harvest) => {
        const date = parseDate(
          getDateValue(harvest)
        );

        if (!date) {
          return;
        }

        const monthKey =
          date.toLocaleDateString(
            "en-IN",
            {
              month: "short",
              year: "numeric",
            }
          );

        if (!grouped[monthKey]) {
          grouped[monthKey] = {
            label: monthKey,
            earnings: 0,
            date: date.getTime(),
          };
        }

        grouped[monthKey].earnings +=
          getEarnings(harvest);
      });

      return Object.values(grouped)
        .sort(
          (a, b) =>
            a.date - b.date
        )
        .slice(-6);
    }, [harvests]);

  const maxHarvestEarnings =
    useMemo(() => {
      if (!harvestChartData.length) {
        return 1;
      }

      return Math.max(
        ...harvestChartData.map(
          (item) => item.earnings
        ),
        1
      );
    }, [harvestChartData]);

  /* =========================================================
     ORDER STATUS CHART
  ========================================================= */

  const orderStatusData =
    useMemo(() => {
      const statusMap = {
        Pending: 0,
        Confirmed: 0,
        Delivered: 0,
        Cancelled: 0,
        Other: 0,
      };

      orders.forEach((order) => {
        const rawStatus = String(
          order.status || "Other"
        ).toLowerCase();

        if (
          rawStatus === "pending"
        ) {
          statusMap.Pending += 1;
        } else if (
          rawStatus === "confirmed" ||
          rawStatus === "accepted"
        ) {
          statusMap.Confirmed += 1;
        } else if (
          rawStatus === "delivered" ||
          rawStatus === "completed"
        ) {
          statusMap.Delivered += 1;
        } else if (
          rawStatus === "cancelled" ||
          rawStatus === "canceled" ||
          rawStatus === "rejected"
        ) {
          statusMap.Cancelled += 1;
        } else {
          statusMap.Other += 1;
        }
      });

      return Object.entries(statusMap)
        .filter(
          ([, count]) =>
            count > 0
        )
        .map(
          ([status, count]) => ({
            status,
            count,
          })
        );
    }, [orders]);

  const orderStatusTotal =
    orders.length || 1;

  /* =========================================================
     MARKET PRICE CHART
  ========================================================= */

  const normalizedMarketPrices =
    useMemo(() => {
      return marketPrices
        .map((item, index) => {
          if (
            typeof item === "string" ||
            typeof item === "number"
          ) {
            return {
              name: `Crop ${index + 1}`,
              price: Number(item) || 0,
            };
          }

          const name =
            item?.crop ||
            item?.cropName ||
            item?.name ||
            item?.commodity ||
            `Crop ${index + 1}`;

          const priceCandidates = [
            item?.price,
            item?.currentPrice,
            item?.modalPrice,
            item?.averagePrice,
            item?.marketPrice,
            item?.rate,
          ];

          let price = 0;

          for (
            const value of priceCandidates
          ) {
            const number = Number(value);

            if (
              Number.isFinite(number)
            ) {
              price = number;
              break;
            }
          }

          return {
            name,
            price,
          };
        })
        .filter(
          (item) =>
            item.price > 0
        )
        .slice(0, 6);
    }, [marketPrices]);

  const maxMarketPrice =
    useMemo(() => {
      if (
        !normalizedMarketPrices.length
      ) {
        return 1;
      }

      return Math.max(
        ...normalizedMarketPrices.map(
          (item) => item.price
        ),
        1
      );
    }, [normalizedMarketPrices]);

  /* =========================================================
     WEATHER
  ========================================================= */

  const getWeatherTemperature =
    () => {
      const temperature =
        weather?.current
          ?.temperature_2m ??
        weather?.current_weather
          ?.temperature ??
        weather?.temperature ??
        null;

      if (
        temperature === null ||
        temperature === undefined
      ) {
        return "--";
      }

      return `${Math.round(
        Number(temperature)
      )}°C`;
    };

  const getWeatherHumidity =
    () => {
      const humidity =
        weather?.current
          ?.relative_humidity_2m ??
        weather?.relative_humidity_2m ??
        weather?.humidity ??
        null;

      if (
        humidity === null ||
        humidity === undefined
      ) {
        return "--";
      }

      return `${Math.round(
        Number(humidity)
      )}%`;
    };

  const getWeatherWind = () => {
    const wind =
      weather?.current
        ?.wind_speed_10m ??
      weather?.wind_speed_10m ??
      weather?.windSpeed ??
      null;

    if (
      wind === null ||
      wind === undefined
    ) {
      return "--";
    }

    return `${Math.round(
      Number(wind)
    )} km/h`;
  };

  const getWeatherCode = () => {
    return (
      weather?.current?.weather_code ??
      weather?.current_weather
        ?.weathercode ??
      weather?.weather_code ??
      null
    );
  };

  const getWeatherIcon = (
    code
  ) => {
    if (
      code === null ||
      code === undefined
    ) {
      return "🌤️";
    }

    if (code === 0) {
      return "☀️";
    }

    if (code <= 3) {
      return "🌤️";
    }

    if (code <= 48) {
      return "🌫️";
    }

    if (code <= 67) {
      return "🌧️";
    }

    if (code <= 77) {
      return "❄️";
    }

    if (code <= 82) {
      return "🌦️";
    }

    if (code <= 99) {
      return "⛈️";
    }

    return "🌤️";
  };

  const getWeatherLocation =
    () => {
      return (
        weather?.weatherPlaceName ||
        weather?.weatherLocation ||
        weather?.location?.name ||
        localStorage.getItem(
          "agriWeatherLocation"
        ) ||
        "Your Location"
      );
    };

  /* =========================================================
     RECENT DATA
  ========================================================= */

  const recentCrops =
    useMemo(() => {
      return [...crops]
        .sort((a, b) => {
          const dateA =
            parseDate(
              getDateValue(a)
            )?.getTime() || 0;

          const dateB =
            parseDate(
              getDateValue(b)
            )?.getTime() || 0;

          return dateB - dateA;
        })
        .slice(0, 5);
    }, [crops]);

  const recentOrders =
    useMemo(() => {
      return [...orders]
        .sort((a, b) => {
          const dateA =
            parseDate(
              getDateValue(a)
            )?.getTime() || 0;

          const dateB =
            parseDate(
              getDateValue(b)
            )?.getTime() || 0;

          return dateB - dateA;
        })
        .slice(0, 5);
    }, [orders]);

  const recentHarvests =
    useMemo(() => {
      return [...harvests]
        .sort((a, b) => {
          const dateA =
            parseDate(
              getDateValue(a)
            )?.getTime() || 0;

          const dateB =
            parseDate(
              getDateValue(b)
            )?.getTime() || 0;

          return dateB - dateA;
        })
        .slice(0, 5);
    }, [harvests]);

  /* =========================================================
     MOBILE MENU NAVIGATION
  ========================================================= */

  const navigateMobile = (
    callback
  ) => {
    setMobileMenuOpen(false);

    setTimeout(() => {
      callback();
    }, 80);
  };

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow =
        "hidden";
    } else {
      document.body.style.overflow =
        "";
    }

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [mobileMenuOpen]);

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="dashboard-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="dashboard-header">

        <div className="brand-section">

          <div className="brand-icon">
            🌾
          </div>

          <div>
            <h1>
              AgriConnect
            </h1>

            <p>
              Smart Farming Platform
            </p>
          </div>

        </div>

        {/* DESKTOP HEADER */}

        <div className="header-actions desktop-header-actions">

          <button
            className="notification-button"
            onClick={onNotifications}
            title="Notifications"
          >
            🔔

            {unreadNotifications >
              0 && (
              <span className="notification-badge">
                {
                  unreadNotifications
                }
              </span>
            )}
          </button>

          <button
            className="profile-button"
            onClick={onProfile}
          >
            👤{" "}
            {user?.name ||
              "Farmer"}
          </button>

          <button
            className="logout-button"
            onClick={onLogout}
          >
            Logout
          </button>

        </div>

        {/* MOBILE HEADER */}

        <div className="mobile-header-actions">

          <button
            className="mobile-notification-button"
            onClick={() =>
              navigateMobile(
                onNotifications
              )
            }
          >
            🔔

            {unreadNotifications >
              0 && (
              <span className="mobile-notification-badge">
                {
                  unreadNotifications
                }
              </span>
            )}
          </button>

          <button
            className="hamburger-button"
            onClick={() =>
              setMobileMenuOpen(
                true
              )
            }
            aria-label="Open menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

        </div>

      </header>

      {/* =====================================================
          MAIN DASHBOARD
      ===================================================== */}

      <main className="dashboard-content">

        {/* ===================================================
            WELCOME
        =================================================== */}

        <section className="welcome-section">

          <div className="welcome-text">

            <div className="welcome-tag">
              🌱 AgriConnect Dashboard
            </div>

            <h2>
              {getGreeting()},{" "}
              {user?.name ||
                "Farmer"}! 👋
            </h2>

            <p>
              Manage your crops,
              harvests, marketplace
              activities and farm
              information from one
              place.
            </p>

          </div>

          <div className="welcome-illustration">
            🌾
          </div>

        </section>

        {/* ===================================================
            STATISTICS
        =================================================== */}

        <section className="stats-grid">

          <button
            className="stat-card crop-stat"
            onClick={onCrops}
          >

            <div className="stat-icon">
              🌱
            </div>

            <div className="stat-content">

              <span>
                My Crops
              </span>

              <strong>
                {formatNumber(
                  crops.length
                )}
              </strong>

              <small>
                View crop records →
              </small>

            </div>

          </button>

          <button
            className="stat-card product-stat"
            onClick={onMarketplace}
          >

            <div className="stat-icon">
              🛒
            </div>

            <div className="stat-content">

              <span>
                Marketplace
              </span>

              <strong>
                {formatNumber(
                  products.length
                )}
              </strong>

              <small>
                Products listed →
              </small>

            </div>

          </button>

          <button
            className="stat-card order-stat"
            onClick={onOrders}
          >

            <div className="stat-icon">
              📦
            </div>

            <div className="stat-content">

              <span>
                Orders
              </span>

              <strong>
                {formatNumber(
                  orders.length
                )}
              </strong>

              <small>
                {pendingOrders > 0
                  ? `${pendingOrders} pending`
                  : "Manage orders"}{" "}
                →
              </small>

            </div>

          </button>

          <button
            className="stat-card harvest-stat"
            onClick={onHarvest}
          >

            <div className="stat-icon">
              🌾
            </div>

            <div className="stat-content">

              <span>
                Harvest Records
              </span>

              <strong>
                {formatNumber(
                  harvests.length
                )}
              </strong>

              <small>
                View harvest history →
              </small>

            </div>

          </button>

        </section>

        {/* ===================================================
            WEATHER + HARVEST SUMMARY
        =================================================== */}

        <section className="overview-grid">

          {/* WEATHER */}

          <div className="dashboard-card weather-dashboard-card">

            <div className="card-heading">

              <div>
                <span className="card-kicker">
                  WEATHER
                </span>

                <h3>
                  Farm Weather
                </h3>
              </div>

              <button
                className="small-link-button"
                onClick={onWeather}
              >
                View →
              </button>

            </div>

            <div className="weather-main">

              <div className="weather-icon-large">
                {getWeatherIcon(
                  getWeatherCode()
                )}
              </div>

              <div>

                <div className="weather-temperature">
                  {
                    getWeatherTemperature()
                  }
                </div>

                <div className="weather-location">
                  📍{" "}
                  {
                    getWeatherLocation()
                  }
                </div>

              </div>

            </div>

            <div className="weather-details">

              <div>
                <span>
                  💧 Humidity
                </span>

                <strong>
                  {
                    getWeatherHumidity()
                  }
                </strong>
              </div>

              <div>
                <span>
                  💨 Wind
                </span>

                <strong>
                  {getWeatherWind()}
                </strong>
              </div>

            </div>

          </div>

          {/* HARVEST SUMMARY */}

          <div className="dashboard-card harvest-summary-card">

            <div className="card-heading">

              <div>
                <span className="card-kicker">
                  HARVEST
                </span>

                <h3>
                  Harvest Summary
                </h3>
              </div>

              <button
                className="small-link-button"
                onClick={onHarvest}
              >
                View →
              </button>

            </div>

            <div className="harvest-summary-number">
              {formatNumber(
                totalHarvestQuantity
              )}
              <span>
                kg
              </span>
            </div>

            <p>
              Total harvested quantity
            </p>

            <div className="earnings-box">

              <span>
                Total Earnings
              </span>

              <strong>
                {formatCurrency(
                  totalHarvestEarnings
                )}
              </strong>

            </div>

          </div>

        </section>

        {/* ===================================================
            CHARTS HEADER
        =================================================== */}

        <section className="section-heading-block">

          <div>

            <span className="section-kicker">
              FARM ANALYTICS
            </span>

            <h2>
              Visual Overview
            </h2>

            <p>
              Understand your farming
              activity at a glance.
            </p>

          </div>

        </section>

        {/* ===================================================
            CHART ROW 1
        =================================================== */}

        <section className="charts-grid">

          {/* CROP QUANTITY */}

          <div className="chart-card">

            <div className="chart-header">

              <div>

                <span className="chart-icon">
                  🌱
                </span>

                <div>
                  <h3>
                    Crop Quantity
                  </h3>

                  <p>
                    Current crop quantities
                  </p>
                </div>

              </div>

              <span className="chart-total">
                {crops.length}
              </span>

            </div>

            {cropChartData.length ===
            0 ? (
              <div className="chart-empty">

                <div>
                  🌱
                </div>

                <p>
                  No crop data available
                </p>

                <button
                  onClick={onCrops}
                >
                  Add Crop
                </button>

              </div>
            ) : (
              <div className="bar-chart">

                {cropChartData.map(
                  (item) => {
                    const width =
                      (item.quantity /
                        maxCropQuantity) *
                      100;

                    return (
                      <div
                        className="bar-row"
                        key={
                          item.name
                        }
                      >

                        <div className="bar-label">
                          <span>
                            {
                              item.name
                            }
                          </span>

                          <strong>
                            {formatNumber(
                              item.quantity
                            )}
                          </strong>
                        </div>

                        <div className="bar-track">

                          <div
                            className="bar-fill crop-bar-fill"
                            style={{
                              width: `${Math.max(
                                width,
                                4
                              )}%`,
                            }}
                          />

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </div>

          {/* HARVEST EARNINGS */}

          <div className="chart-card">

            <div className="chart-header">

              <div>

                <span className="chart-icon">
                  💰
                </span>

                <div>
                  <h3>
                    Harvest Earnings
                  </h3>

                  <p>
                    Recent earnings by month
                  </p>
                </div>

              </div>

              <span className="chart-total">
                {formatCurrency(
                  totalHarvestEarnings
                )}
              </span>

            </div>

            {harvestChartData.length ===
            0 ? (
              <div className="chart-empty">

                <div>
                  💰
                </div>

                <p>
                  No harvest earnings
                  available
                </p>

                <button
                  onClick={onHarvest}
                >
                  Add Harvest
                </button>

              </div>
            ) : (
              <div className="earnings-chart">

                <div className="earnings-bars">

                  {harvestChartData.map(
                    (item) => {
                      const height =
                        (item.earnings /
                          maxHarvestEarnings) *
                        100;

                      return (
                        <div
                          className="earnings-column"
                          key={
                            item.label
                          }
                        >

                          <div className="earnings-value">
                            {formatCurrency(
                              item.earnings
                            )}
                          </div>

                          <div className="earnings-bar-area">

                            <div
                              className="earnings-bar"
                              style={{
                                height: `${Math.max(
                                  height,
                                  5
                                )}%`,
                              }}
                            />

                          </div>

                          <span>
                            {
                              item.label
                            }
                          </span>

                        </div>
                      );
                    }
                  )}

                </div>

              </div>
            )}

          </div>

        </section>

        {/* ===================================================
            CHART ROW 2
        =================================================== */}

        <section className="charts-grid">

          {/* ORDER STATUS */}

          <div className="chart-card">

            <div className="chart-header">

              <div>

                <span className="chart-icon">
                  📦
                </span>

                <div>
                  <h3>
                    Order Status
                  </h3>

                  <p>
                    Current order distribution
                  </p>
                </div>

              </div>

              <span className="chart-total">
                {orders.length}
              </span>

            </div>

            {orderStatusData.length ===
            0 ? (
              <div className="chart-empty">

                <div>
                  📦
                </div>

                <p>
                  No orders available
                </p>

                <button
                  onClick={onOrders}
                >
                  View Orders
                </button>

              </div>
            ) : (
              <div className="order-chart">

                <div className="order-ring-wrapper">

                  <div className="order-ring">

                    <div className="order-ring-inner">

                      <strong>
                        {orders.length}
                      </strong>

                      <span>
                        Orders
                      </span>

                    </div>

                  </div>

                </div>

                <div className="order-legend">

                  {orderStatusData.map(
                    (item, index) => {
                      const percentage =
                        Math.round(
                          (item.count /
                            orderStatusTotal) *
                            100
                        );

                      return (
                        <div
                          className="legend-row"
                          key={
                            item.status
                          }
                        >

                          <div className="legend-left">

                            <span
                              className={`legend-dot legend-dot-${index}`}
                            />

                            <span>
                              {
                                item.status
                              }
                            </span>

                          </div>

                          <strong>
                            {item.count}{" "}
                            <small>
                              (
                              {
                                percentage
                              }
                              %)
                            </small>
                          </strong>

                        </div>
                      );
                    }
                  )}

                </div>

              </div>
            )}

          </div>

          {/* MARKET PRICES */}

          <div className="chart-card">

            <div className="chart-header">

              <div>

                <span className="chart-icon">
                  📈
                </span>

                <div>
                  <h3>
                    Market Prices
                  </h3>

                  <p>
                    Current tracked crop prices
                  </p>
                </div>

              </div>

              <button
                className="small-link-button"
                onClick={onMarketPrices}
              >
                View →
              </button>

            </div>

            {normalizedMarketPrices.length ===
            0 ? (
              <div className="chart-empty">

                <div>
                  📈
                </div>

                <p>
                  No market price data
                  available
                </p>

                <button
                  onClick={
                    onMarketPrices
                  }
                >
                  View Prices
                </button>

              </div>
            ) : (
              <div className="bar-chart market-chart">

                {normalizedMarketPrices.map(
                  (item) => {
                    const width =
                      (item.price /
                        maxMarketPrice) *
                      100;

                    return (
                      <div
                        className="bar-row"
                        key={
                          item.name
                        }
                      >

                        <div className="bar-label">

                          <span>
                            {
                              item.name
                            }
                          </span>

                          <strong>
                            {formatCurrency(
                              item.price
                            )}
                          </strong>

                        </div>

                        <div className="bar-track">

                          <div
                            className="bar-fill market-bar-fill"
                            style={{
                              width: `${Math.max(
                                width,
                                4
                              )}%`,
                            }}
                          />

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </div>

        </section>

        {/* ===================================================
            QUICK ACCESS
        =================================================== */}

        <section className="quick-section">

          <div className="section-heading-inline">

            <div>
              <span className="section-kicker">
                QUICK ACCESS
              </span>

              <h2>
                Manage Your Farm
              </h2>
            </div>

          </div>

          <div className="quick-grid">

            <button
              className="quick-card"
              onClick={onProfile}
            >
              <span>
                👤
              </span>

              <div>
                <strong>
                  My Profile
                </strong>

                <small>
                  Manage your information
                </small>
              </div>

              <b>
                →
              </b>
            </button>

            <button
              className="quick-card"
              onClick={onCrops}
            >
              <span>
                🌱
              </span>

              <div>
                <strong>
                  My Crops
                </strong>

                <small>
                  Manage crop records
                </small>
              </div>

              <b>
                →
              </b>
            </button>

            <button
              className="quick-card"
              onClick={onMarketplace}
            >
              <span>
                🛒
              </span>

              <div>
                <strong>
                  Marketplace
                </strong>

                <small>
                  Buy and sell products
                </small>
              </div>

              <b>
                →
              </b>
            </button>

            <button
              className="quick-card"
              onClick={onMarketPrices}
            >
              <span>
                📈
              </span>

              <div>
                <strong>
                  Market Prices
                </strong>

                <small>
                  Check crop prices
                </small>
              </div>

              <b>
                →
              </b>
            </button>

            <button
              className="quick-card"
              onClick={onOrders}
            >
              <span>
                📦
              </span>

              <div>
                <strong>
                  My Orders
                </strong>

                <small>
                  Track your orders
                </small>
              </div>

              <b>
                →
              </b>
            </button>

            <button
              className="quick-card"
              onClick={onHarvest}
            >
              <span>
                🌾
              </span>

              <div>
                <strong>
                  Harvest Records
                </strong>

                <small>
                  Track harvest history
                </small>
              </div>

              <b>
                →
              </b>
            </button>

            <button
              className="quick-card"
              onClick={onWeather}
            >
              <span>
                🌦️
              </span>

              <div>
                <strong>
                  Weather
                </strong>

                <small>
                  Check farm weather
                </small>
              </div>

              <b>
                →
              </b>
            </button>

            <button
              className="quick-card"
              onClick={onNotifications}
            >
              <span>
                🔔
              </span>

              <div>
                <strong>
                  Notifications
                </strong>

                <small>
                  {unreadNotifications >
                  0
                    ? `${unreadNotifications} unread notification${unreadNotifications === 1 ? "" : "s"}`
                    : "View notifications"}
                </small>
              </div>

              <b>
                →
              </b>
            </button>

          </div>

        </section>

        {/* ===================================================
            RECENT ACTIVITY
        =================================================== */}

        <section className="recent-grid">

          {/* RECENT CROPS */}

          <div className="dashboard-card recent-card">

            <div className="card-heading">

              <div>

                <span className="card-kicker">
                  RECENT
                </span>

                <h3>
                  Recent Crops
                </h3>

              </div>

              <button
                className="small-link-button"
                onClick={onCrops}
              >
                View All →
              </button>

            </div>

            {recentCrops.length ===
            0 ? (
              <div className="simple-empty">
                🌱
                <p>
                  No crops added yet.
                </p>
              </div>
            ) : (
              <div className="recent-list">

                {recentCrops.map(
                  (crop) => (
                    <div
                      className="recent-item"
                      key={crop.id}
                    >

                      <div className="recent-item-icon">
                        🌱
                      </div>

                      <div className="recent-item-main">

                        <strong>
                          {
                            crop.name ||
                            crop.cropName ||
                            crop.crop ||
                            "Crop"
                          }
                        </strong>

                        <span>
                          Quantity:{" "}
                          {formatNumber(
                            getQuantity(
                              crop
                            )
                          )}
                        </span>

                      </div>

                      <span
                        className={`status-pill ${String(crop.status || "Growing").toLowerCase()}`}
                      >
                        {
                          crop.status ||
                          "Growing"
                        }
                      </span>

                    </div>
                  )
                )}

              </div>
            )}

          </div>

          {/* RECENT ORDERS */}

          <div className="dashboard-card recent-card">

            <div className="card-heading">

              <div>

                <span className="card-kicker">
                  RECENT
                </span>

                <h3>
                  Recent Orders
                </h3>

              </div>

              <button
                className="small-link-button"
                onClick={onOrders}
              >
                View All →
              </button>

            </div>

            {recentOrders.length ===
            0 ? (
              <div className="simple-empty">
                📦
                <p>
                  No orders yet.
                </p>
              </div>
            ) : (
              <div className="recent-list">

                {recentOrders.map(
                  (order) => (
                    <div
                      className="recent-item"
                      key={order.id}
                    >

                      <div className="recent-item-icon order-icon">
                        📦
                      </div>

                      <div className="recent-item-main">

                        <strong>
                          {
                            order.productName ||
                            order.product ||
                            order.cropName ||
                            "Order"
                          }
                        </strong>

                        <span>
                          {formatCurrency(
                            order.totalAmount ||
                            order.amount ||
                            order.total ||
                            0
                          )}
                        </span>

                      </div>

                      <span
                        className={`status-pill ${String(order.status || "Pending").toLowerCase()}`}
                      >
                        {
                          order.status ||
                          "Pending"
                        }
                      </span>

                    </div>
                  )
                )}

              </div>
            )}

          </div>

        </section>

        {/* ===================================================
            HARVEST ACTIVITY
        =================================================== */}

        <section className="dashboard-card harvest-activity-card">

          <div className="card-heading">

            <div>

              <span className="card-kicker">
                ACTIVITY
              </span>

              <h3>
                Recent Harvest Activity
              </h3>

            </div>

            <button
              className="small-link-button"
              onClick={onHarvest}
            >
              View All →
            </button>

          </div>

          {recentHarvests.length ===
          0 ? (
            <div className="simple-empty">
              🌾

              <p>
                No harvest records yet.
              </p>
            </div>
          ) : (
            <div className="harvest-activity-grid">

              {recentHarvests.map(
                (harvest) => (
                  <div
                    className="harvest-activity-item"
                    key={harvest.id}
                  >

                    <div className="harvest-activity-icon">
                      🌾
                    </div>

                    <div>

                      <strong>
                        {
                          harvest.cropName ||
                          harvest.name ||
                          harvest.crop ||
                          "Harvest"
                        }
                      </strong>

                      <span>
                        {formatNumber(
                          getQuantity(
                            harvest
                          )
                        )}{" "}
                        kg
                      </span>

                    </div>

                    <div className="harvest-earning">
                      {formatCurrency(
                        getEarnings(
                          harvest
                        )
                      )}
                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </section>

        {/* ===================================================
            FOOTER
        =================================================== */}

        <footer className="dashboard-footer">

          <div>
            <strong>
              🌾 AgriConnect
            </strong>

            <span>
              Smart Farming Platform
            </span>
          </div>

          <span>
            Your farm. Your data. Your
            future.
          </span>

        </footer>

      </main>

      {/* =====================================================
          MOBILE MENU
          FULL SCREEN - DASHBOARD COMPLETELY HIDDEN BEHIND
      ===================================================== */}

      {mobileMenuOpen && (
        <div className="mobile-menu-overlay">

          <div className="mobile-menu-header">

            <div className="mobile-menu-brand">

              <div className="mobile-menu-logo">
                🌾
              </div>

              <div>
                <strong>
                  AgriConnect
                </strong>

                <span>
                  Smart Farming Platform
                </span>
              </div>

            </div>

            <button
              className="mobile-close-button"
              onClick={() =>
                setMobileMenuOpen(
                  false
                )
              }
              aria-label="Close menu"
            >
              ×
            </button>

          </div>

          <div className="mobile-user-card">

            <div className="mobile-user-avatar">
              👤
            </div>

            <div>

              <strong>
                {user?.name ||
                  "Farmer"}
              </strong>

              <span>
                {user?.email ||
                  userEmail}
              </span>

            </div>

          </div>

          <nav className="mobile-menu-list">

            <button
              onClick={() =>
                navigateMobile(
                  onProfile
                )
              }
            >
              <span>
                👤
              </span>

              <strong>
                My Profile
              </strong>

              <b>
                →
              </b>
            </button>

            <button
              onClick={() =>
                navigateMobile(
                  onCrops
                )
              }
            >
              <span>
                🌱
              </span>

              <strong>
                My Crops
              </strong>

              <b>
                →
              </b>
            </button>

            <button
              onClick={() =>
                navigateMobile(
                  onMarketplace
                )
              }
            >
              <span>
                🛒
              </span>

              <strong>
                Marketplace
              </strong>

              <b>
                →
              </b>
            </button>

            <button
              onClick={() =>
                navigateMobile(
                  onMarketPrices
                )
              }
            >
              <span>
                📈
              </span>

              <strong>
                Market Prices
              </strong>

              <b>
                →
              </b>
            </button>

            <button
              onClick={() =>
                navigateMobile(
                  onOrders
                )
              }
            >
              <span>
                📦
              </span>

              <strong>
                My Orders
              </strong>

              <b>
                →
              </b>
            </button>

            <button
              onClick={() =>
                navigateMobile(
                  onWeather
                )
              }
            >
              <span>
                🌦️
              </span>

              <strong>
                Weather
              </strong>

              <b>
                →
              </b>
            </button>

            <button
              onClick={() =>
                navigateMobile(
                  onHarvest
                )
              }
            >
              <span>
                🌾
              </span>

              <strong>
                Harvest Records
              </strong>

              <b>
                →
              </b>
            </button>

            <button
              onClick={() =>
                navigateMobile(
                  onNotifications
                )
              }
            >
              <span>
                🔔
              </span>

              <strong>
                Notifications
              </strong>

              {unreadNotifications >
                0 && (
                <em>
                  {
                    unreadNotifications
                  }
                </em>
              )}

              <b>
                →
              </b>
            </button>

            <button
              onClick={() =>
                navigateMobile(
                  onHelp
                )
              }
            >
              <span>
                ❓
              </span>

              <strong>
                Help & Support
              </strong>

              <b>
                →
              </b>
            </button>

          </nav>

          <div className="mobile-menu-bottom">

            <button
              className="mobile-logout-button"
              onClick={() => {
                setMobileMenuOpen(
                  false
                );

                setTimeout(() => {
                  onLogout();
                }, 80);
              }}
            >
              <span>
                🚪
              </span>

              <strong>
                Logout
              </strong>
            </button>

          </div>

        </div>
      )}

      {/* =====================================================
          CSS
      ===================================================== */}

      <style>{`

        /* =====================================================
           BASE
        ===================================================== */

        .dashboard-page {
          min-height: 100vh;
          background: #f4f8f3;
          color: #1f2937;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
          overflow-x: hidden;
        }

        /* =====================================================
           HEADER
        ===================================================== */

        .dashboard-header {
          position: sticky;
          top: 0;
          z-index: 1000;

          width: 100%;

          min-height: 78px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 14px 5%;

          background: rgba(
            255,
            255,
            255,
            0.97
          );

          border-bottom: 1px solid
            #dfe8df;

          box-shadow:
            0 4px 18px
            rgba(
              20,
              83,
              45,
              0.05
            );

          backdrop-filter: blur(
            12px
          );
        }

        .brand-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-icon {
          width: 48px;
          height: 48px;

          display: flex;
          align-items: center;
          justify-content: center;

          background: #e9f5eb;

          border-radius: 14px;

          font-size: 26px;
        }

        .brand-section h1 {
          margin: 0;

          font-size: 21px;

          color: #14532d;
        }

        .brand-section p {
          margin: 3px 0 0;

          font-size: 12px;

          color: #6b7280;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .header-actions button {
          border: none;
          cursor: pointer;
        }

        .notification-button {
          position: relative;

          width: 45px;
          height: 45px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 12px;

          background: #f1f7f2;

          font-size: 19px;
        }

        .notification-badge,
        .mobile-notification-badge {
          position: absolute;

          min-width: 20px;
          height: 20px;

          padding: 0 5px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 20px;

          background: #dc2626;
          color: white;

          font-size: 11px;
          font-weight: 700;
        }

        .notification-badge {
          top: -4px;
          right: -4px;
        }

        .profile-button {
          min-height: 45px;

          padding: 0 16px;

          border-radius: 12px;

          background: #e9f5eb;

          color: #176b36;

          font-weight: 700;
        }

        .logout-button {
          min-height: 45px;

          padding: 0 18px;

          border-radius: 12px;

          background: #176b36;

          color: white;

          font-weight: 700;
        }

        .mobile-header-actions {
          display: none;
        }

        /* =====================================================
           CONTENT
        ===================================================== */

        .dashboard-content {
          width: min(
            1400px,
            92%
          );

          margin: 0 auto;

          padding: 30px 0 50px;
        }

        /* =====================================================
           WELCOME
        ===================================================== */

        .welcome-section {
          min-height: 190px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 32px 38px;

          margin-bottom: 24px;

          border-radius: 24px;

          background:
            linear-gradient(
              135deg,
              #e8f6eb,
              #f7fbf6
            );

          border: 1px solid
            #dcebdd;

          overflow: hidden;
        }

        .welcome-text {
          max-width: 780px;
        }

        .welcome-tag {
          display: inline-flex;

          padding: 7px 12px;

          margin-bottom: 12px;

          border-radius: 30px;

          background: white;

          color: #176b36;

          font-size: 12px;
          font-weight: 700;
        }

        .welcome-section h2 {
          margin: 0;

          font-size: 32px;

          color: #14532d;
        }

        .welcome-section p {
          margin: 10px 0 0;

          color: #64748b;

          font-size: 15px;

          line-height: 1.7;
        }

        .welcome-illustration {
          width: 130px;
          height: 130px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: rgba(
            255,
            255,
            255,
            0.75
          );

          font-size: 70px;
        }

        /* =====================================================
           STATS
        ===================================================== */

        .stats-grid {
          display: grid;

          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );

          gap: 16px;

          margin-bottom: 24px;
        }

        .stat-card {
          min-height: 135px;

          display: flex;
          align-items: center;

          gap: 15px;

          padding: 22px;

          border: 1px solid
            #dfe8df;

          border-radius: 18px;

          background: white;

          text-align: left;

          cursor: pointer;

          box-shadow:
            0 4px 16px
            rgba(
              20,
              83,
              45,
              0.04
            );
        }

        .stat-card:hover {
          transform: translateY(-2px);

          box-shadow:
            0 10px 25px
            rgba(
              20,
              83,
              45,
              0.08
            );
        }

        .stat-icon {
          width: 52px;
          height: 52px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 15px;

          background: #e9f5eb;

          font-size: 25px;
        }

        .stat-content {
          display: flex;
          flex-direction: column;
        }

        .stat-content span {
          color: #6b7280;

          font-size: 13px;

          font-weight: 600;
        }

        .stat-content strong {
          margin-top: 4px;

          color: #14532d;

          font-size: 28px;
        }

        .stat-content small {
          margin-top: 3px;

          color: #7b8a80;

          font-size: 11px;
        }

        /* =====================================================
           OVERVIEW
        ===================================================== */

        .overview-grid {
          display: grid;

          grid-template-columns:
            1.4fr
            1fr;

          gap: 18px;

          margin-bottom: 35px;
        }

        .dashboard-card {
          background: white;

          border: 1px solid
            #dfe8df;

          border-radius: 20px;

          padding: 24px;

          box-shadow:
            0 4px 18px
            rgba(
              20,
              83,
              45,
              0.04
            );
        }

        .card-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;

          gap: 15px;

          margin-bottom: 20px;
        }

        .card-kicker,
        .section-kicker {
          color: #6da477;

          font-size: 11px;

          font-weight: 800;

          letter-spacing: 1.2px;
        }

        .card-heading h3 {
          margin: 5px 0 0;

          color: #173b24;

          font-size: 19px;
        }

        .small-link-button {
          border: none;

          background: transparent;

          color: #176b36;

          font-weight: 700;

          cursor: pointer;
        }

        /* =====================================================
           WEATHER
        ===================================================== */

        .weather-main {
          display: flex;
          align-items: center;

          gap: 18px;

          padding: 5px 0 20px;
        }

        .weather-icon-large {
          width: 78px;
          height: 78px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 20px;

          background: #eef7ef;

          font-size: 42px;
        }

        .weather-temperature {
          color: #14532d;

          font-size: 36px;

          font-weight: 800;
        }

        .weather-location {
          margin-top: 4px;

          color: #6b7280;

          font-size: 13px;
        }

        .weather-details {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 12px;
        }

        .weather-details > div {
          display: flex;
          justify-content: space-between;
          align-items: center;

          padding: 13px;

          border-radius: 12px;

          background: #f5f9f5;
        }

        .weather-details span {
          color: #6b7280;

          font-size: 12px;
        }

        .weather-details strong {
          color: #14532d;

          font-size: 13px;
        }

        /* =====================================================
           HARVEST SUMMARY
        ===================================================== */

        .harvest-summary-number {
          color: #14532d;

          font-size: 38px;

          font-weight: 800;
        }

        .harvest-summary-number span {
          margin-left: 6px;

          color: #6b7280;

          font-size: 15px;

          font-weight: 600;
        }

        .harvest-summary-card p {
          margin: 5px 0 20px;

          color: #6b7280;

          font-size: 13px;
        }

        .earnings-box {
          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 15px;

          border-radius: 14px;

          background: #eef7ef;
        }

        .earnings-box span {
          color: #64748b;

          font-size: 12px;
        }

        .earnings-box strong {
          color: #176b36;

          font-size: 18px;
        }

        /* =====================================================
           SECTION HEADING
        ===================================================== */

        .section-heading-block {
          margin: 10px 0 18px;
        }

        .section-heading-block h2 {
          margin: 5px 0 4px;

          color: #173b24;

          font-size: 25px;
        }

        .section-heading-block p {
          margin: 0;

          color: #718096;

          font-size: 13px;
        }

        /* =====================================================
           CHARTS
        ===================================================== */

        .charts-grid {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 18px;

          margin-bottom: 18px;
        }

        .chart-card {
          min-height: 340px;

          padding: 24px;

          background: white;

          border: 1px solid
            #dfe8df;

          border-radius: 20px;

          box-shadow:
            0 4px 18px
            rgba(
              20,
              83,
              45,
              0.04
            );
        }

        .chart-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;

          margin-bottom: 25px;
        }

        .chart-header > div:first-child {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .chart-icon {
          width: 42px;
          height: 42px;

          display: flex;
          align-items: center;
          justify-content: center;

          flex-shrink: 0;

          border-radius: 12px;

          background: #eef7ef;

          font-size: 20px;
        }

        .chart-header h3 {
          margin: 2px 0 3px;

          color: #173b24;

          font-size: 17px;
        }

        .chart-header p {
          margin: 0;

          color: #8a948c;

          font-size: 11px;
        }

        .chart-total {
          color: #176b36;

          font-size: 13px;

          font-weight: 800;
        }

        /* =====================================================
           BAR CHART
        ===================================================== */

        .bar-chart {
          display: flex;

          flex-direction: column;

          gap: 18px;
        }

        .bar-row {
          width: 100%;
        }

        .bar-label {
          display: flex;
          align-items: center;
          justify-content: space-between;

          margin-bottom: 7px;
        }

        .bar-label span {
          max-width: 65%;

          overflow: hidden;

          text-overflow: ellipsis;

          white-space: nowrap;

          color: #46534a;

          font-size: 12px;

          font-weight: 600;
        }

        .bar-label strong {
          color: #176b36;

          font-size: 12px;
        }

        .bar-track {
          width: 100%;

          height: 10px;

          overflow: hidden;

          border-radius: 20px;

          background: #edf3ed;
        }

        .bar-fill {
          height: 100%;

          border-radius: 20px;

          transition:
            width 0.7s ease;
        }

        .crop-bar-fill {
          background:
            linear-gradient(
              90deg,
              #176b36,
              #6da477
            );
        }

        .market-bar-fill {
          background:
            linear-gradient(
              90deg,
              #d97706,
              #eab308
            );
        }

        /* =====================================================
           EARNINGS BAR CHART
        ===================================================== */

        .earnings-chart {
          width: 100%;
          height: 245px;
        }

        .earnings-bars {
          width: 100%;
          height: 100%;

          display: flex;
          align-items: flex-end;

          gap: 12px;

          padding-top: 5px;
        }

        .earnings-column {
          min-width: 0;

          flex: 1;

          height: 100%;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
        }

        .earnings-value {
          min-height: 25px;

          color: #176b36;

          font-size: 9px;

          font-weight: 700;

          text-align: center;
        }

        .earnings-bar-area {
          width: 100%;

          max-width: 46px;

          height: 175px;

          display: flex;
          align-items: flex-end;

          border-radius: 10px 10px 5px 5px;

          background: #f1f6f1;

          overflow: hidden;
        }

        .earnings-bar {
          width: 100%;

          border-radius:
            10px 10px 4px 4px;

          background:
            linear-gradient(
              180deg,
              #176b36,
              #8bb493
            );

          transition:
            height 0.7s ease;
        }

        .earnings-column > span {
          margin-top: 8px;

          color: #7b857e;

          font-size: 10px;

          text-align: center;
        }

        /* =====================================================
           ORDER CHART
        ===================================================== */

        .order-chart {
          min-height: 235px;

          display: flex;
          align-items: center;

          gap: 30px;
        }

        .order-ring-wrapper {
          flex-shrink: 0;
        }

        .order-ring {
          width: 170px;
          height: 170px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background:
            conic-gradient(
              #176b36 0 30%,
              #6da477 30% 55%,
              #d97706 55% 75%,
              #dc2626 75% 88%,
              #94a3b8 88% 100%
            );
        }

        .order-ring-inner {
          width: 118px;
          height: 118px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: white;
        }

        .order-ring-inner strong {
          color: #14532d;

          font-size: 28px;
        }

        .order-ring-inner span {
          color: #7b857e;

          font-size: 11px;
        }

        .order-legend {
          flex: 1;

          display: flex;
          flex-direction: column;

          gap: 13px;
        }

        .legend-row {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 10px;

          font-size: 12px;
        }

        .legend-left {
          display: flex;
          align-items: center;

          gap: 8px;
        }

        .legend-dot {
          width: 9px;
          height: 9px;

          border-radius: 50%;

          background: #176b36;
        }

        .legend-dot-1 {
          background: #6da477;
        }

        .legend-dot-2 {
          background: #d97706;
        }

        .legend-dot-3 {
          background: #dc2626;
        }

        .legend-dot-4 {
          background: #94a3b8;
        }

        .legend-row strong {
          color: #176b36;
        }

        .legend-row small {
          color: #9ca3af;

          font-weight: 500;
        }

        /* =====================================================
           EMPTY CHART
        ===================================================== */

        .chart-empty {
          min-height: 230px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          text-align: center;
        }

        .chart-empty > div {
          font-size: 38px;
        }

        .chart-empty p {
          margin: 10px 0 14px;

          color: #7b857e;

          font-size: 13px;
        }

        .chart-empty button {
          min-height: 40px;

          padding: 0 15px;

          border: none;

          border-radius: 10px;

          background: #e9f5eb;

          color: #176b36;

          font-weight: 700;

          cursor: pointer;
        }

        /* =====================================================
           QUICK ACCESS
        ===================================================== */

        .quick-section {
          margin-top: 35px;
        }

        .section-heading-inline {
          margin-bottom: 17px;
        }

        .section-heading-inline h2 {
          margin: 5px 0 0;

          color: #173b24;

          font-size: 24px;
        }

        .quick-grid {
          display: grid;

          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );

          gap: 14px;
        }

        .quick-card {
          min-height: 92px;

          display: flex;
          align-items: center;

          gap: 12px;

          padding: 16px;

          border: 1px solid
            #dfe8df;

          border-radius: 16px;

          background: white;

          cursor: pointer;

          text-align: left;
        }

        .quick-card:hover {
          border-color: #a9c8ae;

          transform: translateY(-2px);
        }

        .quick-card > span {
          width: 42px;
          height: 42px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 12px;

          background: #eef7ef;

          font-size: 20px;
        }

        .quick-card > div {
          min-width: 0;

          flex: 1;

          display: flex;
          flex-direction: column;
        }

        .quick-card strong {
          color: #24412c;

          font-size: 13px;
        }

        .quick-card small {
          margin-top: 4px;

          color: #8a948c;

          font-size: 10px;
        }

        .quick-card b {
          color: #176b36;

          font-size: 17px;
        }

        /* =====================================================
           RECENT
        ===================================================== */

        .recent-grid {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 18px;

          margin-top: 35px;
        }

        .recent-list {
          display: flex;
          flex-direction: column;

          gap: 10px;
        }

        .recent-item {
          display: flex;
          align-items: center;

          gap: 11px;

          padding: 12px;

          border-radius: 13px;

          background: #f7faf7;
        }

        .recent-item-icon {
          width: 38px;
          height: 38px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 10px;

          background: #e9f5eb;
        }

        .order-icon {
          background: #fff5e8;
        }

        .recent-item-main {
          min-width: 0;

          flex: 1;

          display: flex;
          flex-direction: column;
        }

        .recent-item-main strong {
          overflow: hidden;

          text-overflow: ellipsis;

          white-space: nowrap;

          color: #304335;

          font-size: 12px;
        }

        .recent-item-main span {
          margin-top: 3px;

          color: #8a948c;

          font-size: 10px;
        }

        .status-pill {
          padding: 5px 8px;

          border-radius: 20px;

          background: #e9f5eb;

          color: #176b36;

          font-size: 9px;

          font-weight: 700;

          text-transform: capitalize;
        }

        .status-pill.pending {
          background: #fff4df;
          color: #a45d00;
        }

        .status-pill.confirmed,
        .status-pill.accepted {
          background: #e8f5ed;
          color: #176b36;
        }

        .status-pill.delivered,
        .status-pill.completed {
          background: #e3f3eb;
          color: #12633a;
        }

        .status-pill.cancelled,
        .status-pill.canceled,
        .status-pill.rejected {
          background: #fdecec;
          color: #b91c1c;
        }

        .simple-empty {
          min-height: 150px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          color: #8a948c;

          text-align: center;

          font-size: 30px;
        }

        .simple-empty p {
          margin: 8px 0 0;

          font-size: 12px;
        }

        /* =====================================================
           HARVEST ACTIVITY
        ===================================================== */

        .harvest-activity-card {
          margin-top: 18px;
        }

        .harvest-activity-grid {
          display: grid;

          grid-template-columns:
            repeat(
              5,
              minmax(0, 1fr)
            );

          gap: 10px;
        }

        .harvest-activity-item {
          min-width: 0;

          display: flex;
          flex-direction: column;

          padding: 15px;

          border-radius: 14px;

          background: #f7faf7;
        }

        .harvest-activity-icon {
          width: 38px;
          height: 38px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin-bottom: 9px;

          border-radius: 10px;

          background: #e9f5eb;
        }

        .harvest-activity-item strong {
          display: block;

          overflow: hidden;

          text-overflow: ellipsis;

          white-space: nowrap;

          color: #304335;

          font-size: 12px;
        }

        .harvest-activity-item span {
          margin-top: 3px;

          color: #8a948c;

          font-size: 10px;
        }

        .harvest-earning {
          margin-top: 9px;

          color: #176b36;

          font-size: 13px;

          font-weight: 800;
        }

        /* =====================================================
           FOOTER
        ===================================================== */

        .dashboard-footer {
          margin-top: 35px;

          padding: 22px 5px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          border-top: 1px solid
            #dfe8df;

          color: #8a948c;

          font-size: 11px;
        }

        .dashboard-footer > div {
          display: flex;
          flex-direction: column;

          gap: 4px;
        }

        .dashboard-footer strong {
          color: #176b36;

          font-size: 13px;
        }

        /* =====================================================
           MOBILE MENU
        ===================================================== */

        .mobile-menu-overlay {
          position: fixed;

          inset: 0;

          width: 100vw;
          height: 100dvh;

          z-index: 999999;

          display: flex;
          flex-direction: column;

          overflow-y: auto;
          overflow-x: hidden;

          background: #f4f8f3;

          overscroll-behavior: contain;

          -webkit-overflow-scrolling: touch;
        }

        .mobile-menu-header {
          min-height: 76px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 13px 18px;

          background: white;

          border-bottom: 1px solid
            #dfe8df;
        }

        .mobile-menu-brand {
          display: flex;
          align-items: center;

          gap: 10px;
        }

        .mobile-menu-logo {
          width: 44px;
          height: 44px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 13px;

          background: #e9f5eb;

          font-size: 22px;
        }

        .mobile-menu-brand div:last-child {
          display: flex;
          flex-direction: column;
        }

        .mobile-menu-brand strong {
          color: #14532d;

          font-size: 17px;
        }

        .mobile-menu-brand span {
          margin-top: 2px;

          color: #7b857e;

          font-size: 10px;
        }

        .mobile-close-button {
          width: 44px;
          height: 44px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: none;

          border-radius: 12px;

          background: #eef5ee;

          color: #176b36;

          font-size: 30px;

          line-height: 1;

          cursor: pointer;
        }

        .mobile-user-card {
          display: flex;
          align-items: center;

          gap: 12px;

          margin: 16px;

          padding: 16px;

          border: 1px solid
            #dfe8df;

          border-radius: 17px;

          background: white;

          box-shadow:
            0 4px 15px
            rgba(
              20,
              83,
              45,
              0.04
            );
        }

        .mobile-user-avatar {
          width: 46px;
          height: 46px;

          display: flex;
          align-items: center;
          justify-content: center;

          flex-shrink: 0;

          border-radius: 50%;

          background: #e9f5eb;

          font-size: 22px;
        }

        .mobile-user-card div:last-child {
          min-width: 0;

          display: flex;
          flex-direction: column;
        }

        .mobile-user-card strong {
          color: #173b24;

          font-size: 15px;
        }

        .mobile-user-card span {
          margin-top: 3px;

          overflow: hidden;

          text-overflow: ellipsis;

          white-space: nowrap;

          color: #7b857e;

          font-size: 10px;
        }

        .mobile-menu-list {
          display: flex;
          flex-direction: column;

          gap: 8px;

          padding: 0 16px;
        }

        .mobile-menu-list button {
          position: relative;

          min-height: 56px;

          display: flex;
          align-items: center;

          gap: 13px;

          width: 100%;

          padding: 0 14px;

          border: 1px solid
            #dfe8df;

          border-radius: 14px;

          background: white;

          color: #263d2c;

          text-align: left;

          cursor: pointer;
        }

        .mobile-menu-list button:active {
          background: #eef7ef;
        }

        .mobile-menu-list button > span {
          width: 34px;
          height: 34px;

          display: flex;
          align-items: center;
          justify-content: center;

          flex-shrink: 0;

          border-radius: 10px;

          background: #eef7ef;

          font-size: 17px;
        }

        .mobile-menu-list button strong {
          flex: 1;

          color: #304335;

          font-size: 14px;
        }

        .mobile-menu-list button b {
          color: #176b36;

          font-size: 18px;
        }

        .mobile-menu-list button em {
          min-width: 22px;
          height: 22px;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 0 5px;

          border-radius: 20px;

          background: #dc2626;

          color: white;

          font-size: 10px;

          font-style: normal;

          font-weight: 800;
        }

        .mobile-menu-bottom {
          margin-top: auto;

          padding: 18px 16px 24px;
        }

        .mobile-logout-button {
          width: 100%;

          min-height: 55px;

          display: flex;
          align-items: center;

          gap: 13px;

          padding: 0 16px;

          border: none;

          border-radius: 14px;

          background: #fff0f0;

          color: #b91c1c;

          cursor: pointer;
        }

        .mobile-logout-button span {
          font-size: 18px;
        }

        .mobile-logout-button strong {
          font-size: 14px;
        }

        /* =====================================================
           TABLET
        ===================================================== */

        @media (max-width: 1100px) {

          .stats-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }

          .quick-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }

          .harvest-activity-grid {
            grid-template-columns:
              repeat(
                3,
                minmax(0, 1fr)
              );
          }

        }

        /* =====================================================
           MOBILE
        ===================================================== */

        @media (max-width: 700px) {

          .dashboard-header {
            min-height: 68px;

            padding: 10px 15px;
          }

          .brand-icon {
            width: 40px;
            height: 40px;

            border-radius: 12px;

            font-size: 21px;
          }

          .brand-section h1 {
            font-size: 18px;
          }

          .brand-section p {
            font-size: 9px;
          }

          .desktop-header-actions {
            display: none;
          }

          .mobile-header-actions {
            display: flex;
            align-items: center;

            gap: 7px;
          }

          .mobile-notification-button,
          .hamburger-button {
            position: relative;

            width: 42px;
            height: 42px;

            display: flex;
            align-items: center;
            justify-content: center;

            border: none;

            border-radius: 12px;

            background: #eef7ef;

            color: #176b36;

            cursor: pointer;
          }

          .mobile-notification-button {
            font-size: 18px;
          }

          .mobile-notification-badge {
            top: -3px;
            right: -3px;
          }

          .hamburger-button {
            flex-direction: column;

            gap: 4px;
          }

          .hamburger-button span {
            display: block;

            width: 19px;
            height: 2px;

            border-radius: 5px;

            background: #176b36;
          }

          .dashboard-content {
            width: 94%;

            padding: 18px 0 35px;
          }

          .welcome-section {
            min-height: auto;

            padding: 23px 20px;

            border-radius: 19px;
          }

          .welcome-section h2 {
            font-size: 23px;
          }

          .welcome-section p {
            font-size: 12px;

            line-height: 1.6;
          }

          .welcome-illustration {
            display: none;
          }

          .stats-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );

            gap: 10px;

            margin-bottom: 16px;
          }

          .stat-card {
            min-height: 110px;

            padding: 15px;

            gap: 10px;

            border-radius: 15px;
          }

          .stat-icon {
            width: 40px;
            height: 40px;

            border-radius: 11px;

            font-size: 19px;
          }

          .stat-content span {
            font-size: 10px;
          }

          .stat-content strong {
            font-size: 22px;
          }

          .stat-content small {
            font-size: 9px;
          }

          .overview-grid {
            grid-template-columns: 1fr;

            gap: 12px;

            margin-bottom: 25px;
          }

          .dashboard-card {
            padding: 18px;

            border-radius: 17px;
          }

          .weather-temperature {
            font-size: 30px;
          }

          .weather-icon-large {
            width: 64px;
            height: 64px;

            font-size: 34px;
          }

          .section-heading-block {
            margin: 25px 0 14px;
          }

          .section-heading-block h2 {
            font-size: 21px;
          }

          .charts-grid {
            grid-template-columns: 1fr;

            gap: 12px;

            margin-bottom: 12px;
          }

          .chart-card {
            min-height: 310px;

            padding: 18px;

            border-radius: 17px;
          }

          .chart-header {
            margin-bottom: 20px;
          }

          .chart-header h3 {
            font-size: 15px;
          }

          .chart-header p {
            font-size: 9px;
          }

          .chart-icon {
            width: 37px;
            height: 37px;

            font-size: 17px;
          }

          .earnings-chart {
            height: 220px;
          }

          .earnings-bar-area {
            height: 145px;
          }

          .earnings-value {
            font-size: 8px;
          }

          .earnings-column > span {
            font-size: 8px;
          }

          .order-chart {
            min-height: 220px;

            gap: 20px;
          }

          .order-ring {
            width: 140px;
            height: 140px;
          }

          .order-ring-inner {
            width: 96px;
            height: 96px;
          }

          .order-ring-inner strong {
            font-size: 23px;
          }

          .legend-row {
            font-size: 10px;
          }

          .quick-section {
            margin-top: 25px;
          }

          .section-heading-inline h2 {
            font-size: 21px;
          }

          .quick-grid {
            grid-template-columns: 1fr;

            gap: 9px;
          }

          .quick-card {
            min-height: 70px;

            padding: 12px;
          }

          .quick-card > span {
            width: 38px;
            height: 38px;

            font-size: 18px;
          }

          .quick-card strong {
            font-size: 12px;
          }

          .quick-card small {
            font-size: 9px;
          }

          .recent-grid {
            grid-template-columns: 1fr;

            gap: 12px;

            margin-top: 25px;
          }

          .harvest-activity-card {
            margin-top: 12px;
          }

          .harvest-activity-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );

            gap: 8px;
          }

          .harvest-activity-item {
            padding: 12px;
          }

          .dashboard-footer {
            flex-direction: column;

            align-items: flex-start;

            gap: 8px;

            margin-top: 25px;
          }

        }

        /* =====================================================
           SMALL MOBILE
        ===================================================== */

        @media (max-width: 400px) {

          .dashboard-content {
            width: 95%;
          }

          .brand-section p {
            display: none;
          }

          .stats-grid {
            gap: 8px;
          }

          .stat-card {
            padding: 12px;

            min-height: 100px;
          }

          .stat-icon {
            width: 35px;
            height: 35px;

            font-size: 16px;
          }

          .stat-content strong {
            font-size: 20px;
          }

          .weather-details {
            grid-template-columns: 1fr;
          }

          .order-chart {
            flex-direction: column;

            justify-content: center;
          }

          .order-legend {
            width: 100%;
          }

          .harvest-activity-grid {
            grid-template-columns: 1fr;
          }

        }

      `}</style>

    </div>
  );
}

export default Dashboard;