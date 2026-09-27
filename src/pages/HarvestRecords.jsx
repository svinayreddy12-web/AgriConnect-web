import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase";

function HarvestRecords({ onBack }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    crop: "",
    quantity: "",
    harvestDate: "",
    price: "",
    buyer: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [cropFilter, setCropFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");

  // =========================================================
  // FIREBASE AUTHENTICATED USER
  // =========================================================

  const firebaseUser = auth.currentUser;

  const userEmail = firebaseUser?.email || "";
  const userUid = firebaseUser?.uid || "";

  // =========================================================
  // FIRESTORE REAL-TIME LISTENER
  // =========================================================

  useEffect(() => {
    setLoading(true);

    if (!userEmail) {
      setRecords([]);
      setLoading(false);
      return;
    }

    const recordsQuery = query(
      collection(db, "harvestRecords"),
      where("ownerEmail", "==", userEmail)
    );

    const unsubscribe = onSnapshot(
      recordsQuery,
      (snapshot) => {
        const recordData = snapshot.docs.map((recordDoc) => ({
          id: recordDoc.id,
          ...recordDoc.data(),
        }));

        // Newest records first
        recordData.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;

          return timeB - timeA;
        });

        setRecords(recordData);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading harvest records:", error);

        setRecords([]);
        setLoading(false);

        if (error.code === "permission-denied") {
          alert(
            "Permission denied while loading harvest records."
          );
        } else {
          alert(
            "Unable to load harvest records from Firebase."
          );
        }
      }
    );

    return () => unsubscribe();
  }, [userEmail]);

  // =========================================================
  // MESSAGE
  // =========================================================

  const showMessage = (text) => {
    setMessage(text);

    setTimeout(() => {
      setMessage("");
    }, 2500);
  };

  // =========================================================
  // FORM
  // =========================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      crop: "",
      quantity: "",
      harvestDate: "",
      price: "",
      buyer: "",
    });

    setEditingId(null);
    setShowForm(false);
  };

  // =========================================================
  // ADD / UPDATE HARVEST RECORD
  // =========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    const currentUser = auth.currentUser;

    if (!currentUser) {
      showMessage("Please login first.");
      return;
    }

    const currentEmail = currentUser.email || "";
    const currentUid = currentUser.uid || "";

    if (!currentEmail || !currentUid) {
      showMessage("Unable to identify logged-in user.");
      return;
    }

    const cropName = formData.crop.trim();
    const quantity = Number(formData.quantity);
    const price = Number(formData.price);
    const buyerName = formData.buyer.trim();

    // =======================================================
    // VALIDATION
    // =======================================================

    if (!cropName) {
      showMessage("Please enter crop name.");
      return;
    }

    if (
      formData.quantity === "" ||
      Number.isNaN(quantity) ||
      quantity <= 0
    ) {
      showMessage("Please enter a valid quantity in kg.");
      return;
    }

    if (!formData.harvestDate) {
      showMessage("Please select harvest date.");
      return;
    }

    if (
      formData.price === "" ||
      Number.isNaN(price) ||
      price < 0
    ) {
      showMessage("Please enter a valid selling price.");
      return;
    }

    try {
      // =====================================================
      // UPDATE EXISTING RECORD
      // =====================================================

      if (editingId !== null) {
        const existingRecord = records.find(
          (record) => record.id === editingId
        );

        if (!existingRecord) {
          showMessage("Harvest record not found.");
          return;
        }

        // If the record has an ownerUid, verify ownership
        if (
          existingRecord.ownerUid &&
          existingRecord.ownerUid !== currentUid
        ) {
          showMessage("You cannot edit this record.");
          return;
        }

        const recordRef = doc(
          db,
          "harvestRecords",
          editingId
        );

        await updateDoc(recordRef, {
          ownerUid: currentUid,
          ownerEmail: currentEmail,
          crop: cropName,
          quantity: quantity,
          harvestDate: formData.harvestDate,
          price: price,
          buyer: buyerName,
          updatedAt: serverTimestamp(),
        });

        showMessage(
          "Harvest record updated successfully!"
        );
      }

      // =====================================================
      // ADD NEW RECORD
      // =====================================================

      else {
        await addDoc(
          collection(db, "harvestRecords"),
          {
            ownerUid: currentUid,
            ownerEmail: currentEmail,
            crop: cropName,
            quantity: quantity,
            harvestDate: formData.harvestDate,
            price: price,
            buyer: buyerName,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );

        showMessage(
          "Harvest record added successfully!"
        );
      }

      resetForm();
    } catch (error) {
      console.error(
        "Error saving harvest record:",
        error
      );

      if (error.code === "permission-denied") {
        showMessage(
          "Permission denied. You can only modify your own records."
        );
      } else {
        showMessage(
          "Failed to save harvest record. Please try again."
        );
      }
    }
  };

  // =========================================================
  // EDIT
  // =========================================================

  const handleEdit = (record) => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      showMessage("Please login first.");
      return;
    }

    // Check ownership when ownerUid exists
    if (
      record.ownerUid &&
      record.ownerUid !== currentUser.uid
    ) {
      showMessage("You cannot edit this record.");
      return;
    }

    setFormData({
      crop: record.crop || "",
      quantity:
        record.quantity !== undefined &&
        record.quantity !== null
          ? record.quantity
          : "",
      harvestDate: record.harvestDate || "",
      price:
        record.price !== undefined &&
        record.price !== null
          ? record.price
          : "",
      buyer: record.buyer || "",
    });

    setEditingId(record.id);
    setShowForm(true);
  };

  // =========================================================
  // DELETE
  // =========================================================

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this harvest record?"
    );

    if (!confirmed) {
      return;
    }

    const currentUser = auth.currentUser;

    if (!currentUser) {
      showMessage("Please login first.");
      return;
    }

    const record = records.find(
      (item) => item.id === id
    );

    if (!record) {
      showMessage("Harvest record not found.");
      return;
    }

    // Check ownership when ownerUid exists
    if (
      record.ownerUid &&
      record.ownerUid !== currentUser.uid
    ) {
      showMessage("You cannot delete this record.");
      return;
    }

    try {
      await deleteDoc(
        doc(db, "harvestRecords", id)
      );

      showMessage("Harvest record deleted.");
    } catch (error) {
      console.error(
        "Error deleting harvest record:",
        error
      );

      if (error.code === "permission-denied") {
        showMessage(
          "Permission denied. You can only delete your own records."
        );
      } else {
        showMessage(
          "Failed to delete harvest record."
        );
      }
    }
  };

  // =========================================================
  // CROP OPTIONS
  // =========================================================

  const cropOptions = useMemo(() => {
    return [
      ...new Set(
        records
          .map((record) => record.crop)
          .filter(Boolean)
      ),
    ].sort();
  }, [records]);

  // =========================================================
  // FILTERING
  // =========================================================

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const searchText = search
        .toLowerCase()
        .trim();

      const matchesSearch =
        !searchText ||
        String(record.crop || "")
          .toLowerCase()
          .includes(searchText) ||
        String(record.buyer || "")
          .toLowerCase()
          .includes(searchText) ||
        String(record.id || "")
          .toLowerCase()
          .includes(searchText);

      const matchesCrop =
        cropFilter === "All" ||
        String(record.crop || "") === cropFilter;

      let matchesDate = true;

      if (dateFilter !== "All") {
        const recordDate = new Date(
          record.harvestDate
        );

        const now = new Date();

        if (!Number.isNaN(recordDate.getTime())) {
          if (dateFilter === "This Year") {
            matchesDate =
              recordDate.getFullYear() ===
              now.getFullYear();
          }

          if (dateFilter === "This Month") {
            matchesDate =
              recordDate.getFullYear() ===
                now.getFullYear() &&
              recordDate.getMonth() ===
                now.getMonth();
          }

          if (dateFilter === "Last 30 Days") {
            const thirtyDaysAgo = new Date();

            thirtyDaysAgo.setDate(
              thirtyDaysAgo.getDate() - 30
            );

            matchesDate =
              recordDate >= thirtyDaysAgo &&
              recordDate <= now;
          }
        }
      }

      return (
        matchesSearch &&
        matchesCrop &&
        matchesDate
      );
    });
  }, [
    records,
    search,
    cropFilter,
    dateFilter,
  ]);

  // =========================================================
  // STATISTICS
  // =========================================================

  const totalQuantity = records.reduce(
    (total, record) =>
      total + Number(record.quantity || 0),
    0
  );

  const totalRevenue = records.reduce(
    (total, record) =>
      total +
      Number(record.quantity || 0) *
        Number(record.price || 0),
    0
  );

  const averagePrice =
    totalQuantity > 0
      ? totalRevenue / totalQuantity
      : 0;

  // =========================================================
  // CROP SUMMARY
  // =========================================================

  const cropSummary = useMemo(() => {
    const summary = {};

    records.forEach((record) => {
      const crop = record.crop || "Unknown";

      if (!summary[crop]) {
        summary[crop] = {
          crop,
          quantity: 0,
          revenue: 0,
          records: 0,
        };
      }

      summary[crop].quantity += Number(
        record.quantity || 0
      );

      summary[crop].revenue +=
        Number(record.quantity || 0) *
        Number(record.price || 0);

      summary[crop].records += 1;
    });

    return Object.values(summary).sort(
      (a, b) => b.quantity - a.quantity
    );
  }, [records]);

  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (date) => {
    if (!date) {
      return "Not available";
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // =========================================================
  // FORMAT CURRENCY
  // =========================================================

  const formatCurrency = (amount) => {
    return `₹${Number(
      amount || 0
    ).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  };

  // =========================================================
  // EXPORT CSV
  // =========================================================

  const exportCSV = () => {
    if (records.length === 0) {
      showMessage(
        "No harvest records to export."
      );
      return;
    }

    const headers = [
      "Crop",
      "Quantity (kg)",
      "Harvest Date",
      "Price per kg",
      "Buyer",
      "Total Value",
    ];

    const rows = records.map((record) => [
      record.crop || "",
      record.quantity || 0,
      record.harvestDate || "",
      record.price || 0,
      record.buyer || "",
      (
        Number(record.quantity || 0) *
        Number(record.price || 0)
      ).toFixed(2),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value).replace(
                /"/g,
                '""'
              )}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download =
      "agriconnect-harvest-records.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    showMessage(
      "CSV exported successfully!"
    );
  };

  // =========================================================
  // EXPORT PDF
  // =========================================================

  const exportPDF = () => {
    if (records.length === 0) {
      showMessage(
        "No harvest records to export."
      );
      return;
    }

    const pdf = new jsPDF();

    pdf.setFontSize(18);

    pdf.text(
      "AgriConnect - Harvest Records",
      14,
      18
    );

    pdf.setFontSize(10);

    pdf.text(
      `Total Harvest: ${totalQuantity.toFixed(
        2
      )} kg`,
      14,
      28
    );

    pdf.text(
      `Total Revenue: ${formatCurrency(
        totalRevenue
      )}`,
      14,
      34
    );

    let y = 45;

    pdf.setFontSize(9);

    pdf.text("Crop", 14, y);
    pdf.text("Qty", 55, y);
    pdf.text("Date", 80, y);
    pdf.text("Price", 120, y);
    pdf.text("Buyer", 150, y);

    y += 7;

    records.forEach((record) => {
      if (y > 280) {
        pdf.addPage();
        y = 20;
      }

      pdf.text(
        String(record.crop || "").substring(
          0,
          18
        ),
        14,
        y
      );

      pdf.text(
        `${Number(
          record.quantity || 0
        )} kg`,
        55,
        y
      );

      pdf.text(
        formatDate(record.harvestDate),
        80,
        y
      );

      pdf.text(
        formatCurrency(record.price),
        120,
        y
      );

      pdf.text(
        String(
          record.buyer || "—"
        ).substring(0, 18),
        150,
        y
      );

      y += 7;
    });

    pdf.save(
      "agriconnect-harvest-records.pdf"
    );

    showMessage(
      "PDF exported successfully!"
    );
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button
            onClick={onBack}
            style={styles.backButton}
          >
            ← Back
          </button>

          <div>
            <h1 style={styles.headerTitle}>
              Harvest Records
            </h1>

            <p style={styles.headerSubtitle}>
              Track your harvest, sales and farming
              revenue
            </p>
          </div>
        </div>
      </header>

      <main style={styles.container}>
        {message && (
          <div style={styles.message}>
            ✓ {message}
          </div>
        )}

        {/* STATISTICS */}

        <section style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              🌾
            </div>

            <div>
              <span style={styles.statLabel}>
                Total Harvest
              </span>

              <strong style={styles.statValue}>
                {totalQuantity.toFixed(2)} kg
              </strong>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              💰
            </div>

            <div>
              <span style={styles.statLabel}>
                Total Revenue
              </span>

              <strong style={styles.statValue}>
                {formatCurrency(totalRevenue)}
              </strong>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              📈
            </div>

            <div>
              <span style={styles.statLabel}>
                Average Price
              </span>

              <strong style={styles.statValue}>
                {formatCurrency(averagePrice)}
                /kg
              </strong>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              📋
            </div>

            <div>
              <span style={styles.statLabel}>
                Records
              </span>

              <strong style={styles.statValue}>
                {records.length}
              </strong>
            </div>
          </div>
        </section>

        {/* ACTION BAR */}

        <section style={styles.actionBar}>
          <div>
            <h2 style={styles.sectionTitle}>
              Harvest Management
            </h2>

            <p style={styles.sectionDescription}>
              Add and manage your harvest records
            </p>
          </div>

          <div style={styles.actionButtons}>
            <button
              onClick={() =>
                setShowForm(!showForm)
              }
              style={styles.primaryButton}
            >
              {showForm
                ? "✕ Close Form"
                : "＋ Add Harvest"}
            </button>

            <button
              onClick={exportCSV}
              style={styles.secondaryButton}
            >
              📥 CSV
            </button>

            <button
              onClick={exportPDF}
              style={styles.secondaryButton}
            >
              📄 PDF
            </button>
          </div>
        </section>

        {/* FORM */}

        {showForm && (
          <section style={styles.formCard}>
            <div style={styles.formHeader}>
              <h2 style={styles.sectionTitle}>
                {editingId !== null
                  ? "✏️ Edit Harvest Record"
                  : "➕ Add Harvest Record"}
              </h2>

              <p style={styles.sectionDescription}>
                Enter your harvest and sales
                information
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={styles.formGrid}>
                <div style={styles.field}>
                  <label style={styles.label}>
                    Crop Name *
                  </label>

                  <input
                    type="text"
                    name="crop"
                    value={formData.crop}
                    onChange={handleChange}
                    placeholder="e.g. Rice"
                    style={styles.input}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    Quantity (kg) *
                  </label>

                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    placeholder="e.g. 500"
                    min="0.01"
                    step="0.01"
                    style={styles.input}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    Harvest Date *
                  </label>

                  <input
                    type="date"
                    name="harvestDate"
                    value={formData.harvestDate}
                    onChange={handleChange}
                    style={styles.input}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>
                    Selling Price (₹/kg) *
                  </label>

                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="e.g. 35"
                    min="0"
                    step="0.01"
                    style={styles.input}
                  />
                </div>

                <div style={styles.fieldFull}>
                  <label style={styles.label}>
                    Buyer Name
                  </label>

                  <input
                    type="text"
                    name="buyer"
                    value={formData.buyer}
                    onChange={handleChange}
                    placeholder="Enter buyer name"
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formActions}>
                <button
                  type="button"
                  onClick={resetForm}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={styles.saveButton}
                >
                  {editingId !== null
                    ? "💾 Update Record"
                    : "💾 Save Record"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* FILTER */}

        <section style={styles.filterCard}>
          <div style={styles.searchWrapper}>
            <span style={styles.searchIcon}>
              🔍
            </span>

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search crop, buyer or record ID..."
              style={styles.searchInput}
            />
          </div>

          <select
            value={cropFilter}
            onChange={(e) =>
              setCropFilter(e.target.value)
            }
            style={styles.select}
          >
            <option value="All">
              All Crops
            </option>

            {cropOptions.map((crop) => (
              <option key={crop} value={crop}>
                {crop}
              </option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={(e) =>
              setDateFilter(e.target.value)
            }
            style={styles.select}
          >
            <option value="All">
              All Dates
            </option>

            <option value="This Month">
              This Month
            </option>

            <option value="Last 30 Days">
              Last 30 Days
            </option>

            <option value="This Year">
              This Year
            </option>
          </select>
        </section>

        {/* RECORDS */}

        <section style={styles.recordsCard}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>
              📋 Harvest History
            </h2>

            <p style={styles.sectionDescription}>
              Showing {filteredRecords.length} of{" "}
              {records.length} records
            </p>
          </div>

          {loading ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                ⏳
              </div>

              <h3 style={styles.emptyTitle}>
                Loading harvest records...
              </h3>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>
                🌾
              </div>

              <h3 style={styles.emptyTitle}>
                No harvest records found
              </h3>

              <p style={styles.emptyText}>
                Add your first harvest record to
                start tracking your harvest and
                revenue.
              </p>

              <button
                onClick={() =>
                  setShowForm(true)
                }
                style={styles.primaryButton}
              >
                ＋ Add Harvest
              </button>
            </div>
          ) : (
            <div style={styles.recordList}>
              {filteredRecords.map((record) => {
                const totalValue =
                  Number(record.quantity || 0) *
                  Number(record.price || 0);

                return (
                  <article
                    key={record.id}
                    style={styles.recordCard}
                  >
                    <div style={styles.recordIcon}>
                      🌾
                    </div>

                    <div style={styles.recordMain}>
                      <div style={styles.recordTop}>
                        <div>
                          <h3
                            style={styles.recordCrop}
                          >
                            {record.crop}
                          </h3>

                          <span
                            style={styles.recordDate}
                          >
                            📅{" "}
                            {formatDate(
                              record.harvestDate
                            )}
                          </span>
                        </div>

                        <strong
                          style={styles.recordValue}
                        >
                          {formatCurrency(
                            totalValue
                          )}
                        </strong>
                      </div>

                      <div
                        style={styles.recordDetails}
                      >
                        <span>
                          ⚖️{" "}
                          <strong>
                            {Number(
                              record.quantity || 0
                            ).toFixed(2)}
                          </strong>{" "}
                          kg
                        </span>

                        <span>
                          💰{" "}
                          <strong>
                            {formatCurrency(
                              record.price
                            )}
                          </strong>
                          /kg
                        </span>

                        <span>
                          👤{" "}
                          <strong>
                            {record.buyer ||
                              "No buyer"}
                          </strong>
                        </span>
                      </div>

                      <div
                        style={styles.recordActions}
                      >
                        <button
                          onClick={() =>
                            handleEdit(record)
                          }
                          style={styles.editButton}
                        >
                          ✏️ Edit
                        </button>

                        <button
                          onClick={() =>
                            handleDelete(
                              record.id
                            )
                          }
                          style={
                            styles.deleteButton
                          }
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* CROP SUMMARY */}

        {cropSummary.length > 0 && (
          <section style={styles.summaryCard}>
            <h2 style={styles.sectionTitle}>
              📊 Crop-wise Summary
            </h2>

            <div style={styles.summaryGrid}>
              {cropSummary.map((item) => (
                <div
                  key={item.crop}
                  style={styles.summaryItem}
                >
                  <strong>{item.crop}</strong>

                  <span>
                    {item.quantity.toFixed(2)} kg
                  </span>

                  <span>
                    {formatCurrency(
                      item.revenue
                    )}
                  </span>

                  <small>
                    {item.records} record
                    {item.records !== 1
                      ? "s"
                      : ""}
                  </small>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f8f3",
  },

  header: {
    background: "#1f6f43",
    color: "#fff",
    padding: "18px 20px",
  },

  headerInner: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    gap: "18px",
  },

  backButton: {
    border: "none",
    background: "#e9f5eb",
    color: "#176b36",
    padding: "12px 20px",
    borderRadius: "14px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "17px",
    minHeight: "50px",
    minWidth: "121px",
  },

  headerTitle: {
    margin: 0,
    fontSize: "28px",
  },

  headerSubtitle: {
    margin: "5px 0 0",
    opacity: 0.9,
  },

  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "24px 20px 50px",
  },

  message: {
    background: "#e7f6ec",
    color: "#176638",
    border: "1px solid #b9dfc4",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontWeight: "600",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "16px",
    marginBottom: "22px",
  },

  statCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "18px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    boxShadow:
      "0 2px 10px rgba(0,0,0,0.06)",
  },

  statIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "10px",
    background: "#e9f6ed",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
  },

  statLabel: {
    display: "block",
    color: "#666",
    fontSize: "13px",
    marginBottom: "5px",
  },

  statValue: {
    display: "block",
    color: "#1f6f43",
    fontSize: "20px",
  },

  actionBar: {
    background: "#fff",
    borderRadius: "12px",
    padding: "18px",
    marginBottom: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
    boxShadow:
      "0 2px 10px rgba(0,0,0,0.05)",
  },

  sectionTitle: {
    margin: 0,
    color: "#1f3d2b",
    fontSize: "20px",
  },

  sectionDescription: {
    margin: "5px 0 0",
    color: "#777",
    fontSize: "14px",
  },

  actionButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  primaryButton: {
    border: "none",
    background: "#1f6f43",
    color: "#fff",
    padding: "11px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    minHeight: "40px",
  },

  secondaryButton: {
    border: "1px solid #cbd8cf",
    background: "#fff",
    color: "#1f6f43",
    padding: "11px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    minHeight: "40px",
  },

  formCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "22px",
    marginBottom: "20px",
    boxShadow:
      "0 2px 10px rgba(0,0,0,0.05)",
  },

  formHeader: {
    marginBottom: "18px",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "16px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  fieldFull: {
    gridColumn: "1 / -1",
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  label: {
    fontWeight: "600",
    color: "#37443b",
    fontSize: "14px",
  },

  input: {
    width: "100%",
    padding: "12px",
    border: "1px solid #ccd7cf",
    borderRadius: "8px",
    outline: "none",
    background: "#fff",
  },

  formActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "20px",
  },

  cancelButton: {
    border: "1px solid #ccd7cf",
    background: "#fff",
    color: "#444",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    minHeight: "40px",
  },

  saveButton: {
    border: "none",
    background: "#1f6f43",
    color: "#fff",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    minHeight: "40px",
  },

  filterCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "20px",
    display: "grid",
    gridTemplateColumns:
      "minmax(220px, 1fr) 180px 180px",
    gap: "12px",
    boxShadow:
      "0 2px 10px rgba(0,0,0,0.05)",
  },

  searchWrapper: {
    position: "relative",
  },

  searchIcon: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
  },

  searchInput: {
    width: "100%",
    padding: "12px 12px 12px 38px",
    border: "1px solid #ccd7cf",
    borderRadius: "8px",
    outline: "none",
  },

  select: {
    width: "100%",
    padding: "12px",
    border: "1px solid #ccd7cf",
    borderRadius: "8px",
    background: "#fff",
    cursor: "pointer",
  },

  recordsCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "22px",
    marginBottom: "20px",
    boxShadow:
      "0 2px 10px rgba(0,0,0,0.05)",
  },

  sectionHeader: {
    marginBottom: "18px",
  },

  recordList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  recordCard: {
    border: "1px solid #e0e8e2",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    gap: "15px",
  },

  recordIcon: {
    width: "48px",
    height: "48px",
    flexShrink: 0,
    borderRadius: "10px",
    background: "#e9f6ed",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
  },

  recordMain: {
    flex: 1,
    minWidth: 0,
  },

  recordTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "15px",
  },

  recordCrop: {
    margin: 0,
    color: "#1f3d2b",
    fontSize: "18px",
  },

  recordDate: {
    display: "block",
    marginTop: "5px",
    color: "#777",
    fontSize: "13px",
  },

  recordValue: {
    color: "#1f6f43",
    fontSize: "18px",
    whiteSpace: "nowrap",
  },

  recordDetails: {
    display: "flex",
    gap: "18px",
    flexWrap: "wrap",
    marginTop: "13px",
    color: "#666",
    fontSize: "14px",
  },

  recordActions: {
    display: "flex",
    gap: "8px",
    marginTop: "14px",
    flexWrap: "wrap",
  },

  editButton: {
    border: "1px solid #b8d2c0",
    background: "#f2f9f4",
    color: "#1f6f43",
    padding: "8px 12px",
    borderRadius: "7px",
    cursor: "pointer",
    minHeight: "40px",
  },

  deleteButton: {
    border: "1px solid #e4bcbc",
    background: "#fff5f5",
    color: "#b42318",
    padding: "8px 12px",
    borderRadius: "7px",
    cursor: "pointer",
    minHeight: "40px",
  },

  emptyState: {
    textAlign: "center",
    padding: "45px 20px",
  },

  emptyIcon: {
    fontSize: "48px",
    marginBottom: "10px",
  },

  emptyTitle: {
    margin: "5px 0",
    color: "#333",
  },

  emptyText: {
    color: "#777",
    maxWidth: "500px",
    margin: "8px auto 18px",
    lineHeight: 1.5,
  },

  summaryCard: {
    background: "#fff",
    borderRadius: "12px",
    padding: "22px",
    boxShadow:
      "0 2px 10px rgba(0,0,0,0.05)",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "12px",
    marginTop: "16px",
  },

  summaryItem: {
    border: "1px solid #e0e8e2",
    borderRadius: "10px",
    padding: "15px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
};

export default HarvestRecords;