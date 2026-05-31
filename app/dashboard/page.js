'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
      if (!data.user) window.location.href = '/';
    });
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#0f1117',color:'#e2e8f8',fontFamily:'monospace'}}>
      Loading...
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#0f1117',color:'#e2e8f8',fontFamily:'IBM Plex Sans, sans-serif'}}>
      <div style={{maxWidth:'900px',margin:'0 auto',padding:'40px 20px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'48px'}}>
          <div>
            <div style={{fontFamily:'monospace',fontSize:'11px',letterSpacing:'3px',textTransform:'uppercase',color:'#4f8ef7',marginBottom:'8px'}}>Annotation Studio</div>
            <h1 style={{fontSize:'24px',fontWeight:'700',margin:'0'}}>My Projects</h1>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
            <span style={{fontSize:'13px',color:'#7a8aaa'}}>{user?.email}</span>
            <button onClick={signOut} style={{padding:'8px 16px',background:'transparent',border:'1px solid #2a3050',borderRadius:'6px',color:'#7a8aaa',cursor:'pointer',fontSize:'13px'}}>Sign out</button>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'16px'}}>
          <div
            onClick={() => window.location.href = '/annotate'}
            style={{background:'#181c27',border:'2px dashed #2a3050',borderRadius:'12px',padding:'40px 24px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'12px',transition:'border-color .2s'}}
            onMouseOver={e => e.currentTarget.style.borderColor='#4f8ef7'}
            onMouseOut={e => e.currentTarget.style.borderColor='#2a3050'}
          >
            <div style={{fontSize:'32px'}}>＋</div>
            <div style={{fontSize:'15px',fontWeight:'600',color:'#e2e8f8'}}>New Project</div>
            <div style={{fontSize:'12px',color:'#7a8aaa',textAlign:'center'}}>Upload an Excel file to start annotating</div>
          </div>
        </div>
      </div>
    </div>
  );
}