"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [unread, setUnread] = useState(0);
  const [articleCount, setArticleCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      // Fetch unread notifications count
      const { count: nCount } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnread(nCount || 0);

      // Fetch article count
      const { count: aCount } = await supabase
        .from("articles")
        .select("*", { count: "exact", head: true });
      setArticleCount(aCount || 0);
    };
    init();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navItems = [
    { href: "/dashboard/articles", icon: "📝", label: "Articles", sub: `${articleCount} published` },
    { href: "/dashboard/top5", icon: "🏆", label: "Top 5 Articles", sub: "Most viewed" },
    { href: "/dashboard/notifications", icon: "🔔", label: "Notifications", sub: unread > 0 ? `${unread} unread` : "All caught up", badge: unread },
    { href: "/dashboard/profile", icon: "👤", label: "My Profile", sub: "Edit your info" },
  ];

  return (
    <div style={styles.bg}>
      <div style={styles.container}>
        <div style={styles.topBar}>
          <div>
            <h1 style={styles.greeting}>
              👋 Welcome{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(" ")[0]}` : ""}!
            </h1>
            <p style={styles.sub}>{user?.email}</p>
          </div>
          <button style={styles.logoutBtn} onClick={handleLogout}>Log Out</button>
        </div>

        <div style={styles.grid}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <div style={styles.card}>
                <div style={styles.cardIcon}>{item.icon}</div>
                <div style={styles.cardInfo}>
                  <div style={styles.cardLabel}>
                    {item.label}
                    {item.badge > 0 && <span style={styles.badge}>{item.badge}</span>}
                  </div>
                  <div style={styles.cardSub}>{item.sub}</div>
                </div>
                <span style={styles.arrow}>→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  bg: { minHeight: "100vh", background: "#0a0a0a" },
  container: { maxWidth: "600px", margin: "0 auto", padding: "48px 16px" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "36px" },
  greeting: { color: "#f0f0f0", fontFamily: "sans-serif", fontSize: "24px", margin: "0 0 4px" },
  sub: { color: "#666", fontFamily: "sans-serif", fontSize: "13px", margin: 0 },
  logoutBtn: { background: "none", border: "1px solid #333", color: "#888", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", fontFamily: "sans-serif", cursor: "pointer" },
  grid: { display: "flex", flexDirection: "column", gap: "10px" },
  card: { background: "#111", border: "1px solid #1e1e1e", borderRadius: "14px", padding: "20px", display: "flex", alignItems: "center", gap: "16px", cursor: "pointer", transition: "border-color 0.15s" },
  cardIcon: { fontSize: "24px", flexShrink: 0 },
  cardInfo: { flex: 1 },
  cardLabel: { color: "#f0f0f0", fontFamily: "sans-serif", fontSize: "16px", fontWeight: 500, display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" },
  cardSub: { color: "#666", fontFamily: "sans-serif", fontSize: "13px" },
  badge: { background: "#e040fb", color: "#fff", fontSize: "11px", fontWeight: 700, padding: "2px 7px", borderRadius: "20px" },
  arrow: { color: "#444", fontFamily: "sans-serif", fontSize: "18px" },
};
