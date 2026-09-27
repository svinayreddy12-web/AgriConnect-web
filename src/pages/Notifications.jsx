import React, { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase";

function Notifications({ onBack }) {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const firebaseUser = auth.currentUser;
  const userEmail = firebaseUser?.email || "";
  const userUid = firebaseUser?.uid || "";

  /* =========================
     FIRESTORE NOTIFICATIONS
  ========================= */

  useEffect(() => {
    if (!userEmail) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const notificationsQuery = query(
      collection(db, "notifications"),
      where("ownerEmail", "==", userEmail)
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        data.sort(
          (a, b) =>
            new Date(b.date || 0) -
            new Date(a.date || 0)
        );

        setNotifications(data);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Notification loading error:",
          error
        );
        setNotifications([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userEmail, userUid]);

  /* =========================
     CREATE NOTIFICATION
  ========================= */

  const createNotification = async (
    type,
    title,
    message,
    icon
  ) => {
    if (!userEmail || !userUid) return;

    try {
      /*
        Create a predictable ID so the same notification
        is not repeatedly created.
      */

      const safeId = encodeURIComponent(
        `${userEmail}_${type}_${title}_${message}`
      ).replace(/%/g, "_");

      const notificationRef = doc(
        db,
        "notifications",
        safeId
      );

      await setDoc(
        notificationRef,
        {
          ownerUid: userUid,
          ownerEmail: userEmail,
          type,
          title,
          message,
          icon,
          read: false,
          date: new Date().toISOString(),
        },
        {
          merge: false,
        }
      );
    } catch (error) {
      console.error(
        "Notification creation error:",
        error
      );
    }
  };

  /* =========================
     GENERATE NOTIFICATIONS
  ========================= */

  useEffect(() => {
    if (!userEmail || !userUid) return;

    let unsubscribeCrops;
    let unsubscribeOrders;

    const cropsQuery = query(
      collection(db, "crops"),
      where("ownerEmail", "==", userEmail)
    );

    const ordersQuery = query(
      collection(db, "orders"),
      where("ownerEmail", "==", userEmail)
    );

    unsubscribeCrops = onSnapshot(
      cropsQuery,
      async (snapshot) => {
        const crops = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        for (const crop of crops) {
          if (!crop.harvestDate) continue;

          const harvestDate = new Date(
            crop.harvestDate
          );

          const today = new Date();

          if (
            Number.isNaN(
              harvestDate.getTime()
            )
          ) {
            continue;
          }

          harvestDate.setHours(0, 0, 0, 0);
          today.setHours(0, 0, 0, 0);

          const difference = Math.ceil(
            (harvestDate - today) /
              (1000 * 60 * 60 * 24)
          );

          if (
            difference >= 0 &&
            difference <= 7
          ) {
            const cropName =
              crop.name || "Crop";

            await createNotification(
              "crop",
              `Harvest Reminder: ${cropName}`,
              `${cropName} is expected to be ready for harvest within ${difference} day${
                difference === 1 ? "" : "s"
              }.`,
              "🌾"
            );
          }
        }
      },
      (error) => {
        console.error(
          "Crop notification error:",
          error
        );
      }
    );

    unsubscribeOrders = onSnapshot(
      ordersQuery,
      async (snapshot) => {
        const orders = snapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

        const pendingOrders =
          orders.filter(
            (order) =>
              String(
                order.status || ""
              ).toLowerCase() === "pending"
          );

        if (pendingOrders.length > 0) {
          await createNotification(
            "order",
            "Pending Orders",
            `You have ${pendingOrders.length} pending order${
              pendingOrders.length === 1
                ? ""
                : "s"
            } waiting for confirmation.`,
            "📦"
          );
        }

        const confirmedOrders =
          orders.filter(
            (order) =>
              String(
                order.status || ""
              ).toLowerCase() === "confirmed"
          );

        if (confirmedOrders.length > 0) {
          await createNotification(
            "order",
            "Orders Confirmed",
            `${confirmedOrders.length} order${
              confirmedOrders.length === 1
                ? ""
                : "s"
            } ${
              confirmedOrders.length === 1
                ? "has"
                : "have"
            } been confirmed.`,
            "✅"
          );
        }

        if (orders.length === 0) {
          await createNotification(
            "system",
            "Welcome to AgriConnect",
            "Your farming notifications will appear here.",
            "🌱"
          );
        }
      },
      (error) => {
        console.error(
          "Order notification error:",
          error
        );
      }
    );

    return () => {
      if (unsubscribeCrops) {
        unsubscribeCrops();
      }

      if (unsubscribeOrders) {
        unsubscribeOrders();
      }
    };
  }, [userEmail, userUid]);

  /* =========================
     LOCAL WEATHER / MARKET
     ========================= */

  useEffect(() => {
    if (!userEmail) return;

    const weatherAlert =
      localStorage.getItem(
        "agriWeatherAlert"
      );

    const marketUpdated =
      localStorage.getItem(
        "agriMarketPriceUpdated"
      );

    if (weatherAlert) {
      createNotification(
        "weather",
        "Weather Alert",
        weatherAlert,
        "🌦️"
      );
    }

    if (marketUpdated) {
      const updatedDate = new Date(
        marketUpdated
      );

      if (
        !Number.isNaN(
          updatedDate.getTime()
        )
      ) {
        createNotification(
          "market",
          "Market Prices Updated",
          "Latest agricultural market prices are available.",
          "💰"
        );
      }
    }
  }, [userEmail]);

  /* =========================
     MARK AS READ
  ========================= */

  const markAsRead = async (id) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const notification = notifications.find((item) => item.id === id);
    if (!notification) return;
    if (notification.ownerUid && notification.ownerUid !== currentUser.uid) {
      return;
    }

    try {
      await setDoc(
        doc(db, "notifications", id),
        {
          read: true,
        },
        {
          merge: true,
        }
      );
    } catch (error) {
      console.error(
        "Mark as read error:",
        error
      );
    }
  };

  /* =========================
     MARK ALL AS READ
  ========================= */

  const markAllAsRead = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const unread = notifications.filter(
        (item) => !item.read
      );

      await Promise.all(
        unread.map((item) =>
          setDoc(
            doc(
              db,
              "notifications",
              item.id
            ),
            {
              read: true,
            },
            {
              merge: true,
            }
          )
        )
      );
    } catch (error) {
      console.error(
        "Mark all as read error:",
        error
      );
    }
  };

  /* =========================
     DELETE NOTIFICATION
  ========================= */

  const deleteNotification = async (id) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const notification = notifications.find((item) => item.id === id);
    if (!notification) return;
    if (notification.ownerUid && notification.ownerUid !== currentUser.uid) {
      return;
    }

    try {
      await deleteDoc(
        doc(db, "notifications", id)
      );
    } catch (error) {
      console.error(
        "Delete notification error:",
        error
      );
    }
  };

  /* =========================
     CLEAR ALL
  ========================= */

  const clearAll = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    if (notifications.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to clear all notifications?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await Promise.all(
        notifications.map((item) =>
          deleteDoc(
            doc(
              db,
              "notifications",
              item.id
            )
          )
        )
      );
    } catch (error) {
      console.error(
        "Clear notifications error:",
        error
      );
    }
  };

  /* =========================
     DATE
  ========================= */

  const getDateText = (date) => {
    if (!date) return "Recently";

    const parsed = new Date(date);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return "Recently";
    }

    return parsed.toLocaleString("en-IN");
  };

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter(
          (item) => !item.read
        )
      : filter === "read"
      ? notifications.filter(
          (item) => item.read
        )
      : notifications;

  const unreadCount =
    notifications.filter(
      (item) => !item.read
    ).length;

  return (
    <div className="notifications-page">
      <header className="notifications-header">
        <div className="header-left">
          <button
            className="back-button"
            onClick={onBack}
          >
            ← Back
          </button>

          <div>
            <h1>🔔 Notifications</h1>

            <p>
              Stay updated with your farming
              activities
            </p>
          </div>
        </div>

        <div className="header-actions">
          {unreadCount > 0 && (
            <button
              className="read-all-button"
              onClick={markAllAsRead}
            >
              ✓ Mark all as read
            </button>
          )}

          {notifications.length > 0 && (
            <button
              className="clear-button"
              onClick={clearAll}
            >
              🗑 Clear all
            </button>
          )}
        </div>
      </header>

      <main className="notifications-content">
        {loading ? (
          <div className="empty-notifications">
            <div>🔄</div>

            <h2>
              Loading notifications...
            </h2>

            <p>
              Syncing your notifications
              from Firebase.
            </p>
          </div>
        ) : (
          <>
            <section className="notification-summary">
              <div className="summary-card">
                <span>🔔</span>

                <div>
                  <strong>
                    {notifications.length}
                  </strong>

                  <small>
                    Total Notifications
                  </small>
                </div>
              </div>

              <div className="summary-card unread-summary">
                <span>📢</span>

                <div>
                  <strong>
                    {unreadCount}
                  </strong>

                  <small>Unread</small>
                </div>
              </div>

              <div className="summary-card">
                <span>✓</span>

                <div>
                  <strong>
                    {notifications.length -
                      unreadCount}
                  </strong>

                  <small>Read</small>
                </div>
              </div>
            </section>

            <section className="notification-controls">
              <button
                className={
                  filter === "all"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setFilter("all")
                }
              >
                All ({notifications.length})
              </button>

              <button
                className={
                  filter === "unread"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setFilter("unread")
                }
              >
                Unread ({unreadCount})
              </button>

              <button
                className={
                  filter === "read"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setFilter("read")
                }
              >
                Read (
                {notifications.length -
                  unreadCount}
                )
              </button>
            </section>

            <section className="notifications-list">
              {filteredNotifications.length ===
              0 ? (
                <div className="empty-notifications">
                  <div>🔔</div>

                  <h2>
                    No notifications
                  </h2>

                  <p>
                    {filter === "unread"
                      ? "You have no unread notifications."
                      : filter === "read"
                      ? "You have no read notifications."
                      : "You're all caught up! New notifications will appear here."}
                  </p>
                </div>
              ) : (
                filteredNotifications.map(
                  (item) => (
                    <div
                      className={`notification-card ${
                        item.read
                          ? "read"
                          : "unread"
                      }`}
                      key={item.id}
                    >
                      <div className="notification-icon">
                        {item.icon ||
                          "🔔"}
                      </div>

                      <div className="notification-body">
                        <div className="notification-title-row">
                          <h3>
                            {item.title}
                          </h3>

                          {!item.read && (
                            <span className="new-label">
                              NEW
                            </span>
                          )}
                        </div>

                        <p>
                          {item.message}
                        </p>

                        <small>
                          🕒{" "}
                          {getDateText(
                            item.date
                          )}
                        </small>
                      </div>

                      <div className="notification-actions">
                        {!item.read && (
                          <button
                            className="read-button"
                            onClick={() =>
                              markAsRead(
                                item.id
                              )
                            }
                          >
                            ✓ Read
                          </button>
                        )}

                        <button
                          className="delete-button"
                          onClick={() =>
                            deleteNotification(
                              item.id
                            )
                          }
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  )
                )
              )}
            </section>
          </>
        )}
      </main>

      <style>{`
        .notifications-page {
          min-height: 100vh;
          background: #f4f8f3;
          color: #1f2937;
        }

        .notifications-header {
          min-height: 75px;
          background: #ffffff;
          border-bottom: 1px solid #dfe8df;
          padding: 13px 5%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .back-button {
          border: none;
          background: #e9f5eb;
          color: #176b36;
          padding: 10px 16px;
          border-radius: 14px;
          min-height: 50px;
          min-width: 121px;
          cursor: pointer;
          font-weight: 700;
          font-size: 17px;
        }

        .notifications-header h1 {
          margin: 0;
          color: #14532d;
          font-size: 24px;
        }

        .notifications-header p {
          margin: 4px 0 0;
          color: #6b7280;
          font-size: 12px;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .header-actions button {
          min-height: 38px;
          border: none;
          border-radius: 8px;
          padding: 8px 12px;
          cursor: pointer;
          font-weight: 600;
        }

        .read-all-button {
          background: #e8f5ea;
          color: #176b36;
        }

        .clear-button {
          background: #feecec;
          color: #b91c1c;
        }

        .notifications-content {
          width: min(1050px, 90%);
          margin: auto;
          padding: 28px 0 45px;
        }

        .notification-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 20px;
        }

        .summary-card {
          background: white;
          border: 1px solid #e1e9e1;
          border-radius: 13px;
          padding: 17px;
          display: flex;
          align-items: center;
          gap: 13px;
          box-shadow: 0 3px 10px rgba(0,0,0,0.04);
        }

        .summary-card > span {
          width: 43px;
          height: 43px;
          border-radius: 11px;
          background: #edf7ee;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 21px;
        }

        .summary-card strong {
          display: block;
          font-size: 23px;
          color: #14532d;
        }

        .summary-card small {
          color: #6b7280;
          font-size: 11px;
        }

        .notification-controls {
          background: white;
          border: 1px solid #e1e9e1;
          border-radius: 11px;
          padding: 8px;
          display: flex;
          gap: 7px;
          margin-bottom: 16px;
        }

        .notification-controls button {
          border: none;
          background: transparent;
          color: #6b7280;
          border-radius: 7px;
          padding: 9px 14px;
          cursor: pointer;
          font-weight: 600;
        }

        .notification-controls button.active {
          background: #176b36;
          color: white;
        }

        .notifications-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .notification-card {
          background: white;
          border: 1px solid #e0e8e0;
          border-radius: 12px;
          padding: 15px;
          display: flex;
          align-items: flex-start;
          gap: 13px;
          transition: 0.2s;
        }

        .notification-card.unread {
          border-left: 4px solid #176b36;
          background: #fbfefb;
        }

        .notification-card:hover {
          box-shadow: 0 4px 13px rgba(0,0,0,0.06);
        }

        .notification-icon {
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          border-radius: 11px;
          background: #edf7ee;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }

        .notification-body {
          flex: 1;
          min-width: 0;
        }

        .notification-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .notification-body h3 {
          margin: 0;
          color: #14532d;
          font-size: 15px;
        }

        .notification-body p {
          margin: 5px 0;
          color: #4b5563;
          font-size: 13px;
          line-height: 1.5;
        }

        .notification-body small {
          color: #9ca3af;
          font-size: 11px;
        }

        .new-label {
          background: #dc2626;
          color: white;
          border-radius: 10px;
          padding: 2px 6px;
          font-size: 8px;
          font-weight: 700;
        }

        .notification-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .notification-actions button {
          border: none;
          border-radius: 7px;
          cursor: pointer;
          min-height: 34px;
        }

        .read-button {
          background: #e9f5eb;
          color: #176b36;
          padding: 6px 9px;
          font-size: 11px;
          font-weight: 600;
        }

        .delete-button {
          width: 34px;
          background: #fff1f1;
          color: #dc2626;
        }

        .empty-notifications {
          background: white;
          border: 1px solid #e1e9e1;
          border-radius: 14px;
          padding: 55px 20px;
          text-align: center;
        }

        .empty-notifications > div {
          font-size: 48px;
        }

        .empty-notifications h2 {
          margin: 12px 0 5px;
          color: #14532d;
        }

        .empty-notifications p {
          margin: 0;
          color: #6b7280;
          font-size: 13px;
        }

        @media (max-width: 700px) {
          .notifications-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .header-left {
            width: 100%;
          }

          .header-actions {
            width: 100%;
          }

          .header-actions button {
            flex: 1;
          }

          .notifications-content {
            width: 92%;
            padding-top: 20px;
          }

          .notification-summary {
            grid-template-columns: 1fr 1fr 1fr;
            gap: 7px;
          }

          .summary-card {
            padding: 10px;
            flex-direction: column;
            text-align: center;
            gap: 5px;
          }

          .summary-card > span {
            width: 34px;
            height: 34px;
            font-size: 17px;
          }

          .summary-card strong {
            font-size: 19px;
          }

          .notification-controls {
            overflow-x: auto;
          }

          .notification-controls button {
            white-space: nowrap;
            flex: 1;
          }

          .notification-card {
            padding: 12px;
          }

          .notification-icon {
            width: 38px;
            height: 38px;
            font-size: 18px;
          }

          .notification-actions {
            flex-direction: column;
          }

          .read-button {
            white-space: nowrap;
          }

          .notifications-header h1 {
            font-size: 21px;
          }
        }

        @media (max-width: 450px) {
          .back-button {
            padding: 10px 14px;
            min-width: 110px;
          }

          .notification-body h3 {
            font-size: 14px;
          }

          .notification-body p {
            font-size: 12px;
          }

          .notification-card {
            gap: 9px;
          }
        }
      `}</style>
    </div>
  );
}

export default Notifications;