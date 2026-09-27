import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";

function MarketPrices({ onBack }) {
  const defaultPrices = [
    {
      id: 1,
      crop: "Rice",
      market: "Ballari",
      price: 3200,
      unit: "quintal",
      trend: "up",
      change: 4.5,
    },
    {
      id: 2,
      crop: "Wheat",
      market: "Raichur",
      price: 2450,
      unit: "quintal",
      trend: "up",
      change: 2.8,
    },
    {
      id: 3,
      crop: "Tomato",
      market: "Kolar",
      price: 2800,
      unit: "quintal",
      trend: "down",
      change: -3.2,
    },
    {
      id: 4,
      crop: "Onion",
      market: "Bengaluru",
      price: 2200,
      unit: "quintal",
      trend: "up",
      change: 5.1,
    },
    {
      id: 5,
      crop: "Maize",
      market: "Davanagere",
      price: 2100,
      unit: "quintal",
      trend: "stable",
      change: 0,
    },
    {
      id: 6,
      crop: "Potato",
      market: "Chikkaballapur",
      price: 1900,
      unit: "quintal",
      trend: "down",
      change: -2.1,
    },
  ];

  const [prices, setPrices] = useState(defaultPrices);

  const [search, setSearch] = useState("");
  const [marketFilter, setMarketFilter] = useState("All");

  const [lastUpdated, setLastUpdated] = useState(
    new Date().toLocaleString("en-IN")
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const firebaseUser = auth.currentUser;
  const userEmail = firebaseUser?.email || "guest";
  const userUid = firebaseUser?.uid || "";

  /*
   * FIRESTORE MARKET PRICE SYNC
   *
   * Collection:
   * marketPrices
   *
   * Document:
   * main
   */
  useEffect(() => {
    const pricesRef = collection(db, "marketPrices");

    const unsubscribe = onSnapshot(
      pricesRef,
      async (snapshot) => {
        try {
          if (snapshot.empty) {
            // Create default market prices in Firestore
            const mainRef = doc(db, "marketPrices", "main");

            await setDoc(
              mainRef,
              {
                prices: defaultPrices,
                updatedAt: serverTimestamp(),
                updatedBy: userEmail,
                updatedByUid: userUid,
              },
              { merge: true }
            );

            setPrices(defaultPrices);

            const now = new Date().toLocaleString("en-IN");
            setLastUpdated(now);

            localStorage.setItem(
              "agriMarketPriceUpdated",
              now
            );
          } else {
            const mainDoc = snapshot.docs.find(
              (item) => item.id === "main"
            );

            if (mainDoc) {
              const data = mainDoc.data();

              if (
                Array.isArray(data.prices) &&
                data.prices.length > 0
              ) {
                setPrices(data.prices);
              }

              if (data.updatedAt?.toDate) {
                const updatedDate =
                  data.updatedAt.toDate();

                const formatted =
                  updatedDate.toLocaleString("en-IN");

                setLastUpdated(formatted);

                localStorage.setItem(
                  "agriMarketPriceUpdated",
                  formatted
                );
              }
            }
          }
        } catch (error) {
          console.error(
            "Error loading market prices:",
            error
          );

          setPrices(defaultPrices);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error(
          "Market price Firestore error:",
          error
        );

        // Fallback to localStorage if Firestore fails
        try {
          const saved = localStorage.getItem(
            "agriMarketPrices"
          );

          if (saved) {
            setPrices(JSON.parse(saved));
          } else {
            setPrices(defaultPrices);
          }

          const savedUpdated =
            localStorage.getItem(
              "agriMarketPriceUpdated"
            );

          if (savedUpdated) {
            setLastUpdated(savedUpdated);
          }
        } catch {
          setPrices(defaultPrices);
        }

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userEmail]);

  /*
   * COMPATIBILITY CACHE
   */
  useEffect(() => {
    if (prices.length > 0) {
      localStorage.setItem(
        "agriMarketPrices",
        JSON.stringify(prices)
      );
    }
  }, [prices]);

  /*
   * MARKET LIST
   */
  const markets = useMemo(() => {
    const marketList = prices
      .map((item) => item.market)
      .filter(Boolean);

    return ["All", ...new Set(marketList)];
  }, [prices]);

  /*
   * FILTERED PRICES
   */
  const filteredPrices = useMemo(() => {
    return prices.filter((item) => {
      const searchText = search.toLowerCase().trim();

      const matchesSearch =
        item.crop
          ?.toLowerCase()
          .includes(searchText) ||
        item.market
          ?.toLowerCase()
          .includes(searchText);

      const matchesMarket =
        marketFilter === "All" ||
        item.market === marketFilter;

      return matchesSearch && matchesMarket;
    });
  }, [prices, search, marketFilter]);

  /*
   * AVERAGE PRICE
   */
  const averagePrice = useMemo(() => {
    if (prices.length === 0) {
      return 0;
    }

    const total = prices.reduce(
      (sum, item) =>
        sum + Number(item.price || 0),
      0
    );

    return Math.round(total / prices.length);
  }, [prices]);

  /*
   * HIGHEST PRICE
   */
  const highestPrice = useMemo(() => {
    if (prices.length === 0) {
      return 0;
    }

    return Math.max(
      ...prices.map((item) =>
        Number(item.price || 0)
      )
    );
  }, [prices]);

  /*
   * LOWEST PRICE
   */
  const lowestPrice = useMemo(() => {
    if (prices.length === 0) {
      return 0;
    }

    return Math.min(
      ...prices.map((item) =>
        Number(item.price || 0)
      )
    );
  }, [prices]);

  /*
   * RISING PRICES
   */
  const risingPrices = prices.filter(
    (item) => item.trend === "up"
  ).length;

  /*
   * REFRESH MARKET PRICES
   */
  const refreshPrices = async () => {
    if (refreshing) {
      return;
    }

    try {
      setRefreshing(true);

      const now = new Date();
      const formatted =
        now.toLocaleString("en-IN");

      setLastUpdated(formatted);

      localStorage.setItem(
        "agriMarketPriceUpdated",
        formatted
      );

      const mainRef = doc(
        db,
        "marketPrices",
        "main"
      );

      await setDoc(
        mainRef,
        {
          prices: prices,
          updatedAt: serverTimestamp(),
          updatedBy: userEmail,
          updatedByUid: userUid,
        },
        { merge: true }
      );

      alert(
        "Market prices refreshed successfully."
      );
    } catch (error) {
      console.error(
        "Error refreshing market prices:",
        error
      );

      alert(
        "Market prices updated locally, but Firestore sync failed."
      );
    } finally {
      setRefreshing(false);
    }
  };

  /*
   * FORMAT PRICE
   */
  const formatPrice = (price) => {
    return Number(price || 0).toLocaleString(
      "en-IN"
    );
  };

  /*
   * CHANGE STYLE
   */
  const getChangeStyle = (change) => {
    if (change > 0) {
      return {
        background: "#e8f5e9",
        color: "#2e7d32",
      };
    }

    if (change < 0) {
      return {
        background: "#ffebee",
        color: "#c62828",
      };
    }

    return {
      background: "#f5f5f5",
      color: "#666",
    };
  };

  /*
   * TREND TEXT
   */
  const getTrendText = (trend) => {
    if (trend === "up") {
      return "⬆ Rising";
    }

    if (trend === "down") {
      return "⬇ Falling";
    }

    return "➡ Stable";
  };

  /*
   * TREND STYLE
   */
  const getTrendStyle = (trend) => {
    if (trend === "up") {
      return styles.upTrend;
    }

    if (trend === "down") {
      return styles.downTrend;
    }

    return styles.stableTrend;
  };

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <div style={styles.header}>
        <button
          style={styles.backButton}
          onClick={onBack}
        >
          ← Back
        </button>

        <div style={styles.headerInfo}>
          <h1 style={styles.title}>
            📈 Market Prices
          </h1>

          <p style={styles.subtitle}>
            Check current agricultural market
            prices
          </p>
        </div>

        <button
          style={{
            ...styles.refreshButton,
            opacity: refreshing ? 0.7 : 1,
            cursor: refreshing
              ? "default"
              : "pointer",
            transition: "none",
            transform: "none",
          }}
          onClick={refreshPrices}
          disabled={refreshing}
        >
          {refreshing
            ? "⏳ Refreshing..."
            : "🔄 Refresh Prices"}
        </button>
      </div>

      {/* LAST UPDATED */}
      <div style={styles.updatedBar}>
        <span>
          🕒 Last updated:{" "}
          <strong>{lastUpdated}</strong>
        </span>

        <span style={styles.syncText}>
          ☁️ Synced
        </span>
      </div>

      {/* LOADING */}
      {loading ? (
        <div style={styles.loadingBox}>
          <div style={styles.loadingIcon}>
            ⏳
          </div>

          <h3>Loading market prices...</h3>

          <p>
            Syncing the latest market information.
          </p>
        </div>
      ) : (
        <>
          {/* STATISTICS */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statIcon}>
                🌾
              </div>

              <div>
                <div style={styles.statNumber}>
                  {prices.length}
                </div>

                <div style={styles.statLabel}>
                  Crops Tracked
                </div>
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statIcon}>
                💰
              </div>

              <div>
                <div style={styles.statNumber}>
                  ₹{formatPrice(averagePrice)}
                </div>

                <div style={styles.statLabel}>
                  Average Price
                </div>
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statIcon}>
                ⬆️
              </div>

              <div>
                <div style={styles.statNumber}>
                  ₹{formatPrice(highestPrice)}
                </div>

                <div style={styles.statLabel}>
                  Highest Price
                </div>
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statIcon}>
                📊
              </div>

              <div>
                <div style={styles.statNumber}>
                  {risingPrices}
                </div>

                <div style={styles.statLabel}>
                  Prices Rising
                </div>
              </div>
            </div>
          </div>

          {/* FILTERS */}
          <div style={styles.filterCard}>
            <div style={styles.searchBox}>
              <span>🔍</span>

              <input
                type="text"
                placeholder="Search crop or market..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                style={styles.searchInput}
              />
            </div>

            <select
              value={marketFilter}
              onChange={(e) =>
                setMarketFilter(e.target.value)
              }
              style={styles.marketSelect}
            >
              {markets.map((market) => (
                <option
                  key={market}
                  value={market}
                >
                  {market === "All"
                    ? "All Markets"
                    : market}
                </option>
              ))}
            </select>
          </div>

          {/* SECTION HEADER */}
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                Current Market Prices
              </h2>

              <p style={styles.sectionSubtitle}>
                Prices shown per quintal
              </p>
            </div>

            <span style={styles.resultBadge}>
              {filteredPrices.length} result
              {filteredPrices.length !== 1
                ? "s"
                : ""}
            </span>
          </div>

          {/* CONTENT */}
          {filteredPrices.length === 0 ? (
            <div style={styles.emptyBox}>
              <div style={styles.emptyIcon}>
                🔎
              </div>

              <h3>
                No market prices found
              </h3>

              <p>
                Try another crop name or select a
                different market.
              </p>

              <button
                style={styles.clearButton}
                onClick={() => {
                  setSearch("");
                  setMarketFilter("All");
                }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="desktopTable">
                <div
                  style={styles.tableWrapper}
                >
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>
                          Crop
                        </th>

                        <th style={styles.th}>
                          Market
                        </th>

                        <th style={styles.th}>
                          Current Price
                        </th>

                        <th style={styles.th}>
                          Change
                        </th>

                        <th style={styles.th}>
                          Trend
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredPrices.map(
                        (item) => (
                          <tr key={item.id}>
                            <td
                              style={styles.td}
                            >
                              <div
                                style={
                                  styles.cropCell
                                }
                              >
                                <span
                                  style={
                                    styles.cropIcon
                                  }
                                >
                                  🌾
                                </span>

                                <strong>
                                  {item.crop}
                                </strong>
                              </div>
                            </td>

                            <td
                              style={styles.td}
                            >
                              📍 {item.market}
                            </td>

                            <td
                              style={styles.td}
                            >
                              <strong
                                style={
                                  styles.price
                                }
                              >
                                ₹
                                {formatPrice(
                                  item.price
                                )}
                              </strong>

                              <span
                                style={
                                  styles.unit
                                }
                              >
                                /{" "}
                                {item.unit ||
                                  "quintal"}
                              </span>
                            </td>

                            <td
                              style={styles.td}
                            >
                              <span
                                style={{
                                  ...styles.changeBadge,
                                  ...getChangeStyle(
                                    item.change
                                  ),
                                }}
                              >
                                {item.change > 0
                                  ? "+"
                                  : ""}
                                {item.change}%
                              </span>
                            </td>

                            <td
                              style={styles.td}
                            >
                              <span
                                style={getTrendStyle(
                                  item.trend
                                )}
                              >
                                {getTrendText(
                                  item.trend
                                )}
                              </span>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MOBILE CARDS */}
              <div className="mobileCards">
                {filteredPrices.map((item) => (
                  <div
                    key={item.id}
                    style={styles.mobileCard}
                  >
                    <div
                      style={
                        styles.mobileCardTop
                      }
                    >
                      <div
                        style={styles.mobileCrop}
                      >
                        <span
                          style={
                            styles.mobileCropIcon
                          }
                        >
                          🌾
                        </span>

                        <div>
                          <strong
                            style={
                              styles.mobileCropName
                            }
                          >
                            {item.crop}
                          </strong>

                          <div
                            style={
                              styles.mobileMarket
                            }
                          >
                            📍 {item.market}
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          ...styles.changeBadge,
                          ...getChangeStyle(
                            item.change
                          ),
                        }}
                      >
                        {item.change > 0
                          ? "+"
                          : ""}
                        {item.change}%
                      </span>
                    </div>

                    <div
                      style={
                        styles.mobilePriceRow
                      }
                    >
                      <div>
                        <div
                          style={
                            styles.mobilePriceLabel
                          }
                        >
                          Current Price
                        </div>

                        <strong
                          style={
                            styles.mobilePrice
                          }
                        >
                          ₹
                          {formatPrice(
                            item.price
                          )}
                        </strong>

                        <span
                          style={
                            styles.mobileUnit
                          }
                        >
                          /{" "}
                          {item.unit ||
                            "quintal"}
                        </span>
                      </div>

                      <div
                        style={
                          styles.mobileTrendBox
                        }
                      >
                        <div
                          style={
                            styles.mobilePriceLabel
                          }
                        >
                          Trend
                        </div>

                        <span
                          style={getTrendStyle(
                            item.trend
                          )}
                        >
                          {getTrendText(
                            item.trend
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <style>{`
        .mobileCards {
          display: none;
        }

        @media (max-width: 700px) {
          .desktopTable {
            display: none;
          }

          .mobileCards {
            display: block;
          }
        }

        @media (max-width: 600px) {
          .market-prices-page {
            overflow-x: hidden;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "20px",
    background: "#f4f8f3",
    overflowX: "hidden",
  },

  header: {
    maxWidth: "1200px",
    margin: "0 auto 20px",
    display: "flex",
    alignItems: "center",
    gap: "18px",
    flexWrap: "wrap",
  },

  backButton: {
    border: "none",
    background: "#e9f5eb",
    color: "#176b36",
    padding: "0 20px",
    minHeight: "50px",
    minWidth: "121px",
    borderRadius: "14px",
    fontWeight: "700",
    fontSize: "17px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "none",
    transform: "none",
    boxShadow: "none",
  },

  headerInfo: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    margin: 0,
    color: "#1b5e20",
    fontSize: "30px",
  },

  subtitle: {
    margin: "5px 0 0",
    color: "#666",
  },

  refreshButton: {
    border: "none",
    background: "#2e7d32",
    color: "white",
    padding: "12px 18px",
    borderRadius: "9px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "none",
    transform: "none",
  },

  updatedBar: {
    maxWidth: "1200px",
    margin: "0 auto 20px",
    background: "#fff",
    borderRadius: "10px",
    padding: "12px 16px",
    color: "#666",
    boxShadow:
      "0 2px 8px rgba(0,0,0,0.06)",
    fontSize: "14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },

  syncText: {
    color: "#2e7d32",
    fontWeight: "bold",
  },

  loadingBox: {
    maxWidth: "1200px",
    margin: "40px auto",
    padding: "50px 20px",
    background: "#fff",
    borderRadius: "14px",
    textAlign: "center",
    boxShadow:
      "0 3px 12px rgba(0,0,0,0.07)",
  },

  loadingIcon: {
    fontSize: "42px",
  },

  statsGrid: {
    maxWidth: "1200px",
    margin: "0 auto 25px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "15px",
  },

  statCard: {
    background: "#fff",
    borderRadius: "14px",
    padding: "18px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    boxShadow:
      "0 3px 12px rgba(0,0,0,0.07)",
    minWidth: 0,
  },

  statIcon: {
    fontSize: "30px",
    flexShrink: 0,
  },

  statNumber: {
    color: "#1b5e20",
    fontSize: "21px",
    fontWeight: "bold",
    wordBreak: "break-word",
  },

  statLabel: {
    color: "#777",
    marginTop: "4px",
    fontSize: "13px",
  },

  filterCard: {
    maxWidth: "1200px",
    margin: "0 auto 25px",
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },

  searchBox: {
    flex: 1,
    minWidth: "230px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "0 12px",
    minHeight: "48px",
  },

  searchInput: {
    width: "100%",
    minWidth: 0,
    border: "none",
    outline: "none",
    padding: "13px 5px",
    fontSize: "15px",
  },

  marketSelect: {
    minWidth: "190px",
    maxWidth: "100%",
    padding: "12px",
    border: "1px solid #ccc",
    borderRadius: "10px",
    background: "#fff",
    outline: "none",
  },

  sectionHeader: {
    maxWidth: "1200px",
    margin: "0 auto 15px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
  },

  sectionTitle: {
    margin: 0,
    color: "#1b5e20",
  },

  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#777",
    fontSize: "14px",
  },

  resultBadge: {
    background: "#e8f5e9",
    color: "#2e7d32",
    padding: "7px 12px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "bold",
    flexShrink: 0,
  },

  tableWrapper: {
    maxWidth: "1200px",
    margin: "0 auto",
    overflow: "hidden",
    background: "#fff",
    borderRadius: "14px",
    boxShadow:
      "0 3px 12px rgba(0,0,0,0.07)",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  th: {
    textAlign: "left",
    padding: "15px",
    background: "#e8f5e9",
    color: "#1b5e20",
    fontSize: "14px",
    borderBottom: "1px solid #ddd",
  },

  td: {
    padding: "15px",
    borderBottom: "1px solid #eee",
    color: "#444",
  },

  cropCell: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  cropIcon: {
    fontSize: "22px",
  },

  price: {
    color: "#2e7d32",
    fontSize: "17px",
  },

  unit: {
    marginLeft: "4px",
    color: "#888",
    fontSize: "12px",
  },

  changeBadge: {
    display: "inline-block",
    padding: "6px 9px",
    borderRadius: "15px",
    fontSize: "12px",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },

  upTrend: {
    color: "#2e7d32",
    fontWeight: "bold",
  },

  downTrend: {
    color: "#c62828",
    fontWeight: "bold",
  },

  stableTrend: {
    color: "#757575",
    fontWeight: "bold",
  },

  mobileCard: {
    background: "#fff",
    borderRadius: "14px",
    padding: "16px",
    marginBottom: "12px",
    boxShadow:
      "0 3px 12px rgba(0,0,0,0.07)",
    width: "100%",
    overflow: "hidden",
  },

  mobileCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "10px",
  },

  mobileCrop: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
  },

  mobileCropIcon: {
    fontSize: "28px",
    flexShrink: 0,
  },

  mobileCropName: {
    display: "block",
    color: "#1b5e20",
    fontSize: "18px",
    wordBreak: "break-word",
  },

  mobileMarket: {
    marginTop: "4px",
    color: "#777",
    fontSize: "13px",
    wordBreak: "break-word",
  },

  mobilePriceRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "15px",
    marginTop: "16px",
    paddingTop: "14px",
    borderTop: "1px solid #eee",
  },

  mobilePriceLabel: {
    color: "#888",
    fontSize: "12px",
    marginBottom: "4px",
  },

  mobilePrice: {
    color: "#2e7d32",
    fontSize: "20px",
  },

  mobileUnit: {
    marginLeft: "4px",
    color: "#888",
    fontSize: "11px",
  },

  mobileTrendBox: {
    textAlign: "right",
    flexShrink: 0,
  },

  emptyBox: {
    maxWidth: "1200px",
    margin: "30px auto",
    padding: "45px 20px",
    background: "#fff",
    borderRadius: "14px",
    textAlign: "center",
    boxShadow:
      "0 3px 12px rgba(0,0,0,0.07)",
  },

  emptyIcon: {
    fontSize: "45px",
  },

  clearButton: {
    border: "none",
    background: "#2e7d32",
    color: "#fff",
    padding: "11px 18px",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "none",
    transform: "none",
  },
};

export default MarketPrices;