import React, { useEffect, useState } from "react";
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";

function Profile({ user, onBack }) {
  const firebaseUser = auth.currentUser;

  const userUid = firebaseUser?.uid || user?.uid || "";
  const userEmail = firebaseUser?.email || user?.email || "";

  const emptyProfile = {
    fullName: user?.name || "",
    email: userEmail,
    phone: "",
    location: "",
    experience: "",
    mainCrops: "",
    landArea: "",
    landUnit: "Acres",
  };

  const [formData, setFormData] = useState(emptyProfile);
  const [savedData, setSavedData] = useState(emptyProfile);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // --------------------------------------------------
  // LOAD PROFILE FROM FIRESTORE
  // --------------------------------------------------
  useEffect(() => {
    if (!userUid) {
      setLoading(false);
      setMessage("User authentication information not available.");
      return;
    }

    const profileRef = doc(db, "profiles", userUid);

    const unsubscribe = onSnapshot(
      profileRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const profile = snapshot.data();

          const loadedData = {
            fullName:
              profile.fullName ||
              user?.name ||
              "",
            email:
              profile.email ||
              userEmail ||
              "",
            phone:
              profile.phone ||
              "",
            location:
              profile.location ||
              "",
            experience:
              profile.experience ||
              "",
            mainCrops:
              profile.mainCrops ||
              "",
            landArea:
              profile.landArea ||
              "",
            landUnit:
              profile.landUnit ||
              "Acres",
          };

          setFormData(loadedData);
          setSavedData(loadedData);

          // Compatibility cache
          localStorage.setItem(
            "agriProfile",
            JSON.stringify(loadedData)
          );
        } else {
          // Check old localStorage profile if Firebase profile
          // does not exist yet.
          const savedProfile =
            localStorage.getItem("agriProfile");

          if (savedProfile) {
            try {
              const profile =
                JSON.parse(savedProfile);

              const loadedData = {
                fullName:
                  profile.fullName ||
                  user?.name ||
                  "",
                email:
                  profile.email ||
                  userEmail ||
                  "",
                phone:
                  profile.phone ||
                  "",
                location:
                  profile.location ||
                  "",
                experience:
                  profile.experience ||
                  "",
                mainCrops:
                  profile.mainCrops ||
                  "",
                landArea:
                  profile.landArea ||
                  "",
                landUnit:
                  profile.landUnit ||
                  "Acres",
              };

              setFormData(loadedData);
              setSavedData(loadedData);
            } catch (error) {
              console.log(
                "Unable to load old profile data."
              );
            }
          }
        }

        setLoading(false);
      },
      (error) => {
        console.error(
          "Profile loading error:",
          error
        );

        setLoading(false);

        if (
          error.code ===
          "permission-denied"
        ) {
          setMessage(
            "Profile access was denied. Please make sure you are logged in."
          );
        } else {
          setMessage(
            "Unable to load profile from Firebase."
          );
        }
      }
    );

    return () => unsubscribe();
  }, [userUid, userEmail, user]);

  // --------------------------------------------------
  // HANDLE INPUT CHANGES
  // --------------------------------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // --------------------------------------------------
  // SAVE PROFILE TO FIRESTORE
  // --------------------------------------------------
  const handleSave = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setMessage(
        "You are not logged in. Please log in again."
      );
      return;
    }

    const uid = currentUser.uid;
    const email = currentUser.email || "";

    try {
      setSaving(true);
      setMessage("");

      // IMPORTANT:
      // Profile document ID = Firebase UID
      const profileRef = doc(
        db,
        "profiles",
        uid
      );

      const profileData = {
        uid: uid,
        ownerEmail: email,

        fullName:
          formData.fullName.trim(),

        // Keep Firebase-auth email as the
        // official email.
        email: email,

        phone:
          formData.phone.trim(),

        location:
          formData.location.trim(),

        experience:
          formData.experience,

        mainCrops:
          formData.mainCrops.trim(),

        landArea:
          formData.landArea,

        landUnit:
          formData.landUnit,

        updatedAt:
          serverTimestamp(),
      };

      await setDoc(
        profileRef,
        profileData,
        { merge: true }
      );

      const updatedData = {
        ...formData,
        email: email,
      };

      // Compatibility cache
      localStorage.setItem(
        "agriProfile",
        JSON.stringify(updatedData)
      );

      setFormData(updatedData);
      setSavedData(updatedData);

      setEditing(false);

      setMessage(
        "Profile saved successfully!"
      );

      setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (error) {
      console.error(
        "Profile save error:",
        error
      );

      if (
        error.code ===
        "permission-denied"
      ) {
        setMessage(
          "Profile update was denied by Firebase security rules."
        );
      } else {
        setMessage(
          "Unable to save profile. Please try again."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // RESET CHANGES
  // --------------------------------------------------
  const handleReset = () => {
    setFormData(savedData);
    setEditing(false);
    setMessage("");
  };

  const startEditing = () => {
    setEditing(true);
    setMessage("");
  };

  // --------------------------------------------------
  // GET INITIAL
  // --------------------------------------------------
  const getInitial = () => {
    const name =
      formData.fullName ||
      user?.name ||
      "Farmer";

    return name
      .charAt(0)
      .toUpperCase();
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------
  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingIcon}>
            🌾
          </div>

          <h2>
            Loading Profile...
          </h2>

          <p>
            Your profile is being loaded
            from Firebase.
          </p>
        </div>
      </div>
    );
  }

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
              My Profile
            </h1>

            <p
              style={styles.headerSubtitle}
            >
              Manage your personal and
              farming information
            </p>
          </div>
        </div>
      </header>

      <main style={styles.container}>
        {message && (
          <div
            style={
              message.includes(
                "successfully"
              )
                ? styles.successMessage
                : styles.errorMessage
            }
          >
            {message.includes(
              "successfully"
            )
              ? "✓"
              : "⚠"}{" "}
            {message}
          </div>
        )}

        {/* PROFILE HEADER */}
        <section style={styles.profileCard}>
          <div style={styles.profileTop}>
            <div style={styles.avatar}>
              {getInitial()}
            </div>

            <div
              style={styles.profileIdentity}
            >
              <h2
                style={styles.profileName}
              >
                {formData.fullName ||
                  "Farmer"}
              </h2>

              <p
                style={styles.profileEmail}
              >
                {formData.email ||
                  "No email available"}
              </p>

              <span
                style={styles.profileBadge}
              >
                🌾 Farmer
              </span>
            </div>

            {!editing && (
              <button
                onClick={startEditing}
                style={styles.editButton}
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>
        </section>

        {/* PERSONAL INFORMATION */}
        <section style={styles.card}>
          <div
            style={styles.sectionHeader}
          >
            <div>
              <h2
                style={styles.sectionTitle}
              >
                👤 Personal Information
              </h2>

              <p
                style={
                  styles.sectionDescription
                }
              >
                Update your basic personal
                details
              </p>
            </div>
          </div>

          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>
                Full Name
              </label>

              <input
                type="text"
                name="fullName"
                value={
                  formData.fullName
                }
                onChange={handleChange}
                disabled={!editing}
                placeholder="Enter your full name"
                style={{
                  ...styles.input,
                  ...(!editing
                    ? styles.disabledInput
                    : {}),
                }}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                Email Address
              </label>

              <input
                type="email"
                name="email"
                value={
                  formData.email
                }
                disabled={true}
                placeholder="Email address"
                style={{
                  ...styles.input,
                  ...styles.disabledInput,
                }}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                Phone Number
              </label>

              <input
                type="tel"
                name="phone"
                value={
                  formData.phone
                }
                onChange={handleChange}
                disabled={!editing}
                placeholder="Enter phone number"
                style={{
                  ...styles.input,
                  ...(!editing
                    ? styles.disabledInput
                    : {}),
                }}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                Location
              </label>

              <input
                type="text"
                name="location"
                value={
                  formData.location
                }
                onChange={handleChange}
                disabled={!editing}
                placeholder="Village, district, state"
                style={{
                  ...styles.input,
                  ...(!editing
                    ? styles.disabledInput
                    : {}),
                }}
              />
            </div>
          </div>
        </section>

        {/* FARMING INFORMATION */}
        <section style={styles.card}>
          <div
            style={styles.sectionHeader}
          >
            <div>
              <h2
                style={styles.sectionTitle}
              >
                🌾 Farming Information
              </h2>

              <p
                style={
                  styles.sectionDescription
                }
              >
                Tell us about your farming
                activities
              </p>
            </div>
          </div>

          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>
                Farming Experience
              </label>

              <select
                name="experience"
                value={
                  formData.experience
                }
                onChange={handleChange}
                disabled={!editing}
                style={{
                  ...styles.input,
                  ...(!editing
                    ? styles.disabledInput
                    : {}),
                }}
              >
                <option value="">
                  Select experience
                </option>

                <option value="Less than 1 year">
                  Less than 1 year
                </option>

                <option value="1-3 years">
                  1-3 years
                </option>

                <option value="4-7 years">
                  4-7 years
                </option>

                <option value="8-15 years">
                  8-15 years
                </option>

                <option value="More than 15 years">
                  More than 15 years
                </option>
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                Main Crops
              </label>

              <input
                type="text"
                name="mainCrops"
                value={
                  formData.mainCrops
                }
                onChange={handleChange}
                disabled={!editing}
                placeholder="Rice, wheat, tomato..."
                style={{
                  ...styles.input,
                  ...(!editing
                    ? styles.disabledInput
                    : {}),
                }}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                Land Area
              </label>

              <input
                type="number"
                name="landArea"
                value={
                  formData.landArea
                }
                onChange={handleChange}
                disabled={!editing}
                placeholder="Enter land area"
                min="0"
                style={{
                  ...styles.input,
                  ...(!editing
                    ? styles.disabledInput
                    : {}),
                }}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                Land Unit
              </label>

              <select
                name="landUnit"
                value={
                  formData.landUnit
                }
                onChange={handleChange}
                disabled={!editing}
                style={{
                  ...styles.input,
                  ...(!editing
                    ? styles.disabledInput
                    : {}),
                }}
              >
                <option value="Acres">
                  Acres
                </option>

                <option value="Hectares">
                  Hectares
                </option>

                <option value="Guntas">
                  Guntas
                </option>
              </select>
            </div>
          </div>
        </section>

        {/* SAVE / RESET */}
        {editing && (
          <section
            style={styles.actionCard}
          >
            <div>
              <h3
                style={styles.actionTitle}
              >
                Save Your Changes
              </h3>

              <p
                style={styles.actionText}
              >
                Make sure your information
                is correct before saving.
              </p>
            </div>

            <div
              style={styles.actionButtons}
            >
              <button
                onClick={handleReset}
                disabled={saving}
                style={{
                  ...styles.cancelButton,
                  ...(saving
                    ? styles.disabledButton
                    : {}),
                }}
              >
                ↩ Reset
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  ...styles.saveButton,
                  ...(saving
                    ? styles.disabledButton
                    : {}),
                }}
              >
                {saving
                  ? "Saving..."
                  : "💾 Save Profile"}
              </button>
            </div>
          </section>
        )}

        {/* PROFILE SUMMARY */}
        <section style={styles.card}>
          <div
            style={styles.sectionHeader}
          >
            <div>
              <h2
                style={styles.sectionTitle}
              >
                📋 Profile Summary
              </h2>

              <p
                style={
                  styles.sectionDescription
                }
              >
                Your current farming profile
              </p>
            </div>
          </div>

          <div
            style={styles.summaryGrid}
          >
            <div
              style={styles.summaryItem}
            >
              <span
                style={styles.summaryIcon}
              >
                📍
              </span>

              <div>
                <span
                  style={styles.summaryLabel}
                >
                  Location
                </span>

                <strong
                  style={styles.summaryValue}
                >
                  {formData.location ||
                    "Not added"}
                </strong>
              </div>
            </div>

            <div
              style={styles.summaryItem}
            >
              <span
                style={styles.summaryIcon}
              >
                📞
              </span>

              <div>
                <span
                  style={styles.summaryLabel}
                >
                  Phone
                </span>

                <strong
                  style={styles.summaryValue}
                >
                  {formData.phone ||
                    "Not added"}
                </strong>
              </div>
            </div>

            <div
              style={styles.summaryItem}
            >
              <span
                style={styles.summaryIcon}
              >
                🌱
              </span>

              <div>
                <span
                  style={styles.summaryLabel}
                >
                  Main Crops
                </span>

                <strong
                  style={styles.summaryValue}
                >
                  {formData.mainCrops ||
                    "Not added"}
                </strong>
              </div>
            </div>

            <div
              style={styles.summaryItem}
            >
              <span
                style={styles.summaryIcon}
              >
                ⏳
              </span>

              <div>
                <span
                  style={styles.summaryLabel}
                >
                  Experience
                </span>

                <strong
                  style={styles.summaryValue}
                >
                  {formData.experience ||
                    "Not added"}
                </strong>
              </div>
            </div>

            <div
              style={styles.summaryItem}
            >
              <span
                style={styles.summaryIcon}
              >
                📐
              </span>

              <div>
                <span
                  style={styles.summaryLabel}
                >
                  Land Area
                </span>

                <strong
                  style={styles.summaryValue}
                >
                  {formData.landArea
                    ? `${formData.landArea} ${formData.landUnit}`
                    : "Not added"}
                </strong>
              </div>
            </div>

            <div
              style={styles.summaryItem}
            >
              <span
                style={styles.summaryIcon}
              >
                ✉️
              </span>

              <div>
                <span
                  style={styles.summaryLabel}
                >
                  Email
                </span>

                <strong
                  style={styles.summaryValue}
                >
                  {formData.email ||
                    "Not added"}
                </strong>
              </div>
            </div>
          </div>
        </section>

        <footer style={styles.footer}>
          <p>
            🌾 AgriConnect • Empowering
            Farmers with Technology
          </p>
        </footer>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f8f3",
  },

  loadingPage: {
    minHeight: "100vh",
    background: "#f4f8f3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },

  loadingCard: {
    background: "white",
    padding: "35px",
    borderRadius: "16px",
    textAlign: "center",
    boxShadow:
      "0 4px 15px rgba(0,0,0,0.08)",
    maxWidth: "400px",
    width: "100%",
  },

  loadingIcon: {
    fontSize: "40px",
    marginBottom: "10px",
  },

  header: {
    background:
      "linear-gradient(135deg, #166534, #15803d)",
    color: "white",
    padding: "24px 20px",
    boxShadow:
      "0 3px 12px rgba(0,0,0,0.12)",
  },

  headerInner: {
    maxWidth: "1100px",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    gap: "18px",
  },

  backButton: {
    border: "none",
    background: "#e9f5eb",
    color: "#176b36",
    padding: "0 20px",
    borderRadius: "14px",
    cursor: "pointer",
    fontWeight: "700",
    minHeight: "50px",
    minWidth: "121px",
    fontSize: "17px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "none",
    transform: "none",
  },

  headerTitle: {
    margin: "0 0 5px",
    fontSize: "28px",
  },

  headerSubtitle: {
    margin: 0,
    opacity: 0.9,
    fontSize: "14px",
  },

  container: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "28px 20px",
  },

  successMessage: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #86efac",
    padding: "13px 16px",
    borderRadius: "10px",
    marginBottom: "20px",
    fontWeight: "600",
  },

  errorMessage: {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    padding: "13px 16px",
    borderRadius: "10px",
    marginBottom: "20px",
    fontWeight: "600",
  },

  profileCard: {
    background: "white",
    borderRadius: "16px",
    padding: "25px",
    marginBottom: "22px",
    boxShadow:
      "0 4px 15px rgba(0,0,0,0.07)",
  },

  profileTop: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    flexWrap: "wrap",
  },

  avatar: {
    width: "78px",
    height: "78px",
    borderRadius: "50%",
    background:
      "linear-gradient(135deg, #22c55e, #15803d)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "32px",
    fontWeight: "bold",
    flexShrink: 0,
  },

  profileIdentity: {
    flex: 1,
    minWidth: "200px",
  },

  profileName: {
    margin: "0 0 5px",
    fontSize: "24px",
    color: "#166534",
  },

  profileEmail: {
    margin: "0 0 10px",
    color: "#666",
  },

  profileBadge: {
    display: "inline-block",
    background: "#dcfce7",
    color: "#166534",
    padding: "5px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
  },

  editButton: {
    background: "#166534",
    color: "white",
    border: "none",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "none",
    transform: "none",
  },

  card: {
    background: "white",
    borderRadius: "16px",
    padding: "25px",
    marginBottom: "22px",
    boxShadow:
      "0 4px 15px rgba(0,0,0,0.07)",
  },

  sectionHeader: {
    marginBottom: "22px",
  },

  sectionTitle: {
    margin: "0 0 5px",
    color: "#166534",
    fontSize: "21px",
  },

  sectionDescription: {
    margin: 0,
    color: "#777",
    fontSize: "14px",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "20px",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  label: {
    fontWeight: "600",
    color: "#333",
    fontSize: "14px",
  },

  input: {
    width: "100%",
    minHeight: "44px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    padding: "10px 12px",
    outline: "none",
    background: "white",
    color: "#222",
  },

  disabledInput: {
    background: "#f7f7f7",
    color: "#555",
    cursor: "not-allowed",
  },

  actionCard: {
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
    borderRadius: "16px",
    padding: "20px 25px",
    marginBottom: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    flexWrap: "wrap",
  },

  actionTitle: {
    margin: "0 0 5px",
    color: "#166534",
  },

  actionText: {
    margin: 0,
    color: "#4b5563",
    fontSize: "14px",
  },

  actionButtons: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  cancelButton: {
    background: "white",
    color: "#555",
    border: "1px solid #d1d5db",
    padding: "10px 17px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "none",
    transform: "none",
  },

  saveButton: {
    background: "#16a34a",
    color: "white",
    border: "none",
    padding: "10px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "none",
    transform: "none",
  },

  disabledButton: {
    opacity: 0.6,
    cursor: "not-allowed",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "14px",
  },

  summaryItem: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    padding: "15px",
    background: "#f8faf8",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
  },

  summaryIcon: {
    width: "42px",
    height: "42px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#dcfce7",
    borderRadius: "10px",
    fontSize: "20px",
    flexShrink: 0,
  },

  summaryLabel: {
    display: "block",
    color: "#777",
    fontSize: "12px",
    marginBottom: "4px",
  },

  summaryValue: {
    display: "block",
    color: "#222",
    fontSize: "14px",
    wordBreak: "break-word",
  },

  footer: {
    textAlign: "center",
    color: "#777",
    padding: "10px 0 25px",
    fontSize: "13px",
  },
};

export default Profile;