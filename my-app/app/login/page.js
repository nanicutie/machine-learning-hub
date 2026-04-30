"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setMessage(error.message); return; }
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', data.user.id).single();
    if (profile?.role === 'admin') {
      await supabase.auth.signOut();
      setMessage('You are an admin. Please use the Admin Login page.');
      return;
    }
    router.push("/dashboard");
  };

  const handleForgotPassword = async () => {
    if (!email) { setMessage("Please enter your email address first."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { setMessage(error.message); }
    else { setMessage("Password reset email sent! Check your email."); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .page-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0d0010;
          position: relative;
          overflow: hidden;
          font-family: 'Inter', sans-serif;
        }

        .page-root::before {
          content: '';
          position: absolute;
          width: 600px; height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, transparent 70%);
          top: -100px; left: -150px;
          animation: orbFloat 8s ease-in-out infinite;
        }

        .page-root::after {
          content: '';
          position: absolute;
          width: 500px; height: 500px;
          border-radius: 50%;
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
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 400px;
          margin: 24px;
          background: rgba(20, 0, 30, 0.72);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 48px 40px 40px;
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
          content: '';
          position: absolute;
          top: 0; left: 20%; right: 20%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(216, 180, 254, 0.8), transparent);
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .icon-wrap {
          display: flex; justify-content: center; margin-bottom: 22px;
        }

        .icon-box {
          width: 52px; height: 52px;
          border-radius: 14px;
          background: rgba(168, 85, 247, 0.18);
          border: 1px solid rgba(168, 85, 247, 0.35);
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.2);
          display: flex; align-items: center; justify-content: center;
        }

        .card-header { text-align: center; margin-bottom: 32px; }

        .eyebrow {
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(196, 181, 253, 0.55);
          margin-bottom: 8px;
        }

        .card-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 28px;
          font-weight: 600;
          color: #f3e8ff;
          line-height: 1.15;
          margin-bottom: 6px;
        }

        .card-subtitle {
          font-family: 'Cormorant Garamond', serif;
          font-style: italic;
          font-size: 15px;
          color: rgba(196, 181, 253, 0.55);
        }

        .field-group { margin-bottom: 14px; }

        .field-label {
          display: block;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(196, 181, 253, 0.65);
          margin-bottom: 7px;
        }

        .field-input {
          width: 100%;
          padding: 11px 15px;
          background: rgba(88, 28, 135, 0.15);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 10px;
          color: #f3e8ff;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 300;
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
          width: 100%;
          padding: 12px;
          margin-top: 6px;
          border: none;
          border-radius: 10px;
          background: linear-gradient(135deg, #9333ea, #7c3aed);
          color: #fff;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(147, 51, 234, 0.45), inset 0 1px 0 rgba(255,255,255,0.1);
          transition: transform 0.15s, box-shadow 0.15s;
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 28px rgba(147, 51, 234, 0.6), inset 0 1px 0 rgba(255,255,255,0.14);
        }

        .btn-primary:active { transform: translateY(0); }

        .btn-ghost {
          width: 100%;
          padding: 11px;
          margin-top: 8px;
          border: 1px solid rgba(168, 85, 247, 0.22);
          border-radius: 10px;
          background: transparent;
          color: rgba(196, 181, 253, 0.75);
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 400;
          letter-spacing: 0.06em;
          cursor: pointer;
          transition: background 0.2s, color 0.2s, border-color 0.2s;
        }

        .btn-ghost:hover {
          background: rgba(168, 85, 247, 0.1);
          color: #d8b4fe;
          border-color: rgba(168, 85, 247, 0.4);
        }

        .message {
          margin-top: 14px;
          font-size: 12.5px;
          font-weight: 400;
          color: #f87171;
          text-align: center;
          line-height: 1.5;
          min-height: 18px;
        }

        .nav-divider {
          margin-top: 28px;
          padding-top: 22px;
          border-top: 1px solid rgba(168, 85, 247, 0.1);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .nav-text {
          font-size: 13px;
          color: rgba(196, 181, 253, 0.4);
        }

        .nav-link {
          font-size: 13px;
          font-weight: 500;
          color: rgba(196, 181, 253, 0.65);
          text-decoration: none;
          transition: color 0.2s;
        }

        .nav-link:hover { color: #d8b4fe; }

        .nav-link-subtle {
          font-size: 12px;
          color: rgba(196, 181, 253, 0.35);
          text-decoration: none;
          transition: color 0.2s;
          letter-spacing: 0.04em;
        }

        .nav-link-subtle:hover { color: rgba(196, 181, 253, 0.65); }
      `}</style>

      <div className="page-root">
        <div className="grid-overlay" />
        <div className="card">

          <div className="icon-wrap">
            <div className="icon-box">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="rgba(216,180,254,0.9)" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
          </div>

          <div className="card-header">
            <p className="eyebrow">Welcome back</p>
            <h1 className="card-title">Sign In</h1>
            <p className="card-subtitle">The Article Library</p>
          </div>

          <div className="field-group">
            <label className="field-label">Email</label>
            <input className="field-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
          </div>

          <div className="field-group">
            <label className="field-label">Password</label>
            <input className="field-input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
          </div>

          <button className="btn-primary" onClick={handleLogin}>Login</button>
          <button className="btn-ghost" onClick={handleForgotPassword}>Forgot password?</button>

          {message && <p className="message">{message}</p>}

          <div className="nav-divider">
            <p className="nav-text">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="nav-link">Sign up</Link>
            </p>
            <Link href="/" className="nav-link-subtle">← Back to home</Link>
          </div>

        </div>
      </div>
    </>
  );
}