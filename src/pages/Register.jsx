import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase";

function Register({ onLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const registerUser = async (e) => {
    e.preventDefault();

    setMessage("");
    setSuccess(false);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // -----------------------------
    // VALIDATION
    // -----------------------------
    if (
      !cleanName ||
      !cleanEmail ||
      !password ||
      !confirmPassword
    ) {
      setMessage("Please fill all the fields.");
      return;
    }

    if (password.length < 6) {
      setMessage(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      console.log(
        "Creating Firebase account for:",
        cleanEmail
      );

      // -----------------------------
      // CREATE FIREBASE ACCOUNT
      // -----------------------------
      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

      const firebaseUser = userCredential.user;

      console.log(
        "Firebase account created:",
        firebaseUser.uid
      );

      // -----------------------------
      // SAVE PROFILE
      // -----------------------------
      await setDoc(
        doc(
          db,
          "profiles",
          firebaseUser.uid
        ),
        {
          uid: firebaseUser.uid,
          name: cleanName,
          email: cleanEmail,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      console.log("Profile saved.");

      // -----------------------------
      // SAVE COMPATIBILITY DATA
      // -----------------------------
      localStorage.setItem(
        "agriUser",
        JSON.stringify({
          uid: firebaseUser.uid,
          name: cleanName,
          email: cleanEmail,
        })
      );

      // -----------------------------
      // IMPORTANT:
      // SIGN OUT AFTER REGISTRATION
      // -----------------------------
      await signOut(auth);

      // Clear old compatibility login
      localStorage.removeItem("agriUser");

      // -----------------------------
      // SUCCESS
      // -----------------------------
      setSuccess(true);

      setMessage(
        "Registration successful! Please login with your new account."
      );

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      // Go to Login after a short delay
      setTimeout(() => {
        if (onLogin) {
          onLogin();
        }
      }, 800);

    } catch (error) {
      console.error(
        "Firebase registration error:",
        error
      );

      console.error(
        "Error code:",
        error.code
      );

      // -----------------------------
      // FIREBASE ERRORS
      // -----------------------------
      switch (error.code) {
        case "auth/email-already-in-use":
          setMessage(
            "This email is already registered. Please use another email or login."
          );
          break;

        case "auth/invalid-email":
          setMessage(
            "Please enter a valid email address."
          );
          break;

        case "auth/weak-password":
          setMessage(
            "Password is too weak. Use at least 6 characters."
          );
          break;

        case "auth/operation-not-allowed":
          setMessage(
            "Email/Password authentication is not enabled in Firebase."
          );
          break;

        case "auth/network-request-failed":
          setMessage(
            "Network error. Please check your internet connection."
          );
          break;

        case "auth/admin-restricted-operation":
          setMessage(
            "Firebase Authentication is restricted. Check your Firebase settings."
          );
          break;

        case "permission-denied":
        case "permission-denied-error":
          setMessage(
            "Firestore permission denied. Please check your Firestore rules."
          );
          break;

        default:
          setMessage(
            `Registration failed: ${
              error.code || "Unknown error"
            }`
          );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        <h1 style={styles.logo}>
          🌱 AgriConnect
        </h1>

        <h2>Create Account</h2>

        <p style={styles.subtitle}>
          Join AgriConnect today!
        </p>

        <form onSubmit={registerUser}>

          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            style={styles.input}
            disabled={loading}
          />

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            style={styles.input}
            disabled={loading}
          />

          <input
            type="password"
            placeholder="Create your password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            style={styles.input}
            disabled={loading}
          />

          <input
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(e.target.value)
            }
            style={styles.input}
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "CREATING ACCOUNT..."
              : "REGISTER"}
          </button>

        </form>

        {message && (
          <p
            style={{
              ...styles.message,
              color: success
                ? "#299447"
                : "#d32f2f",
            }}
          >
            {message}
          </p>
        )}

        <p>
          Already have an account?{" "}

          <button
            type="button"
            onClick={onLogin}
            disabled={loading}
            style={styles.linkButton}
          >
            Login
          </button>
        </p>

      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f3fff4",
    fontFamily: "Arial, sans-serif",
    padding: "20px",
    boxSizing: "border-box",
  },

  card: {
    width: "400px",
    maxWidth: "100%",
    background: "#fff",
    padding: "40px",
    borderRadius: "15px",
    boxShadow:
      "0 5px 25px rgba(0,0,0,0.12)",
    textAlign: "center",
    boxSizing: "border-box",
  },

  logo: {
    color: "#299447",
  },

  subtitle: {
    color: "#777",
  },

  input: {
    width: "100%",
    padding: "13px",
    margin: "8px 0",
    border: "1px solid #ccc",
    borderRadius: "8px",
    boxSizing: "border-box",
    fontSize: "15px",
  },

  button: {
    width: "100%",
    padding: "14px",
    marginTop: "10px",
    background: "#49b95c",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  message: {
    fontWeight: "bold",
    lineHeight: "1.5",
  },

  linkButton: {
    border: "none",
    background: "none",
    color: "#299447",
    cursor: "pointer",
    fontWeight: "bold",
  },
};

export default Register;