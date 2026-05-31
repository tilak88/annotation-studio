'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { window.location.href = '/'; return; }
      setUser(data.user);
      loadProjects(data.user.id);
    });
  }, []);

  async function loadProjects(userId) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (!error && data) setProjects(data);
    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function pct(p) {
    if (!p.total_rows) return 0;
    return Math.round((p.done_rows / p.total_rows) * 100);
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#0f1117',color:'#e2e8f8',fontFamily:'monospace',fontSize:'13px',letterSpacing:'2px'}}>
      LOADING...
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#0f1117;--surface:#181c27;--surface2:#1e2335;--border:#2a3050;--accent:#4f8ef7;--accent2:#7c5fe6;--green:#3ecf6e;--amber:#f5a623;--text:#e2e8f8;--text-dim:#7a8aaa;--mono:'IBM Plex Mono',monospace;--sans:'IBM Plex Sans',sans-serif;}
        body{font-family:var(--sans);background:var(--bg);color:var(--text);min-height:100vh;}
        .dash{max-width:960px;margin:0 auto;padding:40px 24px;}
        .dash-nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:48px;}
        .dash-brand{font-family:var(--mono);font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--accent);}
        .dash-user{display:flex;align-items:center;gap:12px;}
        .dash-email{font-size:13px;color:var(--text-dim);}
        .btn-signout{padding:7px 14px;background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--text-dim);font-size:12px;cursor:pointer;font-family:var(--sans);transition:all .15s;}
        .btn-signout:hover{border-color:var(--accent);color:var(--accent);}
        .dash-title{font-size:26px;font-weight:700;margin-bottom:8px;}
        .dash-sub{font-size:14px;color:var(--text-dim);margin-bottom:32px;}
        .projects-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;}
        .project-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;cursor:pointer;transition:border-color .2s,transform .15s;position:relative;}
        .project-card:hover{border-color:var(--accent);transform:translateY(-2px);}
        .project-name{font-size:14px;font-weight:600;color:var(--text);margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .project-meta{font-size:12px;color:var(--text-dim);margin-bottom:14px;}
        .project-progress-bg{height:4px;background:var(--surface2);border-radius:99px;overflow:hidden;margin-bottom:8px;}
        .project-progress-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--accent),var(--accent2));transition:width .3s;}
        .project-stats{display:flex;justify-content:space-between;align-items:center;}
        .project-pct{font-family:var(--mono);font-size:11px;color:var(--text-dim);}
        .project-date{font-size:11px;color:var(--text-faint,#3a4560);}
        .badge-done{font-family:var(--mono);font-size:10px;padding:2px 8px;background:rgba(62,207,110,.12);border:1px solid rgba(62,207,110,.3);color:var(--green);border-radius:99px;}
        .new-card{background:var(--surface);border:2px dashed var(--border);border-radius:12px;padding:40px 20px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;transition:border-color .2s;}
        .new-card:hover{border-color:var(--accent);}
        .new-icon{font-size:28px;color:var(--text-dim);}
        .new-label{font-size:14px;font-weight:600;color:var(--text);}
        .new-sub{font-size:12px;color:var(--text-dim);text-align:center;}
        .empty-state{grid-column:1/-1;text-align:center;padding:40px;color:var(--text-dim);font-size:14px;}
      `}</style>

      <div className="dash">
        <div className="dash-nav">
          <div className="dash-brand">Annotation Studio</div>
          <div className="dash-user">
            <span className="dash-email">{user?.email}</span>
            <button className="btn-signout" onClick={signOut}>Sign out</button>
          </div>
        </div>

        <div className="dash-title">My Projects</div>
        <div className="dash-sub">
          {projects.length > 0 ? `${projects.length} project${projects.length > 1 ? 's' : ''} · click to continue` : 'No projects yet — start one below'}
        </div>

        <div className="projects-grid">
          <div className="new-card" onClick={() => window.location.href = '/annotate'}>
            <div className="new-icon">＋</div>
            <div className="new-label">New Project</div>
            <div className="new-sub">Upload an Excel file to start annotating</div>
          </div>

          {projects.map(p => (
            <div key={p.id} className="project-card" onClick={() => window.location.href = `/annotate?project=${p.id}`}>
              <div className="project-name">{p.name || p.file_name || 'Untitled Project'}</div>
              <div className="project-meta">{p.total_rows} rows · updated {formatDate(p.updated_at)}</div>
              <div className="project-progress-bg">
                <div className="project-progress-fill" style={{width: pct(p) + '%'}}></div>
              </div>
              <div className="project-stats">
                <span className="project-pct">{p.done_rows} / {p.total_rows} scored ({pct(p)}%)</span>
                {pct(p) === 100 && <span className="badge-done">✓ Done</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}