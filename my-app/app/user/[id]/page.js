"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function UserProfile() {
  const params = useParams();
  const id = params?.id;
  const [profile, setProfile] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const getData = async () => {
      const { data: profileData, error } = await supabase.from("profiles").select("*").eq("id", id).single();
      if (error) console.error("Profile error:", error.message);
      if (profileData) setProfile(profileData);
      const { data: articleData } = await supabase
        .from("articles").select("*").eq("author_id", id).order("created_at", { ascending: false });
      if (articleData) setArticles(articleData);
      setLoading(false);
    };
    getData();
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0d0010', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', color: 'rgba(196,181,253,0.55)', letterSpacing: '0.1em' }}>Loading profile...</p>
    </div>
  );

  if (!profile) return (
    <div style={{ minHeight: '100vh', background: '#0d0010', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', color: 'rgba(248,113,113,0.6)', letterSpacing: '0.1em' }}>User not found.</p>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .page-root {
          min-height: 100vh;
          background: #0d0010;
          font-family: 'DM Sans', sans-serif;
          position: relative;
        }

        .page-root::before {
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

        /* ── PROFILE HEADER ── */
        .profile-card {
          background: rgba(20,0,30,0.72);
          border: 1px solid rgba(168,85,247,0.22);
          border-radius: 16px; padding: 36px;
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

        .profile-header {
          margin-bottom: 26px; padding-bottom: 24px;
          border-bottom: 1px solid rgba(168,85,247,0.1);
        }

        .display-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px; font-weight: 700; color: #f3e8ff;
          margin-bottom: 6px; line-height: 1.2;
        }

        .username-tag {
          font-size: 14px; font-weight: 400;
          color: rgba(168,85,247,0.7); letter-spacing: 0.04em;
        }

        .info-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 13px 0;
          border-bottom: 1px solid rgba(168,85,247,0.07);
        }

        .info-row:last-child { border-bottom: none; }

        .info-label {
          font-size: 11px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase;
          color: rgba(196,181,253,0.4);
        }

        .info-value { font-size: 14px; font-weight: 400; color: #f3e8ff; }

        /* ── ARTICLES ── */
        .section-header {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 20px;
        }

        .section-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px; font-weight: 600; color: #f3e8ff;
        }

        .section-count { font-size: 12px; color: rgba(196,181,253,0.4); }

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

        .article-date {
          font-size: 12px; color: rgba(196,181,253,0.3); letter-spacing: 0.04em;
        }

        .empty-text {
          font-size: 14px; color: rgba(196,181,253,0.3);
          font-style: italic; padding: 32px 0; text-align: center;
        }
      `}</style>

      <div className="page-root">
        <div className="grid-bg" />
        <div className="page-inner">

          <nav className="navbar">
            <Link href="/dashboard" className="back-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              Dashboard
            </Link>
          </nav>

          <div className="profile-card">
            <div className="profile-header">
              <h1 className="display-name">{profile.full_name || profile.username || 'Unknown User'}</h1>
              {profile.username && <p className="username-tag">@{profile.username}</p>}
            </div>
            <div className="info-row"><span className="info-label">Email</span><span className="info-value">{profile.email}</span></div>
            <div className="info-row"><span className="info-label">Age</span><span className="info-value">{profile.age || '—'}</span></div>
            <div className="info-row"><span className="info-label">Contact</span><span className="info-value">{profile.contact_number || '—'}</span></div>
          </div>

          <div className="section-header">
            <h2 className="section-title">Articles by {profile.full_name || profile.username}</h2>
            <span className="section-count">{articles.length}</span>
          </div>

          {articles.length === 0 ? (
            <p className="empty-text">No articles published yet.</p>
          ) : (
            <div className="article-grid">
              {articles.map(article => (
                <div key={article.id} className="article-item">
                  <h3 className="article-title">{article.title}</h3>
                  <p className="article-preview">{article.content.substring(0, 150)}...</p>
                  <span className="article-date">{new Date(article.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
}