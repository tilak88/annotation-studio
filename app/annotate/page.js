'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Annotate() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('upload'); // upload | step2 | step3 | annotate
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
  const [projectLoading, setProjectLoading] = useState(false);
  const [metrics, setMetrics] = useState([]);
  const [editingMetric, setEditingMetric] = useState(null);
  const fileInputRef = useRef(null);
  const leftPanelRef = useRef(null);
  const questionRef = useRef(null);
  const solutionRef = useRef(null);
  const storageKey = useRef('annot_tool_v1');
  const projectId = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { window.location.href = '/'; return; }
      setUser(data.user);
      setAuthChecked(true);
      const params = new URLSearchParams(window.location.search);
      const pid = params.get('project');
      if (pid) {
        projectId.current = pid;
        setProjectLoading(true);
        const { data: proj } = await supabase.from('projects').select('*').eq('id', pid).single();
        if (proj) {
          setFileName(proj.file_name || 'project');
          setColQ(proj.col_q || '');
          setColS(proj.col_s || '');
          setColSrc(proj.col_src || '');
          setScores(proj.scores || {});
          setNotes(proj.notes || {});
          setMetrics(proj.metrics || []);
          storageKey.current = 'annot_' + pid;
          const cached = localStorage.getItem('sheet_' + pid);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              setSheetData(parsed.data || []);
              setOriginalHeaders(parsed.headers || []);
              setHeaderRowIdx(parsed.headerRowIdx || 0);
              setMetaLines(parsed.metaLines || []);
              setScreen('annotate');
            } catch(e) {}
          }
        }
        setProjectLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (document.getElementById('katex-css')) return;
    const link = document.createElement('link');
    link.id = 'katex-css'; link.rel = 'stylesheet';
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

  useEffect(() => {
    if (screen !== 'annotate') return;
    const tryRender = () => {
      if (window.renderMathInElement) {
        [questionRef.current, solutionRef.current].forEach(el => {
          if (el) window.renderMathInElement(el, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false },
              { left: '\\(', right: '\\)', display: false },
              { left: '\\[', right: '\\]', display: true },
            ], throwOnError: false,
          });
        });
      }
    };
    setTimeout(tryRender, 100);
  }, [screen, currentIdx, sheetData]);

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

  function guessScale(headers, data) {
    // Try to detect numeric columns with small range → score columns
    const candidates = [];
    headers.forEach(h => {
      const vals = data.map(r => parseFloat(r[h])).filter(v => !isNaN(v));
      if (vals.length > data.length * 0.3) {
        const max = Math.max(...vals);
        const min = Math.min(...vals);
        if (max <= 10 && min >= 0) candidates.push({ name: h, max });
      }
    });
    return candidates;
  }

  function buildDefaultMetrics(headers) {
    const lc = h => h.toLowerCase();
    const skip = [colQ, colS, colSrc].filter(Boolean);
    const remaining = headers.filter(h => !skip.includes(h));
    const numericCandidates = guessScale(remaining, sheetData.slice(0,20));
    const numericNames = numericCandidates.map(c => c.name);
    const nonNumeric = remaining.filter(h => !numericNames.includes(h));

    const suggested = [];
    // Add non-numeric columns as potential text/content cols — skip
    // Add numeric ones as metrics
    numericCandidates.forEach(c => {
      const scale = c.max <= 3 ? 3 : c.max <= 5 ? 5 : 10;
      suggested.push({
        id: Math.random().toString(36).slice(2),
        name: c.name,
        scale,
        type: 'numeric',
        labels: Array.from({length: scale}, (_,i) => ({ value: i+1, label: '' })),
        suggested: true,
      });
    });

    // If no numeric found, add 3 blank metrics for user to fill
    if (suggested.length === 0) {
      for (let i = 0; i < 3; i++) {
        suggested.push({
          id: Math.random().toString(36).slice(2),
          name: `Metric ${i+1}`,
          scale: 5,
          type: 'numeric',
          labels: Array.from({length: 5}, (_,j) => ({ value: j+1, label: '' })),
          suggested: false,
        });
      }
    }
    return suggested;
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
          return cells.some(c => c==='question'||c.startsWith('question')||c==='prompt'||c==='text'||c==='input') &&
            cells.some(c => c==='solution'||c.startsWith('solution')||c==='answer'||c==='output'||c==='response');
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
        setColQ(findCol('question','quest','problem','prompt','text','input'));
        setColS(findCol('solution','answer','sol','response','output'));
        const srcGuess = headers.find(h => lc(h).includes('source')||lc(h).includes('origin')||lc(h).includes('label')||lc(h).includes('id'));
        setColSrc(srcGuess||'');
        localStorage.setItem('sheet_' + (projectId.current || storageKey.current), JSON.stringify({
          data, headers, headerRowIdx: hIdx, metaLines: meta
        }));
        setScreen('step2');
      } catch(err) { setUploadError('Could not read this file: '+err.message); }
    };
    reader.readAsArrayBuffer(file);
  }

  function goToStep3() {
    if (!colQ||!colS) { setUploadError('Please map at least the Question and Solution columns.'); return; }
    setUploadError('');
    const suggested = buildDefaultMetrics(originalHeaders);
    setMetrics(suggested);
    setScreen('step3');
  }

  function startAnnotation() {
    if (metrics.length === 0) { return; }
    setCurrentIdx(0);
    setScreen('annotate');
  }

  function addMetric() {
    setMetrics(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      name: `Metric ${prev.length + 1}`,
      scale: 5,
      type: 'numeric',
      labels: Array.from({length: 5}, (_,i) => ({ value: i+1, label: '' })),
      suggested: false,
    }]);
  }

  function removeMetric(id) {
    setMetrics(prev => prev.filter(m => m.id !== id));
  }

  function updateMetric(id, changes) {
    setMetrics(prev => prev.map(m => {
      if (m.id !== id) return m;
      const updated = { ...m, ...changes };
      if (changes.scale !== undefined) {
        updated.labels = Array.from({length: changes.scale}, (_,i) => ({
          value: i+1,
          label: m.labels[i]?.label || ''
        }));
      }
      return updated;
    }));
  }

  function updateLabel(metricId, valueIdx, label) {
    setMetrics(prev => prev.map(m => {
      if (m.id !== metricId) return m;
      const labels = [...m.labels];
      labels[valueIdx] = { ...labels[valueIdx], label };
      return { ...m, labels };
    }));
  }

  function isScored(idx) {
    const s = scores[idx];
    if (!s) return false;
    return metrics.every(m => s[m.id] !== undefined && s[m.id] !== null && s[m.id] !== '');
  }

  function countDone() { return sheetData.filter((_,i) => isScored(i)).length; }

  function setScore(metricId, val) {
    const next = { ...scores, [currentIdx]: { ...(scores[currentIdx]||{}), [metricId]: val } };
    setScores(next);
    persist(next, notes);
  }

  function saveNote(val) {
    const next = { ...notes, [currentIdx]: val };
    setNotes(next);
    persist(scores, next);
  }

  async function persist(s, n) {
    try {
      localStorage.setItem(storageKey.current, JSON.stringify({ scores: s, notes: n }));
      const done = sheetData.filter((_,i) => {
        const sc = s[i];
        if (!sc) return false;
        return metrics.every(m => sc[m.id] !== undefined && sc[m.id] !== null && sc[m.id] !== '');
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
            metrics: metrics,
            total_rows: sheetData.length,
            done_rows: done,
          }).select().single();
          if (data) projectId.current = data.id;
        } else {
          await supabase.from('projects').update({
            scores: s, notes: n, done_rows: done,
            updated_at: new Date().toISOString(),
          }).eq('id', projectId.current);
        }
      }
      setSaveBadge('saved ' + new Date().toLocaleTimeString());
    } catch(e) {}
  }

  function exportXLSX() {
    const done = countDone(); const total = sheetData.length;
    if (done < total && !confirm(`${total-done} row(s) not fully scored. Export anyway?`)) return;
    const XLSX = window.XLSX;
    if (!XLSX) return;
    const outputRows = sheetData.map((row,i) => {
      const s = scores[i]||{};
      const scoreObj = {};
      metrics.forEach(m => { scoreObj[m.name] = s[m.id] ?? ''; });
      return { ...row, ...scoreObj, Annotator_Notes: notes[i]||'' };
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

  if (!authChecked || projectLoading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#0f1117',color:'#e2e8f8',fontFamily:'monospace',fontSize:'13px',letterSpacing:'2px'}}>
      LOADING...
    </div>
  );

  const done = countDone();
  const total = sheetData.length;
  const pct = total ? (done/total*100) : 0;
  const row = sheetData[currentIdx] || {};
  const curScores = scores[currentIdx] || {};
  const answeredCount = metrics.filter(m => curScores[m.id] !== undefined && curScores[m.id] !== null && curScores[m.id] !== '').length;

  const scoreColors = [
    '',
    {bg:'#5c1a1a',border:'#f25e5e',text:'#fca5a5'},
    {bg:'#5c3010',border:'#f97316',text:'#fdba74'},
    {bg:'#4d3a00',border:'#f5a623',text:'#fcd34d'},
    {bg:'#1a3d1a',border:'#4ade80',text:'#86efac'},
    {bg:'#0d2d0d',border:'#3ecf6e',text:'#3ecf6e'},
    {bg:'#0d2d0d',border:'#3ecf6e',text:'#3ecf6e'},
    {bg:'#0d2040',border:'#4f8ef7',text:'#93c5fd'},
    {bg:'#1a1540',border:'#7c5fe6',text:'#c4b5fd'},
    {bg:'#1a2540',border:'#4f8ef7',text:'#93c5fd'},
    {bg:'#0d1a30',border:'#3ecf6e',text:'#3ecf6e'},
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#0f1117;--surface:#181c27;--surface2:#1e2335;--border:#2a3050;--accent:#4f8ef7;--accent2:#7c5fe6;--green:#3ecf6e;--amber:#f5a623;--red:#f25e5e;--text:#e2e8f8;--text-dim:#7a8aaa;--text-faint:#3a4560;--mono:'IBM Plex Mono',monospace;--sans:'IBM Plex Sans',sans-serif;--radius:10px;--topbar-h:54px}
        html{scroll-behavior:smooth}
        body{font-family:var(--sans);background:var(--bg);color:var(--text);min-height:100vh;line-height:1.6}
        /* Wizard */
        .wizard{display:flex;flex-direction:column;align-items:center;min-height:100vh;padding:40px 20px;background:radial-gradient(ellipse at 50% 0%,#1a1f3a 0%,var(--bg) 60%)}
        .wizard-logo{font-family:var(--mono);font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--accent);margin-bottom:32px;opacity:.7}
        .wizard-steps{display:flex;align-items:center;gap:0;margin-bottom:40px}
        .wstep{display:flex;align-items:center;gap:8px;font-size:12px;font-family:var(--mono);color:var(--text-faint)}
        .wstep.active{color:var(--accent)}
        .wstep.done{color:var(--green)}
        .wstep-num{width:24px;height:24px;border-radius:50%;border:1.5px solid currentColor;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0}
        .wstep-line{width:40px;height:1px;background:var(--border);margin:0 8px}
        .wizard-card{width:100%;max-width:580px;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px 32px}
        .wizard-title{font-size:20px;font-weight:700;margin-bottom:6px}
        .wizard-sub{font-size:13px;color:var(--text-dim);margin-bottom:24px;line-height:1.6}
        /* Upload */
        .drop-zone{width:100%;border:2px dashed var(--border);border-radius:12px;padding:48px 24px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;background:var(--surface2);position:relative}
        .drop-zone:hover,.drop-zone.drag-over{border-color:var(--accent);background:#1a2040}
        .drop-zone input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
        .drop-icon{font-size:40px;margin-bottom:12px;display:block}
        .drop-main{font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px}
        .drop-hint{font-size:12px;color:var(--text-dim)}
        .drop-accept{margin-top:12px;font-family:var(--mono);font-size:11px;color:var(--accent);letter-spacing:1px}
        .upload-error{margin-top:16px;color:var(--red);font-size:13px;background:rgba(242,94,94,.08);border:1px solid rgba(242,94,94,.3);border-radius:8px;padding:10px 14px;text-align:center}
        /* Col mapping */
        .col-row{display:flex;align-items:center;gap:12px;margin-bottom:12px}
        .col-row label{width:100px;font-size:13px;font-weight:600;color:var(--text-dim);flex-shrink:0;line-height:1.4}
        .col-row select{flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:var(--sans);font-size:13px;padding:8px 10px;outline:none;cursor:pointer}
        .col-row select:focus{border-color:var(--accent)}
        .header-info{margin-bottom:16px;padding:8px 12px;background:rgba(79,142,247,.08);border:1px solid rgba(79,142,247,.25);border-radius:7px;font-size:12px;color:var(--accent);font-family:var(--mono)}
        .data-preview{margin-top:16px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;overflow:hidden}
        .preview-label{padding:8px 12px;font-family:var(--mono);font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--text-dim);border-bottom:1px solid var(--border)}
        .preview-row{padding:10px 12px;font-size:12px;color:var(--text-dim);border-bottom:1px solid var(--border);line-height:1.5}
        .preview-row:last-child{border-bottom:none}
        .preview-row strong{color:var(--text);font-weight:500}
        /* Metric builder */
        .metric-card{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:10px;position:relative}
        .metric-card.suggested{border-color:rgba(79,142,247,.3)}
        .metric-header{display:flex;align-items:center;gap:10px;margin-bottom:12px}
        .metric-name-input{flex:1;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:var(--sans);font-size:13px;font-weight:600;padding:7px 10px;outline:none}
        .metric-name-input:focus{border-color:var(--accent)}
        .metric-scale-wrap{display:flex;align-items:center;gap:8px}
        .metric-scale-label{font-size:11px;color:var(--text-dim);white-space:nowrap}
        .metric-scale-select{background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:var(--mono);font-size:12px;padding:5px 8px;outline:none;cursor:pointer}
        .metric-scale-select:focus{border-color:var(--accent)}
        .metric-labels{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px;margin-top:10px}
        .label-input-wrap{display:flex;align-items:center;gap:6px}
        .label-num{font-family:var(--mono);font-size:11px;color:var(--accent);width:16px;flex-shrink:0}
        .label-input{flex:1;background:var(--surface);border:1px solid var(--border);border-radius:5px;color:var(--text);font-size:11px;padding:5px 7px;outline:none;font-family:var(--sans)}
        .label-input:focus{border-color:var(--accent)}
        .label-input::placeholder{color:var(--text-faint)}
        .metric-remove{position:absolute;top:12px;right:12px;background:transparent;border:none;color:var(--text-faint);cursor:pointer;font-size:16px;line-height:1;padding:2px}
        .metric-remove:hover{color:var(--red)}
        .suggested-badge{font-size:10px;font-family:var(--mono);padding:2px 7px;background:rgba(79,142,247,.1);color:var(--accent);border-radius:99px;border:1px solid rgba(79,142,247,.2)}
        .btn-add-metric{width:100%;padding:10px;background:transparent;border:1.5px dashed var(--border);border-radius:8px;color:var(--text-dim);font-family:var(--sans);font-size:13px;cursor:pointer;transition:all .15s;margin-top:4px}
        .btn-add-metric:hover{border-color:var(--accent);color:var(--accent)}
        /* Wizard nav */
        .wizard-footer{display:flex;justify-content:space-between;align-items:center;margin-top:24px}
        .btn-back{padding:10px 20px;background:transparent;border:1.5px solid var(--border);border-radius:8px;color:var(--text-dim);font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer;transition:all .15s}
        .btn-back:hover{border-color:var(--accent);color:var(--accent)}
        .btn-next{padding:10px 24px;background:var(--accent);border:none;border-radius:8px;color:#fff;font-family:var(--sans);font-size:13px;font-weight:700;cursor:pointer;transition:background .15s}
        .btn-next:hover{background:#3a7aec}
        /* Annotation */
        #topbar{position:sticky;top:0;z-index:300;background:rgba(15,17,23,0.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:var(--topbar-h);gap:12px}
        .tb-left{display:flex;align-items:center;gap:14px;min-width:0}
        .tb-brand{font-family:var(--mono);font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--accent);white-space:nowrap;cursor:pointer}
        .tb-file{font-size:12px;color:var(--text-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px}
        .progress-bar-wrap{flex:1;max-width:160px;height:5px;background:var(--surface2);border-radius:99px;overflow:hidden}
        .progress-bar-fill{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:99px;transition:width .3s ease}
        .progress-label{font-family:var(--mono);font-size:11px;color:var(--text-dim);white-space:nowrap}
        .tb-right{display:flex;align-items:center;gap:10px}
        .btn-export{display:flex;align-items:center;gap:7px;padding:8px 16px;background:var(--green);color:#000;font-family:var(--sans);font-size:13px;font-weight:700;border:none;border-radius:7px;cursor:pointer;transition:background .15s;white-space:nowrap}
        .btn-export:hover{background:#2ebc5c}
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
        #split-wrap{display:grid;grid-template-columns:1fr 420px;gap:0;min-height:calc(100vh - var(--topbar-h) - 44px)}
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
        .score-dim-name{font-size:13px;font-weight:600;color:var(--text)}
        .score-dim-hint{font-size:11px;color:var(--text-dim);margin-bottom:8px;font-style:italic}
        .btn-row{display:flex;flex-wrap:wrap;gap:5px}
        .score-btn{border:1.5px solid var(--border);background:transparent;border-radius:6px;padding:7px 8px;min-width:48px;font-size:11.5px;font-family:var(--mono);font-weight:600;cursor:pointer;color:var(--text-dim);transition:all .13s;text-align:center;line-height:1.3}
        .score-btn:hover{border-color:var(--accent);color:var(--text);transform:translateY(-1px)}
        .score-btn.selected{transform:translateY(-1px)}
        .notes-wrap{padding:12px 16px;border-top:1px solid var(--border);background:var(--surface)}
        .notes-label{font-family:var(--mono);font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--text-dim);margin-bottom:7px;display:block}
        .notes-field{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-family:var(--sans);font-size:13px;padding:9px 11px;resize:vertical;min-height:64px;outline:none;transition:border-color .15s;line-height:1.6}
        .notes-field:focus{border-color:var(--accent)}
        .score-done-badge{display:inline-flex;align-items:center;gap:4px;background:rgba(62,207,110,.12);border:1px solid rgba(62,207,110,.3);color:var(--green);border-radius:99px;font-family:var(--mono);font-size:10px;padding:2px 8px}
        .reupload-banner{background:rgba(245,166,35,.08);border:1px solid rgba(245,166,35,.3);border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:var(--amber);text-align:center}
        @media(max-width:780px){#split-wrap{grid-template-columns:1fr}#right-panel{position:static;height:auto;border-top:1px solid var(--border)}#left-panel{border-right:none}}
      `}</style>

      {/* STEP 1: Upload */}
      {screen === 'upload' && (
        <div className="wizard">
          <div className="wizard-logo">Annotation Studio</div>
          <div className="wizard-steps">
            <div className="wstep active"><div className="wstep-num">1</div>Upload</div>
            <div className="wstep-line"/>
            <div className="wstep"><div className="wstep-num">2</div>Map Columns</div>
            <div className="wstep-line"/>
            <div className="wstep"><div className="wstep-num">3</div>Set Metrics</div>
          </div>
          <div className="wizard-card">
            <div className="wizard-title">Upload your dataset</div>
            <div className="wizard-sub">Drop any Excel or CSV file. Works for any research domain — NLP, medical, legal, linguistics, and more.</div>
            {projectId.current && (
              <div className="reupload-banner">⚠ Re-upload your file to continue — your scores are saved and will be restored automatically.</div>
            )}
            <div className={`drop-zone${dragOver?' drag-over':''}`}
              onDragOver={e=>{e.preventDefault();setDragOver(true)}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);if(e.dataTransfer.files[0])handleFile(e.dataTransfer.files[0])}}>
              <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv" onChange={e=>{if(e.target.files?.[0])handleFile(e.target.files[0])}} />
              <span className="drop-icon">📁</span>
              <div className="drop-main">Drop your file here</div>
              <div className="drop-hint">or click to browse</div>
              <div className="drop-accept">.xlsx · .xls · .csv</div>
            </div>
            {uploadError && <div className="upload-error">{uploadError}</div>}
          </div>
          <button onClick={()=>window.location.href='/dashboard'} style={{marginTop:'20px',background:'transparent',border:'none',color:'#7a8aaa',fontSize:'13px',cursor:'pointer'}}>← Back to dashboard</button>
        </div>
      )}

      {/* STEP 2: Map Columns */}
      {screen === 'step2' && (
        <div className="wizard">
          <div className="wizard-logo">Annotation Studio</div>
          <div className="wizard-steps">
            <div className="wstep done"><div className="wstep-num">✓</div>Upload</div>
            <div className="wstep-line"/>
            <div className="wstep active"><div className="wstep-num">2</div>Map Columns</div>
            <div className="wstep-line"/>
            <div className="wstep"><div className="wstep-num">3</div>Set Metrics</div>
          </div>
          <div className="wizard-card">
            <div className="wizard-title">Map your columns</div>
            <div className="wizard-sub">Tell us which columns contain the content to annotate. We auto-detected the most likely matches — adjust if needed.</div>
            {headerRowIdx > 0 && <div className="header-info">↳ Auto-skipped {headerRowIdx} header/instruction row(s). Found {sheetData.length} data rows.</div>}
            <div className="col-row">
              <label>Question /<br/>Input *</label>
              <select value={colQ} onChange={e=>setColQ(e.target.value)}>{originalHeaders.map(h=><option key={h} value={h}>{h}</option>)}</select>
            </div>
            <div className="col-row">
              <label>Answer /<br/>Output *</label>
              <select value={colS} onChange={e=>setColS(e.target.value)}>{originalHeaders.map(h=><option key={h} value={h}>{h}</option>)}</select>
            </div>
            <div className="col-row">
              <label>ID / Source<br/><span style={{fontSize:'10px',fontWeight:400,color:'var(--text-faint)'}}>(optional)</span></label>
              <select value={colSrc} onChange={e=>setColSrc(e.target.value)}>
                <option value="">— none —</option>
                {originalHeaders.map(h=><option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            {uploadError && <div className="upload-error" style={{marginTop:'12px'}}>{uploadError}</div>}
            {sheetData.length > 0 && (
              <div className="data-preview">
                <div className="preview-label">Preview — Row 1</div>
                <div className="preview-row"><strong>Q:</strong> {String(sheetData[0][colQ]||'').slice(0,120)}{String(sheetData[0][colQ]||'').length>120?'…':''}</div>
                <div className="preview-row"><strong>A:</strong> {String(sheetData[0][colS]||'').slice(0,120)}{String(sheetData[0][colS]||'').length>120?'…':''}</div>
              </div>
            )}
            <div className="wizard-footer">
              <button className="btn-back" onClick={()=>setScreen('upload')}>← Back</button>
              <button className="btn-next" onClick={goToStep3}>Next: Set Metrics →</button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Set Metrics */}
      {screen === 'step3' && (
        <div className="wizard">
          <div className="wizard-logo">Annotation Studio</div>
          <div className="wizard-steps">
            <div className="wstep done"><div className="wstep-num">✓</div>Upload</div>
            <div className="wstep-line"/>
            <div className="wstep done"><div className="wstep-num">✓</div>Map Columns</div>
            <div className="wstep-line"/>
            <div className="wstep active"><div className="wstep-num">3</div>Set Metrics</div>
          </div>
          <div className="wizard-card" style={{maxWidth:'640px'}}>
            <div className="wizard-title">Define your scoring metrics</div>
            <div className="wizard-sub">We auto-detected {metrics.filter(m=>m.suggested).length} metric(s) from your file. Add, remove, or rename them. Set a scale and optionally label each score level.</div>
            {metrics.map((m) => (
              <div key={m.id} className={`metric-card${m.suggested?' suggested':''}`}>
                {metrics.length > 1 && <button className="metric-remove" onClick={()=>removeMetric(m.id)}>×</button>}
                <div className="metric-header">
                  <input className="metric-name-input" value={m.name} onChange={e=>updateMetric(m.id,{name:e.target.value})} placeholder="Metric name" />
                  {m.suggested && <span className="suggested-badge">auto-detected</span>}
                </div>
                <div className="metric-scale-wrap">
                  <span className="metric-scale-label">Scale:</span>
                  <select className="metric-scale-select" value={m.scale} onChange={e=>updateMetric(m.id,{scale:parseInt(e.target.value)})}>
                    {[2,3,4,5,7,10].map(n=><option key={n} value={n}>1 – {n}</option>)}
                  </select>
                  <span className="metric-scale-label" style={{marginLeft:'12px'}}>Label each score (optional):</span>
                </div>
                <div className="metric-labels">
                  {m.labels.map((l,i) => (
                    <div key={i} className="label-input-wrap">
                      <span className="label-num">{l.value}</span>
                      <input className="label-input" value={l.label} onChange={e=>updateLabel(m.id,i,e.target.value)} placeholder={`Score ${l.value}`} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button className="btn-add-metric" onClick={addMetric}>+ Add another metric</button>
            <div className="wizard-footer">
              <button className="btn-back" onClick={()=>setScreen('step2')}>← Back</button>
              <button className="btn-next" onClick={startAnnotation}>Start Annotating →</button>
            </div>
          </div>
        </div>
      )}

      {/* ANNOTATION SCREEN */}
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
                  <span className="card-tag tag-q">Input</span>
                  <span className="card-row-label">Row {currentIdx+1} of {total}</span>
                  {colSrc && row[colSrc] && <span className="card-tag tag-src">{row[colSrc]}</span>}
                </div>
                <div className="card-body" ref={questionRef} dangerouslySetInnerHTML={{__html: renderMD(row[colQ]||'')}} />
              </div>
              <div className="card">
                <div className="card-head"><span className="card-tag tag-s">Output</span></div>
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
                  {answeredCount===metrics.length ? <span className="score-done-badge">✓ Complete</span> : `${answeredCount} / ${metrics.length} answered`}
                </span>
              </div>

              {metrics.map((m) => {
                const cur = curScores[m.id];
                const hasVal = cur !== undefined && cur !== null && cur !== '';
                return (
                  <div key={m.id} className="score-dim">
                    <div className="score-dim-head">
                      <span className="score-dim-name">{m.name}</span>
                    </div>
                    {m.labels.some(l=>l.label) && (
                      <div className="score-dim-hint">
                        {m.labels.filter(l=>l.label).map(l=>`${l.value}=${l.label}`).join(' · ')}
                      </div>
                    )}
                    <div className="btn-row">
                      {m.labels.map((l) => {
                        const isSelected = hasVal && cur === l.value;
                        const colorIdx = Math.min(l.value, scoreColors.length-1);
                        const color = isSelected ? scoreColors[colorIdx] : null;
                        return (
                          <button key={l.value}
                            className={`score-btn${isSelected?' selected':''}`}
                            style={color ? {background:color.bg,borderColor:color.border,color:color.text} : {}}
                            onClick={()=>setScore(m.id, l.value)}>
                            {l.value}{l.label ? <><br/><span style={{fontSize:'9px',fontWeight:400}}>{l.label}</span></> : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

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