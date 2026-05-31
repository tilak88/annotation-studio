'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        window.location.href = '/dashboard';
      } else {
        setChecking(false);
      }
    });
  }, []);

  async function signInWithGoogle() {
    setSigningIn(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/callback',
      },
    });
  }

  if (checking) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#0f1117',color:'#e2e8f8',fontFamily:'monospace',fontSize:'13px',letterSpacing:'2px'}}>
      LOADING...
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#0f1117;--surface:#181c27;--surface2:#1e2335;--border:#2a3050;--accent:#4f8ef7;--accent2:#7c5fe6;--green:#3ecf6e;--text:#e2e8f8;--text-dim:#7a8aaa;--mono:'IBM Plex Mono',monospace;--sans:'IBM Plex Sans',sans-serif;}
        body{font-family:var(--sans);background:var(--bg);color:var(--text);min-height:100vh;}
        .landing{min-height:100vh;display:flex;flex-direction:column;background:radial-gradient(ellipse at 50% 0%,#1a1f3a 0%,var(--bg) 60%)}
        nav{display:flex;align-items:center;justify-content:space-between;padding:20px 40px;border-bottom:1px solid var(--border)}
        .nav-brand{font-family:var(--mono);font-size:12px;letter-spacing:3px;text-transform:uppercase;color:var(--accent)}
        .hero{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;text-align:center}
        .hero-tag{font-family:var(--mono);font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--accent);margin-bottom:24px;opacity:.8}
        .hero-title{font-size:clamp(32px,6vw,56px);font-weight:700;letter-spacing:-.5px;margin-bottom:20px;background:linear-gradient(135deg,#e2e8f8 30%,#4f8ef7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1.15}
        .hero-sub{font-size:17px;color:var(--text-dim);max-width:520px;line-height:1.7;margin-bottom:48px}
        .btn-google{display:flex;align-items:center;gap:12px;padding:14px 28px;background:white;color:#1a1a1a;border:none;border-radius:10px;font-family:var(--sans);font-size:15px;font-weight:600;cursor:pointer;transition:transform .15s,box-shadow .15s;box-shadow:0 2px 12px rgba(0,0,0,.3)}
        .btn-google:hover{transform:translateY(-2px);box-shadow:0 4px 20px rgba(0,0,0,.4)}
        .btn-google:disabled{opacity:.6;cursor:not-allowed;transform:none}
        .btn-google svg{width:20px;height:20px;flex-shrink:0}
        .features{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;max-width:800px;width:100%;margin-top:72px}
        .feature{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px 22px;text-align:left}
        .feature-icon{font-size:20px;margin-bottom:10px}
        .feature-title{font-size:13px;font-weight:600;color:var(--text);margin-bottom:5px}
        .feature-desc{font-size:12px;color:var(--text-dim);line-height:1.6}
        .privacy-note{margin-top:20px;font-size:12px;color:var(--text-dim);display:flex;align-items:center;gap:6px}
        footer{padding:20px 40px;border-top:1px solid var(--border);text-align:center;font-size:12px;color:var(--text-dim)}
      `}</style>

      <div className="landing">
        <nav>
          <div className="nav-brand">Annotation Studio</div>
          <button className="btn-google" onClick={signInWithGoogle} disabled={signingIn} style={{padding:'8px 18px',fontSize:'13px'}}>
            <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            {signingIn ? 'Signing in...' : 'Sign in with Google'}
          </button>
        </nav>

        <div className="hero">
          <div className="hero-tag">Built by a researcher, for researchers</div>
          <h1 className="hero-title">Annotation without<br/>the frustration</h1>
          <p className="hero-sub">Upload your Excel sheet, render LaTeX and Markdown beautifully, score with one click. No more jumping between cells.</p>

          <button className="btn-google" onClick={signInWithGoogle} disabled={signingIn}>
            <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            {signingIn ? 'Signing in...' : 'Get started free — Sign in with Google'}
          </button>

          <div className="privacy-note">
            🔒 Your research data never leaves your browser. We only store your scores.
          </div>

          <div className="features">
            <div className="feature">
              <div className="feature-icon">📐</div>
              <div className="feature-title">LaTeX & Markdown rendering</div>
              <div className="feature-desc">Equations and formatting rendered beautifully — no more raw symbols.</div>
            </div>
            <div className="feature">
              <div className="feature-icon">⚡</div>
              <div className="feature-title">Click to score</div>
              <div className="feature-desc">No typing scores 1-5. Just click. Progress saved automatically.</div>
            </div>
            <div className="feature">
              <div className="feature-icon">🧠</div>
              <div className="feature-title">Smart column detection</div>
              <div className="feature-desc">Auto-detects headers and skips instruction rows intelligently.</div>
            </div>
            <div className="feature">
              <div className="feature-icon">🔒</div>
              <div className="feature-title">Private by default</div>
              <div className="feature-desc">Your data stays yours. Files parsed in browser, never on our servers.</div>
            </div>
          </div>
        </div>

        <footer>
          Built by a researcher · Annotation Studio · Free to use
        </footer>
      </div>
    </>
  );
}