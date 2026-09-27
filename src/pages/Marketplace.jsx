import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase";

function Marketplace({ onBack }) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showCart, setShowCart] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    price: "",
    quantity: "",
    description: "",
    category: "Other",
  });

  /* =========================================================
     CURRENT USER
  ========================================================= */

  const firebaseUser = auth.currentUser;

  const userUid = firebaseUser?.uid || "";
  const userEmail = firebaseUser?.email || "";

  /* =========================================================
     LOAD MARKETPLACE PRODUCTS
  ========================================================= */

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const productsQuery = query(
      collection(db, "products"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      productsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setProducts(data);
        setLoading(false);
      },
      (error) => {
        console.error("Marketplace error:", error);
        setLoading(false);

        if (error.code === "permission-denied") {
          alert(
            "You do not have permission to view marketplace products."
          );
        } else if (error.code === "failed-precondition") {
          alert(
            "Firestore needs an index for this query. Please create the required index in Firebase Console."
          );
        } else {
          alert("Unable to load marketplace products.");
        }
      }
    );

    return () => unsubscribe();
  }, [userUid]);

  /* =========================================================
     LOAD CART
  ========================================================= */

  useEffect(() => {
    if (!userEmail) {
      setCart([]);
      return;
    }

    try {
      const saved = localStorage.getItem(`agriCart_${userEmail}`);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setCart(parsed);
        } else {
          setCart([]);
        }
      } else {
        setCart([]);
      }
    } catch (error) {
      console.error("Cart loading error:", error);
      setCart([]);
    }
  }, [userEmail]);

  /* =========================================================
     SAVE CART
  ========================================================= */

  useEffect(() => {
    if (!userEmail) {
      return;
    }

    try {
      localStorage.setItem(
        `agriCart_${userEmail}`,
        JSON.stringify(cart)
      );
    } catch (error) {
      console.error("Cart saving error:", error);
    }
  }, [cart, userEmail]);

  /* =========================================================
     CATEGORIES
  ========================================================= */

  const categories = useMemo(() => {
    const values = products.map(
      (product) => product.category || "Other"
    );

    return ["All", ...new Set(values)];
  }, [products]);

  /* =========================================================
     FILTER PRODUCTS
  ========================================================= */

  const filteredProducts = useMemo(() => {
    const text = search.toLowerCase().trim();

    return products.filter((product) => {
      const name = String(product.name || "").toLowerCase();

      const description = String(
        product.description || ""
      ).toLowerCase();

      const seller = String(
        product.ownerEmail || ""
      ).toLowerCase();

      const searchMatch =
        name.includes(text) ||
        description.includes(text) ||
        seller.includes(text);

      const categoryMatch =
        category === "All" ||
        (product.category || "Other") === category;

      return searchMatch && categoryMatch;
    });
  }, [products, search, category]);

  /* =========================================================
     CART COUNT
  ========================================================= */

  const cartCount = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + Number(item.cartQuantity || 0),
      0
    );
  }, [cart]);

  /* =========================================================
     CART TOTAL
  ========================================================= */

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total +
        Number(item.price || 0) *
          Number(item.cartQuantity || 0),
      0
    );
  }, [cart]);

  /* =========================================================
     FORM CHANGE
  ========================================================= */

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* =========================================================
     RESET FORM
  ========================================================= */

  const resetForm = () => {
    setForm({
      name: "",
      price: "",
      quantity: "",
      description: "",
      category: "Other",
    });

    setEditingId(null);
  };

  /* =========================================================
     CHECK PRODUCT OWNER
  ========================================================= */

  const isOwner = (product) => {
    const currentUser = auth.currentUser;

    if (!currentUser || !product) {
      return false;
    }

    if (product.ownerUid) {
      return product.ownerUid === currentUser.uid;
    }

    return (
      String(product.ownerEmail || "").toLowerCase() ===
      String(currentUser.email || "").toLowerCase()
    );
  };

  /* =========================================================
     ADD / UPDATE PRODUCT
  ========================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert("Please login first.");
      return;
    }

    if (!form.name.trim()) {
      alert("Please enter product name.");
      return;
    }

    const price = Number(form.price);
    const quantity = Number(form.quantity);

    if (!Number.isFinite(price) || price < 0) {
      alert("Please enter a valid price.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity < 0) {
      alert("Please enter a valid quantity.");
      return;
    }

    setSaving(true);

    try {
      /* UPDATE PRODUCT */

      if (editingId) {
        const product = products.find(
          (item) => item.id === editingId
        );

        if (!product) {
          alert("Product not found.");
          return;
        }

        if (!isOwner(product)) {
          alert(
            "You can edit only your own products."
          );
          return;
        }

        await updateDoc(
          doc(db, "products", editingId),
          {
            name: form.name.trim(),
            price,
            quantity,
            description: form.description.trim(),
            category: form.category || "Other",
            updatedAt: serverTimestamp(),
          }
        );

        alert("Product updated successfully.");
      }

      /* ADD PRODUCT */

      else {
        await addDoc(
          collection(db, "products"),
          {
            name: form.name.trim(),
            price,
            quantity,
            description: form.description.trim(),
            category: form.category || "Other",

            ownerUid: currentUser.uid,
            ownerEmail: currentUser.email || "",

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );

        alert("Product added successfully.");
      }

      resetForm();
    } catch (error) {
      console.error("Product save error:", error);

      if (error.code === "permission-denied") {
        alert(
          "Permission denied. You can modify only your own product."
        );
      } else {
        alert(
          error.message || "Failed to save product."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     EDIT PRODUCT
  ========================================================= */

  const handleEdit = (product) => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert("Please login first.");
      return;
    }

    if (!isOwner(product)) {
      alert(
        "You can edit only your own products."
      );
      return;
    }

    setEditingId(product.id);

    setForm({
      name: product.name || "",
      price:
        product.price !== undefined
          ? String(product.price)
          : "",
      quantity:
        product.quantity !== undefined
          ? String(product.quantity)
          : "",
      description: product.description || "",
      category: product.category || "Other",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =========================================================
     DELETE PRODUCT
  ========================================================= */

  const handleDelete = async (product) => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert("Please login first.");
      return;
    }

    if (!isOwner(product)) {
      alert(
        "You can delete only your own products."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete "${product.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(
        doc(db, "products", product.id)
      );

      setCart((previous) =>
        previous.filter(
          (item) =>
            String(item.id) !==
            String(product.id)
        )
      );

      if (
        String(editingId) ===
        String(product.id)
      ) {
        resetForm();
      }

      alert("Product deleted successfully.");
    } catch (error) {
      console.error(
        "Product delete error:",
        error
      );

      if (error.code === "permission-denied") {
        alert(
          "Permission denied. You can delete only your own product."
        );
      } else {
        alert(
          error.message ||
            "Failed to delete product."
        );
      }
    }
  };

  /* =========================================================
     ADD TO CART
  ========================================================= */

  const addToCart = (product) => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      alert("Please login first.");
      return;
    }

    if (isOwner(product)) {
      alert(
        "You cannot buy your own product."
      );
      return;
    }

    const stock = Number(product.quantity || 0);

    if (stock <= 0) {
      alert("This product is out of stock.");
      return;
    }

    setCart((previous) => {
      const existing = previous.find(
        (item) =>
          String(item.id) ===
          String(product.id)
      );

      if (existing) {
        const existingQuantity = Number(
          existing.cartQuantity || 0
        );

        if (existingQuantity >= stock) {
          alert(
            "Maximum available stock reached."
          );

          return previous;
        }

        return previous.map((item) =>
          String(item.id) ===
          String(product.id)
            ? {
                ...item,
                name: product.name,
                price: Number(
                  product.price || 0
                ),
                quantity: stock,
                category:
                  product.category || "Other",
                sellerUid:
                  product.ownerUid || "",
                sellerEmail:
                  product.ownerEmail || "",
                cartQuantity:
                  existingQuantity + 1,
              }
            : item
        );
      }

      return [
        ...previous,
        {
          id: product.id,
          name: product.name,
          price: Number(product.price || 0),
          quantity: stock,
          category:
            product.category || "Other",

          sellerUid:
            product.ownerUid || "",

          sellerEmail:
            product.ownerEmail || "",

          cartQuantity: 1,
        },
      ];
    });

    alert("Product added to cart.");
  };

  /* =========================================================
     INCREASE CART QUANTITY
  ========================================================= */

  const increaseCartQuantity = (id) => {
    setCart((previous) =>
      previous.map((item) => {
        if (
          String(item.id) !==
          String(id)
        ) {
          return item;
        }

        const latestProduct = products.find(
          (product) =>
            String(product.id) ===
            String(id)
        );

        const stock = latestProduct
          ? Number(
              latestProduct.quantity || 0
            )
          : Number(item.quantity || 0);

        if (
          Number(item.cartQuantity || 0) >=
          stock
        ) {
          alert(
            "Maximum available stock reached."
          );

          return item;
        }

        return {
          ...item,
          quantity: stock,
          price: latestProduct
            ? Number(latestProduct.price || 0)
            : Number(item.price || 0),
          cartQuantity:
            Number(item.cartQuantity || 0) + 1,
        };
      })
    );
  };

  /* =========================================================
     DECREASE CART QUANTITY
  ========================================================= */

  const decreaseCartQuantity = (id) => {
    setCart((previous) =>
      previous
        .map((item) =>
          String(item.id) === String(id)
            ? {
                ...item,
                cartQuantity:
                  Number(
                    item.cartQuantity || 0
                  ) - 1,
              }
            : item
        )
        .filter(
          (item) =>
            Number(
              item.cartQuantity || 0
            ) > 0
        )
    );
  };

  /* =========================================================
     REMOVE FROM CART
  ========================================================= */

  const removeFromCart = (id) => {
    setCart((previous) =>
      previous.filter(
        (item) =>
          String(item.id) !==
          String(id)
      )
    );
  };

  /* =========================================================
     PLACE ORDER
  ========================================================= */

  const placeOrder = async () => {
    const buyer = auth.currentUser;

    if (!buyer) {
      alert("Please login first.");
      return;
    }

    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    const confirmed = window.confirm(
      `Place order for ₹${cartTotal.toLocaleString(
        "en-IN"
      )}?`
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    try {
      for (const item of cart) {
        const latestProduct = products.find(
          (product) =>
            String(product.id) ===
            String(item.id)
        );

        if (!latestProduct) {
          throw new Error(
            `${item.name} is no longer available.`
          );
        }

        const currentStock = Number(
          latestProduct.quantity || 0
        );

        const requestedQuantity = Number(
          item.cartQuantity || 0
        );

        if (requestedQuantity <= 0) {
          continue;
        }

        if (
          currentStock <
          requestedQuantity
        ) {
          throw new Error(
            `Not enough stock for ${item.name}. Available: ${currentStock} kg.`
          );
        }

        /*
          IMPORTANT:
          Your current Firestore security rules allow
          product updates only to the product owner.

          Therefore, only update stock here if the
          buyer is also the owner. For another seller's
          product, the order is created without trying
          to modify the seller's product document.
        */

        if (isOwner(latestProduct)) {
          throw new Error(
            "You cannot purchase your own product."
          );
        }

        /* CREATE BUYER ORDER */

        await addDoc(
          collection(db, "orders"),
          {
            ownerUid: buyer.uid,
            ownerEmail: buyer.email || "",

            buyerUid: buyer.uid,
            buyerEmail: buyer.email || "",

            sellerUid:
              latestProduct.ownerUid || "",

            sellerEmail:
              latestProduct.ownerEmail || "",

            productId: item.id,
            product: item.name,

            quantity: requestedQuantity,

            price:
              Number(
                latestProduct.price || 0
              ) * requestedQuantity,

            unitPrice: Number(
              latestProduct.price || 0
            ),

            status: "Pending",

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp(),
          }
        );
      }

      setCart([]);
      setShowCart(false);

      alert(
        "Order placed successfully!"
      );
    } catch (error) {
      console.error(
        "Order error:",
        error
      );

      if (
        error.code ===
        "permission-denied"
      ) {
        alert(
          "Permission denied while placing the order."
        );
      } else {
        alert(
          error.message ||
            "Failed to place order."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     STATISTICS
  ========================================================= */

  const totalProducts =
    products.length;

  const totalStock =
    products.reduce(
      (total, product) =>
        total +
        Number(
          product.quantity || 0
        ),
      0
    );

  const totalValue =
    products.reduce(
      (total, product) =>
        total +
        Number(
          product.price || 0
        ) *
          Number(
            product.quantity || 0
          ),
      0
    );

  /* =========================================================
     UI
  ========================================================= */

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

        <div style={styles.headerText}>
          <h1 style={styles.title}>
            🛒 Agri Marketplace
          </h1>

          <p style={styles.subtitle}>
            Buy and sell agricultural
            products easily
          </p>
        </div>

        <button
          style={styles.cartButton}
          onClick={() =>
            setShowCart(
              (previous) => !previous
            )
          }
        >
          🛒 Cart ({cartCount})
        </button>
      </div>

      {/* CART */}

      {showCart ? (
        <div style={styles.cartSection}>
          <div style={styles.cartHeader}>
            <h2 style={styles.sectionTitle}>
              Your Cart
            </h2>

            <button
              style={
                styles.continueButton
              }
              onClick={() =>
                setShowCart(false)
              }
            >
              Continue Shopping
            </button>
          </div>

          {cart.length === 0 ? (
            <div style={styles.emptyBox}>
              <div style={styles.emptyIcon}>
                🛒
              </div>

              <h3>
                Your cart is empty
              </h3>

              <p>
                Add products from the
                marketplace.
              </p>

              <button
                style={
                  styles.primaryButton
                }
                onClick={() =>
                  setShowCart(false)
                }
              >
                Browse Products
              </button>
            </div>
          ) : (
            <>
              <div style={styles.cartList}>
                {cart.map((item) => (
                  <div
                    key={item.id}
                    style={styles.cartItem}
                    className="marketplace-cart-item"
                  >
                    <div
                      style={styles.cartInfo}
                    >
                      <h3
                        style={
                          styles.productName
                        }
                      >
                        {item.name}
                      </h3>

                      <p
                        style={
                          styles.categoryText
                        }
                      >
                        {item.category}
                      </p>

                      <p
                        style={
                          styles.sellerText
                        }
                      >
                        Seller:{" "}
                        {item.sellerEmail ||
                          "Unknown"}
                      </p>

                      <p
                        style={
                          styles.priceText
                        }
                      >
                        ₹
                        {Number(
                          item.price || 0
                        ).toLocaleString(
                          "en-IN"
                        )}{" "}
                        / kg
                      </p>
                    </div>

                    <div
                      style={
                        styles.quantityControls
                      }
                    >
                      <button
                        style={
                          styles.quantityButton
                        }
                        onClick={() =>
                          decreaseCartQuantity(
                            item.id
                          )
                        }
                      >
                        −
                      </button>

                      <span
                        style={
                          styles.quantityNumber
                        }
                      >
                        {item.cartQuantity} kg
                      </span>

                      <button
                        style={
                          styles.quantityButton
                        }
                        onClick={() =>
                          increaseCartQuantity(
                            item.id
                          )
                        }
                      >
                        +
                      </button>
                    </div>

                    <div
                      style={
                        styles.itemTotal
                      }
                    >
                      ₹
                      {(
                        Number(
                          item.price || 0
                        ) *
                        Number(
                          item.cartQuantity || 0
                        )
                      ).toLocaleString(
                        "en-IN"
                      )}
                    </div>

                    <button
                      style={
                        styles.removeButton
                      }
                      onClick={() =>
                        removeFromCart(
                          item.id
                        )
                      }
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>

              <div
                style={
                  styles.cartSummary
                }
              >
                <div>
                  <span
                    style={
                      styles.summaryLabel
                    }
                  >
                    Cart Total
                  </span>

                  <strong
                    style={
                      styles.summaryTotal
                    }
                  >
                    ₹
                    {cartTotal.toLocaleString(
                      "en-IN"
                    )}
                  </strong>
                </div>

                <button
                  style={
                    styles.orderButton
                  }
                  onClick={placeOrder}
                  disabled={saving}
                >
                  {saving
                    ? "Processing..."
                    : "📦 Place Order"}
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          {loading ? (
            <div style={styles.emptyBox}>
              <div style={styles.emptyIcon}>
                🌾
              </div>

              <h3>
                Loading marketplace...
              </h3>
            </div>
          ) : (
            <>
              {/* STATS */}

              <div style={styles.statsGrid}>
                <div
                  style={styles.statCard}
                >
                  <div
                    style={styles.statIcon}
                  >
                    📦
                  </div>

                  <div>
                    <div
                      style={
                        styles.statNumber
                      }
                    >
                      {totalProducts}
                    </div>

                    <div
                      style={
                        styles.statLabel
                      }
                    >
                      Products
                    </div>
                  </div>
                </div>

                <div
                  style={styles.statCard}
                >
                  <div
                    style={styles.statIcon}
                  >
                    🌾
                  </div>

                  <div>
                    <div
                      style={
                        styles.statNumber
                      }
                    >
                      {totalStock} kg
                    </div>

                    <div
                      style={
                        styles.statLabel
                      }
                    >
                      Total Stock
                    </div>
                  </div>
                </div>

                <div
                  style={styles.statCard}
                >
                  <div
                    style={styles.statIcon}
                  >
                    💰
                  </div>

                  <div>
                    <div
                      style={
                        styles.statNumber
                      }
                    >
                      ₹
                      {totalValue.toLocaleString(
                        "en-IN"
                      )}
                    </div>

                    <div
                      style={
                        styles.statLabel
                      }
                    >
                      Stock Value
                    </div>
                  </div>
                </div>

                <div
                  style={styles.statCard}
                >
                  <div
                    style={styles.statIcon}
                  >
                    🛒
                  </div>

                  <div>
                    <div
                      style={
                        styles.statNumber
                      }
                    >
                      {cartCount}
                    </div>

                    <div
                      style={
                        styles.statLabel
                      }
                    >
                      Cart Items
                    </div>
                  </div>
                </div>
              </div>

              {/* FORM */}

              <div style={styles.formCard}>
                <h2
                  style={
                    styles.sectionTitle
                  }
                >
                  {editingId
                    ? "✏️ Edit Product"
                    : "➕ Add Product"}
                </h2>

                <form
                  onSubmit={handleSubmit}
                >
                  <div
                    style={
                      styles.formGrid
                    }
                  >
                    <div
                      style={
                        styles.inputGroup
                      }
                    >
                      <label
                        style={
                          styles.label
                        }
                      >
                        Product Name *
                      </label>

                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={
                          handleInputChange
                        }
                        placeholder="Enter product name"
                        style={
                          styles.input
                        }
                      />
                    </div>

                    <div
                      style={
                        styles.inputGroup
                      }
                    >
                      <label
                        style={
                          styles.label
                        }
                      >
                        Price (₹ / kg) *
                      </label>

                      <input
                        type="number"
                        name="price"
                        value={form.price}
                        onChange={
                          handleInputChange
                        }
                        placeholder="Enter price"
                        min="0"
                        step="0.01"
                        style={
                          styles.input
                        }
                      />
                    </div>

                    <div
                      style={
                        styles.inputGroup
                      }
                    >
                      <label
                        style={
                          styles.label
                        }
                      >
                        Quantity (kg) *
                      </label>

                      <input
                        type="number"
                        name="quantity"
                        value={
                          form.quantity
                        }
                        onChange={
                          handleInputChange
                        }
                        placeholder="Enter quantity"
                        min="0"
                        step="0.01"
                        style={
                          styles.input
                        }
                      />
                    </div>

                    <div
                      style={
                        styles.inputGroup
                      }
                    >
                      <label
                        style={
                          styles.label
                        }
                      >
                        Category
                      </label>

                      <select
                        name="category"
                        value={
                          form.category
                        }
                        onChange={
                          handleInputChange
                        }
                        style={
                          styles.input
                        }
                      >
                        <option value="Seeds">
                          Seeds
                        </option>

                        <option value="Fertilizers">
                          Fertilizers
                        </option>

                        <option value="Pesticides">
                          Pesticides
                        </option>

                        <option value="Equipment">
                          Equipment
                        </option>

                        <option value="Crops">
                          Crops
                        </option>

                        <option value="Other">
                          Other
                        </option>
                      </select>
                    </div>
                  </div>

                  <div
                    style={
                      styles.inputGroup
                    }
                  >
                    <label
                      style={
                        styles.label
                      }
                    >
                      Description
                    </label>

                    <textarea
                      name="description"
                      value={
                        form.description
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="Enter description"
                      rows="3"
                      style={
                        styles.textarea
                      }
                    />
                  </div>

                  <div
                    style={
                      styles.formButtons
                    }
                  >
                    <button
                      type="submit"
                      style={
                        styles.primaryButton
                      }
                      disabled={saving}
                    >
                      {saving
                        ? "Saving..."
                        : editingId
                        ? "Update Product"
                        : "Add Product"}
                    </button>

                    {editingId && (
                      <button
                        type="button"
                        style={
                          styles.cancelButton
                        }
                        onClick={
                          resetForm
                        }
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* SEARCH */}

              <div
                style={
                  styles.searchSection
                }
              >
                <div
                  style={
                    styles.searchBox
                  }
                >
                  <span>🔍</span>

                  <input
                    type="text"
                    value={search}
                    onChange={(e) =>
                      setSearch(
                        e.target.value
                      )
                    }
                    placeholder="Search products or sellers..."
                    style={
                      styles.searchInput
                    }
                  />
                </div>

                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(
                      e.target.value
                    )
                  }
                  style={
                    styles.filterSelect
                  }
                >
                  {categories.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* PRODUCTS HEADER */}

              <div
                style={
                  styles.productsHeader
                }
              >
                <h2
                  style={
                    styles.sectionTitle
                  }
                >
                  Marketplace Products
                </h2>

                <span
                  style={
                    styles.resultCount
                  }
                >
                  {filteredProducts.length}{" "}
                  product
                  {filteredProducts.length !==
                  1
                    ? "s"
                    : ""}
                </span>
              </div>

              {/* PRODUCTS */}

              {filteredProducts.length ===
              0 ? (
                <div
                  style={
                    styles.emptyBox
                  }
                >
                  <div
                    style={
                      styles.emptyIcon
                    }
                  >
                    🌾
                  </div>

                  <h3>
                    No products found
                  </h3>

                  <p>
                    Try another search or
                    category.
                  </p>
                </div>
              ) : (
                <div
                  style={
                    styles.productGrid
                  }
                >
                  {filteredProducts.map(
                    (product) => {
                      const stock =
                        Number(
                          product.quantity ||
                            0
                        );

                      const mine =
                        isOwner(product);

                      return (
                        <div
                          key={
                            product.id
                          }
                          style={
                            styles.productCard
                          }
                        >
                          <div
                            style={
                              styles.productTop
                            }
                          >
                            <span
                              style={
                                styles.productEmoji
                              }
                            >
                              🌾
                            </span>

                            <span
                              style={
                                styles.categoryBadge
                              }
                            >
                              {product.category ||
                                "Other"}
                            </span>
                          </div>

                          {mine && (
                            <div
                              style={
                                styles.myProductBadge
                              }
                            >
                              Your Product
                            </div>
                          )}

                          <h3
                            style={
                              styles.cardProductName
                            }
                          >
                            {product.name}
                          </h3>

                          <p
                            style={
                              styles.description
                            }
                          >
                            {product.description ||
                              "No description available."}
                          </p>

                          <div
                            style={
                              styles.sellerBox
                            }
                          >
                            <span
                              style={
                                styles.detailLabel
                              }
                            >
                              Seller
                            </span>

                            <strong
                              style={
                                styles.sellerValue
                              }
                            >
                              {mine
                                ? "You"
                                : product.ownerEmail ||
                                  "Unknown seller"}
                            </strong>
                          </div>

                          <div
                            style={
                              styles.productDetails
                            }
                          >
                            <div>
                              <span
                                style={
                                  styles.detailLabel
                                }
                              >
                                Price
                              </span>

                              <strong
                                style={
                                  styles.cardPrice
                                }
                              >
                                ₹
                                {Number(
                                  product.price ||
                                    0
                                ).toLocaleString(
                                  "en-IN"
                                )}{" "}
                                / kg
                              </strong>
                            </div>

                            <div
                              style={
                                styles.stockBox
                              }
                            >
                              <span
                                style={
                                  styles.detailLabel
                                }
                              >
                                Stock
                              </span>

                              <strong
                                style={{
                                  ...styles.stockValue,
                                  color:
                                    stock > 0
                                      ? "#2e7d32"
                                      : "#c62828",
                                }}
                              >
                                {stock} kg
                              </strong>
                            </div>
                          </div>

                          <div
                            style={
                              styles.cardButtons
                            }
                          >
                            {mine ? (
                              <>
                                <div
                                  style={
                                    styles.ownerMessage
                                  }
                                >
                                  Your listing
                                </div>

                                <button
                                  style={
                                    styles.editButton
                                  }
                                  onClick={() =>
                                    handleEdit(
                                      product
                                    )
                                  }
                                >
                                  ✏️ Edit
                                </button>

                                <button
                                  style={
                                    styles.deleteButton
                                  }
                                  onClick={() =>
                                    handleDelete(
                                      product
                                    )
                                  }
                                >
                                  🗑️
                                </button>
                              </>
                            ) : (
                              <button
                                style={
                                  styles.buyButton
                                }
                                onClick={() =>
                                  addToCart(
                                    product
                                  )
                                }
                                disabled={
                                  stock <= 0 ||
                                  saving
                                }
                              >
                                {stock > 0
                                  ? "🛒 Add to Cart"
                                  : "Out of Stock"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      <style>
        {`
          @media (max-width: 700px) {
            .marketplace-cart-item {
              grid-template-columns: 1fr !important;
            }
          }

          @media (max-width: 500px) {
            .marketplace-cart-item {
              gap: 12px !important;
            }
          }
        `}
      </style>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = {
  page: {
    minHeight: "100vh",
    padding: "20px",
    background: "#f4f8f3",
  },

  header: {
    maxWidth: "1200px",
    margin: "0 auto 25px",
    display: "flex",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
  },

  headerText: {
    flex: 1,
    minWidth: "220px",
  },

  backButton: {
    border: "none",
    background: "#e9f5eb",
    color: "#176b36",
    padding: "0 20px",
    borderRadius: "14px",
    fontWeight: "700",
    cursor: "pointer",
    minHeight: "50px",
    minWidth: "121px",
    fontSize: "17px",
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

  cartButton: {
    border: "none",
    background: "#2e7d32",
    color: "white",
    padding: "12px 20px",
    borderRadius: "10px",
    fontWeight: "bold",
    cursor: "pointer",
    minHeight: "44px",
  },

  continueButton: {
    border: "none",
    background: "#e8f5e9",
    color: "#2e7d32",
    padding: "10px 15px",
    borderRadius: "9px",
    fontWeight: "bold",
    cursor: "pointer",
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
    background: "white",
    borderRadius: "15px",
    padding: "18px",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    boxShadow:
      "0 3px 12px rgba(0,0,0,0.08)",
  },

  statIcon: {
    fontSize: "30px",
  },

  statNumber: {
    fontSize: "22px",
    fontWeight: "bold",
    color: "#1b5e20",
  },

  statLabel: {
    color: "#777",
    marginTop: "3px",
  },

  formCard: {
    maxWidth: "1200px",
    margin: "0 auto 25px",
    background: "white",
    borderRadius: "15px",
    padding: "25px",
    boxShadow:
      "0 3px 12px rgba(0,0,0,0.08)",
  },

  sectionTitle: {
    margin: "0 0 18px",
    color: "#1b5e20",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "15px",
  },

  inputGroup: {
    marginBottom: "15px",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    fontWeight: "bold",
    color: "#444",
  },

  input: {
    width: "100%",
    padding: "12px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    outline: "none",
    background: "white",
    color: "#222",
  },

  textarea: {
    width: "100%",
    padding: "12px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    resize: "vertical",
    outline: "none",
    background: "white",
    color: "#222",
  },

  formButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  primaryButton: {
    border: "none",
    background: "#2e7d32",
    color: "white",
    padding: "12px 20px",
    borderRadius: "9px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  cancelButton: {
    border: "none",
    background: "#757575",
    color: "white",
    padding: "12px 20px",
    borderRadius: "9px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  searchSection: {
    maxWidth: "1200px",
    margin: "0 auto 20px",
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },

  searchBox: {
    flex: 1,
    minWidth: "220px",
    background: "white",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "0 12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  searchInput: {
    width: "100%",
    border: "none",
    outline: "none",
    padding: "13px 5px",
    fontSize: "15px",
    background: "transparent",
  },

  filterSelect: {
    minWidth: "180px",
    padding: "12px",
    border: "1px solid #ccc",
    borderRadius: "10px",
    background: "white",
  },

  productsHeader: {
    maxWidth: "1200px",
    margin: "0 auto 15px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },

  resultCount: {
    background: "#e8f5e9",
    color: "#2e7d32",
    padding: "7px 12px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "bold",
  },

  productGrid: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill, minmax(270px, 1fr))",
    gap: "18px",
  },

  productCard: {
    background: "white",
    borderRadius: "15px",
    padding: "20px",
    boxShadow:
      "0 3px 12px rgba(0,0,0,0.08)",
  },

  productTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },

  productEmoji: {
    fontSize: "35px",
  },

  categoryBadge: {
    background: "#e8f5e9",
    color: "#2e7d32",
    padding: "6px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "bold",
  },

  myProductBadge: {
    display: "inline-block",
    background: "#e3f2fd",
    color: "#1565c0",
    padding: "5px 9px",
    borderRadius: "15px",
    fontSize: "11px",
    fontWeight: "bold",
    marginBottom: "8px",
  },

  cardProductName: {
    margin: "0 0 8px",
    fontSize: "20px",
    color: "#1b5e20",
  },

  description: {
    minHeight: "45px",
    color: "#666",
    lineHeight: 1.5,
    fontSize: "14px",
  },

  sellerBox: {
    background: "#f8faf8",
    borderRadius: "8px",
    padding: "9px 11px",
    marginTop: "12px",
  },

  sellerValue: {
    display: "block",
    color: "#444",
    fontSize: "13px",
    wordBreak: "break-word",
  },

  sellerText: {
    margin: "0 0 5px",
    color: "#777",
    fontSize: "13px",
    wordBreak: "break-word",
  },

  productDetails: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "end",
    margin: "18px 0",
    paddingTop: "15px",
    borderTop: "1px solid #eee",
  },

  detailLabel: {
    display: "block",
    color: "#888",
    fontSize: "12px",
    marginBottom: "4px",
  },

  cardPrice: {
    fontSize: "19px",
    color: "#2e7d32",
  },

  stockBox: {
    textAlign: "right",
  },

  stockValue: {
    fontSize: "18px",
  },

  cardButtons: {
    display: "grid",
    gridTemplateColumns:
      "1fr auto auto",
    gap: "7px",
    alignItems: "stretch",
  },

  buyButton: {
    border: "none",
    background: "#2e7d32",
    color: "white",
    padding: "10px",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  ownerMessage: {
    background: "#f5f5f5",
    color: "#777",
    padding: "10px",
    borderRadius: "8px",
    fontWeight: "bold",
    textAlign: "center",
  },

  editButton: {
    border: "none",
    background: "#fff3cd",
    color: "#856404",
    padding: "10px",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  deleteButton: {
    border: "none",
    background: "#ffebee",
    color: "#c62828",
    padding: "10px",
    borderRadius: "8px",
    cursor: "pointer",
  },

  cartSection: {
    maxWidth: "1200px",
    margin: "0 auto",
  },

  cartHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
    marginBottom: "15px",
  },

  cartList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  cartItem: {
    background: "white",
    borderRadius: "12px",
    padding: "18px",
    display: "grid",
    gridTemplateColumns:
      "1fr auto auto auto",
    gap: "20px",
    alignItems: "center",
    boxShadow:
      "0 3px 10px rgba(0,0,0,0.07)",
  },

  cartInfo: {
    minWidth: 0,
  },

  productName: {
    margin: "0 0 5px",
    color: "#1b5e20",
  },

  categoryText: {
    margin: "0 0 5px",
    color: "#777",
    fontSize: "13px",
  },

  priceText: {
    margin: 0,
    color: "#555",
    fontSize: "14px",
  },

  quantityControls: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  quantityButton: {
    width: "34px",
    height: "34px",
    minHeight: "34px",
    border: "none",
    borderRadius: "7px",
    background: "#e8f5e9",
    color: "#2e7d32",
    fontSize: "20px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  quantityNumber: {
    minWidth: "55px",
    textAlign: "center",
    fontWeight: "bold",
  },

  itemTotal: {
    minWidth: "100px",
    textAlign: "right",
    fontWeight: "bold",
    color: "#2e7d32",
  },

  removeButton: {
    border: "none",
    background: "#ffebee",
    color: "#c62828",
    borderRadius: "7px",
    padding: "9px",
    cursor: "pointer",
  },

  cartSummary: {
    marginTop: "20px",
    background: "white",
    borderRadius: "15px",
    padding: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
    boxShadow:
      "0 3px 12px rgba(0,0,0,0.08)",
  },

  summaryLabel: {
    display: "block",
    color: "#777",
    marginBottom: "5px",
  },

  summaryTotal: {
    fontSize: "25px",
    color: "#1b5e20",
  },

  orderButton: {
    border: "none",
    background: "#1b5e20",
    color: "white",
    padding: "13px 22px",
    borderRadius: "9px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  emptyBox: {
    maxWidth: "1200px",
    margin: "30px auto",
    background: "white",
    borderRadius: "15px",
    padding: "45px 20px",
    textAlign: "center",
    boxShadow:
      "0 3px 12px rgba(0,0,0,0.07)",
  },

  emptyIcon: {
    fontSize: "45px",
    marginBottom: "10px",
  },
};

export default Marketplace;