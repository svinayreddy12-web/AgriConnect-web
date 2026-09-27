import React, { useState } from "react";

function Help({ onBack }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [openFaq, setOpenFaq] = useState(null);

  const categories = [
    { name: "All", icon: "📚" },
    { name: "Crops", icon: "🌱" },
    { name: "Marketplace", icon: "🛒" },
    { name: "Orders", icon: "📦" },
    { name: "Market Prices", icon: "💰" },
    { name: "Weather", icon: "🌦️" },
    { name: "Account", icon: "👤" },
  ];

  const guides = [
    {
      id: 1,
      title: "Managing Your Crops",
      description:
        "Learn how to add, update and track your crops.",
      category: "Crops",
      icon: "🌱",
    },
    {
      id: 2,
      title: "Using the Marketplace",
      description:
        "Learn how to list agricultural products and manage stock.",
      category: "Marketplace",
      icon: "🛒",
    },
    {
      id: 3,
      title: "Understanding Market Prices",
      description:
        "Check crop prices and compare different markets.",
      category: "Market Prices",
      icon: "💰",
    },
    {
      id: 4,
      title: "Checking Weather",
      description:
        "Use weather information to plan your farming activities.",
      category: "Weather",
      icon: "🌦️",
    },
    {
      id: 5,
      title: "Managing Orders",
      description:
        "View, confirm and manage your marketplace orders.",
      category: "Orders",
      icon: "📦",
    },
    {
      id: 6,
      title: "Managing Your Profile",
      description:
        "Update your personal and farming information.",
      category: "Account",
      icon: "👤",
    },
  ];

  const faqs = [
    {
      question: "How do I add a new crop?",
      answer:
        "Open the Crops section from your dashboard and select Add Crop. Enter the crop name, quantity, planting date and expected harvest date, then save the crop.",
      category: "Crops",
    },
    {
      question: "How do I sell a product?",
      answer:
        "Go to Marketplace and use the Add Product option. Enter the product name, price, available quantity, description and category. Your product will then appear in the marketplace.",
      category: "Marketplace",
    },
    {
      question: "How can I check market prices?",
      answer:
        "Open Market Prices from the dashboard. You can search for a crop and filter prices by market to compare available prices.",
      category: "Market Prices",
    },
    {
      question: "How do I check the weather?",
      answer:
        "Open the Weather section and search for your location. AgriConnect displays current weather information and a multi-day forecast.",
      category: "Weather",
    },
    {
      question: "Where can I see my orders?",
      answer:
        "Open the Orders section from your dashboard. You can search orders, filter them by status and view order details.",
      category: "Orders",
    },
    {
      question: "How do I update my profile?",
      answer:
        "Open Profile from the dashboard, select Edit Profile, update your information and press Save Profile.",
      category: "Account",
    },
    {
      question: "Can I use AgriConnect on my phone?",
      answer:
        "Yes. AgriConnect is designed with a responsive interface so it can be used on mobile phones, tablets and computers.",
      category: "Account",
    },
    {
      question: "What should I do if my information is not saved?",
      answer:
        "Refresh the page and try saving again. If the issue continues, check that the required fields contain valid information.",
      category: "Account",
    },
  ];

  const searchText = search.toLowerCase().trim();

  const filteredGuides = guides.filter((guide) => {
    const matchesCategory =
      activeCategory === "All" ||
      guide.category === activeCategory;

    const text =
      `${guide.title} ${guide.description} ${guide.category}`.toLowerCase();

    return matchesCategory && text.includes(searchText);
  });

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory =
      activeCategory === "All" ||
      faq.category === activeCategory;

    const text =
      `${faq.question} ${faq.answer} ${faq.category}`.toLowerCase();

    return matchesCategory && text.includes(searchText);
  });

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleCategory = (category) => {
    setActiveCategory(category);
    setOpenFaq(null);
  };

  return (
    <div style={styles.page}>
      {/* HEADER */}
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
              Help & Support
            </h1>

            <p style={styles.headerSubtitle}>
              Find answers and get help with AgriConnect
            </p>
          </div>
        </div>
      </header>

      <main style={styles.container}>
        {/* HERO */}
        <section style={styles.hero}>
          <div style={styles.heroIcon}>🆘</div>

          <h2 style={styles.heroTitle}>
            How can we help you?
          </h2>

          <p style={styles.heroText}>
            Search for a topic, browse our guides or check
            frequently asked questions.
          </p>

          <div style={styles.searchBox}>
            <span style={styles.searchIcon}>🔍</span>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for help..."
              style={styles.searchInput}
            />

            {search && (
              <button
                onClick={() => setSearch("")}
                style={styles.clearSearch}
              >
                ×
              </button>
            )}
          </div>
        </section>

        {/* CATEGORIES */}
        <section style={styles.categorySection}>
          <div style={styles.categoryList}>
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() =>
                  handleCategory(category.name)
                }
                style={{
                  ...styles.categoryButton,
                  ...(activeCategory === category.name
                    ? styles.activeCategory
                    : {}),
                }}
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* GUIDES */}
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                📚 Farming & App Guides
              </h2>

              <p style={styles.sectionDescription}>
                Quick guides to help you use AgriConnect
              </p>
            </div>

            <span style={styles.resultCount}>
              {filteredGuides.length} guides
            </span>
          </div>

          {filteredGuides.length === 0 ? (
            <div style={styles.noResults}>
              <div style={styles.noResultsIcon}>🔎</div>

              <h3>No guides found</h3>

              <p>
                Try a different search term or category.
              </p>
            </div>
          ) : (
            <div style={styles.guideGrid}>
              {filteredGuides.map((guide) => (
                <div
                  key={guide.id}
                  style={styles.guideCard}
                >
                  <div style={styles.guideIcon}>
                    {guide.icon}
                  </div>

                  <div style={styles.guideContent}>
                    <span style={styles.guideCategory}>
                      {guide.category}
                    </span>

                    <h3 style={styles.guideTitle}>
                      {guide.title}
                    </h3>

                    <p style={styles.guideDescription}>
                      {guide.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* FAQ */}
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                ❓ Frequently Asked Questions
              </h2>

              <p style={styles.sectionDescription}>
                Find quick answers to common questions
              </p>
            </div>

            <span style={styles.resultCount}>
              {filteredFaqs.length} FAQs
            </span>
          </div>

          {filteredFaqs.length === 0 ? (
            <div style={styles.noResults}>
              <div style={styles.noResultsIcon}>🔎</div>

              <h3>No FAQs found</h3>

              <p>
                Try searching for another topic.
              </p>
            </div>
          ) : (
            <div style={styles.faqList}>
              {filteredFaqs.map((faq, index) => (
                <div
                  key={faq.question}
                  style={styles.faqItem}
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    style={styles.faqQuestion}
                  >
                    <span style={styles.faqQuestionText}>
                      <span style={styles.faqIcon}>
                        ❔
                      </span>

                      {faq.question}
                    </span>

                    <span style={styles.faqArrow}>
                      {openFaq === index ? "−" : "+"}
                    </span>
                  </button>

                  {openFaq === index && (
                    <div style={styles.faqAnswer}>
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SUPPORT */}
        <section style={styles.supportCard}>
          <div style={styles.supportHeader}>
            <div style={styles.supportIcon}>📞</div>

            <div>
              <h2 style={styles.supportTitle}>
                Need More Help?
              </h2>

              <p style={styles.supportText}>
                Contact the appropriate support service for
                assistance.
              </p>
            </div>
          </div>

          <div style={styles.contactGrid}>
            <div style={styles.contactCard}>
              <div style={styles.contactIcon}>🌾</div>

              <div style={styles.contactContent}>
                <h3 style={styles.contactTitle}>
                  Kisan Call Centre
                </h3>

                <p style={styles.contactDescription}>
                  Get assistance with agriculture and farming
                  related questions.
                </p>

                <a
                  href="tel:18001801551"
                  style={styles.callButton}
                >
                  📞 Call 1800-180-1551
                </a>
              </div>
            </div>

            <div style={styles.contactCard}>
              <div style={styles.contactIcon}>🏛️</div>

              <div style={styles.contactContent}>
                <h3 style={styles.contactTitle}>
                  Karnataka Agriculture Department
                </h3>

                <p style={styles.contactDescription}>
                  Contact the agriculture department for
                  government farming assistance.
                </p>

                <a
                  href="tel:18004253553"
                  style={styles.callButton}
                >
                  📞 Call 1800-425-3553
                </a>
              </div>
            </div>

            <div style={styles.contactCard}>
              <div style={styles.contactIcon}>🚨</div>

              <div style={styles.contactContent}>
                <h3 style={styles.contactTitle}>
                  Emergency Services
                </h3>

                <p style={styles.contactDescription}>
                  For immediate emergencies, contact the
                  emergency response service.
                </p>

                <a
                  href="tel:112"
                  style={styles.emergencyButton}
                >
                  🚨 Call 112
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* TIPS */}
        <section style={styles.tipsCard}>
          <div style={styles.tipsIcon}>💡</div>

          <div>
            <h2 style={styles.tipsTitle}>
              Helpful Tips
            </h2>

            <ul style={styles.tipsList}>
              <li>
                Keep your profile information updated.
              </li>

              <li>
                Check weather conditions before important
                farming activities.
              </li>

              <li>
                Compare market prices before selling crops.
              </li>

              <li>
                Keep track of your crop and harvest records.
              </li>

              <li>
                Check Notifications regularly for important
                updates.
              </li>
            </ul>
          </div>
        </section>

        <footer style={styles.footer}>
          <p>
            🌾 AgriConnect • Helping Farmers Grow Smarter
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

  header: {
    background:
      "linear-gradient(135deg, #166534, #15803d)",
    color: "white",
    padding: "24px 20px",
    boxShadow: "0 3px 12px rgba(0,0,0,0.12)",
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

  hero: {
    background:
      "linear-gradient(135deg, #166534, #16a34a)",
    color: "white",
    borderRadius: "18px",
    padding: "35px 25px",
    textAlign: "center",
    marginBottom: "22px",
    boxShadow: "0 5px 18px rgba(0,0,0,0.1)",
  },

  heroIcon: {
    fontSize: "42px",
    marginBottom: "8px",
  },

  heroTitle: {
    margin: "0 0 8px",
    fontSize: "27px",
  },

  heroText: {
    margin: "0 auto 22px",
    maxWidth: "650px",
    opacity: 0.92,
    lineHeight: 1.5,
  },

  searchBox: {
    maxWidth: "650px",
    margin: "0 auto",
    background: "white",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    padding: "0 13px",
  },

  searchIcon: {
    fontSize: "18px",
  },

  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    padding: "14px 10px",
    fontSize: "15px",
    minWidth: 0,
  },

  clearSearch: {
    border: "none",
    background: "transparent",
    color: "#777",
    fontSize: "23px",
    cursor: "pointer",
    minHeight: "35px",
    padding: "0 5px",
    transition: "none",
    transform: "none",
  },

  categorySection: {
    background: "white",
    borderRadius: "14px",
    padding: "15px",
    marginBottom: "22px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
  },

  categoryList: {
    display: "flex",
    gap: "9px",
    flexWrap: "wrap",
    justifyContent: "center",
  },

  categoryButton: {
    border: "1px solid #d1d5db",
    background: "white",
    color: "#555",
    padding: "9px 14px",
    borderRadius: "20px",
    cursor: "pointer",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "none",
    transform: "none",
  },

  activeCategory: {
    background: "#166534",
    border: "1px solid #166534",
    color: "white",
  },

  card: {
    background: "white",
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "22px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
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

  resultCount: {
    background: "#dcfce7",
    color: "#166534",
    padding: "6px 10px",
    borderRadius: "15px",
    fontSize: "12px",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },

  guideGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "14px",
  },

  guideCard: {
    display: "flex",
    gap: "14px",
    padding: "17px",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    background: "#fafdfa",
  },

  guideIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    background: "#dcfce7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
    flexShrink: 0,
  },

  guideContent: {
    minWidth: 0,
  },

  guideCategory: {
    color: "#16a34a",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
  },

  guideTitle: {
    margin: "4px 0 6px",
    color: "#222",
    fontSize: "16px",
  },

  guideDescription: {
    margin: 0,
    color: "#666",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  faqList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  faqItem: {
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    overflow: "hidden",
  },

  faqQuestion: {
    width: "100%",
    border: "none",
    background: "#fafafa",
    padding: "15px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    textAlign: "left",
    cursor: "pointer",
    fontWeight: "600",
    color: "#333",
    fontSize: "14px",
    gap: "10px",
    transition: "none",
    transform: "none",
  },

  faqQuestionText: {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
  },

  faqIcon: {
    marginRight: "9px",
    flexShrink: 0,
  },

  faqArrow: {
    fontSize: "20px",
    color: "#166534",
    flexShrink: 0,
  },

  faqAnswer: {
    background: "white",
    padding: "0 15px 15px 15px",
    color: "#666",
    fontSize: "14px",
    lineHeight: 1.6,
  },

  noResults: {
    textAlign: "center",
    padding: "35px 15px",
    color: "#777",
  },

  noResultsIcon: {
    fontSize: "40px",
    marginBottom: "8px",
  },

  supportCard: {
    background: "white",
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "22px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
  },

  supportHeader: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "20px",
  },

  supportIcon: {
    width: "52px",
    height: "52px",
    borderRadius: "13px",
    background: "#dcfce7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "25px",
    flexShrink: 0,
  },

  supportTitle: {
    margin: "0 0 5px",
    color: "#166534",
    fontSize: "21px",
  },

  supportText: {
    margin: 0,
    color: "#777",
    fontSize: "14px",
  },

  contactGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(3, minmax(0, 1fr))",
    gap: "14px",
  },

  contactCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "18px",
    background: "#fafdfa",
  },

  contactIcon: {
    fontSize: "28px",
    marginBottom: "10px",
  },

  contactTitle: {
    margin: "0 0 7px",
    color: "#222",
    fontSize: "16px",
  },

  contactDescription: {
    margin: "0 0 14px",
    color: "#666",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  callButton: {
    display: "inline-block",
    textDecoration: "none",
    background: "#166534",
    color: "white",
    padding: "9px 12px",
    borderRadius: "7px",
    fontSize: "12px",
    fontWeight: "600",
  },

  emergencyButton: {
    display: "inline-block",
    textDecoration: "none",
    background: "#dc2626",
    color: "white",
    padding: "9px 12px",
    borderRadius: "7px",
    fontSize: "12px",
    fontWeight: "600",
  },

  tipsCard: {
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
    borderRadius: "16px",
    padding: "22px 24px",
    display: "flex",
    gap: "15px",
    marginBottom: "22px",
  },

  tipsIcon: {
    fontSize: "28px",
    flexShrink: 0,
  },

  tipsTitle: {
    margin: "0 0 8px",
    color: "#166534",
  },

  tipsList: {
    margin: 0,
    paddingLeft: "20px",
    color: "#4b5563",
    lineHeight: 1.8,
    fontSize: "14px",
  },

  footer: {
    textAlign: "center",
    color: "#777",
    padding: "5px 0 25px",
    fontSize: "13px",
  },
};

export default Help;