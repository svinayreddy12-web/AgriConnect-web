import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../firebase";

function Login({ onLogin, onRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const loginUser = async (e) => {
    e.preventDefault();

    setMessage("");
    setSuccess(false);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setMessage("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      console.log("Logging in:", cleanEmail);

      // --------------------------------
      // FIREBASE LOGIN
      // --------------------------------
      const userCredential = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      const firebaseUser = userCredential.user;

      console.log("Login successful:", firebaseUser.email);

      // --------------------------------
      // GET USER PROFILE
      // --------------------------------
      const profileRef = doc(
        db,
        "profiles",
        firebaseUser.uid
      );

      const profileSnap = await getDoc(profileRef);

      let userName = "";

      if (profileSnap.exists()) {
        const profileData = profileSnap.data();
        userName = profileData.name || "";
      }

      // --------------------------------
      // SAVE CURRENT USER
      // --------------------------------
      const currentUser = {
        uid: firebaseUser.uid,
        name: userName,
        email: firebaseUser.email,
      };

      localStorage.setItem(
        "agriUser",
        JSON.stringify(currentUser)
      );

      setSuccess(true);
      setMessage("Login successful!");

      // --------------------------------
      // CLEAR LOGIN FORM
      // --------------------------------
      setEmail("");
      setPassword("");

      // --------------------------------
      // OPEN DASHBOARD
      // --------------------------------
      if (onLogin) {
        onLogin(currentUser);
      }

    } catch (error) {
      console.error("Login error:", error);
      console.error("Login error code:", error.code);

      switch (error.code) {
        case "auth/invalid-credential":
        case "auth/invalid-login-credentials":
        case "auth/wrong-password":
          setMessage("Incorrect email or password.");
          break;

        case "auth/user-not-found":
          setMessage("No account found with this email.");
          break;

        case "auth/invalid-email":
          setMessage("Please enter a valid email address.");
          break;

        case "auth/user-disabled":
          setMessage("This account has been disabled.");
          break;

        case "auth/too-many-requests":
          setMessage(
            "Too many login attempts. Please try again later."
          );
          break;

        case "auth/network-request-failed":
          setMessage(
            "Network error. Please check your internet connection."
          );
          break;

        case "auth/operation-not-allowed":
          setMessage(
            "Email/Password authentication is not enabled in Firebase."
          );
          break;

        default:
          setMessage(
            `Login failed: ${
              error.message || error.code || "Unknown error"
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

        <h2 style={styles.heading}>
          Welcome Back
        </h2>

        <p style={styles.subtitle}>
          Login to your AgriConnect account
        </p>

        <form
          onSubmit={loginUser}
          autoComplete="off"
        >

          {/* EMAIL */}
          <input
            type="email"
            name="agriconnect-login-email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setMessage("");
              setSuccess(false);
            }}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck="false"
            style={styles.input}
            disabled={loading}
          />

          {/* PASSWORD */}
          <input
            type="password"
            name="agriconnect-login-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setMessage("");
              setSuccess(false);
            }}
            autoComplete="new-password"
            style={styles.input}
            disabled={loading}
          />

          {/* LOGIN BUTTON */}
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
            {loading ? "LOGGING IN..." : "LOGIN"}
          </button>

        </form>

        {/* MESSAGE */}
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

        {/* REGISTER */}
        <p style={styles.registerText}>
          Don't have an account?{" "}

          <button
            type="button"
            onClick={() => {
              setEmail("");
              setPassword("");
              setMessage("");
              setSuccess(false);

              if (onRegister) {
                onRegister();
              }
            }}
            disabled={loading}
            style={styles.linkButton}
          >
            Register
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
    background: "#ffffff",
    padding: "40px",
    borderRadius: "15px",
    boxShadow: "0 5px 25px rgba(0,0,0,0.12)",
    textAlign: "center",
    boxSizing: "border-box",
  },

  logo: {
    color: "#299447",
    marginBottom: "20px",
  },

  heading: {
    marginBottom: "10px",
  },

  subtitle: {
    color: "#777",
    marginBottom: "25px",
  },

  input: {
    width: "100%",
    padding: "13px",
    margin: "8px 0",
    border: "1px solid #ccc",
    borderRadius: "8px",
    boxSizing: "border-box",
    fontSize: "15px",
    background: "#ffffff",
    color: "#222",
  },

  button: {
    width: "100%",
    padding: "14px",
    marginTop: "10px",
    background: "#49b95c",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  message: {
    fontWeight: "bold",
    lineHeight: "1.5",
    marginTop: "18px",
  },

  registerText: {
    marginTop: "25px",
  },

  linkButton: {
    border: "none",
    background: "none",
    color: "#299447",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "15px",
  },
};

export default Login;