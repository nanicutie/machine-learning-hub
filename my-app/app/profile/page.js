"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [articles, setArticles] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");

  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [articleStats, setArticleStats] = useState({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      // Fetch profile — if missing, create it from auth metadata
      let { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        // Profile row missing (user signed up before the trigger was added).
        // Create it now from auth user metadata.
        const meta = user.user_metadata || {};
        const { data: created } = await supabase
          .from("profiles")
          .upsert([{
            id: user.id,
            email: user.email,
            full_name: meta.full_name || "",
            role: meta.role || "user",
          }], { onConflict: "id" })
          .select()
          .single();
        profileData = created;
      }

      if (profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name || "");
        setUsername(profileData.username || "");
      }

      const { data: articleData } = await supabase
        .from("articles").select("*").eq("author_id", user.id).order("created_at", { ascending: false });
      if (articleData) {
        setArticles(articleData);

        const statsMap = {};
        for (const article of articleData) {
          const { count: commentCount } = await supabase
            .from('comments').select('id', { count: 'exact', head: true }).eq('article_id', article.id);
          statsMap[article.id] = { likes: article.counter || 0, comments: commentCount || 0 };
        }
        setArticleStats(statsMap);
      }

      setLoading(false);
    };
    getData();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles")
      .update({ full_name: fullName, username })
      .eq("id", user.id);
    setSaving(false);
    if (!error) {
      setProfile({ ...profile, full_name: fullName, username });
      setIsEditing(false);
      setMessage("Profile updated successfully!");
      setTimeout(() => setMessage(""), 3000);
    } else { setMessage("Failed to update: " + error.message); }
  };

  if (loading || !user || !profile) return (
    <div style={{ minHeight: '100vh', background: '#0d0010', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', color: 'rgba(196,181,253,0.55)', letterSpacing: '0.1em' }}>Loading profile...</p>
    </div>
  );

  const isAdmin = profile?.role === 'admin';
  const totalLikes = articles.reduce((s, a) => s + (a.counter || 0), 0);
  const totalComments = Object.values(articleStats).reduce((s, v) => s + (v.comments || 0), 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .profile-root {
          min-height: 100vh;
          background: #0d0010;
          font-family: 'DM Sans', sans-serif;
          position: relative;
        }

        .profile-root::before {
          content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background:
            radial-gradient(ellipse 700px 500px at 10% 0%, rgba(168,85,247,0.13) 0%, transparent 70%),
            radial-gradient(ellipse 500px 400px at 90% 100%, rgba(109,40,217,0.15) 0%, transparent 70%);
        }

        .grid-bg {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background-image:
            linear-gradient(rgba(168,85,247,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168,85,247,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
        }

        .page-inner {
          position: relative; z-index: 1;
          max-width: 780px; margin: 0 auto;
          padding: 0 20px 60px;
        }

        .navbar {
          display: flex; justify-content: space-between; align-items: center;
          padding: 28px 0 24px;
          border-bottom: 1px solid rgba(168,85,247,0.15);
          margin-bottom: 36px;
        }

        .back-btn {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 13px; font-weight: 400;
          color: rgba(196,181,253,0.6); text-decoration: none;
          transition: color 0.2s; letter-spacing: 0.02em;
        }
        .back-btn:hover { color: #d8b4fe; }

        .navbar-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 20px; font-weight: 600; color: #f3e8ff;
        }

        .admin-badge {
          font-size: 10px; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase;
          color: rgba(196,181,253,0.9);
          background: rgba(168,85,247,0.18); border: 1px solid rgba(168,85,247,0.3);
          padding: 3px 10px; border-radius: 20px;
        }

        .stats-bar {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
          margin-bottom: 28px;
        }

        .stat-card {
          background: rgba(20,0,30,0.65);
          border: 1px solid rgba(168,85,247,0.18);
          border-radius: 12px; padding: 18px 20px;
          text-align: center; backdrop-filter: blur(8px);
        }

        .stat-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 32px; font-weight: 700;
          color: #f3e8ff; line-height: 1; margin-bottom: 6px;
        }

        .stat-label {
          font-size: 11px; font-weight: 400; letter-spacing: 0.14em; text-transform: uppercase;
          color: rgba(196,181,253,0.45);
        }

        .profile-card {
          background: rgba(20,0,30,0.72);
          border: 1px solid rgba(168,85,247,0.22);
          border-radius: 16px; padding: 32px;
          margin-bottom: 36px;
          backdrop-filter: blur(12px);
          box-shadow: 0 8px 40px rgba(88,28,135,0.2);
          position: relative;
        }

        .profile-card::before {
          content: ''; position: absolute;
          top: 0; left: 20%; right: 20%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(216,180,254,0.6), transparent);
        }

        .info-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 0;
          border-bottom: 1px solid rgba(168,85,247,0.08);
        }
        .info-row:last-of-type { border-bottom: none; }

        .info-label {
          font-size: 11px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase;
          color: rgba(196,181,253,0.4);
        }

        .info-value { font-size: 14px; font-weight: 400; color: #f3e8ff; }

        .edit-btn {
          margin-top: 24px; padding: 10px 24px;
          background: rgba(168,85,247,0.14);
          border: 1px solid rgba(168,85,247,0.3);
          color: rgba(196,181,253,0.85);
          border-radius: 10px; font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 400;
          cursor: pointer; transition: background 0.2s, color 0.2s;
          letter-spacing: 0.04em;
        }
        .edit-btn:hover { background: rgba(168,85,247,0.28); color: #f3e8ff; }

        .field { margin-bottom: 16px; }

        .field-label {
          display: block; font-size: 11px; font-weight: 500;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: rgba(196,181,253,0.45); margin-bottom: 7px;
        }

        .field-input {
          width: 100%; padding: 10px 14px;
          background: rgba(88,28,135,0.15);
          border: 1px solid rgba(168,85,247,0.2);
          border-radius: 10px; color: #f3e8ff;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 300;
          outline: none; transition: border-color 0.2s, background 0.2s;
        }
        .field-input:focus { border-color: rgba(168,85,247,0.5); background: rgba(88,28,135,0.25); }
        .field-input.readonly { opacity: 0.5; cursor: pointer; }

        .btn-group { display: flex; gap: 10px; margin-top: 20px; }

        .btn-save {
          flex: 1; padding: 11px;
          background: linear-gradient(135deg, #9333ea, #7c3aed);
          border: none; border-radius: 10px; color: #fff;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
          cursor: pointer; transition: opacity 0.2s; letter-spacing: 0.06em;
        }
        .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

        .btn-cancel {
          padding: 11px 20px;
          background: rgba(168,85,247,0.08);
          border: 1px solid rgba(168,85,247,0.2);
          color: rgba(196,181,253,0.6); border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 400;
          cursor: pointer; transition: background 0.2s;
        }
        .btn-cancel:hover { background: rgba(168,85,247,0.18); color: #d8b4fe; }

        .status-msg {
          margin-top: 16px; font-size: 13px; text-align: center;
          color: #86efac; padding: 10px; border-radius: 8px;
          background: rgba(22,163,74,0.1); border: 1px solid rgba(22,163,74,0.18);
        }

        .section-header {
          display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
        }

        .section-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px; font-weight: 600; color: #f3e8ff;
        }

        .section-count { font-size: 12px; color: rgba(196,181,253,0.4); letter-spacing: 0.06em; }

        .article-grid { display: flex; flex-direction: column; gap: 14px; }

        .article-item {
          background: rgba(20,0,30,0.65);
          border: 1px solid rgba(168,85,247,0.15);
          border-radius: 12px; padding: 20px 22px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .article-item:hover {
          border-color: rgba(168,85,247,0.4);
          box-shadow: 0 4px 20px rgba(88,28,135,0.2);
        }

        .article-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px; font-weight: 600; color: #f3e8ff;
          margin-bottom: 8px; line-height: 1.3;
        }

        .article-preview {
          font-size: 13px; color: rgba(196,181,253,0.45);
          line-height: 1.6; margin-bottom: 12px;
        }

        .article-meta { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }

        .article-date { font-size: 12px; color: rgba(196,181,253,0.3); letter-spacing: 0.04em; }

        .article-stat {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 12px; color: rgba(196,181,253,0.4);
        }

        .empty-text {
          font-size: 14px; color: rgba(196,181,253,0.3);
          font-style: italic; padding: 32px 0; text-align: center;
        }
      `}</style>

      <div className="profile-root">
        <div className="grid-bg" />
        <div className="page-inner">

          <nav className="navbar">
            <Link href="/dashboard" className="back-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              Dashboard
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="navbar-title">My Profile</span>
              {isAdmin && <span className="admin-badge">Admin</span>}
            </div>
          </nav>

          {isAdmin && (
            <div className="stats-bar">
              <div className="stat-card">
                <div className="stat-num">{articles.length}</div>
                <div className="stat-label">Articles</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{totalLikes}</div>
                <div className="stat-label">Total Likes</div>
              </div>
              <div className="stat-card">
                <div className="stat-num">{totalComments}</div>
                <div className="stat-label">Total Comments</div>
              </div>
            </div>
          )}

          <div className="profile-card">
            {isEditing ? (
              <>
                <div className="field">
                  <label className="field-label">Username</label>
                  <input className="field-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
                </div>
                <div className="field">
                  <label className="field-label">Full Name</label>
                  <input className="field-input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
                </div>
                <div className="field">
                  <label className="field-label">Email (locked)</label>
                  <input
                    className="field-input readonly" value={profile.email} readOnly
                    onClick={() => alert('To change your email, please contact the admin.\n\n📧 Email: manaayjerica@gmail.com\n📞 Contact: 09686336110')}
                  />
                </div>

                <div className="btn-group">
                  <button className="btn-save" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                  <button className="btn-cancel" onClick={() => setIsEditing(false)}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="info-row"><span className="info-label">Username</span><span className="info-value">{profile.username || '—'}</span></div>
                <div className="info-row"><span className="info-label">Full Name</span><span className="info-value">{profile.full_name || '—'}</span></div>
                <div className="info-row"><span className="info-label">Email</span><span className="info-value">{profile.email}</span></div>

                <button className="edit-btn" onClick={() => setIsEditing(true)}>Edit Profile</button>
              </>
            )}
            {message && <p className="status-msg">{message}</p>}
          </div>

          <div className="section-header">
            <h2 className="section-title">My Articles</h2>
            <span className="section-count">{articles.length} {articles.length === 1 ? 'article' : 'articles'}</span>
          </div>

          {articles.length === 0 ? (
            <p className="empty-text">You haven&apos;t published any articles yet.</p>
          ) : (
            <div className="article-grid">
              {articles.map(article => (
                <div key={article.id} className="article-item">
                  <h3 className="article-title">{article.title}</h3>
                  <p className="article-preview">{article.content.substring(0, 120)}...</p>
                  <div className="article-meta">
                    <span className="article-date">{new Date(article.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    {isAdmin && articleStats[article.id] && (
                      <>
                        <span className="article-stat">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                          {articleStats[article.id].likes} likes
                        </span>
                        <span className="article-stat">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          {articleStats[article.id].comments} comments
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
}