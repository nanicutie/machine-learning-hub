"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkResetLink = async () => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      const type = params.get("type");
      if (type === "recovery" && access_token && refresh_token) {
        const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error || !data?.session) {
          setMessage("Invalid or expired reset link. Please request a new one.");
        }
      }
    };
    checkResetLink();
  }, []);

  const handleResetPassword = async () => {
    setMessage(""); setIsSuccess(false);
    if (password !== confirmPassword) { setMessage("Passwords do not match."); return; }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setMessage("Password must be 8+ characters with uppercase, lowercase, number, and symbol."); return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
    } else {
      setIsSuccess(true);
      setMessage("Password updated successfully! Redirecting...");
      setTimeout(() => router.push("/login"), 2500);
    }
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
          transition: transform 0.15s, box-shadow 0.15s;
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 28px rgba(147, 51, 234, 0.6), inset 0 1px 0 rgba(255,255,255,0.14);
        }

        .btn-primary:active { transform: translateY(0); }

        .message {
          margin-top: 14px; font-size: 12.5px; font-weight: 400;
          text-align: center; line-height: 1.5; min-height: 18px;
          padding: 10px 12px; border-radius: 8px;
        }

        .message.error { color: #fca5a5; background: rgba(220, 38, 38, 0.12); border: 1px solid rgba(220, 38, 38, 0.18); }
        .message.success { color: #86efac; background: rgba(22, 163, 74, 0.12); border: 1px solid rgba(22, 163, 74, 0.2); }

        .hint {
          margin-top: 10px; font-size: 11.5px;
          color: rgba(196, 181, 253, 0.35); text-align: center; line-height: 1.6;
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
          </div>

          <div className="card-header">
            <p className="eyebrow">Security</p>
            <h1 className="card-title">Reset Password</h1>
            <p className="card-subtitle">Choose a new password</p>
          </div>

          <div className="field-group">
            <label className="field-label">New Password</label>
            <input className="field-input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div className="field-group">
            <label className="field-label">Confirm Password</label>
            <input className="field-input" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()} />
          </div>

          <p className="hint">8+ characters · uppercase · lowercase · number · symbol</p>

          <button className="btn-primary" onClick={handleResetPassword}>Update Password</button>

          {message && <p className={`message ${isSuccess ? 'success' : 'error'}`}>{message}</p>}

          <div className="nav-divider">
            <a href="/login" className="nav-link-subtle">← Back to login</a>
          </div>

        </div>
      </div>
    </>
  );
}