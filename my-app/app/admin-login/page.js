"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setMessage(error.message); setLoading(false); return; }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
    if (profile?.role !== 'admin') {
      await supabase.auth.signOut();
      setMessage('Access denied. Admins only.');
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .page-root {
          min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          background: #0d0010;
          position: relative; overflow: hidden;
          font-family: 'Inter', sans-serif;
        }

        .page-root::before {
          content: ''; position: absolute;
          width: 600px; height: 600px; border-radius: 50%;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, transparent 70%);
          top: -100px; left: -150px;
          animation: orbFloat 8s ease-in-out infinite;
        }

        .page-root::after {
          content: ''; position: absolute;
          width: 500px; height: 500px; border-radius: 50%;
          background: radial-gradient(circle, rgba(109, 40, 217, 0.2) 0%, transparent 70%);
          bottom: -80px; right: -100px;
          animation: orbFloat 10s ease-in-out infinite reverse;
        }

        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, 20px) scale(1.05); }
        }

        .grid-overlay {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(168, 85, 247, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168, 85, 247, 0.04) 1px, transparent 1px);
          background-size: 40px 40px; pointer-events: none;
        }

        .card {
          position: relative; z-index: 10;
          width: 100%; max-width: 400px; margin: 24px;
          background: rgba(20, 0, 30, 0.72);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border-radius: 20px; padding: 48px 40px 40px;
          border: 1px solid rgba(168, 85, 247, 0.25);
          box-shadow:
            0 0 0 1px rgba(168, 85, 247, 0.1),
            0 8px 32px rgba(109, 40, 217, 0.3),
            0 24px 64px rgba(88, 28, 135, 0.4),
            0 0 80px rgba(168, 85, 247, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          animation: cardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .card::before {
          content: ''; position: absolute;
          top: 0; left: 20%; right: 20%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(216, 180, 254, 0.8), transparent);
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .icon-wrap { display: flex; justify-content: center; margin-bottom: 22px; }

        .icon-box {
          width: 52px; height: 52px; border-radius: 14px;
          background: rgba(168, 85, 247, 0.18);
          border: 1px solid rgba(168, 85, 247, 0.35);
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.2);
          display: flex; align-items: center; justify-content: center;
        }

        .card-header { text-align: center; margin-bottom: 32px; }

        .eyebrow {
          font-size: 11px; font-weight: 500; letter-spacing: 0.2em;
          text-transform: uppercase; color: rgba(196, 181, 253, 0.55); margin-bottom: 8px;
        }

        .card-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px; font-weight: 600; color: #f3e8ff;
          line-height: 1.15; margin-bottom: 6px;
        }

        .card-subtitle {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic; font-size: 15px; color: rgba(196, 181, 253, 0.55);
        }

        .field-group { margin-bottom: 14px; }

        .field-label {
          display: block; font-size: 11px; font-weight: 500;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: rgba(196, 181, 253, 0.65); margin-bottom: 7px;
        }

        .field-input {
          width: 100%; padding: 11px 15px;
          background: rgba(88, 28, 135, 0.15);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 10px; color: #f3e8ff;
          font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 300;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }

        .field-input::placeholder { color: rgba(196, 181, 253, 0.28); }

        .field-input:focus {
          border-color: rgba(168, 85, 247, 0.55);
          background: rgba(88, 28, 135, 0.25);
          box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1);
        }

        .btn-primary {
          width: 100%; padding: 12px; margin-top: 6px;
          border: none; border-radius: 10px;
          background: linear-gradient(135deg, #9333ea, #7c3aed);
          color: #fff; font-family: 'Inter', sans-serif;
          font-size: 13px; font-weight: 500;
          letter-spacing: 0.12em; text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(147, 51, 234, 0.45), inset 0 1px 0 rgba(255,255,255,0.1);
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 28px rgba(147, 51, 234, 0.6), inset 0 1px 0 rgba(255,255,255,0.14);
        }

        .btn-primary:active:not(:disabled) { transform: translateY(0); }

        .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

        .spinner {
          display: inline-block; width: 13px; height: 13px;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
          border-radius: 50%; animation: spin 0.7s linear infinite;
          vertical-align: middle; margin-right: 8px;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .message {
          margin-top: 14px; font-size: 12.5px;
          color: #f87171; text-align: center; min-height: 18px;
        }

        .access-badge {
          display: inline-flex; align-items: center; gap: 6px;
          margin-top: 10px;
          padding: 5px 12px; border-radius: 20px;
          background: rgba(168, 85, 247, 0.1);
          border: 1px solid rgba(168, 85, 247, 0.18);
          font-size: 11px; font-weight: 500; letter-spacing: 0.1em;
          color: rgba(196, 181, 253, 0.5); text-transform: uppercase;
        }

        .badge-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: rgba(196, 181, 253, 0.4);
        }

        .nav-divider {
          margin-top: 28px; padding-top: 22px;
          border-top: 1px solid rgba(168, 85, 247, 0.1);
          display: flex; justify-content: center;
        }

        .nav-link-subtle {
          font-size: 12px; color: rgba(196, 181, 253, 0.35); text-decoration: none;
          transition: color 0.2s; letter-spacing: 0.04em;
        }
        .nav-link-subtle:hover { color: rgba(196, 181, 253, 0.65); }
      `}</style>

      <div className="page-root">
        <div className="grid-overlay" />
        <div className="card">

          <div className="icon-wrap">
            <div className="icon-box">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="rgba(216,180,254,0.9)" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
          </div>

          <div className="card-header">
            <p className="eyebrow">Restricted access</p>
            <h1 className="card-title">Admin Portal</h1>
            <p className="card-subtitle">The Article Library</p>
          </div>

          <div className="field-group">
            <label className="field-label">Email</label>
            <input className="field-input" type="email" placeholder="admin@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="field-group">
            <label className="field-label">Password</label>
            <input className="field-input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !loading && handleLogin()} />
          </div>

          <button className="btn-primary" onClick={handleLogin} disabled={loading}>
            {loading && <span className="spinner" />}
            {loading ? "Verifying..." : "Sign In"}
          </button>

          {message && <p className="message">{message}</p>}

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span className="access-badge">
              <span className="badge-dot" />
              Authorized personnel only
            </span>
          </div>

          <div className="nav-divider">
            <Link href="/" className="nav-link-subtle">← Back to home</Link>
          </div>

        </div>
      </div>
    </>
  );
}