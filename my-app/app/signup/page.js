"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";

export default function Signup() {
  const [role, setRole] = useState("user"); // "user" | "admin"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim() || !fullName.trim()) {
      setMessage("Please fill in all fields before signing up."); return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setMessage("Please enter a valid email address."); return; }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setMessage("Password must be at least 8 characters with uppercase, lowercase, number, and symbol."); return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage(error.message);
    } else {
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert([{
          id: data.user.id, email, full_name: fullName, role
        }]);
        if (profileError) {
          setMessage("Signup successful but profile save failed: " + profileError.message);
        } else {
          setMessage("Sign up successful! Check your email for confirmation.");
        }
      } else {
        setMessage("Sign up successful! Check your email for confirmation.");
      }
    }
  };

  const switchRole = (newRole) => {
    setRole(newRole);
    setMessage("");
  };

  const isSuccess = message.includes('successful');

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
          background-size: 40px 40px;
          pointer-events: none;
        }

        .card {
          position: relative; z-index: 10;
          width: 100%; max-width: 400px; margin: 24px;
          background: rgba(20, 0, 30, 0.72);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border-radius: 20px; padding: 44px 40px 38px;
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

        .toggle-wrap {
          display: flex; gap: 6px;
          background: rgba(88, 28, 135, 0.18);
          border: 1px solid rgba(168, 85, 247, 0.18);
          border-radius: 12px; padding: 4px;
          margin-bottom: 28px;
        }

        .toggle-btn {
          flex: 1; padding: 9px 0;
          border: none; border-radius: 9px;
          font-family: 'Inter', sans-serif;
          font-size: 12px; font-weight: 500;
          letter-spacing: 0.1em; text-transform: uppercase;
          cursor: pointer; transition: all 0.25s ease;
          display: flex; align-items: center; justify-content: center; gap: 7px;
        }

        .toggle-btn.inactive {
          background: transparent;
          color: rgba(196, 181, 253, 0.4);
        }

        .toggle-btn.inactive:hover {
          color: rgba(196, 181, 253, 0.65);
          background: rgba(168, 85, 247, 0.06);
        }

        .toggle-btn.active {
          background: linear-gradient(135deg, rgba(147, 51, 234, 0.55), rgba(124, 58, 237, 0.55));
          color: #f3e8ff;
          box-shadow: 0 0 14px rgba(147, 51, 234, 0.3), inset 0 1px 0 rgba(255,255,255,0.08);
        }

        .toggle-btn.active.admin-tab {
          background: linear-gradient(135deg, rgba(180, 83, 9, 0.6), rgba(217, 119, 6, 0.6));
          box-shadow: 0 0 14px rgba(217, 119, 6, 0.25), inset 0 1px 0 rgba(255,255,255,0.08);
        }

        .icon-wrap { display: flex; justify-content: center; margin-bottom: 20px; }

        .icon-box {
          width: 52px; height: 52px; border-radius: 14px;
          background: rgba(168, 85, 247, 0.18);
          border: 1px solid rgba(168, 85, 247, 0.35);
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.2);
          display: flex; align-items: center; justify-content: center;
          transition: all 0.3s ease;
        }

        .card-header { text-align: center; margin-bottom: 26px; }

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
          transition: transform 0.15s, box-shadow 0.15s;
        }

        .btn-primary.admin-btn {
          background: linear-gradient(135deg, #b45309, #d97706);
          box-shadow: 0 4px 20px rgba(217, 119, 6, 0.4), inset 0 1px 0 rgba(255,255,255,0.1);
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 28px rgba(147, 51, 234, 0.6), inset 0 1px 0 rgba(255,255,255,0.14);
        }

        .btn-primary.admin-btn:hover {
          box-shadow: 0 6px 28px rgba(217, 119, 6, 0.55), inset 0 1px 0 rgba(255,255,255,0.14);
        }

        .btn-primary:active { transform: translateY(0); }

        .message {
          margin-top: 14px; font-size: 12.5px; font-weight: 400;
          text-align: center; line-height: 1.5; min-height: 18px;
          padding: 10px 12px; border-radius: 8px;
        }

        .message.error { color: #fca5a5; background: rgba(220, 38, 38, 0.12); border: 1px solid rgba(220, 38, 38, 0.18); }
        .message.success { color: #86efac; background: rgba(22, 163, 74, 0.12); border: 1px solid rgba(22, 163, 74, 0.2); }

        .nav-divider {
          margin-top: 28px; padding-top: 22px;
          border-top: 1px solid rgba(168, 85, 247, 0.1);
          display: flex; flex-direction: column; align-items: center; gap: 10px;
        }

        .nav-text { font-size: 13px; color: rgba(196, 181, 253, 0.4); }

        .nav-link {
          font-size: 13px; font-weight: 500;
          color: rgba(196, 181, 253, 0.65); text-decoration: none;
          transition: color 0.2s;
        }
        .nav-link:hover { color: #d8b4fe; }

        .nav-link-subtle {
          font-size: 12px; color: rgba(196, 181, 253, 0.35); text-decoration: none;
          transition: color 0.2s; letter-spacing: 0.04em;
        }
        .nav-link-subtle:hover { color: rgba(196, 181, 253, 0.65); }
      `}</style>

      <div className="page-root">
        <div className="grid-overlay" />
        <div className="card">

          {/* ── Role Toggle ── */}
          <div className="toggle-wrap">
            <button
              className={`toggle-btn ${role === "user" ? "active" : "inactive"}`}
              onClick={() => switchRole("user")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              User
            </button>
            <button
              className={`toggle-btn ${role === "admin" ? "active admin-tab" : "inactive"}`}
              onClick={() => switchRole("admin")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              Admin
            </button>
          </div>

          {/* ── Icon ── */}
          <div className="icon-wrap">
            <div className="icon-box">
              {role === "user" ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="rgba(216,180,254,0.9)" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="rgba(251,191,36,0.9)" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              )}
            </div>
          </div>

          {/* ── Header ── */}
          <div className="card-header">
            <p className="eyebrow">Create account</p>
            <h1 className="card-title">Sign Up</h1>
            <p className="card-subtitle">
              {role === "admin" ? "Admin — The Article Library" : "Join The Article Library"}
            </p>
          </div>

          {/* ── Fields ── */}
          <div className="field-group">
            <label className="field-label">Email</label>
            <input className="field-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="field-group">
            <label className="field-label">Password</label>
            <input className="field-input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div className="field-group">
            <label className="field-label">Full Name</label>
            <input className="field-input" type="text" placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSignUp()} />
          </div>

          <button
            className={`btn-primary ${role === "admin" ? "admin-btn" : ""}`}
            onClick={handleSignUp}
          >
            {role === "admin" ? "Create Admin Account" : "Create Account"}
          </button>

          {message && <p className={`message ${isSuccess ? 'success' : 'error'}`}>{message}</p>}

          {/* ── Nav ── */}
          <div className="nav-divider">
            <p className="nav-text">
              Already have an account?{' '}
              <Link href="/login" className="nav-link">Login</Link>
            </p>
            <Link href="/" className="nav-link-subtle">← Back to home</Link>
          </div>

        </div>
    </div>
    </>
  );
}