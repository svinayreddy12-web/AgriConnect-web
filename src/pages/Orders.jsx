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

function Orders({ onBack }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    product: "",
    buyer: "",
    quantity: "",
    price: "",
    orderDate: "",
    deliveryDate: "",
    status: "Pending",
  });

  // Get authenticated Firebase user
  const getCurrentUser = () => {
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      return null;
    }

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || "",
    };
  };

  const firebaseUser = getCurrentUser();
  const userEmail = firebaseUser?.email || null;
  const userUid = firebaseUser?.uid || null;

  // REAL-TIME FIREBASE LISTENER
  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const email = currentUser.email;

    if (!email) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const ordersRef = collection(db, "orders");

    const q = query(
      ordersRef,
      where("ownerEmail", "==", email)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const firebaseOrders = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        // Newest first
        firebaseOrders.sort((a, b) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;

          return dateB - dateA;
        });

        setOrders(firebaseOrders);
        setLoading(false);
      },
      (error) => {
        console.error("Firebase orders error:", error);
        setLoading(false);

        if (error.code === "permission-denied") {
          alert(
            "You do not have permission to access these orders."
          );
        } else {
          alert("Unable to load orders from Firebase.");
        }
      }
    );

    return () => unsubscribe();
  }, [userEmail, userUid]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const productName = String(
        order.product || order.productName || ""
      ).toLowerCase();

      const buyerName = String(
        order.buyer || order.buyerName || ""
      ).toLowerCase();

      const searchText = search.toLowerCase();

      const matchesSearch =
        productName.includes(searchText) ||
        buyerName.includes(searchText);

      const matchesStatus =
        statusFilter === "All" ||
        order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  // Reset form
  const resetForm = () => {
    setForm({
      product: "",
      buyer: "",
      quantity: "",
      price: "",
      orderDate: "",
      deliveryDate: "",
      status: "Pending",
    });

    setEditingId(null);
    setShowForm(false);
  };

  // Handle input
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Add / Update order
  const handleSubmit = async (e) => {
    e.preventDefault();

    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert("Please login first.");
      return;
    }

    const email = currentUser.email;
    const uid = currentUser.uid;

    if (!email || !uid) {
      alert("Unable to identify the logged-in user.");
      return;
    }

    const product = form.product.trim();
    const buyer = form.buyer.trim();
    const quantity = Number(form.quantity);
    const price = Number(form.price);

    if (!product) {
      alert("Please enter product name.");
      return;
    }

    if (!buyer) {
      alert("Please enter buyer name.");
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

    if (
      form.price === "" ||
      Number.isNaN(price) ||
      price < 0
    ) {
      alert("Please enter a valid price.");
      return;
    }

    try {
      if (editingId !== null) {
        const orderRef = doc(db, "orders", editingId);

        await updateDoc(orderRef, {
          product,
          buyer,
          quantity,
          price,
          orderDate:
            form.orderDate ||
            new Date().toISOString().split("T")[0],
          deliveryDate: form.deliveryDate,
          status: form.status,
          updatedAt: serverTimestamp(),
        });

        alert("Order updated successfully!");
      } else {
        await addDoc(collection(db, "orders"), {
          product,
          buyer,
          quantity,
          price,
          orderDate:
            form.orderDate ||
            new Date().toISOString().split("T")[0],
          deliveryDate: form.deliveryDate,
          status: form.status,

          // Firebase authenticated user ownership
          ownerUid: uid,
          ownerEmail: email,

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        alert("Order added successfully!");
      }

      resetForm();
    } catch (error) {
      console.error("Error saving order:", error);

      if (error.code === "permission-denied") {
        alert(
          "Permission denied. Your Firestore rules may need to be updated."
        );
      } else {
        alert("Could not save the order. Please try again.");
      }
    }
  };

  // Edit order
  const handleEdit = (order) => {
    setEditingId(order.id);

    setForm({
      product: order.product || order.productName || "",
      buyer: order.buyer || order.buyerName || "",
      quantity:
        order.quantity !== undefined &&
        order.quantity !== null
          ? order.quantity
          : "",
      price:
        order.price !== undefined &&
        order.price !== null
          ? order.price
          : "",
      orderDate: order.orderDate || "",
      deliveryDate: order.deliveryDate || "",
      status: order.status || "Pending",
    });

    setShowForm(true);
  };

  // Delete order
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this order?"
    );

    if (!confirmDelete) {
      return;
    }

    if (!auth.currentUser) {
      alert("Please login first.");
      return;
    }

    try {
      await deleteDoc(doc(db, "orders", id));

      alert("Order deleted successfully!");
    } catch (error) {
      console.error("Error deleting order:", error);

      if (error.code === "permission-denied") {
        alert(
          "Permission denied. You cannot delete this order."
        );
      } else {
        alert("Could not delete the order.");
      }
    }
  };

  // Change status
  const handleStatusChange = async (id, newStatus) => {
    if (!auth.currentUser) {
      alert("Please login first.");
      return;
    }

    try {
      await updateDoc(doc(db, "orders", id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating status:", error);

      if (error.code === "permission-denied") {
        alert(
          "Permission denied. You cannot update this order."
        );
      } else {
        alert("Could not update order status.");
      }
    }
  };

  // Statistics
  const totalOrders = orders.length;

  const pendingOrders = orders.filter(
    (order) => order.status === "Pending"
  ).length;

  const processingOrders = orders.filter(
    (order) => order.status === "Processing"
  ).length;

  const deliveredOrders = orders.filter(
    (order) => order.status === "Delivered"
  ).length;

  return (
    <div className="orders-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .orders-page {
          min-height: 100vh;
          padding: 20px;
          background: #f4f8f3;
          color: #222;
        }

        .orders-container {
          width: 100%;
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
          box-shadow: 0 3px 12px rgba(0,0,0,0.08);
        }

        .stat-card h3 {
          margin: 0 0 8px;
          color: #666;
          font-size: 15px;
        }

        .stat-number {
          color: #2e7d32;
          font-size: 28px;
          font-weight: bold;
        }

        .form-card,
        .filter-card,
        .orders-card {
          background: white;
          padding: 22px;
          border-radius: 12px;
          margin-bottom: 25px;
          box-shadow: 0 3px 12px rgba(0,0,0,0.08);
        }

        .form-title,
        .section-title {
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
          font-size: 14px;
          font-weight: bold;
        }

        .form-group input,
        .form-group select,
        .search-input,
        .status-filter,
        .status-select-small {
          padding: 11px 12px;
          border: 1px solid #ccc;
          border-radius: 7px;
          outline: none;
          font-size: 15px;
          background: white;
        }

        .form-group input:focus,
        .form-group select:focus,
        .search-input:focus,
        .status-filter:focus {
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
        }

        .save-button {
          background: #2e7d32;
        }

        .cancel-button {
          background: #777;
        }

        .filter-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 15px;
        }

        .search-input,
        .status-filter {
          width: 100%;
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
        }

        .section-description {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .order-list {
          display: grid;
          gap: 15px;
        }

        .order-item {
          border: 1px solid #e0e0e0;
          border-radius: 10px;
          padding: 18px;
          display: flex;
          justify-content: space-between;
          gap: 20px;
        }

        .order-info {
          flex: 1;
          min-width: 0;
        }

        .order-title {
          margin: 0 0 12px;
          color: #2e7d32;
          font-size: 20px;
        }

        .order-details {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px 20px;
          color: #555;
          font-size: 14px;
        }

        .order-status-row {
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .status-label {
          font-weight: bold;
          font-size: 14px;
        }

        .status-badge {
          display: inline-block;
          padding: 6px 11px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
        }

        .status-pending {
          background: #fff3cd;
          color: #856404;
        }

        .status-processing {
          background: #e3f2fd;
          color: #1565c0;
        }

        .status-delivered {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .status-cancelled {
          background: #ffebee;
          color: #c62828;
        }

        .order-actions {
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
          min-width: 80px;
          min-height: 40px;
        }

        .edit-button {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .delete-button {
          background: #ffebee;
          color: #c62828;
        }

        .empty-state {
          text-align: center;
          padding: 45px 20px;
          color: #777;
        }

        .empty-icon {
          font-size: 45px;
          margin-bottom: 10px;
        }

        .loading {
          text-align: center;
          padding: 30px;
          color: #176b36;
          font-weight: bold;
        }

        @media (max-width: 900px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .form-grid,
          .filter-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .orders-page {
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

          .form-card,
          .filter-card,
          .orders-card {
            padding: 15px;
          }

          .section-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .order-item {
            flex-direction: column;
          }

          .order-details {
            grid-template-columns: 1fr;
          }

          .order-actions {
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

          .order-actions {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="orders-container">

        <div className="top-bar">
          <div>
            <button
              className="back-button"
              onClick={onBack}
            >
              ← Back
            </button>

            <h1 className="page-title">
              📦 My Orders
            </h1>

            <p className="page-subtitle">
              Manage and track your orders
            </p>
          </div>

          <button
            className="add-button"
            onClick={() => {
              setEditingId(null);

              setForm({
                product: "",
                buyer: "",
                quantity: "",
                price: "",
                orderDate: "",
                deliveryDate: "",
                status: "Pending",
              });

              setShowForm(true);
            }}
          >
            + Add Order
          </button>
        </div>

        <div className="stats-grid">

          <div className="stat-card">
            <h3>Total Orders</h3>
            <div className="stat-number">
              {totalOrders}
            </div>
          </div>

          <div className="stat-card">
            <h3>Pending</h3>
            <div className="stat-number">
              {pendingOrders}
            </div>
          </div>

          <div className="stat-card">
            <h3>Processing</h3>
            <div className="stat-number">
              {processingOrders}
            </div>
          </div>

          <div className="stat-card">
            <h3>Delivered</h3>
            <div className="stat-number">
              {deliveredOrders}
            </div>
          </div>

        </div>

        {showForm && (
          <div className="form-card">

            <h2 className="form-title">
              {editingId !== null
                ? "✏️ Edit Order"
                : "📦 Add New Order"}
            </h2>

            <form onSubmit={handleSubmit}>

              <div className="form-grid">

                <div className="form-group">
                  <label>Product / Crop</label>
                  <input
                    type="text"
                    name="product"
                    value={form.product}
                    onChange={handleChange}
                    placeholder="Enter product or crop"
                  />
                </div>

                <div className="form-group">
                  <label>Buyer Name</label>
                  <input
                    type="text"
                    name="buyer"
                    value={form.buyer}
                    onChange={handleChange}
                    placeholder="Enter buyer name"
                  />
                </div>

                <div className="form-group">
                  <label>Quantity (kg)</label>
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
                  <label>Price (₹)</label>
                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    placeholder="Enter price"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label>Order Date</label>
                  <input
                    type="date"
                    name="orderDate"
                    value={form.orderDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Expected Delivery Date</label>
                  <input
                    type="date"
                    name="deliveryDate"
                    value={form.deliveryDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>

                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Processing">Processing</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

              </div>

              <div className="form-actions">

                <button
                  type="submit"
                  className="save-button"
                >
                  {editingId !== null
                    ? "Update Order"
                    : "Save Order"}
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

        <div className="filter-card">

          <div className="filter-grid">

            <input
              type="text"
              className="search-input"
              placeholder="🔍 Search product or buyer..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

            <select
              className="status-filter"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>

          </div>

        </div>

        <section className="orders-card">

          <div className="section-header">

            <h2 className="section-title">
              📋 Order List
            </h2>

            <p className="section-description">
              Showing {filteredOrders.length} of{" "}
              {orders.length} orders
            </p>

          </div>

          {loading ? (

            <div className="loading">
              Loading orders...
            </div>

          ) : filteredOrders.length === 0 ? (

            <div className="empty-state">

              <div className="empty-icon">
                📦
              </div>

              <h3>No orders found</h3>

              <p>
                {orders.length === 0
                  ? "Add your first order to start tracking orders."
                  : "Try changing your search or status filter."}
              </p>

              {orders.length === 0 && (
                <button
                  className="add-button"
                  onClick={() => setShowForm(true)}
                >
                  + Add Your First Order
                </button>
              )}

            </div>

          ) : (

            <div className="order-list">

              {filteredOrders.map((order) => {

                const quantity =
                  Number(order.quantity) || 0;

                const price =
                  Number(order.price) || 0;

                const productName =
                  order.product ||
                  order.productName ||
                  "Unknown Product";

                const buyerName =
                  order.buyer ||
                  order.buyerName ||
                  "Unknown Buyer";

                const statusClass =
                  order.status === "Processing"
                    ? "status-processing"
                    : order.status === "Delivered"
                    ? "status-delivered"
                    : order.status === "Cancelled"
                    ? "status-cancelled"
                    : "status-pending";

                return (
                  <div
                    className="order-item"
                    key={order.id}
                  >

                    <div className="order-info">

                      <h3 className="order-title">
                        📦 {productName}
                      </h3>

                      <div className="order-details">

                        <div>
                          <strong>Buyer:</strong>{" "}
                          {buyerName}
                        </div>

                        <div>
                          <strong>Quantity:</strong>{" "}
                          {quantity} kg
                        </div>

                        <div>
                          <strong>Price:</strong>{" "}
                          ₹{price}
                        </div>

                        <div>
                          <strong>Total:</strong>{" "}
                          ₹{(quantity * price).toFixed(2)}
                        </div>

                        <div>
                          <strong>Order Date:</strong>{" "}
                          {order.orderDate || "Not provided"}
                        </div>

                        <div>
                          <strong>Delivery:</strong>{" "}
                          {order.deliveryDate || "Not provided"}
                        </div>

                      </div>

                      <div className="order-status-row">

                        <span className="status-label">
                          Status:
                        </span>

                        <span
                          className={`status-badge ${statusClass}`}
                        >
                          {order.status || "Pending"}
                        </span>

                        <select
                          className="status-select-small"
                          value={order.status || "Pending"}
                          onChange={(e) =>
                            handleStatusChange(
                              order.id,
                              e.target.value
                            )
                          }
                        >
                          <option value="Pending">
                            Pending
                          </option>

                          <option value="Processing">
                            Processing
                          </option>

                          <option value="Delivered">
                            Delivered
                          </option>

                          <option value="Cancelled">
                            Cancelled
                          </option>
                        </select>

                      </div>

                    </div>

                    <div className="order-actions">

                      <button
                        className="edit-button"
                        onClick={() => handleEdit(order)}
                      >
                        ✏️ Edit
                      </button>

                      <button
                        className="delete-button"
                        onClick={() =>
                          handleDelete(order.id)
                        }
                      >
                        🗑️ Delete
                      </button>

                    </div>

                  </div>
                );
              })}

            </div>
          )}

        </section>

      </div>
    </div>
  );
}

export default Orders;