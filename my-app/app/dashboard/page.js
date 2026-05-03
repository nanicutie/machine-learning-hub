"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import ArticleCard from "../../components/ArticleCard";
import Link from "next/link";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [fullName, setFullName] = useState("");
  const [articles, setArticles] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const currentUser = session.user;
      setUser(currentUser);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", currentUser.id)
        .single();
      setUserRole(profile?.role || "user");
      setFullName(profile?.full_name || currentUser.email);

      const { data, error } = await supabase
        .from("articles")
        .select(`*, profiles(username, full_name)`)
        .order("created_at", { ascending: false });
      if (!error) setArticles(data || []);

      // Fetch notifications for this user
      const { data: notifData } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (notifData) {
        setNotifications(notifData);
        setUnreadCount(notifData.filter(n => !n.is_read).length);
      }
    };
    getData();
  }, [router]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleArticleDeleted = (deletedId) => {
    setArticles((prev) => prev.filter((a) => a.id !== deletedId));
  };

  const handlePublish = async () => {
    if (!newTitle.trim() || !newContent.trim()) { alert("Please fill in both title and content."); return; }
    setPublishing(true);
    let file_url = null, file_name = null, file_type = null;

    if (selectedFile) {
      setUploading(true);
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('articles-image').upload(fileName, selectedFile);
      setUploading(false);
      if (uploadError) { alert('File upload failed: ' + uploadError.message); setPublishing(false); return; }
      const { data: urlData } = supabase.storage.from('articles-image').getPublicUrl(fileName);
      file_url = urlData.publicUrl;
      file_name = selectedFile.name;
      file_type = selectedFile.type;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("articles")
      .insert([{ title: newTitle, content: newContent, author_id: user.id, counter: 0, file_url, file_name, file_type }])
      .select("id")
      .single();

    if (insertError) {
      alert("Failed to publish: " + insertError.message);
      setPublishing(false);
      return;
    }

    const { data: fullArticle } = await supabase
      .from("articles")
      .select(`*, profiles(username, full_name)`)
      .eq("id", inserted.id)
      .single();

    setPublishing(false);

    const articleToAdd = fullArticle || {
      id: inserted.id,
      title: newTitle,
      content: newContent,
      author_id: user.id,
      counter: 0,
      file_url,
      file_name,
      file_type,
      created_at: new Date().toISOString(),
      profiles: null,
    };

    setArticles((prev) => [articleToAdd, ...prev]);
    setNewTitle("");
    setNewContent("");
    setSelectedFile(null);
    setShowForm(false);
  };

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#0d0010', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', color: 'rgba(196,181,253,0.6)', letterSpacing: '0.1em' }}>Loading...</div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .dash-root { min-height: 100vh; background: #0d0010; font-family: 'DM Sans', sans-serif; position: relative; }
        .dash-root::before {
          content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background: radial-gradient(ellipse 700px 500px at 10% 0%, rgba(168,85,247,0.13) 0%, transparent 70%),
            radial-gradient(ellipse 500px 400px at 90% 100%, rgba(109,40,217,0.15) 0%, transparent 70%);
        }
        .grid-bg {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background-image: linear-gradient(rgba(168,85,247,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        .dash-inner { position: relative; z-index: 1; max-width: 780px; margin: 0 auto; padding: 0 20px 60px; }
        .navbar { display: flex; justify-content: space-between; align-items: center; padding: 28px 0 24px; border-bottom: 1px solid rgba(168,85,247,0.15); margin-bottom: 36px; }
        .brand { display: flex; align-items: baseline; gap: 10px; }
        .brand-title { font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 700; color: #f3e8ff; letter-spacing: 0.02em; line-height: 1; }
        .brand-title em { font-style: italic; color: rgba(196,181,253,0.7); font-size: 22px; }
        .admin-badge { font-size: 10px; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(196,181,253,0.9); background: rgba(168,85,247,0.18); border: 1px solid rgba(168,85,247,0.3); padding: 3px 10px; border-radius: 20px; }
        .nav-right { display: flex; align-items: center; gap: 12px; }
        .nav-welcome { font-size: 13px; font-weight: 400; color: rgba(196,181,253,0.65); }
        .nav-profile-btn { display: inline-flex; align-items: center; gap: 7px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: rgba(196,181,253,0.8); text-decoration: none; padding: 7px 14px; border: 1px solid rgba(168,85,247,0.25); border-radius: 8px; background: rgba(168,85,247,0.08); transition: all 0.2s; }
        .nav-profile-btn:hover { background: rgba(168,85,247,0.18); border-color: rgba(168,85,247,0.5); color: #d8b4fe; }
        .nav-logout-btn { font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 400; color: rgba(196,181,253,0.4); background: none; border: none; cursor: pointer; padding: 7px 10px; border-radius: 8px; transition: color 0.2s; letter-spacing: 0.02em; }
        .nav-logout-btn:hover { color: rgba(196,181,253,0.75); }

        /* NOTIFICATION BELL */
        .notif-wrapper { position: relative; }
        .notif-bell-btn { background: rgba(168,85,247,0.08); border: 1px solid rgba(168,85,247,0.25); border-radius: 8px; padding: 7px 10px; cursor: pointer; color: rgba(196,181,253,0.8); font-size: 16px; position: relative; transition: all 0.2s; display: flex; align-items: center; }
        .notif-bell-btn:hover { background: rgba(168,85,247,0.18); border-color: rgba(168,85,247,0.5); }
        .notif-badge { position: absolute; top: -6px; right: -6px; background: #9333ea; color: #fff; font-size: 10px; font-weight: 700; border-radius: 999px; min-width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; padding: 0 4px; }
        .notif-dropdown { position: absolute; right: 0; top: calc(100% + 8px); width: 320px; background: rgba(15,0,25,0.97); border: 1px solid rgba(168,85,247,0.25); border-radius: 14px; box-shadow: 0 12px 40px rgba(88,28,135,0.4); z-index: 100; overflow: hidden; }
        .notif-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid rgba(168,85,247,0.12); }
        .notif-header-title { font-size: 13px; font-weight: 500; color: #f3e8ff; letter-spacing: 0.05em; }
        .notif-mark-btn { font-size: 11px; color: rgba(168,85,247,0.8); background: none; border: none; cursor: pointer; }
        .notif-mark-btn:hover { color: #c084fc; }
        .notif-list { max-height: 320px; overflow-y: auto; }
        .notif-item { padding: 12px 16px; border-bottom: 1px solid rgba(168,85,247,0.06); transition: background 0.15s; }
        .notif-item:hover { background: rgba(168,85,247,0.07); }
        .notif-item.unread { background: rgba(168,85,247,0.09); }
        .notif-text { font-size: 13px; color: rgba(196,181,253,0.85); line-height: 1.5; }
        .notif-time { font-size: 11px; color: rgba(196,181,253,0.35); margin-top: 4px; }
        .notif-empty { padding: 24px 16px; text-align: center; font-size: 13px; color: rgba(196,181,253,0.35); font-style: italic; }

        .action-bar { margin-bottom: 24px; display: flex; justify-content: flex-end; }
        .publish-toggle-btn { display: inline-flex; align-items: center; gap: 8px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; letter-spacing: 0.08em; color: #fff; background: linear-gradient(135deg, #9333ea, #7c3aed); border: none; border-radius: 10px; padding: 10px 20px; cursor: pointer; box-shadow: 0 4px 20px rgba(147,51,234,0.4), inset 0 1px 0 rgba(255,255,255,0.1); transition: transform 0.15s, box-shadow 0.15s; }
        .publish-toggle-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 28px rgba(147,51,234,0.55); }
        .publish-toggle-btn.cancel { background: rgba(168,85,247,0.12); border: 1px solid rgba(168,85,247,0.25); color: rgba(196,181,253,0.7); box-shadow: none; }
        .publish-form { background: rgba(20,0,30,0.7); border: 1px solid rgba(168,85,247,0.22); border-radius: 16px; padding: 28px; margin-bottom: 36px; backdrop-filter: blur(12px); box-shadow: 0 8px 40px rgba(88,28,135,0.25); display: flex; flex-direction: column; gap: 14px; }
        .form-label { font-size: 11px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(196,181,253,0.55); margin-bottom: 6px; display: block; }
        .form-input, .form-textarea { width: 100%; padding: 11px 15px; background: rgba(88,28,135,0.15); border: 1px solid rgba(168,85,247,0.2); border-radius: 10px; color: #f3e8ff; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 300; outline: none; transition: border-color 0.2s, background 0.2s; resize: vertical; }
        .form-input::placeholder, .form-textarea::placeholder { color: rgba(196,181,253,0.28); }
        .form-input:focus, .form-textarea:focus { border-color: rgba(168,85,247,0.55); background: rgba(88,28,135,0.25); box-shadow: 0 0 0 3px rgba(168,85,247,0.1); }
        .file-zone { border: 1px dashed rgba(168,85,247,0.3); border-radius: 10px; padding: 16px; text-align: center; background: rgba(88,28,135,0.08); cursor: pointer; transition: border-color 0.2s; }
        .file-zone:hover { border-color: rgba(168,85,247,0.55); }
        .file-zone-label { font-size: 13px; color: rgba(196,181,253,0.55); cursor: pointer; }
        .file-zone-label span { color: #c084fc; }
        .remove-file-btn { margin-left: 10px; background: none; border: none; color: rgba(248,113,113,0.7); cursor: pointer; font-size: 12px; }
        .submit-btn { width: 100%; padding: 12px; background: linear-gradient(135deg, #9333ea, #7c3aed); color: #fff; border: none; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; box-shadow: 0 4px 20px rgba(147,51,234,0.4); transition: transform 0.15s, box-shadow 0.15s; }
        .submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 28px rgba(147,51,234,0.55); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .feed-header-row { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; }
        .feed-title { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 600; color: #f3e8ff; }
        .feed-count { font-size: 12px; font-weight: 400; letter-spacing: 0.08em; color: rgba(196,181,253,0.4); }
        .feed { display: flex; flex-direction: column; gap: 0; }
        .empty-feed { font-size: 14px; color: rgba(196,181,253,0.35); font-style: italic; text-align: center; padding: 48px 0; }
      `}</style>

      <div className="dash-root">
        <div className="grid-bg" />
        <div className="dash-inner">

          <nav className="navbar">
            <div className="brand">
              <span className="brand-title">The Article <em>Library</em></span>
              {userRole === "admin" && <span className="admin-badge">Admin</span>}
            </div>
            <div className="nav-right">
              {/* Show full name instead of email */}
              <span className="nav-welcome">Welcome, {fullName}</span>

              {/* Notification Bell */}
              <div className="notif-wrapper">
                <button className="notif-bell-btn" onClick={() => { setShowNotifs(p => !p); if (!showNotifs && unreadCount > 0) markAllRead(); }}>
                  🔔
                  {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
                </button>
                {showNotifs && (
                  <div className="notif-dropdown">
                    <div className="notif-header">
                      <span className="notif-header-title">Notifications</span>
                      {notifications.some(n => !n.is_read) && (
                        <button className="notif-mark-btn" onClick={markAllRead}>Mark all read</button>
                      )}
                    </div>
                    <div className="notif-list">
                      {notifications.length === 0 ? (
                        <div className="notif-empty">No notifications yet</div>
                      ) : notifications.map(n => (
                        <div key={n.id} className={`notif-item${!n.is_read ? ' unread' : ''}`}>
                          <p className="notif-text">{n.message}</p>
                          <p className="notif-time">{new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Link href="/profile" className="nav-profile-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                Profile
              </Link>
              <button className="nav-logout-btn" onClick={handleLogout}>Sign out</button>
            </div>
          </nav>

          <div className="action-bar">
            <button className={`publish-toggle-btn ${showForm ? 'cancel' : ''}`} onClick={() => setShowForm(!showForm)}>
              {showForm ? (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>Cancel</>
              ) : (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>Publish Article</>
              )}
            </button>
          </div>

          {showForm && (
            <div className="publish-form">
              <div>
                <label className="form-label">Title</label>
                <input type="text" className="form-input" placeholder="Give your article a title..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Content</label>
                <textarea className="form-textarea" placeholder="Write your article here..." value={newContent} onChange={(e) => setNewContent(e.target.value)} rows={6} />
              </div>
              <div className="file-zone">
                <input type="file" id="file-upload" accept="image/*,.pdf,.doc,.docx" style={{ display: 'none' }} onChange={(e) => setSelectedFile(e.target.files[0])} />
                <label htmlFor="file-upload" className="file-zone-label">
                  <span>Attach a file</span> — image or document
                  {selectedFile && (<>{' · '}{selectedFile.name}<button onClick={(e) => { e.preventDefault(); setSelectedFile(null); }} className="remove-file-btn">✕ remove</button></>)}
                </label>
              </div>
              <button className="submit-btn" onClick={handlePublish} disabled={publishing || uploading}>
                {uploading ? 'Uploading...' : publishing ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          )}

          <div className="feed-header-row">
            <h2 className="feed-title">Latest Articles</h2>
            <span className="feed-count">{articles.length} {articles.length === 1 ? 'article' : 'articles'}</span>
          </div>

          <div className="feed">
            {articles.length > 0 ? (
              articles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  currentUserId={user.id}
                  currentUserRole={userRole}
                  onDeleted={handleArticleDeleted}
                />
              ))
            ) : (
              <p className="empty-feed">No articles published yet.</p>
            )}
          </div>

        </div>
      </div>
    </>
  );
}