'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Annotate() {
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/';
    });
  }, []);

  return (
    <div style={{minHeight:'100vh',background:'#0f1117'}}>
      {/* Your annotation tool will load here */}
    </div>
  );
}