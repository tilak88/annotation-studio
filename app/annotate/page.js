'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

// ─── Smart Label Dictionary ───────────────────────────────────────────────────
const LABEL_DICT = {
  fluency:        { scale: 5, labels: ['Disfluent','Mostly disfluent','Mixed','Mostly fluent','Fluent'] },
  flow:           { scale: 5, labels: ['Disfluent','Mostly disfluent','Mixed','Mostly fluent','Fluent'] },
  naturalness:    { scale: 5, labels: ['Robotic','Mostly robotic','Mixed','Mostly natural','Natural'] },
  natural:        { scale: 5, labels: ['Robotic','Mostly robotic','Mixed','Mostly natural','Natural'] },
  readability:    { scale: 5, labels: ['Unreadable','Hard to read','Moderate','Readable','Very readable'] },
  coherence:      { scale: 5, labels: ['Incoherent','Mostly incoherent','Mixed','Mostly coherent','Coherent'] },
  coherent:       { scale: 5, labels: ['Incoherent','Mostly incoherent','Mixed','Mostly coherent','Coherent'] },
  consistency:    { scale: 5, labels: ['Inconsistent','Mostly inconsistent','Mixed','Mostly consistent','Consistent'] },
  logic:          { scale: 5, labels: ['Illogical','Mostly illogical','Mixed','Mostly logical','Logical'] },
  logical:        { scale: 5, labels: ['Illogical','Mostly illogical','Mixed','Mostly logical','Logical'] },
  reasoning:      { scale: 5, labels: ['No reasoning','Weak','Partial','Mostly sound','Sound'] },
  relevance:      { scale: 5, labels: ['Irrelevant','Slightly relevant','Somewhat relevant','Relevant','Highly relevant'] },
  relevant:       { scale: 5, labels: ['Irrelevant','Slightly relevant','Somewhat relevant','Relevant','Highly relevant'] },
  accuracy:       { scale: 5, labels: ['Wrong','Mostly wrong','Partially correct','Mostly correct','Correct'] },
  accurate:       { scale: 5, labels: ['Wrong','Mostly wrong','Partially correct','Mostly correct','Correct'] },
  correctness:    { scale: 5, labels: ['Wrong','Mostly wrong','Partially correct','Mostly correct','Correct'] },
  factuality:     { scale: 5, labels: ['Hallucinated','Mostly wrong','Partially factual','Mostly factual','Fully factual'] },
  factual:        { scale: 5, labels: ['Hallucinated','Mostly wrong','Partially factual','Mostly factual','Fully factual'] },
  adequacy:       { scale: 5, labels: ['Inadequate','Mostly inadequate','Partial','Mostly adequate','Adequate'] },
  completeness:   { scale: 5, labels: ['Incomplete','Mostly incomplete','Partial','Mostly complete','Complete'] },
  complete:       { scale: 5, labels: ['Incomplete','Mostly incomplete','Partial','Mostly complete','Complete'] },
  coverage:       { scale: 5, labels: ['No coverage','Minimal','Partial','Good','Full coverage'] },
  grammar:        { scale: 5, labels: ['Many errors','Several errors','Some errors','Minor errors','Flawless'] },
  syntax:         { scale: 5, labels: ['Many errors','Several errors','Some errors','Minor errors','Flawless'] },
  clarity:        { scale: 5, labels: ['Very unclear','Unclear','Neutral','Clear','Very clear'] },
  informativeness:{ scale: 5, labels: ['Uninformative','Slightly informative','Somewhat informative','Informative','Highly informative'] },
  informative:    { scale: 5, labels: ['Uninformative','Slightly informative','Somewhat informative','Informative','Highly informative'] },
  conciseness:    { scale: 5, labels: ['Very verbose','Verbose','Moderate','Concise','Very concise'] },
  creativity:     { scale: 5, labels: ['Not creative','Slightly creative','Moderately creative','Creative','Highly creative'] },
  diversity:      { scale: 5, labels: ['No diversity','Minimal','Moderate','Diverse','Highly diverse'] },
  confidence:     { scale: 5, labels: ['Guessing','Leaning','Moderate','Confident','Certain'] },
  certainty:      { scale: 5, labels: ['Guessing','Leaning','Moderate','Confident','Certain'] },
  difficulty:     { scale: 5, labels: ['Very easy','Easy','Moderate','Hard','Very hard'] },
  complexity:     { scale: 5, labels: ['Very simple','Simple','Moderate','Complex','Very complex'] },
  quality:        { scale: 5, labels: ['Very poor','Poor','Fair','Good','Excellent'] },
  overall:        { scale: 5, labels: ['Very poor','Poor','Fair','Good','Excellent'] },
  performance:    { scale: 5, labels: ['Very poor','Poor','Fair','Good','Excellent'] },
  sentiment:      { scale: 3, labels: ['Negative','Neutral','Positive'] },
  satisfaction:   { scale: 5, labels: ['Strongly dissatisfied','Dissatisfied','Neutral','Satisfied','Strongly satisfied'] },
  preference:     { scale: 5, labels: ['Strongly dislike','Dislike','Neutral','Like','Strongly like'] },
  agreement:      { scale: 5, labels: ['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'] },
  severity:       { scale: 5, labels: ['None','Mild','Moderate','Severe','Very severe'] },
  intensity:      { scale: 5, labels: ['None','Mild','Moderate','Intense','Very intense'] },
  pain:           { scale: 5, labels: ['No pain','Mild','Moderate','Severe','Unbearable'] },
  risk:           { scale: 5, labels: ['Very safe','Safe','Moderate risk','High risk','Very high risk'] },
  urgency:        { scale: 5, labels: ['Not urgent','Slightly urgent','Moderate','Urgent','Very urgent'] },
  human:          { scale: 2, labels: ['Human','AI generated'] },
  llm:            { scale: 2, labels: ['Human','AI generated'] },
  generated:      { scale: 2, labels: ['Human','AI generated'] },
  appropriate:    { scale: 2, labels: ['No','Yes'] },
  valid:          { scale: 2, labels: ['Invalid','Valid'] },
  translation:    { scale: 5, labels: ['Very poor','Poor','Acceptable','Good','Excellent'] },
  fidelity:       { scale: 5, labels: ['Unfaithful','Mostly unfaithful','Partial','Mostly faithful','Faithful'] },
  compliance:     { scale: 3, labels: ['Non-compliant','Partial','Compliant'] },
  ethical:        { scale: 3, labels: ['Unethical','Borderline','Ethical'] },
  bias:           { scale: 5, labels: ['Highly biased','Biased','Slightly biased','Mostly neutral','Neutral'] },
  toxicity:       { scale: 3, labels: ['Not toxic','Borderline','Toxic'] },
  harm:           { scale: 3, labels: ['No harm','Potential harm','Harmful'] },
};

const GENERIC_LABELS = {
  2: ['No','Yes'],
  3: ['Low','Medium','High'],
  5: ['Very poor','Poor','Fair','Good','Excellent'],
  7: ['Very low','Low','Below average','Average','Above average','High','Very high'],
  10: ['1','2','3','4','5','6','7','8','9','10'],
};

const SKIP_NAMES = ['note','notes','comment','comments','remark','remarks','description','desc','text','feedback','observation','observations','annotation','annotations','name','id','source','origin','label','tag','category','type','class','group','split','set','batch','index','idx','row','num','number','count'];

function getGenericLabels(scale) {
  if (GENERIC_LABELS[scale]) return GENERIC_LABELS[scale];
  return Array.from({length:scale},(_,i)=>`${i+1}`);
}

function splitCamel(str) {
  return str.replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase();
}

function smartTokenize(name) {
  let s = splitCamel(name);
  s = s.replace(/[_\-./\\()[\],;:]/g,' ').replace(/[0-9]+/g,' ').toLowerCase().replace(/\s+/g,' ').trim();
  return s.split(' ').filter(t=>t.length>1);
}

function suggestLabels(name, scale) {
  const normalized = name.toLowerCase().replace(/[^a-z]/g,'');
  if (LABEL_DICT[normalized]) {
    const d = LABEL_DICT[normalized];
    const s = scale || d.scale;
    const base = d.labels.slice(0,s);
    while (base.length < s) base.push(`Score ${base.length+1}`);
    return { scale: s, labels: base };
  }
  const tokens = smartTokenize(name);
  for (const token of tokens) {
    if (LABEL_DICT[token]) {
      const d = LABEL_DICT[token];
      const s = scale || d.scale;
      const base = d.labels.slice(0,s);
      while (base.length < s) base.push(`Score ${base.length+1}`);
      return { scale: s, labels: base };
    }
  }
  for (const token of tokens) {
    for (const key of Object.keys(LABEL_DICT)) {
      if (token.includes(key)||key.includes(token)) {
        const d = LABEL_DICT[key];
        const s = scale || d.scale;
        const base = d.labels.slice(0,s);
        while (base.length < s) base.push(`Score ${base.length+1}`);
        return { scale: s, labels: base };
      }
    }
  }
  const s = scale || 5;
  return { scale: s, labels: getGenericLabels(s) };
}

function buildLabelsForRange(start, end, existingLabels) {
  const count = Math.max(end - start + 1, 1);
  return Array.from({length:count},(_,i)=>({
    value: start+i,
    label: existingLabels?.[i]?.label ?? existingLabels?.[i] ?? '',
  }));
}

function isSkipName(name) {
  const tokens = smartTokenize(name);
  const normalized = name.toLowerCase().replace(/[^a-z]/g,'');
  if (SKIP_NAMES.includes(normalized)) return true;
  return tokens.some(t=>SKIP_NAMES.includes(t));
}

function isTextColumn(vals) {
  if (!vals.length) return false;
  const textVals = vals.filter(v=>v&&String(v).length>20);
  return textVals.length > vals.length * 0.3;
}

function detectMetrics(headers, data, displayCols) {
  const candidates = headers.filter(h=>!displayCols.includes(h));
  const results = [];
  for (const h of candidates) {
    if (isSkipName(h)) continue;
    const vals = data.map(r=>r[h]).filter(v=>v!==''&&v!==null&&v!==undefined);
    if (isTextColumn(vals)) continue;
    const isEmpty = vals.length < data.length * 0.15;
    const numVals = vals.map(v=>parseFloat(v)).filter(v=>!isNaN(v));
    const isNumeric = numVals.length >= vals.length * 0.7 && numVals.length > 0;
    const min = isNumeric ? Math.min(...numVals) : null;
    const max = isNumeric ? Math.max(...numVals) : null;
    const isTightRange = isNumeric && max <= 20 && min >= -20 && (max-min) <= 19;
    if (!isEmpty && !isTightRange) continue;
    let scaleStart = 1, scaleEnd = 5;
    if (isTightRange && (max-min) >= 1) {
      scaleStart = Math.round(min);
      scaleEnd = Math.round(max);
    }
    const scale = scaleEnd - scaleStart + 1;
    const suggested = suggestLabels(h, scale);
    results.push({
      id: Math.random().toString(36).slice(2),
      name: h,
      scaleType: isTightRange ? 'preset' : 'preset',
      scaleStart, scaleEnd, scale,
      labels: buildLabelsForRange(scaleStart, scaleEnd, suggested.labels.map(l=>({label:l}))),
      suggested: true,
    });
  }
  if (results.length === 0) {
    const suggested = suggestLabels('quality', 5);
    results.push({
      id: Math.random().toString(36).slice(2),
      name: 'Metric 1',
      scaleType: 'preset', scaleStart: 1, scaleEnd: 5, scale: 5,
      labels: buildLabelsForRange(1,5,suggested.labels.map(l=>({label:l}))),
      suggested: false,
    });
  }
  return results;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Annotate() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('upload');
  const [sheetData, setSheetData] = useState([]);
  const [originalHeaders, setOriginalHeaders] = useState([]);
  const [displayCols, setDisplayCols] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [layoutMode, setLayoutMode] = useState('tabs');
  const [scores, setScores] = useState({});
  const [notes, setNotes] = useState({});
  const [fileName, setFileName] = useState('annotated');
  const [uploadError, setUploadError] = useState('');
  const [headerRowIdx, setHeaderRowIdx] = useState(0);
  const [saveBadge, setSaveBadge] = useState('');
  const [saveFlash, setSaveFlash] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [projectLoading, setProjectLoading] = useState(false);
  const [metrics, setMetrics] = useState([]);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const fileInputRef = useRef(null);
  const leftPanelRef = useRef(null);
  const contentRefs = useRef([]);
  const storageKey = useRef('annot_tool_v1');
  const projectId = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({data}) => {
      if (!data.user) { window.location.href='/'; return; }
      setUser(data.user);
      setAuthChecked(true);
      const params = new URLSearchParams(window.location.search);
      const pid = params.get('project');
      if (pid) {
        projectId.current = pid;
        setProjectLoading(true);
        const {data:proj} = await supabase.from('projects').select('*').eq('id',pid).single();
        if (proj) {
          setFileName(proj.file_name||'project');
          setDisplayCols(proj.display_cols||[]);
          setScores(proj.scores||{});
          setNotes(proj.notes||{});
          setMetrics(proj.metrics||[]);
          setIncludeNotes(proj.include_notes!==false);
          storageKey.current='annot_'+pid;
          const cached=localStorage.getItem('sheet_'+pid);
          if (cached) {
            try {
              const parsed=JSON.parse(cached);
              setSheetData(parsed.data||[]);
              setOriginalHeaders(parsed.headers||[]);
              setHeaderRowIdx(parsed.headerRowIdx||0);
              setScreen('annotate');
            } catch(e) {}
          }
        }
        setProjectLoading(false);
      }
    });
  },[]);

  const [xlsxReady, setXlsxReady] = useState(false);

  useEffect(() => {
    if (document.getElementById('katex-css')) return;
    const link=document.createElement('link');
    link.id='katex-css';link.rel='stylesheet';
    link.href='https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css';
    document.head.appendChild(link);
    const s1=document.createElement('script');
    s1.src='https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js';
    s1.onload=()=>{
      const s2=document.createElement('script');
      s2.src='https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/contrib/auto-render.min.js';
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
    if (!document.getElementById('sheetjs-script')) {
      const s3=document.createElement('script');
      s3.id='sheetjs-script';
      s3.src='https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js';
      s3.onload=()=>setXlsxReady(true);
      document.head.appendChild(s3);
    } else {
      if (window.XLSX) setXlsxReady(true);
    }
  },[]);

  useEffect(() => {
    if (screen!=='annotate') return;
    const tryRender=()=>{
      if (window.renderMathInElement) {
        contentRefs.current.forEach(el=>{
          if (el) window.renderMathInElement(el,{
            delimiters:[
              {left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false},
              {left:'\\(',right:'\\)',display:false},{left:'\\[',right:'\\]',display:true},
            ],throwOnError:false,
          });
        });
      }
    };
    setTimeout(tryRender,100);
  },[screen,currentIdx,sheetData,activeTab,layoutMode]);

  useEffect(() => {
    if (leftPanelRef.current) leftPanelRef.current.scrollTo({top:0,behavior:'smooth'});
    setActiveTab(0);
  },[currentIdx]);

  function renderMD(text) {
    const mathBlocks=[];
    const TOKEN='~~MATH_';const TOKEND='_MATH~~';
    const protect=(m)=>{mathBlocks.push(m);return TOKEN+(mathBlocks.length-1)+TOKEND;};
    let s=String(text||'');
    s=s.replace(/\$\$[\s\S]*?\$\$/g,protect);
    s=s.replace(/\\\[[\s\S]*?\\\]/g,protect);
    s=s.replace(/\\\([\s\S]*?\\\)/g,protect);
    s=s.replace(/\$[^\$\n]+?\$/g,protect);
    s=s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    s=s.replace(/^### (.+)$/gm,'<div class="md-h3">$1</div>');
    s=s.replace(/^## (.+)$/gm,'<div class="md-h2">$1</div>');
    s=s.replace(/^# (.+)$/gm,'<div class="md-h1">$1</div>');
    s=s.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
    s=s.replace(/\*(.+?)\*/g,'<em>$1</em>');
    s=s.replace(/`([^`]+)`/g,'<code class="md-code">$1</code>');
    s=s.replace(/^---+$/gm,'<hr class="md-hr">');
    s=s.replace(/((?:^[ \t]*[-*][ \t].+\n?)+)/gm,block=>{
      const items=block.trim().split('\n').map(l=>`<li>${l.replace(/^[ \t]*[-*][ \t]/,'').trim()}</li>`).join('');
      return `<ul class="md-ul">${items}</ul>`;
    });
    s=s.replace(/((?:^[ \t]*\d+\.[ \t].+\n?)+)/gm,block=>{
      const items=block.trim().split('\n').map(l=>`<li>${l.replace(/^[ \t]*\d+\.[ \t]/,'').trim()}</li>`).join('');
      return `<ol class="md-ol">${items}</ol>`;
    });
    s=s.replace(/\n/g,'<br>');
    s=s.replace(new RegExp(TOKEN.replace(/~/g,'\\~')+'(\\d+)'+TOKEND.replace(/~/g,'\\~'),'g'),(_,i)=>mathBlocks[+i]);
    return s;
  }

  function handleFile(file) {
    setUploadError('');
    const name=file.name.replace(/\.[^.]+$/,'');
    setFileName(name);
    storageKey.current='annot_'+name;
    const reader=new FileReader();
    reader.onload=e=>{
      try {
        const XLSX=window.XLSX;
        if (!XLSX) {
          setUploadError('');
          const retry=()=>{
            if (window.XLSX) { setXlsxReady(true); handleFile(file); }
            else setTimeout(retry,500);
          };
          retry();
          return;
        }
        const wb=XLSX.read(e.target.result,{type:'array'});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const raw2D=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
        if (!raw2D.length) {setUploadError('The file appears to be empty.');return;}
        const isHeaderRow=(row)=>{
          const cells=row.map(c=>String(c||'').toLowerCase().trim());
          return cells.some(c=>['question','prompt','text','input','essay','sentence','source'].some(k=>c.includes(k)))&&
            cells.some(c=>['solution','answer','output','response','translation','target'].some(k=>c.includes(k)));
        };
        let hIdx=0;
        for (let i=0;i<Math.min(raw2D.length,15);i++){if(isHeaderRow(raw2D[i])){hIdx=i;break;}}
        setHeaderRowIdx(hIdx);
        const rawHeaders=raw2D[hIdx];
        const headers=rawHeaders.map(h=>String(h||'').trim()).filter(Boolean);
        const dataRaw=raw2D.slice(hIdx+1).filter(row=>row.some(c=>c!==''&&c!==null&&c!==undefined));
        const data=dataRaw.map(row=>{
          const obj={};
          rawHeaders.forEach((h,i)=>{if(h!==''&&h!==null&&h!==undefined)obj[String(h).trim()]=String(row[i]??'');});
          return obj;
        });
        if (!data.length) {setUploadError('No data rows found.');return;}
        setSheetData(data);
        setOriginalHeaders(headers);
        const lc=h=>h.toLowerCase();
        const findCol=(...keys)=>headers.find(h=>keys.some(k=>lc(h).includes(k)))||'';
        const q=findCol('question','prompt','text','input','essay','sentence');
        const s=findCol('solution','answer','output','response','translation');
        const initCols=[q,s].filter(Boolean);
        setDisplayCols(initCols.length>0?initCols:[headers[0]].filter(Boolean));
        localStorage.setItem('sheet_'+(projectId.current||storageKey.current),JSON.stringify({data,headers,headerRowIdx:hIdx}));
        setScreen('step2');
      } catch(err) {setUploadError('Could not read this file: '+err.message);}
    };
    reader.readAsArrayBuffer(file);
  }

  function addDisplayCol() {
    const available=originalHeaders.filter(h=>!displayCols.includes(h));
    if (available.length===0) return;
    setDisplayCols(prev=>[...prev,available[0]]);
  }

  function removeDisplayCol(idx) {
    if (displayCols.length<=1) return;
    setDisplayCols(prev=>prev.filter((_,i)=>i!==idx));
  }

  function updateDisplayCol(idx,val) {
    setDisplayCols(prev=>prev.map((c,i)=>i===idx?val:c));
  }

  function getAvailableForCol(idx) {
    return originalHeaders.filter(h=>!displayCols.includes(h)||displayCols[idx]===h);
  }

  function goToStep3() {
    const valid=displayCols.filter(Boolean);
    if (valid.length===0){setUploadError('Please select at least one content column.');return;}
    setUploadError('');
    setDisplayCols(valid);
    setMetrics(detectMetrics(originalHeaders,sheetData,valid));
    setScreen('step3');
  }

  function startAnnotation() {
    if (metrics.length===0) return;
    setCurrentIdx(0);setActiveTab(0);
    setScreen('annotate');
  }

  function addMetric() {
    const s=suggestLabels('Metric',5);
    setMetrics(prev=>[...prev,{
      id:Math.random().toString(36).slice(2),
      name:`Metric ${prev.length+1}`,
      scaleType:'preset',scaleStart:1,scaleEnd:5,scale:5,
      labels:buildLabelsForRange(1,5,s.labels.map(l=>({label:l}))),
      suggested:false,
    }]);
  }

  function removeMetric(id){setMetrics(prev=>prev.filter(m=>m.id!==id));}

  function updateMetricName(id,name) {
    setMetrics(prev=>prev.map(m=>{
      if (m.id!==id) return m;
      const s=suggestLabels(name,m.scale);
      return {...m,name,labels:buildLabelsForRange(m.scaleStart,m.scaleEnd,s.labels.map(l=>({label:l})))};
    }));
  }

  function updateMetricScale(id,scaleType,start,end) {
    setMetrics(prev=>prev.map(m=>{
      if (m.id!==id) return m;
      const safeStart=isNaN(start)?0:start;
      const safeEnd=isNaN(end)?safeStart+4:end;
      const finalEnd=safeEnd<=safeStart?safeStart+1:safeEnd;
      const scale=finalEnd-safeStart+1;
      const s=suggestLabels(m.name,scale);
      return {...m,scaleType,scaleStart:safeStart,scaleEnd:finalEnd,scale,
        labels:buildLabelsForRange(safeStart,finalEnd,s.labels.map(l=>({label:l})))};
    }));
  }

  function updateLabel(metricId,valueIdx,label) {
    setMetrics(prev=>prev.map(m=>{
      if (m.id!==metricId) return m;
      const labels=[...m.labels];
      labels[valueIdx]={...labels[valueIdx],label};
      return {...m,labels};
    }));
  }

  function isScored(idx) {
    const s=scores[idx];
    if (!s) return false;
    return metrics.every(m=>s[m.id]!==undefined&&s[m.id]!==null&&s[m.id]!=='');
  }

  function countDone(){return sheetData.filter((_,i)=>isScored(i)).length;}

  const metricRefs = useRef({});
  const rightPanelRef = useRef(null);

  function setScore(metricId,val) {
    const cur=scores[currentIdx]?.[metricId];
    const newVal=cur===val?null:val;
    const next={...scores,[currentIdx]:{...(scores[currentIdx]||{}),[metricId]:newVal}};
    if (newVal===null) delete next[currentIdx][metricId];
    setScores(next);
    persist(next,notes);
    if (autoAdvance&&newVal!==null) {
      const currentMetricIdx=metrics.findIndex(m=>m.id===metricId);
      const nextUnanswered=metrics.slice(currentMetricIdx+1).find(m=>{
        const v=next[currentIdx]?.[m.id];
        return v===undefined||v===null||v==='';
      });
      if (nextUnanswered&&metricRefs.current[nextUnanswered.id]&&rightPanelRef.current) {
        setTimeout(()=>{
          const panel=rightPanelRef.current;
          const el=metricRefs.current[nextUnanswered.id];
          if (panel&&el) {
            const panelTop=panel.getBoundingClientRect().top;
            const elTop=el.getBoundingClientRect().top;
            panel.scrollBy({top:elTop-panelTop-20,behavior:'smooth'});
          }
        },150);
      }
    }
  }

  function saveNote(val) {
    const next={...notes,[currentIdx]:val};
    setNotes(next);
    persist(scores,next);
  }

  async function persist(s,n) {
    try {
      localStorage.setItem(storageKey.current,JSON.stringify({scores:s,notes:n}));
      const done=sheetData.filter((_,i)=>{
        const sc=s[i];if(!sc)return false;
        return metrics.every(m=>sc[m.id]!==undefined&&sc[m.id]!==null&&sc[m.id]!=='');
      }).length;
      if (user) {
        const payload={scores:s,notes:n,done_rows:done,updated_at:new Date().toISOString(),
          display_cols:displayCols,metrics,include_notes:includeNotes};
        if (!projectId.current) {
          const {data}=await supabase.from('projects').insert({
            user_id:user.id,name:fileName,file_name:fileName,...payload,
            col_q:displayCols[0]||'',col_s:displayCols[1]||'',col_src:'',
            total_rows:sheetData.length,
          }).select().single();
          if (data) projectId.current=data.id;
        } else {
          await supabase.from('projects').update(payload).eq('id',projectId.current);
        }
      }
      const now=new Date();
      setSaveBadge(`${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`);
      setSaveFlash(true);
      setTimeout(()=>setSaveFlash(false),1500);
    } catch(e){}
  }

  function exportXLSX() {
    const done=countDone();const total=sheetData.length;
    if (done<total&&!confirm(`${total-done} row(s) not fully scored. Export anyway?`)) return;
    const XLSX=window.XLSX;if(!XLSX)return;
    const outputRows=sheetData.map((row,i)=>{
      const s=scores[i]||{};
      const scoreObj={};
      metrics.forEach(m=>{scoreObj[m.name]=s[m.id]??'';});
      const result={...row,...scoreObj};
      if (includeNotes) result['Annotator_Notes']=notes[i]||'';
      return result;
    });
    const wb=XLSX.utils.book_new();
    const ws=XLSX.utils.json_to_sheet(outputRows);
    XLSX.utils.book_append_sheet(wb,ws,'Annotations');
    XLSX.writeFile(wb,`${fileName}_annotated.xlsx`);
  }

  async function signOut(){await supabase.auth.signOut();window.location.href='/';}

  if (!authChecked||projectLoading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#0f1117',color:'#e2e8f8',fontFamily:'monospace',fontSize:'13px',letterSpacing:'2px'}}>
      LOADING...
    </div>
  );

  const done=countDone();
  const total=sheetData.length;
  const pct=total?(done/total*100):0;
  const row=sheetData[currentIdx]||{};
  const curScores=scores[currentIdx]||{};
  const answeredCount=metrics.filter(m=>curScores[m.id]!==undefined&&curScores[m.id]!==null&&curScores[m.id]!=='').length;
  const validDisplayCols=displayCols.filter(Boolean);

  function getScoreColor(val,scaleStart,scaleEnd) {
    const range=scaleEnd-scaleStart||1;
    const normalized=(val-scaleStart)/range;
    if (normalized<=0.2) return {bg:'#5c1a1a',border:'#f25e5e',text:'#fca5a5'};
    if (normalized<=0.4) return {bg:'#5c3010',border:'#f97316',text:'#fdba74'};
    if (normalized<=0.6) return {bg:'#4d3a00',border:'#f5a623',text:'#fcd34d'};
    if (normalized<=0.8) return {bg:'#1a3d1a',border:'#4ade80',text:'#86efac'};
    return {bg:'#0d2d0d',border:'#3ecf6e',text:'#3ecf6e'};
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--bg:#0f1117;--surface:#181c27;--surface2:#1e2335;--border:#2a3050;--accent:#4f8ef7;--accent2:#7c5fe6;--green:#3ecf6e;--amber:#f5a623;--red:#f25e5e;--text:#e2e8f8;--text-dim:#7a8aaa;--text-faint:#3a4560;--mono:'IBM Plex Mono',monospace;--sans:'IBM Plex Sans',sans-serif;--radius:10px;--topbar-h:54px}
        html{scroll-behavior:smooth}
        body{font-family:var(--sans);background:var(--bg);color:var(--text);min-height:100vh;line-height:1.6}
        .wizard{display:flex;flex-direction:column;align-items:center;min-height:100vh;padding:40px 20px;background:radial-gradient(ellipse at 50% 0%,#1a1f3a 0%,var(--bg) 60%)}
        .wizard-logo{font-family:var(--mono);font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--accent);margin-bottom:32px;opacity:.7}
        .wizard-steps{display:flex;align-items:center;margin-bottom:40px}
        .wstep{display:flex;align-items:center;gap:8px;font-size:12px;font-family:var(--mono);color:var(--text-faint)}
        .wstep.active{color:var(--accent)}.wstep.done{color:var(--green)}
        .wstep-num{width:24px;height:24px;border-radius:50%;border:1.5px solid currentColor;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0}
        .wstep-line{width:40px;height:1px;background:var(--border);margin:0 8px}
        .wizard-card{width:100%;max-width:600px;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px 32px}
        .wizard-title{font-size:20px;font-weight:700;margin-bottom:6px}
        .wizard-sub{font-size:13px;color:var(--text-dim);margin-bottom:24px;line-height:1.6}
        .drop-zone{width:100%;border:2px dashed var(--border);border-radius:12px;padding:48px 24px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;background:var(--surface2);position:relative}
        .drop-zone:hover,.drop-zone.drag-over{border-color:var(--accent);background:#1a2040}
        .drop-zone input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
        .drop-icon{font-size:40px;margin-bottom:12px;display:block}
        .drop-main{font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px}
        .drop-hint{font-size:12px;color:var(--text-dim)}
        .drop-accept{margin-top:12px;font-family:var(--mono);font-size:11px;color:var(--accent);letter-spacing:1px}
        .upload-error{margin-top:16px;color:var(--red);font-size:13px;background:rgba(242,94,94,.08);border:1px solid rgba(242,94,94,.3);border-radius:8px;padding:10px 14px;text-align:center}
        .col-row{display:flex;align-items:center;gap:10px;margin-bottom:10px}
        .col-num{font-size:11px;font-family:var(--mono);font-weight:600;padding:3px 8px;border-radius:4px;background:rgba(79,142,247,.1);color:var(--accent);white-space:nowrap}
        .col-select{flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:var(--sans);font-size:13px;padding:8px 10px;outline:none;cursor:pointer}
        .col-select:focus{border-color:var(--accent)}
        .btn-remove-col{background:transparent;border:none;color:var(--text-faint);cursor:pointer;font-size:18px;padding:2px 6px;line-height:1;border-radius:4px}
        .btn-remove-col:hover{color:var(--red);background:rgba(242,94,94,.08)}
        .btn-add-col{width:100%;padding:9px;background:transparent;border:1.5px dashed var(--border);border-radius:7px;color:var(--text-dim);font-family:var(--sans);font-size:12px;cursor:pointer;transition:all .15s;margin-top:4px}
        .btn-add-col:hover{border-color:var(--accent);color:var(--accent)}
        .header-info{margin-bottom:16px;padding:8px 12px;background:rgba(79,142,247,.08);border:1px solid rgba(79,142,247,.25);border-radius:7px;font-size:12px;color:var(--accent);font-family:var(--mono)}
        .preview-box{margin-top:16px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;overflow:hidden}
        .preview-label{padding:7px 12px;font-family:var(--mono);font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--text-dim);border-bottom:1px solid var(--border)}
        .preview-content{padding:10px 12px;font-size:12px;color:var(--text-dim);line-height:1.6;border-bottom:1px solid var(--border)}
        .preview-content:last-child{border-bottom:none}
        .preview-content strong{color:var(--text);font-weight:500}
        .metric-card{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:10px;position:relative}
        .metric-name-wrap{position:relative;margin-bottom:12px}
        .metric-name-input{width:100%;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:var(--sans);font-size:13px;font-weight:600;padding:9px 36px 9px 10px;outline:none;transition:border-color .15s}
        .metric-name-input:focus{border-color:var(--accent)}
        .edit-icon{position:absolute;right:10px;top:50%;transform:translateY(-50%);color:var(--text-faint);font-size:13px;pointer-events:none}
        .labels-hint{font-size:11px;color:var(--text-faint);margin-bottom:8px;font-style:italic}
        .metric-scale-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}
        .scale-label{font-size:11px;color:var(--text-dim);white-space:nowrap}
        .scale-select{background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:var(--mono);font-size:12px;padding:5px 8px;outline:none;cursor:pointer}
        .scale-select:focus{border-color:var(--accent)}
        .scale-input{width:64px;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text);font-family:var(--mono);font-size:12px;padding:5px 8px;outline:none;text-align:center}
        .scale-input:focus{border-color:var(--accent)}
        .metric-labels-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}
        .label-wrap{display:flex;align-items:center;gap:6px}
        .label-num{font-family:var(--mono);font-size:11px;color:var(--accent);width:22px;flex-shrink:0;text-align:right;font-weight:600}
        .label-input-wrap{flex:1;position:relative;display:flex;align-items:center}
        .label-input{flex:1;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;padding:6px 26px 6px 9px;outline:none;transition:border-color .15s,background .15s;min-width:0;width:100%}
        .label-input:hover{border-color:rgba(79,142,247,.4);background:rgba(79,142,247,.04)}
        .label-input:focus{border-color:var(--accent);background:var(--surface2)}
        .label-input::placeholder{color:var(--text-faint);font-style:italic}
        .label-pencil{position:absolute;right:7px;top:50%;transform:translateY(-50%);color:var(--text-faint);font-size:12px;pointer-events:none;transition:color .15s}
        .label-input:hover~.label-pencil,.label-input:focus~.label-pencil{color:var(--accent)}
        .label-minmax{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .metric-remove{position:absolute;top:12px;right:12px;background:transparent;border:none;color:var(--text-faint);cursor:pointer;font-size:18px;line-height:1;padding:2px 5px;border-radius:4px}
        .metric-remove:hover{color:var(--red);background:rgba(242,94,94,.08)}
        .btn-add-metric{width:100%;padding:10px;background:transparent;border:1.5px dashed var(--border);border-radius:8px;color:var(--text-dim);font-family:var(--sans);font-size:13px;cursor:pointer;transition:all .15s;margin-top:4px}
        .btn-add-metric:hover{border-color:var(--accent);color:var(--accent)}
        .notes-toggle-row{display:flex;align-items:center;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid var(--border)}
        .toggle-switch{position:relative;width:36px;height:20px;flex-shrink:0}
        .toggle-switch input{opacity:0;width:0;height:0}
        .toggle-slider{position:absolute;inset:0;background:var(--border);border-radius:99px;cursor:pointer;transition:.2s}
        .toggle-slider:before{content:'';position:absolute;width:14px;height:14px;left:3px;top:3px;background:white;border-radius:50%;transition:.2s}
        .toggle-switch input:checked+.toggle-slider{background:var(--accent)}
        .toggle-switch input:checked+.toggle-slider:before{transform:translateX(16px)}
        .toggle-label{font-size:13px;color:var(--text-dim)}
        .toggle-label strong{color:var(--text);font-weight:500}
        .wizard-footer{display:flex;justify-content:space-between;align-items:center;margin-top:24px}
        .btn-back{padding:10px 20px;background:transparent;border:1.5px solid var(--border);border-radius:8px;color:var(--text-dim);font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer;transition:all .15s}
        .btn-back:hover{border-color:var(--accent);color:var(--accent)}
        .btn-next{padding:10px 24px;background:var(--accent);border:none;border-radius:8px;color:#fff;font-family:var(--sans);font-size:13px;font-weight:700;cursor:pointer;transition:background .15s}
        .btn-next:hover{background:#3a7aec}
        .reupload-banner{background:rgba(245,166,35,.08);border:1px solid rgba(245,166,35,.3);border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:var(--amber);text-align:center}
        #topbar{position:sticky;top:0;z-index:300;background:rgba(15,17,23,0.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 20px;height:var(--topbar-h);gap:12px}
        .tb-left{display:flex;align-items:center;gap:14px;min-width:0}
        .tb-brand{font-family:var(--mono);font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--accent);white-space:nowrap;cursor:pointer}
        .tb-file{font-size:12px;color:var(--text-dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px}
        .progress-bar-wrap{flex:1;max-width:120px;height:5px;background:var(--surface2);border-radius:99px;overflow:hidden}
        .progress-bar-fill{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:99px;transition:width .3s ease}
        .progress-label{font-family:var(--mono);font-size:11px;color:var(--text-dim);white-space:nowrap}
        .tb-right{display:flex;align-items:center;gap:10px}
        .save-indicator{display:flex;align-items:center;gap:5px;font-family:var(--mono);font-size:10px;color:var(--text-faint)}
        .save-dot{width:7px;height:7px;border-radius:50%;background:var(--text-faint);transition:background .3s,box-shadow .3s;flex-shrink:0}
        .save-dot.flash{background:var(--green);box-shadow:0 0 8px var(--green)}
        .btn-export{display:flex;align-items:center;gap:7px;padding:8px 14px;background:var(--green);color:#000;font-family:var(--sans);font-size:12px;font-weight:700;border:none;border-radius:7px;cursor:pointer;transition:background .15s;white-space:nowrap}
        .btn-export:hover{background:#2ebc5c}
        .btn-export.incomplete{background:var(--amber)}
        .btn-signout{padding:6px 10px;background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--text-dim);font-size:11px;cursor:pointer;font-family:var(--sans)}
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
        .content-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:14px;overflow:hidden}
        .content-card-header{display:flex;align-items:stretch;background:var(--surface2);border-bottom:1px solid var(--border);min-height:38px}
        .tab-bar{display:flex;align-items:center;flex:1;overflow-x:auto}
        .stacked-bar{display:flex;align-items:center;flex:1}
        .tab-btn{padding:9px 16px;font-size:12px;font-family:var(--mono);color:var(--text-dim);cursor:pointer;border:none;background:transparent;border-bottom:2px solid transparent;white-space:nowrap;transition:all .15s;flex-shrink:0}
        .tab-btn.active{color:var(--accent);border-bottom-color:var(--accent)}
        .tab-btn:hover{color:var(--text)}
        .layout-toggle-btn{display:flex;align-items:center;gap:5px;padding:0 14px;font-size:11px;font-family:var(--mono);color:var(--text-dim);cursor:pointer;border:none;background:transparent;border-left:1px solid var(--border);white-space:nowrap;transition:all .15s;flex-shrink:0}
        .layout-toggle-btn:hover{color:var(--accent);background:rgba(79,142,247,.06)}
        .layout-toggle{margin-left:auto;padding:6px 10px;font-size:10px;font-family:var(--mono);color:var(--text-faint);cursor:pointer;border:none;background:transparent;border-left:1px solid var(--border);white-space:nowrap;flex-shrink:0}
        .layout-toggle:hover{color:var(--accent)}
        .card-body{padding:18px 20px;font-size:14.5px;line-height:1.9;color:#d4daf4}
        .stacked-head{padding:8px 16px;background:var(--surface2);border-bottom:1px solid var(--border);display:flex;align-items:center}
        .stacked-col-name{font-size:11px;font-family:var(--mono);color:var(--text-dim)}
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
        #score-panel-head{background:var(--surface2);padding:10px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10;gap:8px}
        #score-panel-head h2{font-size:11px;font-family:var(--mono);letter-spacing:1.5px;text-transform:uppercase;color:var(--text-dim);white-space:nowrap}
        .panel-head-right{display:flex;align-items:center;gap:8px;flex-shrink:0}
        .auto-scroll-toggle{display:flex;align-items:center;gap:5px;cursor:pointer;user-select:none}
        .auto-scroll-toggle span{font-size:10px;font-family:var(--mono);color:var(--text-faint);white-space:nowrap}
        .mini-toggle{width:30px;height:17px;border-radius:99px;border:none;outline:none;cursor:pointer;transition:background .2s;position:relative;flex-shrink:0}
        .mini-toggle::after{content:'';position:absolute;width:11px;height:11px;border-radius:50%;background:white;top:3px;transition:left .2s}
        .mini-toggle.on{background:#4f8ef7}
        .mini-toggle.on::after{left:16px}
        .mini-toggle.off{background:#2a3050}
        .mini-toggle.off::after{left:3px}
        .score-dim{padding:12px 16px;border-bottom:1px solid var(--border)}
        .score-dim:last-child{border-bottom:none}
        .score-dim-name{font-size:13px;font-weight:600;color:var(--text);margin-bottom:3px}
        .score-dim-hint{font-size:11px;color:var(--text-dim);margin-bottom:8px;font-style:italic;line-height:1.5}
        .btn-row{display:flex;flex-wrap:nowrap;gap:5px;width:100%}
        .score-btn{border:1.5px solid var(--border);background:transparent;border-radius:6px;padding:10px 4px;flex:1;font-size:13px;font-family:var(--mono);font-weight:600;cursor:pointer;color:var(--text-dim);transition:all .13s;text-align:center;height:44px;display:flex;align-items:center;justify-content:center;min-width:0}
        .score-btn:hover{border-color:var(--accent);color:var(--text);transform:translateY(-1px)}
        .score-btn.selected{transform:translateY(-1px)}
        .notes-wrap{padding:12px 16px;border-top:1px solid var(--border);background:var(--surface)}
        .notes-label{font-family:var(--mono);font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--text-dim);margin-bottom:7px;display:block}
        .notes-field{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-family:var(--sans);font-size:13px;padding:9px 11px;resize:vertical;min-height:64px;outline:none;transition:border-color .15s;line-height:1.6}
        .notes-field:focus{border-color:var(--accent)}
        .score-done-badge{display:inline-flex;align-items:center;gap:4px;background:rgba(62,207,110,.12);border:1px solid rgba(62,207,110,.3);color:var(--green);border-radius:99px;font-family:var(--mono);font-size:10px;padding:2px 8px}
        @media(max-width:780px){#split-wrap{grid-template-columns:1fr}#right-panel{position:static;height:auto;border-top:1px solid var(--border)}#left-panel{border-right:none}}
      `}</style>

      {/* STEP 1 */}
      {screen==='upload'&&(
        <div className="wizard">
          <div className="wizard-logo">Annotation Studio</div>
          <div className="wizard-steps">
            <div className="wstep active"><div className="wstep-num">1</div>Upload</div>
            <div className="wstep-line"/>
            <div className="wstep"><div className="wstep-num">2</div>Columns</div>
            <div className="wstep-line"/>
            <div className="wstep"><div className="wstep-num">3</div>Metrics</div>
          </div>
          <div className="wizard-card">
            <div className="wizard-title">Upload your dataset</div>
            <div className="wizard-sub">Drop any Excel or CSV file. Works for any research domain — NLP, medical, legal, linguistics, and more.</div>
            {projectId.current&&<div className="reupload-banner">⚠ Re-upload your file to continue — your scores are saved and will be restored automatically.</div>}
            <div className={`drop-zone${dragOver?' drag-over':''}`}
              onDragOver={e=>{e.preventDefault();setDragOver(true)}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);if(e.dataTransfer.files[0])handleFile(e.dataTransfer.files[0])}}>
              <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv" onChange={e=>{if(e.target.files?.[0])handleFile(e.target.files[0])}}/>
              <span className="drop-icon">📁</span>
              <div className="drop-main">Drop your file here</div>
              <div className="drop-hint">or click to browse</div>
              <div className="drop-accept">.xlsx · .xls · .csv</div>
            </div>
            {uploadError&&<div className="upload-error">{uploadError}</div>}
          </div>
          <button onClick={()=>window.location.href='/dashboard'} style={{marginTop:'20px',background:'transparent',border:'none',color:'#7a8aaa',fontSize:'13px',cursor:'pointer'}}>← Back to dashboard</button>
        </div>
      )}

      {/* STEP 2 */}
      {screen==='step2'&&(
        <div className="wizard">
          <div className="wizard-logo">Annotation Studio</div>
          <div className="wizard-steps">
            <div className="wstep done"><div className="wstep-num">✓</div>Upload</div>
            <div className="wstep-line"/>
            <div className="wstep active"><div className="wstep-num">2</div>Columns</div>
            <div className="wstep-line"/>
            <div className="wstep"><div className="wstep-num">3</div>Metrics</div>
          </div>
          <div className="wizard-card">
            <div className="wizard-title">Choose content columns</div>
            <div className="wizard-sub">Select which columns to show the annotator. These are excluded from metric detection. Minimum 1 column required.</div>
            {headerRowIdx>0&&<div className="header-info">↳ Auto-skipped {headerRowIdx} header/instruction row(s). Found {sheetData.length} data rows.</div>}
            {displayCols.map((col,idx)=>(
              <div key={idx} className="col-row">
                <span className="col-num">Col {idx+1}</span>
                <select className="col-select" value={col} onChange={e=>updateDisplayCol(idx,e.target.value)}>
                  <option value="">— select column —</option>
                  {getAvailableForCol(idx).map(h=><option key={h} value={h}>{h}</option>)}
                </select>
                {displayCols.length>1&&<button className="btn-remove-col" onClick={()=>removeDisplayCol(idx)}>×</button>}
              </div>
            ))}
            {displayCols.filter(Boolean).length<originalHeaders.length&&(
              <button className="btn-add-col" onClick={addDisplayCol}>+ Add another content column</button>
            )}
            {uploadError&&<div className="upload-error" style={{marginTop:'12px'}}>{uploadError}</div>}
            {displayCols.filter(Boolean).length>0&&sheetData.length>0&&(
              <div className="preview-box">
                <div className="preview-label">Preview — Row 1</div>
                {displayCols.filter(Boolean).map(col=>(
                  <div key={col} className="preview-content">
                    <strong>{col}:</strong> {String(sheetData[0][col]||'').slice(0,150)}{String(sheetData[0][col]||'').length>150?'…':''}
                  </div>
                ))}
              </div>
            )}
            <div className="wizard-footer">
              <button className="btn-back" onClick={()=>setScreen('upload')}>← Back</button>
              <button className="btn-next" onClick={goToStep3}>Next: Set Metrics →</button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {screen==='step3'&&(
        <div className="wizard">
          <div className="wizard-logo">Annotation Studio</div>
          <div className="wizard-steps">
            <div className="wstep done"><div className="wstep-num">✓</div>Upload</div>
            <div className="wstep-line"/>
            <div className="wstep done"><div className="wstep-num">✓</div>Columns</div>
            <div className="wstep-line"/>
            <div className="wstep active"><div className="wstep-num">3</div>Metrics</div>
          </div>
          <div className="wizard-card" style={{maxWidth:'660px'}}>
            <div className="wizard-title">Define your scoring metrics</div>
            <div className="wizard-sub">
              {metrics.filter(m=>m.suggested).length>0
                ?`We detected ${metrics.filter(m=>m.suggested).length} metric(s) from your file. Labels are auto-suggested — click any label to edit it.`
                :`No score columns detected. Define your metrics below — labels auto-suggest as you type the name.`}
            </div>
            {metrics.map((m)=>{
              const isCustom=m.scaleType==='custom';
              const showIndividual=m.scale<=20;
              return (
                <div key={m.id} className="metric-card">
                  {metrics.length>1&&<button className="metric-remove" onClick={()=>removeMetric(m.id)}>×</button>}
                  <div className="metric-name-wrap">
                    <input className="metric-name-input" value={m.name}
                      onChange={e=>updateMetricName(m.id,e.target.value)}
                      placeholder="Metric name (e.g. Fluency, Accuracy)"/>
                    <span className="edit-icon">✎</span>
                  </div>
                  <div className="metric-scale-row">
                    <span className="scale-label">Scale:</span>
                    <select className="scale-select" value={isCustom?'custom':m.scale}
                      onChange={e=>{
                        if (e.target.value==='custom') updateMetricScale(m.id,'custom',m.scaleStart,m.scaleEnd);
                        else {const n=parseInt(e.target.value);updateMetricScale(m.id,'preset',1,n);}
                      }}>
                      {[2,3,4,5,7,10].map(n=><option key={n} value={n}>1 – {n}</option>)}
                      <option value="custom">Custom range…</option>
                    </select>
                    {isCustom&&(
                      <>
                        <span className="scale-label">from</span>
                        <input className="scale-input" type="number" value={m.scaleStart}
                          onChange={e=>updateMetricScale(m.id,'custom',parseInt(e.target.value),m.scaleEnd)}/>
                        <span className="scale-label">to</span>
                        <input className="scale-input" type="number" value={m.scaleEnd}
                          onChange={e=>updateMetricScale(m.id,'custom',m.scaleStart,parseInt(e.target.value))}/>
                      </>
                    )}
                  </div>
                  <div className="labels-section">
                  {showIndividual?(
                    <div className="metric-labels-grid">
                      {m.labels.map((l,i)=>(
                        <div key={i} className="label-wrap">
                          <span className="label-num">{l.value}</span>
                          <div className="label-input-wrap">
                            <input className="label-input" value={l.label}
                              onChange={e=>updateLabel(m.id,i,e.target.value)}
                              placeholder={`Score ${l.value}…`}/>
                            <span className="label-pencil">✎</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ):(
                    <div className="label-minmax">
                      <div className="label-wrap">
                        <span className="label-num">{m.scaleStart}</span>
                        <div className="label-input-wrap">
                          <input className="label-input" value={m.labels[0]?.label||''}
                            onChange={e=>updateLabel(m.id,0,e.target.value)} placeholder="Min label…"/>
                          <span className="label-pencil">✎</span>
                        </div>
                      </div>
                      <div className="label-wrap">
                        <span className="label-num">{m.scaleEnd}</span>
                        <div className="label-input-wrap">
                          <input className="label-input" value={m.labels[m.labels.length-1]?.label||''}
                            onChange={e=>updateLabel(m.id,m.labels.length-1,e.target.value)} placeholder="Max label…"/>
                          <span className="label-pencil">✎</span>
                        </div>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
            <button className="btn-add-metric" onClick={addMetric}>+ Add another metric</button>
            <div className="notes-toggle-row">
              <label className="toggle-switch">
                <input type="checkbox" checked={includeNotes} onChange={e=>setIncludeNotes(e.target.checked)}/>
                <span className="toggle-slider"></span>
              </label>
              <span className="toggle-label"><strong>Include annotator notes</strong> — an optional free-text field shown during annotation and exported as a column</span>
            </div>
            <div className="wizard-footer">
              <button className="btn-back" onClick={()=>setScreen('step2')}>← Back</button>
              <button className="btn-next" onClick={startAnnotation}>Start Annotating →</button>
            </div>
          </div>
        </div>
      )}

      {/* ANNOTATION */}
      {screen==='annotate'&&(
        <div>
          <div id="topbar">
            <div className="tb-left">
              <span className="tb-brand" onClick={()=>window.location.href='/dashboard'}>← Dashboard</span>
              <span className="tb-file">{fileName}</span>
              <div className="progress-bar-wrap"><div className="progress-bar-fill" style={{width:pct+'%'}}></div></div>
              <span className="progress-label">{done} / {total}</span>
            </div>
            <div className="tb-right">
              <div className="save-indicator">
                <div className={`save-dot${saveFlash?' flash':''}`}></div>
                {saveBadge||'not saved yet'}
              </div>
              <button className={`btn-export${done<total?' incomplete':''}`} onClick={exportXLSX}>⬇ Export</button>
              <button className="btn-signout" onClick={signOut}>Sign out</button>
            </div>
          </div>

          <div id="pill-bar">
            <span className="pill-label">Row</span>
            {sheetData.map((_,i)=>(
              <button key={i} className={`nav-pill${isScored(i)?' done':''}${i===currentIdx?' active':''}`}
                onClick={()=>setCurrentIdx(i)}>{i+1}</button>
            ))}
          </div>

          <div id="split-wrap">
            <div id="left-panel" ref={leftPanelRef}>
              <div className="content-card">
                <div className="content-card-header">
                  {layoutMode==='tabs'?(
                    <div className="tab-bar">
                      {validDisplayCols.map((col,i)=>(
                        <button key={col} className={`tab-btn${activeTab===i?' active':''}`}
                          onClick={()=>setActiveTab(i)}>{col}</button>
                      ))}
                    </div>
                  ):(
                    <div className="stacked-bar">
                      <span style={{fontSize:'11px',fontFamily:'var(--mono)',color:'var(--text-dim)',padding:'0 14px'}}>All columns</span>
                    </div>
                  )}
                  {validDisplayCols.length>1&&(
                    <button className="layout-toggle-btn"
                      onClick={()=>setLayoutMode(m=>m==='tabs'?'stacked':'tabs')}
                      title={layoutMode==='tabs'?'Switch to stacked view':'Switch to tab view'}>
                      {layoutMode==='tabs'?'⊟ Stack':'⊡ Tabs'}
                    </button>
                  )}
                </div>
                {layoutMode==='tabs'?(
                  <div className="card-body"
                    ref={el=>contentRefs.current[0]=el}
                    dangerouslySetInnerHTML={{__html:renderMD(row[validDisplayCols[activeTab]]||'')}}/>
                ):(
                  <>
                    {validDisplayCols.map((col,i)=>(
                      <div key={col}>
                        <div className="stacked-head">
                          <span className="stacked-col-name">{col}</span>
                        </div>
                        <div className="card-body" ref={el=>contentRefs.current[i]=el}
                          dangerouslySetInnerHTML={{__html:renderMD(row[col]||'')}}/>
                        {i<validDisplayCols.length-1&&<div style={{borderTop:'1px solid var(--border)'}}/>}
                      </div>
                    ))}
                  </>
                )}
              </div>
              <div id="bottom-nav">
                <button className="nav-btn" disabled={currentIdx===0} onClick={()=>setCurrentIdx(i=>i-1)}>← Prev</button>
                <div id="nav-center">Row {currentIdx+1} of {total}</div>
                <button className={`nav-btn${currentIdx<total-1?' primary':''}`} disabled={currentIdx===total-1}
                  onClick={()=>setCurrentIdx(i=>i+1)}>Next →</button>
              </div>
            </div>

            <div id="right-panel" ref={rightPanelRef}>
              <div id="score-panel-head">
                <h2>Scoring Panel</h2>
                <div className="panel-head-right">
                  <span className="score-completion">
                    {answeredCount===metrics.length
                      ?<span className="score-done-badge">✓ Complete</span>
                      :`${answeredCount} / ${metrics.length}`}
                  </span>
                  <label style={{display:'flex',alignItems:'center',gap:'5px',cursor:'pointer'}}>
                    <input type="checkbox" checked={autoAdvance} onChange={e=>setAutoAdvance(e.target.checked)} style={{width:'13px',height:'13px',accentColor:'#4f8ef7',cursor:'pointer'}}/>
                    <span style={{fontSize:'10px',fontFamily:'var(--mono)',color:'var(--text-faint)'}}>Auto-scroll</span>
                  </label>
                </div>
              </div>

              {metrics.map((m)=>{
                const cur=curScores[m.id];
                const hasVal=cur!==undefined&&cur!==null&&cur!=='';
                const hintLabels=m.labels.filter(l=>l.label);
                return (
                  <div key={m.id} className="score-dim" ref={el=>metricRefs.current[m.id]=el}>
                    <div className="score-dim-name">{m.name}</div>
                    {hintLabels.length>0&&(
                      <div className="score-dim-hint">
                        {m.scale<=7
                          ?hintLabels.map(l=>`${l.value}=${l.label}`).join(' · ')
                          :`${m.labels[0]?.label?`${m.scaleStart}=${m.labels[0].label}`:''}${m.labels[m.labels.length-1]?.label?` · ${m.scaleEnd}=${m.labels[m.labels.length-1].label}`:''}`
                        }
                      </div>
                    )}
                    <div className="btn-row">
                      {m.labels.map((l)=>{
                        const isSelected=hasVal&&cur===l.value;
                        const color=isSelected?getScoreColor(l.value,m.scaleStart,m.scaleEnd):null;
                        return (
                          <button key={l.value}
                            className={`score-btn${isSelected?' selected':''}`}
                            style={color?{background:color.bg,borderColor:color.border,color:color.text}:{}}
                            onClick={()=>setScore(m.id,l.value)}>
                            {l.value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {includeNotes&&(
                <div className="notes-wrap">
                  <span className="notes-label">Annotator notes <span style={{color:'var(--text-faint)',fontStyle:'italic',fontWeight:400}}>(optional)</span></span>
                  <textarea className="notes-field" placeholder="Any additional observations — leave empty to skip…"
                    value={notes[currentIdx]||''} onChange={e=>saveNote(e.target.value)}/>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}