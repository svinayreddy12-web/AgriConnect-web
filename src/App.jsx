import React, { useEffect, useRef, useState } from "react";

import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import { auth, db } from "./firebase";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Crops from "./pages/Crops.jsx";
import Marketplace from "./pages/Marketplace.jsx";
import MarketPrices from "./pages/MarketPrices.jsx";
import Orders from "./pages/Orders.jsx";
import Weather from "./pages/Weather.jsx";
import Profile from "./pages/Profile.jsx";
import Notifications from "./pages/Notifications.jsx";
import Help from "./pages/Help.jsx";
import HarvestRecords from "./pages/HarvestRecords.jsx";

const PAGE_KEY = "agriCurrentPage";
const DASHBOARD_SCROLL_KEY = "agriDashboardScroll";
const MODULE_SCROLL_KEY = "agriModuleScroll";

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [page, setPage] = useState(() => {
    try {
      const savedPage =
        sessionStorage.getItem(PAGE_KEY);

      if (savedPage) {
        return savedPage;
      }

      return "login";
    } catch (error) {
      return "login";
    }
  });

  const moduleRef = useRef(null);

  /* =====================================================
     FIREBASE AUTHENTICATION
  ===================================================== */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (firebaseUser) => {
          try {
            if (firebaseUser) {
              let name =
                firebaseUser.displayName ||
                firebaseUser.email?.split("@")[0] ||
                "Farmer";

              /*
               * Load profile name from Firestore
               */
              try {
                const profileRef = doc(
                  db,
                  "profiles",
                  firebaseUser.uid
                );

                const profileSnap =
                  await getDoc(profileRef);

                if (profileSnap.exists()) {
                  const profileData =
                    profileSnap.data();

                  if (profileData.name) {
                    name =
                      profileData.name;
                  }
                }
              } catch (profileError) {
                console.error(
                  "Profile loading error:",
                  profileError
                );
              }

              const loggedInUser = {
                uid: firebaseUser.uid,
                name,
                email: firebaseUser.email,
              };

              setUser(loggedInUser);

              /*
               * Compatibility for existing modules
               */
              localStorage.setItem(
                "agriUser",
                JSON.stringify(
                  loggedInUser
                )
              );

              /*
               * If login/register was open,
               * go to Dashboard.
               */
              setPage(
                (currentPage) => {
                  if (
                    currentPage ===
                      "login" ||
                    currentPage ===
                      "register"
                  ) {
                    try {
                      sessionStorage.setItem(
                        PAGE_KEY,
                        "dashboard"
                      );
                    } catch (error) {
                      console.error(error);
                    }

                    return "dashboard";
                  }

                  return currentPage;
                }
              );
            } else {
              setUser(null);

              localStorage.removeItem(
                "agriUser"
              );

              try {
                sessionStorage.removeItem(
                  PAGE_KEY
                );

                sessionStorage.removeItem(
                  DASHBOARD_SCROLL_KEY
                );

                sessionStorage.removeItem(
                  MODULE_SCROLL_KEY
                );
              } catch (error) {
                console.error(error);
              }

              setPage("login");
            }
          } catch (error) {
            console.error(
              "Firebase authentication state error:",
              error
            );

            setUser(null);
            setPage("login");
          } finally {
            setAuthLoading(false);
          }
        }
      );

    return () => unsubscribe();
  }, []);

  /* =====================================================
     SAVE DASHBOARD SCROLL
  ===================================================== */

  const saveDashboardScroll = () => {
    try {
      sessionStorage.setItem(
        DASHBOARD_SCROLL_KEY,
        String(window.scrollY)
      );
    } catch (error) {
      console.error(
        "Dashboard scroll save error:",
        error
      );
    }
  };

  /* =====================================================
     SAVE MODULE SCROLL
  ===================================================== */

  const saveModuleScroll = () => {
    try {
      if (moduleRef.current) {
        sessionStorage.setItem(
          MODULE_SCROLL_KEY,
          String(
            moduleRef.current.scrollTop
          )
        );
      }
    } catch (error) {
      console.error(
        "Module scroll save error:",
        error
      );
    }
  };

  /* =====================================================
     ANDROID / PWA BACK BUTTON
     
     Navigation is intentionally one level deep:

     Dashboard
          ↓
       Module
          ↓
     Android Back
          ↓
       Dashboard
  ===================================================== */

  useEffect(() => {
    if (!user) {
      return;
    }

    /*
     * Make the current screen an AgriConnect
     * history state.
     */
    window.history.replaceState(
      {
        agriConnect: true,
        page,
      },
      "",
      window.location.href
    );

    const handlePopState = () => {
      /*
       * If a module is open, Android Back means:
       *
       * Module → Dashboard
       */
      if (page !== "dashboard") {
        saveModuleScroll();

        try {
          sessionStorage.setItem(
            PAGE_KEY,
            "dashboard"
          );
        } catch (error) {
          console.error(
            "Back navigation save error:",
            error
          );
        }

        setPage("dashboard");

        /*
         * The history entry is now the Dashboard.
         */
        window.history.replaceState(
          {
            agriConnect: true,
            page: "dashboard",
          },
          "",
          window.location.href
        );

        return;
      }

      /*
       * When already on Dashboard, keep the
       * installed PWA inside the application.
       */
      window.history.pushState(
        {
          agriConnect: true,
          page: "dashboard",
        },
        "",
        window.location.href
      );
    };

    window.addEventListener(
      "popstate",
      handlePopState
    );

    return () => {
      window.removeEventListener(
        "popstate",
        handlePopState
      );
    };
  }, [user, page]);

  /* =====================================================
     OPEN MODULE
  ===================================================== */

  const openPage = (nextPage) => {
    /*
     * Remember exactly where the user was
     * on the Dashboard.
     */
    saveDashboardScroll();

    try {
      sessionStorage.setItem(
        PAGE_KEY,
        nextPage
      );

      /*
       * Every newly opened module starts
       * at the top.
       */
      sessionStorage.setItem(
        MODULE_SCROLL_KEY,
        "0"
      );
    } catch (error) {
      console.error(
        "Page save error:",
        error
      );
    }

    /*
     * Add exactly one history entry.
     *
     * Dashboard → Module
     */
    window.history.pushState(
      {
        agriConnect: true,
        page: nextPage,
      },
      "",
      window.location.href
    );

    setPage(nextPage);
  };

  /* =====================================================
     BACK TO DASHBOARD
     
     Used by the visible ← Back buttons.
     
     Module → Dashboard
  ===================================================== */

  const goBack = () => {
    saveModuleScroll();

    try {
      sessionStorage.setItem(
        PAGE_KEY,
        "dashboard"
      );
    } catch (error) {
      console.error(
        "Back navigation error:",
        error
      );
    }

    /*
     * Go back exactly one history step.
     */
    if (
      window.history.state &&
      window.history.state.agriConnect === true
    ) {
      window.history.back();
    } else {
      setPage("dashboard");

      window.history.replaceState(
        {
          agriConnect: true,
          page: "dashboard",
        },
        "",
        window.location.href
      );
    }
  };

  /* =====================================================
     RESTORE DASHBOARD SCROLL
  ===================================================== */

  useEffect(() => {
    if (
      !user ||
      page !== "dashboard"
    ) {
      return;
    }

    const savedScroll =
      sessionStorage.getItem(
        DASHBOARD_SCROLL_KEY
      );

    if (savedScroll === null) {
      return;
    }

    const position =
      Number(savedScroll);

    if (Number.isNaN(position)) {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo(
          0,
          position
        );
      });
    });
  }, [user, page]);

  /* =====================================================
     RESTORE MODULE SCROLL
  ===================================================== */

  useEffect(() => {
    if (
      !user ||
      page === "dashboard"
    ) {
      return;
    }

    const savedModuleScroll =
      sessionStorage.getItem(
        MODULE_SCROLL_KEY
      );

    if (
      savedModuleScroll === null
    ) {
      return;
    }

    const position =
      Number(savedModuleScroll);

    if (Number.isNaN(position)) {
      return;
    }

    requestAnimationFrame(() => {
      if (moduleRef.current) {
        moduleRef.current.scrollTop =
          position;
      }
    });
  }, [user, page]);

  /* =====================================================
     SAVE POSITION BEFORE REFRESH
  ===================================================== */

  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        sessionStorage.setItem(
          PAGE_KEY,
          page
        );

        if (
          page === "dashboard"
        ) {
          sessionStorage.setItem(
            DASHBOARD_SCROLL_KEY,
            String(
              window.scrollY
            )
          );
        } else if (
          moduleRef.current
        ) {
          sessionStorage.setItem(
            MODULE_SCROLL_KEY,
            String(
              moduleRef.current
                .scrollTop
            )
          );
        }
      } catch (error) {
        console.error(
          "Before unload save error:",
          error
        );
      }
    };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );
    };
  }, [page]);

  /* =====================================================
     PREVENT DASHBOARD FROM SCROLLING
     BEHIND MODULE
  ===================================================== */

  useEffect(() => {
    if (!user) {
      document.body.style.overflow =
        "";
      return;
    }

    if (page !== "dashboard") {
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
  }, [user, page]);

  /* =====================================================
     STYLE ALL BACK BUTTONS
  ===================================================== */

  useEffect(() => {
    const styleBackButtons = () => {
      document
        .querySelectorAll("button")
        .forEach((button) => {
          const text =
            button.textContent
              .replace(/\s+/g, " ")
              .trim();

          if (
            text === "← Back"
          ) {
            button.style.setProperty(
              "background",
              "#e9f5eb",
              "important"
            );

            button.style.setProperty(
              "background-color",
              "#e9f5eb",
              "important"
            );

            button.style.setProperty(
              "color",
              "#176b36",
              "important"
            );

            button.style.setProperty(
              "border",
              "none",
              "important"
            );

            button.style.setProperty(
              "border-radius",
              "14px",
              "important"
            );

            button.style.setProperty(
              "min-height",
              "50px",
              "important"
            );

            button.style.setProperty(
              "min-width",
              "121px",
              "important"
            );

            button.style.setProperty(
              "padding",
              "0 20px",
              "important"
            );

            button.style.setProperty(
              "font-size",
              "17px",
              "important"
            );

            button.style.setProperty(
              "font-weight",
              "700",
              "important"
            );

            button.style.setProperty(
              "display",
              "inline-flex",
              "important"
            );

            button.style.setProperty(
              "align-items",
              "center",
              "important"
            );

            button.style.setProperty(
              "justify-content",
              "center",
              "important"
            );

            button.style.setProperty(
              "cursor",
              "pointer",
              "important"
            );

            button.style.setProperty(
              "box-shadow",
              "none",
              "important"
            );

            button.style.setProperty(
              "transform",
              "none",
              "important"
            );

            button.style.setProperty(
              "transition",
              "none",
              "important"
            );
          }
        });
    };

    styleBackButtons();

    const observer =
      new MutationObserver(
        styleBackButtons
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
      }
    );

    return () =>
      observer.disconnect();
  }, [page]);

  /* =====================================================
     LOGIN CALLBACK
  ===================================================== */

  const handleLogin = (
    loggedInUser
  ) => {
    setUser(loggedInUser);
    setPage("dashboard");

    try {
      sessionStorage.setItem(
        PAGE_KEY,
        "dashboard"
      );

      sessionStorage.setItem(
        DASHBOARD_SCROLL_KEY,
        "0"
      );

      sessionStorage.setItem(
        MODULE_SCROLL_KEY,
        "0"
      );
    } catch (error) {
      console.error(error);
    }

    /*
     * Start a fresh AgriConnect history
     * after successful login.
     */
    window.history.replaceState(
      {
        agriConnect: true,
        page: "dashboard",
      },
      "",
      window.location.href
    );

    window.scrollTo(0, 0);
  };

  /* =====================================================
     LOGOUT
  ===================================================== */

  const handleLogout =
    async () => {
      try {
        await signOut(auth);

        localStorage.removeItem(
          "agriUser"
        );

        sessionStorage.removeItem(
          PAGE_KEY
        );

        sessionStorage.removeItem(
          DASHBOARD_SCROLL_KEY
        );

        sessionStorage.removeItem(
          MODULE_SCROLL_KEY
        );

        setUser(null);
        setPage("login");

        window.scrollTo(0, 0);
      } catch (error) {
        console.error(
          "Logout error:",
          error
        );
      }
    };

  /* =====================================================
     NAVIGATION FUNCTIONS
  ===================================================== */

  const goProfile = () =>
    openPage("profile");

  const goCrops = () =>
    openPage("crops");

  const goMarketplace = () =>
    openPage("marketplace");

  const goMarketPrices = () =>
    openPage("prices");

  const goOrders = () =>
    openPage("orders");

  const goWeather = () =>
    openPage("weather");

  const goNotifications = () =>
    openPage("notifications");

  const goHelp = () =>
    openPage("help");

  const goHarvest = () =>
    openPage("harvest");

  /* =====================================================
     AUTH LOADING
  ===================================================== */

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f3fff4",
          fontFamily:
            "Arial, sans-serif",
          color: "#176b36",
          fontSize: "18px",
          fontWeight: "bold",
        }}
      >
        🌱 Loading AgriConnect...
      </div>
    );
  }

  /* =====================================================
     LOGIN
  ===================================================== */

  if (
    !user &&
    page === "login"
  ) {
    return (
      <Login
        onRegister={() =>
          setPage("register")
        }
        onLogin={handleLogin}
      />
    );
  }

  /* =====================================================
     REGISTER
  ===================================================== */

  if (
    !user &&
    page === "register"
  ) {
    return (
      <Register
        onLogin={() =>
          setPage("login")
        }
      />
    );
  }

  /* =====================================================
     MAIN APPLICATION
  ===================================================== */

  if (user) {
    return (
      <div className="agri-app">

        {/* =================================================
            DASHBOARD
        ================================================= */}

        <div
          className={
            page === "dashboard"
              ? "dashboard-layer"
              : "dashboard-layer dashboard-hidden"
          }
        >
          <Dashboard
            user={user}
            onLogout={handleLogout}
            onProfile={goProfile}
            onCrops={goCrops}
            onMarketplace={
              goMarketplace
            }
            onMarketPrices={
              goMarketPrices
            }
            onOrders={goOrders}
            onWeather={goWeather}
            onNotifications={
              goNotifications
            }
            onHelp={goHelp}
            onHarvest={goHarvest}
          />
        </div>

        {/* =================================================
            MODULE
        ================================================= */}

        {page !== "dashboard" && (
          <div
            ref={moduleRef}
            className="module-layer"
          >
            <div className="module-content">

              {page === "profile" && (
                <Profile
                  user={user}
                  onBack={goBack}
                />
              )}

              {page === "crops" && (
                <Crops
                  onBack={goBack}
                />
              )}

              {page === "marketplace" && (
                <Marketplace
                  onBack={goBack}
                />
              )}

              {page === "prices" && (
                <MarketPrices
                  onBack={goBack}
                />
              )}

              {page === "orders" && (
                <Orders
                  onBack={goBack}
                />
              )}

              {page === "weather" && (
                <Weather
                  onBack={goBack}
                />
              )}

              {page === "notifications" && (
                <Notifications
                  onBack={goBack}
                />
              )}

              {page === "help" && (
                <Help
                  onBack={goBack}
                />
              )}

              {page === "harvest" && (
                <HarvestRecords
                  onBack={goBack}
                />
              )}

            </div>
          </div>
        )}

        {/* =================================================
            APP STYLES
        ================================================= */}

        <style>{`

          .agri-app {
            position: relative;
            width: 100%;
            min-height: 100vh;
            overflow-x: hidden;
          }

          .dashboard-layer {
            width: 100%;
            min-height: 100vh;
          }

          /*
           * Completely hide Dashboard while
           * a module is open.
           */
          .dashboard-hidden {
            visibility: hidden !important;
            pointer-events: none !important;
            height: 0 !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }

          /*
           * Full-screen module.
           */
          .module-layer {
            position: fixed;

            top: 0;
            left: 0;
            right: 0;
            bottom: 0;

            width: 100%;
            height: 100vh;

            z-index: 99999;

            background: #f4f8f3;

            overflow-x: hidden;
            overflow-y: auto;

            overscroll-behavior: contain;

            -webkit-overflow-scrolling: touch;
          }

          .module-content {
            width: 100%;
            min-height: 100vh;

            background: #f4f8f3;
          }

          @media (max-width: 600px) {

            .agri-app {
              width: 100%;
              min-height: 100vh;
              overflow-x: hidden;
            }

            .dashboard-layer {
              width: 100%;
            }

            .dashboard-hidden {
              display: none !important;
            }

            .module-layer {
              width: 100%;
              height: 100vh;

              overflow-x: hidden;
              overflow-y: auto;

              -webkit-overflow-scrolling: touch;

              overscroll-behavior: contain;
            }

            .module-content {
              width: 100%;
              min-height: 100vh;
            }

          }

        `}</style>

      </div>
    );
  }

  return null;
}

export default App;