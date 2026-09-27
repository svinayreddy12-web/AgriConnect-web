import React, { useEffect, useMemo, useState } from "react";

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

function Crops({ onBack }) {
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    quantity: "",
    plantingDate: "",
    harvestDate: "",
    status: "Growing",
  });

  // Get authenticated Firebase user's email
  const getUserEmail = () => {
    const firebaseUser = auth.currentUser;

    if (!firebaseUser?.email) {
      return "";
    }

    return firebaseUser.email.trim().toLowerCase();
  };

  const userEmail = getUserEmail();

  // REAL-TIME FIRESTORE LISTENER
  useEffect(() => {
    const firebaseUser = auth.currentUser;
    const email = firebaseUser?.email?.trim().toLowerCase() || "";

    if (!firebaseUser || !email) {
      setCrops([]);
      setLoading(false);
      return;
    }

    const cropsQuery = query(
      collection(db, "crops"),
      where("ownerEmail", "==", email)
    );

    const unsubscribe = onSnapshot(
      cropsQuery,
      (snapshot) => {
        const cropData = snapshot.docs.map((cropDoc) => ({
          id: cropDoc.id,
          ...cropDoc.data(),
        }));

        cropData.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;

          return timeB - timeA;
        });

        setCrops(cropData);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading crops:", error);
        setLoading(false);
        alert("Unable to load crops from Firebase.");
      }
    );

    return () => unsubscribe();
  }, []);

  // Search and status filtering
  const filteredCrops = useMemo(() => {
    return crops.filter((crop) => {
      const cropName = String(crop.name || "").toLowerCase();

      const matchesSearch = cropName.includes(
        search.toLowerCase()
      );

      const matchesStatus =
        statusFilter === "All" ||
        crop.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [crops, search, statusFilter]);

  // Reset form
  const resetForm = () => {
    setForm({
      name: "",
      quantity: "",
      plantingDate: "",
      harvestDate: "",
      status: "Growing",
    });

    setEditingId(null);
    setShowForm(false);
  };

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Add or update crop
  const handleSubmit = async (e) => {
    e.preventDefault();

    const firebaseUser = auth.currentUser;
    const email =
      firebaseUser?.email?.trim().toLowerCase() || "";

    if (!firebaseUser || !email) {
      alert("Please login first.");
      return;
    }

    const cropName = form.name.trim();
    const quantity = Number(form.quantity);

    if (!cropName) {
      alert("Please enter crop name.");
      return;
    }

    if (
      form.quantity === "" ||
      Number.isNaN(quantity) ||
      quantity <= 0
    ) {
      alert("Please enter a valid quantity in kg.");
      return;
    }

    try {
      if (editingId !== null) {
        // UPDATE FIRESTORE
        const cropRef = doc(db, "crops", editingId);

        await updateDoc(cropRef, {
          name: cropName,
          quantity: quantity,
          plantingDate: form.plantingDate,
          harvestDate: form.harvestDate,
          status: form.status,
          updatedAt: serverTimestamp(),
        });

        alert("Crop updated successfully!");
      } else {
        // ADD TO FIRESTORE
        await addDoc(collection(db, "crops"), {
          ownerEmail: email,
          ownerUid: firebaseUser.uid,

          name: cropName,
          quantity: quantity,
          plantingDate: form.plantingDate,
          harvestDate: form.harvestDate,
          status: form.status,

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        alert("Crop added successfully!");
      }

      resetForm();
    } catch (error) {
      console.error("Error saving crop:", error);

      if (error.code === "permission-denied") {
        alert(
          "Permission denied. Please check Firebase security rules."
        );
      } else {
        alert("Failed to save crop. Please try again.");
      }
    }
  };

  // Edit crop
  const handleEdit = (crop) => {
    setEditingId(crop.id);

    setForm({
      name: crop.name || "",
      quantity:
        crop.quantity !== undefined &&
        crop.quantity !== null
          ? crop.quantity
          : "",
      plantingDate: crop.plantingDate || "",
      harvestDate: crop.harvestDate || "",
      status: crop.status || "Growing",
    });

    setShowForm(true);
  };

  // Delete crop
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this crop?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await deleteDoc(doc(db, "crops", id));

      alert("Crop deleted successfully!");
    } catch (error) {
      console.error("Error deleting crop:", error);

      if (error.code === "permission-denied") {
        alert(
          "Permission denied. Please check Firebase security rules."
        );
      } else {
        alert("Failed to delete crop.");
      }
    }
  };

  // Open new crop form
  const openAddForm = () => {
    setEditingId(null);

    setForm({
      name: "",
      quantity: "",
      plantingDate: "",
      harvestDate: "",
      status: "Growing",
    });

    setShowForm(true);
  };

  // Statistics
  const totalCrops = crops.length;

  const growingCrops = crops.filter(
    (crop) => crop.status === "Growing"
  ).length;

  const readyCrops = crops.filter(
    (crop) => crop.status === "Ready"
  ).length;

  const harvestedCrops = crops.filter(
    (crop) => crop.status === "Harvested"
  ).length;

  return (
    <div className="crops-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .crops-page {
          min-height: 100vh;
          padding: 20px;
          background: #f4f8f3;
          color: #222;
        }

        .crops-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-bottom: 25px;
        }

        .back-button {
          border: none;
          background: #e9f5eb;
          color: #176b36;
          padding: 12px 20px;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 700;
          font-size: 17px;
          min-height: 50px;
          min-width: 121px;
          transition: none;
          transform: none;
        }

        .back-button:hover {
          background: #dcefe0;
        }

        .page-title {
          margin: 12px 0 0;
          font-size: 30px;
          color: #2e7d32;
        }

        .page-subtitle {
          margin: 6px 0 0;
          color: #666;
        }

        .add-button {
          border: none;
          background: #388e3c;
          color: white;
          padding: 12px 18px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          min-height: 44px;
          transition: none;
          transform: none;
        }

        .add-button:hover {
          background: #2e7d32;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 25px;
        }

        .stat-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
        }

        .stat-card h3 {
          margin: 0 0 8px;
          font-size: 15px;
          color: #666;
        }

        .stat-number {
          font-size: 28px;
          font-weight: bold;
          color: #2e7d32;
        }

        .form-card {
          background: white;
          padding: 22px;
          border-radius: 12px;
          margin-bottom: 25px;
          box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
        }

        .form-title {
          margin-top: 0;
          color: #2e7d32;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-weight: bold;
          font-size: 14px;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 11px;
          border: 1px solid #ccc;
          border-radius: 7px;
          outline: none;
          font-size: 15px;
        }

        .form-group input:focus,
        .form-group select:focus {
          border-color: #2e7d32;
        }

        .form-actions {
          display: flex;
          gap: 10px;
          margin-top: 18px;
        }

        .save-button,
        .cancel-button {
          border: none;
          color: white;
          padding: 11px 18px;
          border-radius: 7px;
          cursor: pointer;
          font-weight: bold;
          min-height: 44px;
          transition: none;
          transform: none;
        }

        .save-button {
          background: #2e7d32;
        }

        .save-button:hover {
          background: #256628;
        }

        .cancel-button {
          background: #777;
        }

        .cancel-button:hover {
          background: #666;
        }

        .search-filter-section {
          background: white;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 25px;
          box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
        }

        .filter-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 15px;
        }

        .search-input,
        .status-select {
          width: 100%;
          padding: 12px;
          border: 1px solid #ccc;
          border-radius: 8px;
          outline: none;
          font-size: 15px;
        }

        .search-input:focus,
        .status-select:focus {
          border-color: #2e7d32;
        }

        .crops-card {
          background: white;
          padding: 22px;
          border-radius: 12px;
          box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .section-title {
          margin: 0;
          color: #2e7d32;
        }

        .section-description {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .crop-list {
          display: grid;
          gap: 15px;
        }

        .crop-item {
          border: 1px solid #e0e0e0;
          border-radius: 10px;
          padding: 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .crop-info {
          flex: 1;
          min-width: 0;
        }

        .crop-name {
          margin: 0 0 8px;
          font-size: 20px;
          color: #2e7d32;
        }

        .crop-details {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 7px 20px;
          color: #555;
          font-size: 14px;
        }

        .status {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          margin-top: 10px;
        }

        .status.growing {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .status.ready {
          background: #fff8e1;
          color: #f57f17;
        }

        .status.harvested {
          background: #e3f2fd;
          color: #1565c0;
        }

        .crop-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .edit-button,
        .delete-button {
          border: none;
          padding: 9px 14px;
          border-radius: 7px;
          cursor: pointer;
          font-weight: bold;
          min-width: 75px;
          min-height: 40px;
          transition: none;
          transform: none;
        }

        .edit-button {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .edit-button:hover {
          background: #d5ecd7;
        }

        .delete-button {
          background: #ffebee;
          color: #c62828;
        }

        .delete-button:hover {
          background: #ffdfe3;
        }

        .empty-state {
          text-align: center;
          padding: 45px 20px;
          color: #777;
        }

        .empty-state-icon {
          font-size: 45px;
          margin-bottom: 10px;
        }

        .empty-state h3 {
          margin: 5px 0 8px;
          color: #555;
        }

        .empty-state p {
          margin-bottom: 20px;
        }

        .loading-state {
          text-align: center;
          padding: 45px 20px;
          color: #666;
        }

        @media (max-width: 900px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .filter-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .crops-page {
            padding: 12px;
          }

          .top-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .page-title {
            font-size: 25px;
          }

          .add-button {
            width: 100%;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .stat-card {
            padding: 15px;
          }

          .stat-number {
            font-size: 23px;
          }

          .crops-card,
          .form-card,
          .search-filter-section {
            padding: 15px;
          }

          .section-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .crop-item {
            flex-direction: column;
            align-items: stretch;
          }

          .crop-details {
            grid-template-columns: 1fr;
          }

          .crop-actions {
            flex-direction: row;
          }

          .edit-button,
          .delete-button {
            flex: 1;
          }

          .form-actions {
            flex-direction: column;
          }

          .save-button,
          .cancel-button {
            width: 100%;
          }
        }

        @media (max-width: 380px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .crop-actions {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="crops-container">

        {/* TOP BAR */}
        <div className="top-bar">
          <div>
            <button
              className="back-button"
              onClick={onBack}
            >
              ← Back
            </button>

            <h1 className="page-title">
              🌱 My Crops
            </h1>

            <p className="page-subtitle">
              Manage and monitor your crops
            </p>
          </div>

          <button
            className="add-button"
            onClick={openAddForm}
          >
            + Add Crop
          </button>
        </div>

        {/* STATISTICS */}
        <div className="stats-grid">

          <div className="stat-card">
            <h3>Total Crops</h3>
            <div className="stat-number">
              {totalCrops}
            </div>
          </div>

          <div className="stat-card">
            <h3>Growing</h3>
            <div className="stat-number">
              {growingCrops}
            </div>
          </div>

          <div className="stat-card">
            <h3>Ready</h3>
            <div className="stat-number">
              {readyCrops}
            </div>
          </div>

          <div className="stat-card">
            <h3>Harvested</h3>
            <div className="stat-number">
              {harvestedCrops}
            </div>
          </div>

        </div>

        {/* ADD / EDIT FORM */}
        {showForm && (
          <div className="form-card">

            <h2 className="form-title">
              {editingId !== null
                ? "✏️ Edit Crop"
                : "🌱 Add New Crop"}
            </h2>

            <form onSubmit={handleSubmit}>

              <div className="form-grid">

                <div className="form-group">
                  <label>
                    Crop Name
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter crop name"
                  />
                </div>

                <div className="form-group">
                  <label>
                    Quantity (kg)
                  </label>

                  <input
                    type="number"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleChange}
                    placeholder="Enter quantity in kg"
                    min="0.01"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>
                    Planting Date
                  </label>

                  <input
                    type="date"
                    name="plantingDate"
                    value={form.plantingDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>
                    Expected Harvest Date
                  </label>

                  <input
                    type="date"
                    name="harvestDate"
                    value={form.harvestDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>
                    Status
                  </label>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="Growing">
                      Growing
                    </option>

                    <option value="Ready">
                      Ready
                    </option>

                    <option value="Harvested">
                      Harvested
                    </option>
                  </select>
                </div>

              </div>

              <div className="form-actions">

                <button
                  type="submit"
                  className="save-button"
                >
                  {editingId !== null
                    ? "Update Crop"
                    : "Save Crop"}
                </button>

                <button
                  type="button"
                  className="cancel-button"
                  onClick={resetForm}
                >
                  Cancel
                </button>

              </div>

            </form>
          </div>
        )}

        {/* SEARCH AND FILTER */}
        <div className="search-filter-section">

          <div className="filter-grid">

            <input
              type="text"
              className="search-input"
              placeholder="🔍 Search crops..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

            <select
              className="status-select"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
            >
              <option value="All">
                All Status
              </option>

              <option value="Growing">
                Growing
              </option>

              <option value="Ready">
                Ready
              </option>

              <option value="Harvested">
                Harvested
              </option>
            </select>

          </div>

        </div>

        {/* CROP LIST */}
        <section className="crops-card">

          <div className="section-header">

            <h2 className="section-title">
              🌾 Crop List
            </h2>

            <p className="section-description">
              Showing {filteredCrops.length} of{" "}
              {crops.length} crops
            </p>

          </div>

          {loading ? (

            <div className="loading-state">
              Loading crops...
            </div>

          ) : filteredCrops.length === 0 ? (

            <div className="empty-state">

              <div className="empty-state-icon">
                🌱
              </div>

              <h3>
                No crops found
              </h3>

              <p>
                {crops.length === 0
                  ? "Add your first crop to start managing your farm."
                  : "Try changing your search or status filter."}
              </p>

              {crops.length === 0 && (
                <button
                  className="add-button"
                  onClick={openAddForm}
                >
                  + Add Your First Crop
                </button>
              )}

            </div>

          ) : (

            <div className="crop-list">

              {filteredCrops.map((crop) => (

                <div
                  className="crop-item"
                  key={crop.id}
                >

                  <div className="crop-info">

                    <h3 className="crop-name">
                      🌱 {crop.name}
                    </h3>

                    <div className="crop-details">

                      <div>
                        <strong>
                          Quantity:
                        </strong>{" "}
                        {Number(crop.quantity) || 0} kg
                      </div>

                      <div>
                        <strong>
                          Planting:
                        </strong>{" "}
                        {crop.plantingDate ||
                          "Not provided"}
                      </div>

                      <div>
                        <strong>
                          Harvest:
                        </strong>{" "}
                        {crop.harvestDate ||
                          "Not provided"}
                      </div>

                      <div>
                        <strong>
                          Status:
                        </strong>{" "}
                        {crop.status}
                      </div>

                    </div>

                    <span
                      className={`status ${
                        crop.status?.toLowerCase() ||
                        "growing"
                      }`}
                    >
                      {crop.status}
                    </span>

                  </div>

                  <div className="crop-actions">

                    <button
                      className="edit-button"
                      onClick={() =>
                        handleEdit(crop)
                      }
                    >
                      ✏️ Edit
                    </button>

                    <button
                      className="delete-button"
                      onClick={() =>
                        handleDelete(crop.id)
                      }
                    >
                      🗑️ Delete
                    </button>

                  </div>

                </div>

              ))}

            </div>

          )}

        </section>

      </div>
    </div>
  );
}

export default Crops;