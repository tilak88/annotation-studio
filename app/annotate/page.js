'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Annotate() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('upload');
  const [sheetData, setSheetData] = useState([]);
  const [originalHeaders, setOriginalHeaders] = useState([]);
  const [metaLines, setMetaLines] = useState([]);
  const [colQ, setColQ] = useState('');
  const [colS, setColS] = useState('');
  const [colSrc, setColSrc] = useState('');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [scores, setScores] = useState({});
  const [notes, setNotes] = useState({});
  const [fileName, setFileName] = useState('annotated');
  const [uploadError, setUploadError] = useState('');
  const [headerRowIdx, setHeaderRowIdx] = useState(0);
  const [saveBadge, setSaveBadge] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const leftPanelRef = useRef(null);
  const questionRef = useRef(null);
  const solutionRef = useRef(null);
  const storageKey = useRef('annot_tool_v1');

  const DIMS = ['q1','q2','q3','q4','q5','q6','q7'];

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = '/';
      } else {
        setUser(data.user);
        setAuthChecked(true);
      }
    });
  }, []);

  // Load KaTeX and SheetJS
  useEffect(() => {
    if (document.getElementById('katex-css')) return;
    const link = document.createElement('link');
    link.id = 'katex-css';
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css';
    document.head.appendChild(link);
    const s1 = document.createElement('script');
    s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js';
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js';
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
    const s3 = document.createElement('script');
    s3.src = 'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js';
    document.head.appendChild(s3);
  }, []);

  // Render math
  useEffect(() => {
    if (screen !== 'annotate') return;
    const tryRender = () => {
      if (window.renderMathInElement) {
        [questionRef.current, solutionRef.current].forEach(el => {
          if (el) {
            window.renderMathInElement(el, {
              delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false },
                { left: '\\[', right: '\\]', display: true },
              ],
              throwOnError: false,
            });
          }
        });
      }
    };
    setTimeout(tryRender, 100);
  }, [screen, currentIdx, sheetData]);

  // Scroll to top on row change
  useEffect(() => {
    if (leftPanelRef.current) leftPanelRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentIdx]);

  function renderMD(text) {
    const mathBlocks = [];
    const TOKEN = '~~MATH_'; const TOKEND = '_MATH~~';
    const protect = (m) => { mathBlocks.push(m); return TOKEN + (mathBlocks.length - 1) + TOKEND; };
    let s = String(text || '');
    s = s.replace(/\$\$[\s\S]*?\$\$/g, protect);
    s = s.replace(/\\\[[\s\S]*?\\\]/g, protect);
    s = s.replace(/\\\([\s\S]*?\\\)/g, protect);
    s = s.replace(/\$[^\$\n]+?\$/g, protect);
    s = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    s = s.replace(/^### (.+)$/gm,'<div class="md-h3">$1</div>');
    s = s.replace(/^## (.+)$/gm,'<div class="md-h2">$1</div>');
    s = s.replace(/^# (.+)$/gm,'<div class="md-h1">$1</div>');
    s = s.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
    s = s.replace(/\*(.+?)\*/g,'<em>$1</em>');
    s = s.replace(/`([^`]+)`/g,'<code class="md-code">$1</code>');
    s = s.replace(/^---+$/gm,'<hr class="md-hr">');
    s = s.replace(/((?:^[ \t]*[-*][ \t].+\n?)+)/gm, block => {
      const items = block.trim().split('\n').map(l => `<li>${l.replace(/^[ \t]*[-*][ \t]/,'').trim()}</li>`).join('');
      return `<ul class="md-ul">${items}</ul>`;
    });
    s = s.replace(/((?:^[ \t]*\d+\.[ \t].+\n?)+)/gm, block => {
      const items = block.trim().split('\n').map(l => `<li>${l.replace(/^[ \t]*\d+\.[ \t]/,'').trim()}</li>`).join('');
      return `<ol class="md-ol">${items}</ol>`;
    });
    s = s.replace(/\n/g,'<br>');
    s = s.replace(new RegExp(TOKEN.replace(/~/g,'\\~')+'(\\d+)'+TOKEND.replace(/~/g,'\\~'),'g'), (_,i) => mathBlocks[+i]);
    return s;
  }

  function handleFile(file) {
    setUploadError('');
    const name = file.name.replace(/\.[^.]+$/,'');
    setFileName(name);
    storageKey.current = 'annot_' + name;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const XLSX = window.XLSX;
        if (!XLSX) { setUploadError('File parser still loading, please try again in a second.'); return; }
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw2D = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!raw2D.length) { setUploadError('The file appears to be empty.'); return; }
        const isHeaderRow = (row) => {
          const cells = row.map(c => String(c||'').toLowerCase().trim());
          return cells.some(c => c==='question'||c.startsWith('question')) && cells.some(c => c==='solution'||c.startsWith('solution')||c==='answer');
        };
        let hIdx = 0;
        for (let i = 0; i < Math.min(raw2D.length, 15); i++) { if (isHeaderRow(raw2D[i])) { hIdx = i; break; } }
        setHeaderRowIdx(hIdx);
        const meta = raw2D.slice(0,hIdx).map(row => row.filter(Boolean).join(' | ')).filter(Boolean);
        setMetaLines(meta);
        const rawHeaders = raw2D[hIdx];
        const headers = rawHeaders.map(h => String(h||'').trim()).filter(Boolean);
        const dataRaw = raw2D.slice(hIdx+1).filter(row => row.some(c => c!==''&&c!==null&&c!==undefined));
        const data = dataRaw.map(row => {
          const obj = {};
          rawHeaders.forEach((h,i) => { if (h!==''&&h!==null&&h!==undefined) obj[String(h).trim()] = String(row[i]??''); });
          return obj;
        });
        if (!data.length) { setUploadError('No data rows found after the header row.'); return; }
        setSheetData(data);
        setOriginalHeaders(headers);
        const lc = (h) => h.toLowerCase();
        const findCol = (...keys) => headers.find(h => keys.some(k => lc(h).includes(k))) || headers[0];
        setColQ(findCol('question','quest','problem'));
        setColS(findCol('solution','answer','sol','response','output'));
        const srcGuess = headers.find(h => lc(h).includes('source')||lc(h).includes('origin')||lc(h).includes('label'));
        setColSrc(srcGuess||'');
        const saved = localStorage.getItem(storageKey.current);
        if (saved) { try { const p = JSON.parse(saved); setScores(p.scores||{}); setNotes(p.notes||{}); } catch(e) {} }
      } catch(err) { setUploadError('Could not read this file: '+err.message); }
    };
    reader.readAsArrayBuffer(file);
  }

  function startAnnotation() {
    if (!colQ||!colS) { setUploadError('Please map at least Question and Solution columns.'); return; }
    setCurrentIdx(0);
    setScreen('annotate');
  }

  function setScore(dim, val) {
    const next = { ...scores, [currentIdx]: { ...(scores[currentIdx]||{}), [dim]: val } };
    setScores(next);
    persist(next, notes);
  }

  function saveNote(val) {
    const next = { ...notes, [currentIdx]: val };
    setNotes(next);
    persist(scores, next);
  }

  const projectId = useRef(null);

  async function persist(s, n) {
    try {
      localStorage.setItem(storageKey.current, JSON.stringify({ scores: s, notes: n }));
      const done = sheetData.filter((_,i) => {
        const sc = s[i];
        if (!sc) return false;
        return DIMS.every(d => sc[d] !== undefined && sc[d] !== null && sc[d] !== '');
      }).length;
      if (user) {
        if (!projectId.current) {
          const { data } = await supabase.from('projects').insert({
            user_id: user.id,
            name: fileName,
            file_name: fileName,
            scores: s,
            notes: n,
            col_q: colQ,
            col_s: colS,
            col_src: colSrc,
            total_rows: sheetData.length,
            done_rows: done,
          }).select().single();
          if (data) projectId.current = data.id;
        } else {
          await supabase.from('projects').update({
            scores: s,
            notes: n,
            done_rows: done,
            updated_at: new Date().toISOString(),
          }).eq('id', projectId.current);
        }
      }
      setSaveBadge('saved ' + new Date().toLocaleTimeString());
    } catch(e) {}
  }

  function isScored(idx) {
    const s = scores[idx];
    if (!s) return false;
    return DIMS.every(d => s[d] !== undefined && s[d] !== null && s[d] !== '');
  }

  function countDone() { return sheetData.filter((_,i) => isScored(i)).length; }

  function exportXLSX() {
    const done = countDone(); const total = sheetData.length;
    if (done < total && !confirm(`${total-done} row(s) not fully scored. Export anyway?`)) return;
    const XLSX = window.XLSX;
    if (!XLSX) return;
    const outputRows = sheetData.map((row,i) => {
      const s = scores[i]||{};
      return { ...row, Q1_Logical_Flow: s.q1??'', Q2_Formula_Application: s.q2??'',
        Q3_Writing_Naturalness: s.q3??'', Q4_LLM_Error_Detection: s.q4??'',
        Q5_Computation_Accuracy: s.q5??'', Q6_Human_or_LLM: s.q6??'',
        Q7_Confidence: s.q7??'', Annotator_Notes: notes[i]||'' };
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(outputRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Annotations');
    XLSX.writeFile(wb, `${fileName}_annotated.xlsx`);
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  if (!authChecked) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#0f1117',color:'#e2e8f8',fontFamily:'monospace',fontSize:'13px',letterSpacing:'2px'}}>
      LOADING...
    </div>
  );

  const done = countDone();
  const total = sheetData.length;
  const pct = total ? (done/total*100) : 0;
  const row = sheetData[currentIdx] || {};
  const curScores = scores[currentIdx] || {};
  const answeredCount = DIMS.filter(d => curScores[d] !== undefined && curScores[d] !== null && curScores[d] !== '').length;

  const sbCls = (dim, val) => {
    const cur = curScores[dim];
    if (cur === undefined || cur === null || cur === '') return 'score-btn';
    if (dim === 'q6') {
      if (val === 0 && cur === 0) return 'score-btn sb-sel-0';
      if (val === 1 && cur === 1) return 'score-btn sb-sel-llm';
      return 'score-btn';
    }
    if (dim === 'q7') return cur === val ? 'score-btn sb-sel-conf' : 'score-btn';
    const cls = ['','sb-sel-1','sb-sel-2','sb-sel-3','sb-sel-4','sb-sel-5'];
    return cur === val ? `score-btn ${cls[val]}` : 'score-btn';
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#0f1117;--surface:#181c27;--surface2:#1e2335;--border:#2a3050;--accent:#4f8ef7;--accent2:#7c5fe6;--green:#3ecf6e;--amber:#f5a623;--red:#f25e5e;--text:#e2e8f8;--text-dim:#7a8aaa;--text-faint:#3a4560;--mono:'IBM Plex Mono',monospace;--sans:'IBM Plex Sans',sans-serif;--radius:10px;--topbar-h:54px}
        html{scroll-behavior:smooth}
        body{font-family:var(--sans);background:var(--bg);color:var(--text);min-height:100vh;line-height:1.6}
        .upload-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:40px 20px;background:radial-gradient(ellipse at 50% 0%,#1a1f3a 0%,var(--bg) 60%)}
        .upload-logo{font-family:var(--mono);font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--accent);margin-bottom:36px;opacity:.7}
        .upload-title{font-size:clamp(24px,5vw,38px);font-weight:700;letter-spacing:-.5px;text-align:center;margin-bottom:10px;background:linear-gradient(135deg,#e2e8f8 30%,#4f8ef7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .upload-sub{color:var(--text-dim);font-size:15px;text-align:center;max-width:480px;margin-bottom:48px;line-height:1.7}
        .drop-zone{width:100%;max-width:520px;border:2px dashed var(--border);border-radius:16px;padding:56px 32px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;background:var(--surface);position:relative}
        .drop-zone:hover,.drop-zone.drag-over{border-color:var(--accent);background:#1a2040}
        .drop-zone input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
        .drop-icon{font-size:48px;margin-bottom:16px;display:block}
        .drop-main{font-size:16px;font-weight:600;color:var(--text);margin-bottom:6px}
        .drop-hint{font-size:13px;color:var(--text-dim)}
        .drop-accept{margin-top:14px;font-family:var(--mono);font-size:11px;color:var(--accent);letter-spacing:1px}
        .upload-error{margin-top:20px;color:var(--red);font-size:13px;background:rgba(242,94,94,.08);border:1px solid rgba(242,94,94,.3);border-radius:8px;padding:10px 16px;max-width:520px;width:100%;text-align:center}
        .col-mapping{margin-top:36px;width:100%;max-width:520px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px 24px}
        .col-mapping h3{font-size:13px;font-family:var(--mono);letter-spacing:1px;text-transform:uppercase;color:var(--text-dim);margin-bottom:14px}
        .col-row{display:flex;align-items:center;gap:12px;margin-bottom:10px}
        .col-row label{width:90px;font-size:13px;font-weight:600;color:var(--text-dim);flex-shrink:0}
        .col-row select{flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:var(--sans);font-size:13px;padding:7px 10px;outline:none;cursor:pointer}
        .col-row select:focus{border-color:var(--accent)}
        .header-detect-info{margin-bottom:14px;padding:8px 12px;background:rgba(79,142,247,.08);border:1px solid rgba(79,142,247,.25);border-radius:7px;font-size:12px;color:var(--accent);font-family:var(--mono)}
        .btn-start{margin-top:20px;width:100%;padding:14px;background:var(--accent);color:#fff;font-family:var(--sans);font-size:15px;font-weight:700;border:none;border-radius:8px;cursor:pointer;transition:background .15s,transform .1s}
        .btn-start:hover{background:#3a7aec;transform:translateY(-1px)}
        #topbar{position:sticky;top:0;z-index:300;background:rgba(15,17,23,0.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:var(--topbar-h);gap:12px}
        .tb-left{display:flex;align-items:center;gap:14px;min-width:0}
        .tb-brand{font-family:var(--mono);font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--accent);white-space:nowrap;cursor:pointer}
        .tb-file{font-size:12px;color:var(--text-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px}
        .progress-bar-wrap{flex:1;max-width:160px;height:5px;background:var(--surface2);border-radius:99px;overflow:hidden}
        .progress-bar-fill{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:99px;transition:width .3s ease}
        .progress-label{font-family:var(--mono);font-size:11px;color:var(--text-dim);white-space:nowrap}
        .tb-right{display:flex;align-items:center;gap:10px}
        .btn-export{display:flex;align-items:center;gap:7px;padding:8px 16px;background:var(--green);color:#000;font-family:var(--sans);font-size:13px;font-weight:700;border:none;border-radius:7px;cursor:pointer;transition:background .15s,transform .1s;white-space:nowrap}
        .btn-export:hover{background:#2ebc5c;transform:translateY(-1px)}
        .btn-export.incomplete{background:var(--amber)}
        .save-badge{font-family:var(--mono);font-size:10px;color:var(--text-faint);white-space:nowrap}
        .btn-signout{padding:6px 12px;background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--text-dim);font-size:11px;cursor:pointer;font-family:var(--sans)}
        .btn-signout:hover{border-color:var(--accent);color:var(--accent)}
        #pill-bar{background:var(--surface);border-bottom:1px solid var(--border);padding:8px 20px;display:flex;flex-wrap:wrap;gap:5px;align-items:center;position:sticky;top:var(--topbar-h);z-index:200}
        .pill-label{font-size:11px;font-family:var(--mono);color:var(--text-faint);margin-right:6px;text-transform:uppercase;letter-spacing:1px}
        .nav-pill{width:28px;height:28px;border-radius:50%;border:1.5px solid var(--border);background:transparent;color:var(--text-dim);font-family:var(--mono);font-size:10px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
        .nav-pill:hover{border-color:var(--accent);color:var(--accent)}
        .nav-pill.active{border-color:var(--accent);background:var(--accent);color:#fff}
        .nav-pill.done{border-color:var(--green);color:var(--green)}
        .nav-pill.active.done{background:var(--green);color:#000;border-color:var(--green)}
        #split-wrap{display:grid;grid-template-columns:1fr 400px;gap:0;min-height:calc(100vh - var(--topbar-h) - 44px)}
        #left-panel{padding:20px 16px 40px 20px;overflow-y:auto;border-right:1px solid var(--border)}
        #right-panel{position:sticky;top:calc(var(--topbar-h) + 44px);height:calc(100vh - var(--topbar-h) - 44px);overflow-y:auto;background:var(--bg);scrollbar-width:thin;scrollbar-color:var(--border) transparent}
        .card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:14px;overflow:hidden}
        .card-head{padding:10px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;background:var(--surface2)}
        .card-tag{font-family:var(--mono);font-size:10px;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;padding:3px 8px;border-radius:4px}
        .tag-q{background:rgba(79,142,247,.15);color:var(--accent)}
        .tag-s{background:rgba(62,207,110,.12);color:var(--green)}
        .tag-src{background:rgba(245,166,35,.1);color:var(--amber)}
        .card-row-label{font-family:var(--mono);font-size:11px;color:var(--text-dim)}
        .card-body{padding:18px 20px;font-size:14.5px;line-height:1.9;color:#d4daf4}
        .katex-display{overflow-x:auto;overflow-y:hidden;padding:6px 0}
        .katex{font-size:1.05em}
        .md-h1{font-size:17px;font-weight:700;margin:14px 0 6px;color:var(--text)}
        .md-h2{font-size:15px;font-weight:700;margin:12px 0 5px;color:var(--text)}
        .md-h3{font-size:14px;font-weight:600;margin:10px 0 4px;color:var(--text)}
        .md-ul,.md-ol{padding-left:22px;margin:6px 0}
        .md-ul li,.md-ol li{margin-bottom:3px}
        .md-hr{border:none;border-top:1px solid var(--border);margin:12px 0}
        .md-code{font-family:var(--mono);font-size:12.5px;background:rgba(79,142,247,.1);padding:1px 5px;border-radius:4px}
        #bottom-nav{display:flex;justify-content:space-between;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px 16px;margin-top:4px}
        .nav-btn{padding:9px 20px;font-family:var(--sans);font-size:13px;font-weight:600;border:1.5px solid var(--border);background:transparent;color:var(--text-dim);border-radius:8px;cursor:pointer;transition:all .15s}
        .nav-btn:not(:disabled):hover{border-color:var(--accent);color:var(--accent)}
        .nav-btn:disabled{opacity:.3;cursor:not-allowed}
        .nav-btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
        .nav-btn.primary:hover{background:#3a7aec}
        #nav-center{font-family:var(--mono);font-size:12px;color:var(--text-dim);text-align:center}
        #score-panel-head{background:var(--surface2);padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10}
        #score-panel-head h2{font-size:11px;font-family:var(--mono);letter-spacing:1.5px;text-transform:uppercase;color:var(--text-dim)}
        .score-completion{font-family:var(--mono);font-size:11px;color:var(--text-faint)}
        .score-dim{padding:12px 16px;border-bottom:1px solid var(--border)}
        .score-dim:last-child{border-bottom:none}
        .score-dim-head{display:flex;align-items:baseline;gap:8px;margin-bottom:4px}
        .score-dim-key{font-family:var(--mono);font-size:11px;color:var(--accent);font-weight:600;flex-shrink:0}
        .score-dim-name{font-size:13px;font-weight:600;color:var(--text)}
        .score-dim-hint{font-size:11px;color:var(--text-dim);margin-bottom:8px;font-style:italic;line-height:1.5}
        .btn-row{display:flex;flex-wrap:wrap;gap:5px}
        .score-btn{border:1.5px solid var(--border);background:transparent;border-radius:6px;padding:6px 8px;min-width:52px;font-size:11.5px;font-family:var(--mono);font-weight:600;cursor:pointer;color:var(--text-dim);transition:all .13s;text-align:center;line-height:1.3}
        .score-btn:hover{border-color:var(--accent);color:var(--text);transform:translateY(-1px)}
        .sb-sel-1{background:#5c1a1a!important;border-color:var(--red)!important;color:#fca5a5!important}
        .sb-sel-2{background:#5c3010!important;border-color:#f97316!important;color:#fdba74!important}
        .sb-sel-3{background:#4d3a00!important;border-color:var(--amber)!important;color:#fcd34d!important}
        .sb-sel-4{background:#1a3d1a!important;border-color:#4ade80!important;color:#86efac!important}
        .sb-sel-5{background:#0d2d0d!important;border-color:var(--green)!important;color:var(--green)!important}
        .sb-sel-0{background:#0d2040!important;border-color:var(--accent)!important;color:#93c5fd!important}
        .sb-sel-llm{background:#2a0d40!important;border-color:var(--accent2)!important;color:#c4b5fd!important}
        .sb-sel-conf{background:#1a2035!important;border-color:var(--accent)!important;color:var(--accent)!important}
        .notes-wrap{padding:12px 16px;border-top:1px solid var(--border);background:var(--surface)}
        .notes-label{font-family:var(--mono);font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--text-dim);margin-bottom:7px;display:block}
        .notes-field{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-family:var(--sans);font-size:13px;padding:9px 11px;resize:vertical;min-height:64px;outline:none;transition:border-color .15s;line-height:1.6}
        .notes-field:focus{border-color:var(--accent)}
        .score-done-badge{display:inline-flex;align-items:center;gap:4px;background:rgba(62,207,110,.12);border:1px solid rgba(62,207,110,.3);color:var(--green);border-radius:99px;font-family:var(--mono);font-size:10px;padding:2px 8px}
        @media(max-width:780px){#split-wrap{grid-template-columns:1fr}#right-panel{position:static;height:auto;border-top:1px solid var(--border)}#left-panel{border-right:none}}
      `}</style>

      {screen === 'upload' && (
        <div className="upload-screen">
          <div className="upload-logo">Annotation Studio</div>
          <h1 className="upload-title">Start Annotating</h1>
          <p className="upload-sub">Upload your spreadsheet. Headers are auto-detected. Score each row on your metrics with a single click.</p>
          <div className={`drop-zone${dragOver?' drag-over':''}`}
            onDragOver={e=>{e.preventDefault();setDragOver(true)}}
            onDragLeave={()=>setDragOver(false)}
            onDrop={e=>{e.preventDefault();setDragOver(false);if(e.dataTransfer.files[0])handleFile(e.dataTransfer.files[0])}}>
            <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv" onChange={e=>{if(e.target.files?.[0])handleFile(e.target.files[0])}} />
            <span className="drop-icon">📁</span>
            <div className="drop-main">Drop your Excel file here</div>
            <div className="drop-hint">or click to browse your computer</div>
            <div className="drop-accept">.xlsx · .xls · .csv</div>
          </div>
          {uploadError && <div className="upload-error">{uploadError}</div>}
          {originalHeaders.length > 0 && (
            <div className="col-mapping">
              <h3>Column Mapping</h3>
              {headerRowIdx > 0 && <div className="header-detect-info">↳ Auto-skipped {headerRowIdx} header/instruction row(s). Found {sheetData.length} data rows.</div>}
              <div className="col-row"><label>Question</label>
                <select value={colQ} onChange={e=>setColQ(e.target.value)}>{originalHeaders.map(h=><option key={h} value={h}>{h}</option>)}</select></div>
              <div className="col-row"><label>Solution</label>
                <select value={colS} onChange={e=>setColS(e.target.value)}>{originalHeaders.map(h=><option key={h} value={h}>{h}</option>)}</select></div>
              <div className="col-row"><label style={{lineHeight:'1.3'}}>Source<br/><span style={{fontSize:'10px',fontWeight:400}}>(optional)</span></label>
                <select value={colSrc} onChange={e=>setColSrc(e.target.value)}><option value="">— none —</option>{originalHeaders.map(h=><option key={h} value={h}>{h}</option>)}</select></div>
              <button className="btn-start" onClick={startAnnotation}>Start Annotation →</button>
            </div>
          )}
          <button onClick={()=>window.location.href='/dashboard'} style={{marginTop:'20px',background:'transparent',border:'none',color:'#7a8aaa',fontSize:'13px',cursor:'pointer'}}>← Back to dashboard</button>
        </div>
      )}

      {screen === 'annotate' && (
        <div>
          <div id="topbar">
            <div className="tb-left">
              <span className="tb-brand" onClick={()=>window.location.href='/dashboard'}>← Dashboard</span>
              <span className="tb-file">{fileName}</span>
              <div className="progress-bar-wrap"><div className="progress-bar-fill" style={{width:pct+'%'}}></div></div>
              <span className="progress-label">{done} / {total}</span>
            </div>
            <div className="tb-right">
              <span className="save-badge">{saveBadge}</span>
              <button className={`btn-export${done<total?' incomplete':''}`} onClick={exportXLSX}>⬇ Download Excel</button>
              <button className="btn-signout" onClick={signOut}>Sign out</button>
            </div>
          </div>

          <div id="pill-bar">
            <span className="pill-label">Row</span>
            {sheetData.map((_,i)=>(
              <button key={i} className={`nav-pill${isScored(i)?' done':''}${i===currentIdx?' active':''}`} onClick={()=>setCurrentIdx(i)}>{i+1}</button>
            ))}
          </div>

          <div id="split-wrap">
            <div id="left-panel" ref={leftPanelRef}>
              <div className="card">
                <div className="card-head">
                  <span className="card-tag tag-q">Question</span>
                  <span className="card-row-label">Row {currentIdx+1} of {total}</span>
                  {colSrc && row[colSrc] && <span className="card-tag tag-src">{row[colSrc]}</span>}
                </div>
                <div className="card-body" ref={questionRef} dangerouslySetInnerHTML={{__html: renderMD(row[colQ]||'')}} />
              </div>
              <div className="card">
                <div className="card-head"><span className="card-tag tag-s">Solution</span></div>
                <div className="card-body" ref={solutionRef} dangerouslySetInnerHTML={{__html: renderMD(row[colS]||'')}} />
              </div>
              <div id="bottom-nav">
                <button className="nav-btn" disabled={currentIdx===0} onClick={()=>setCurrentIdx(i=>i-1)}>← Prev</button>
                <div id="nav-center">Row {currentIdx+1} of {total}</div>
                <button className={`nav-btn${currentIdx<total-1?' primary':''}`} disabled={currentIdx===total-1} onClick={()=>setCurrentIdx(i=>i+1)}>Next →</button>
              </div>
            </div>

            <div id="right-panel">
              <div id="score-panel-head">
                <h2>Scoring Panel</h2>
                <span className="score-completion">
                  {answeredCount===7 ? <span className="score-done-badge">✓ Complete</span> : `${answeredCount} / 7 answered`}
                </span>
              </div>

              {[
                {dim:'q1',name:'Logical Flow',hint:'Is the reasoning sequence coherent?',labels:['Major gaps','Some gaps','Minor gaps','Well-seq.','Perfect']},
                {dim:'q2',name:'Formula Application',hint:'Formulas correct, with context or derivation?',labels:['Wrong','Misapplied','Minor','Correct','Flawless']},
                {dim:'q3',name:'Writing Naturalness',hint:'Human-written or templated/generated prose?',labels:['Robotic','Generated','Mixed','Mostly nat.','Natural']},
                {dim:'q4',name:'LLM Error Detection',hint:'Hallucinated values, overconfident wrong steps?',labels:['None','Few','Some','Many','Severe']},
                {dim:'q5',name:'Computation Accuracy',hint:'Are all numerical results correct?',labels:['All wrong','Major err.','Minor err.','Mostly acc.','Accurate']},
              ].map(({dim,name,hint,labels})=>(
                <div key={dim} className="score-dim">
                  <div className="score-dim-head">
                    <span className="score-dim-key">{dim.toUpperCase()}</span>
                    <span className="score-dim-name">{name}</span>
                  </div>
                  <div className="score-dim-hint">{hint}</div>
                  <div className="btn-row">
                    {labels.map((label,i)=>(
                      <button key={i} className={sbCls(dim,i+1)} onClick={()=>setScore(dim,i+1)}>
                        {i+1}<br/><span style={{fontSize:'9px',fontWeight:400}}>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="score-dim">
                <div className="score-dim-head"><span className="score-dim-key">Q6</span><span className="score-dim-name">Origin Judgment</span></div>
                <div className="score-dim-hint">Human-written or AI-generated?</div>
                <div className="btn-row">
                  <button className={sbCls('q6',0)} style={{flex:1,minWidth:'80px'}} onClick={()=>setScore('q6',0)}>0 · Human</button>
                  <button className={sbCls('q6',1)} style={{flex:1,minWidth:'80px'}} onClick={()=>setScore('q6',1)}>1 · LLM</button>
                </div>
              </div>

              <div className="score-dim">
                <div className="score-dim-head"><span className="score-dim-key">Q7</span><span className="score-dim-name">Confidence in Q6</span></div>
                <div className="score-dim-hint">How certain are you of your origin judgment?</div>
                <div className="btn-row">
                  {['Guessing','Leaning','Certain'].map((label,i)=>(
                    <button key={i} className={sbCls('q7',i+1)} style={{flex:1}} onClick={()=>setScore('q7',i+1)}>
                      {i+1}<br/><span style={{fontSize:'9px',fontWeight:400}}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="notes-wrap">
                <span className="notes-label">Notes / Comments (optional)</span>
                <textarea className="notes-field" placeholder="Any additional observations…" value={notes[currentIdx]||''} onChange={e=>saveNote(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}