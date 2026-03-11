import { useState, useMemo, useRef, useEffect } from "react";

// ─── Palette & Tokens ─────────────────────────────────────────────────────────
const PILLAR_COLORS = ["#8b5cf6","#2563eb","#059669","#dc2626","#d97706","#0891b2","#7c3aed","#65a30d"];

const C = {
  bg:       "#f9f9f8",
  surface:  "#ffffff",
  surf2:    "#f5f5f4",
  border:   "#e7e7e5",
  border2:  "#d1d1ce",
  text:     "#1a1a17",
  muted:    "#6b7280",
  dim:      "#9ca3af",
  accent:   "#8b5cf6",
  accentBg: "#f5f3ff",
  green:    "#059669",
  red:      "#dc2626",
  amber:    "#d97706",
};

// Complexity → bubble fill color
function complexityColor(complexity) {
  if (complexity <= 3) return "#059669";      // green = easy
  if (complexity <= 6) return "#d97706";      // amber = medium
  return "#dc2626";                           // red = very complex
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 9); }

function getPairs(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i++)
    for (let j = i + 1; j < arr.length; j++)
      out.push([arr[i], arr[j]]);
  return out;
}

function calcWeights(pillars, comps) {
  if (!pillars.length) return {};
  if (pillars.length === 1) return { [pillars[0].id]: 100 };
  const scores = Object.fromEntries(pillars.map(p => [p.id, 0]));
  getPairs(pillars).forEach(([a, b]) => {
    const v = comps[`${a.id}_${b.id}`] ?? 50;
    scores[a.id] += v;
    scores[b.id] += (100 - v);
  });
  const total = Object.values(scores).reduce((s, v) => s + v, 0);
  return Object.fromEntries(
    pillars.map(p => [p.id, total ? +(scores[p.id] / total * 100).toFixed(1) : 0])
  );
}

function calcStrategic(dec, pillars, weights) {
  return Math.round(pillars.reduce((sum, p) =>
    sum + (weights[p.id] || 0) / 100 * (dec.pillarScores?.[p.id] ?? 0) / 100 * 100
  , 0));
}

function calcEase(dec) {
  const c = dec.cost ?? 5, r = dec.risk ?? 5, x = dec.complexity ?? 5;
  return +((10 - (c + r + x) / 3).toFixed(1));
}

// ─── PairSlider ───────────────────────────────────────────────────────────────
function PairSlider({ pA, pB, value, onChange }) {
  const diff = Math.abs(value - 50);
  const word = diff <= 5 ? "equally important"
    : diff <= 15 ? `${value > 50 ? pA.name : pB.name} slightly more important`
    : diff <= 30 ? `${value > 50 ? pA.name : pB.name} moderately more important`
    : diff <= 42 ? `${value > 50 ? pA.name : pB.name} considerably more important`
    : `${value > 50 ? pA.name : pB.name} decisively more important`;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: pA.color, flexShrink: 0 }} />
            <span style={{ fontSize: 18, fontWeight: 600, color: C.text }}>{pA.name}</span>
          </div>
          {pA.description && <p style={{ fontSize: 13, color: C.muted, marginLeft: 18, lineHeight: 1.5 }}>{pA.description}</p>}
          {pA.objectives.length > 0 && (
            <div style={{ marginLeft: 18, marginTop: 6 }}>
              {pA.objectives.map(o => (
                <div key={o.id} style={{ fontSize: 12, color: C.dim, padding: "2px 0", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: pA.color, display: "inline-block", flexShrink: 0 }} />
                  {o.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ color: C.dim, fontSize: 13, fontStyle: "italic", alignSelf: "center", flexShrink: 0 }}>vs</div>
        <div style={{ flex: 1, textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: C.text }}>{pB.name}</span>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: pB.color, flexShrink: 0 }} />
          </div>
          {pB.description && <p style={{ fontSize: 13, color: C.muted, marginRight: 18, lineHeight: 1.5 }}>{pB.description}</p>}
          {pB.objectives.length > 0 && (
            <div style={{ marginRight: 18, marginTop: 6 }}>
              {pB.objectives.map(o => (
                <div key={o.id} style={{ fontSize: 12, color: C.dim, padding: "2px 0", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
                  {o.name}
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: pB.color, display: "inline-block", flexShrink: 0 }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: 16 }}>
        <input type="range" min={0} max={100} value={value}
          onChange={e => onChange(+e.target.value)}
          className="pair-slider"
          style={{ background: `linear-gradient(to right, ${pA.color} 0%, ${pA.color} ${value}%, ${pB.color} ${value}%, ${pB.color} 100%)` }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: pA.color }}>{Math.round(value)}%</div>
        <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", textAlign: "center", padding: "5px 14px", border: `1px solid ${C.border}`, borderRadius: 20, background: C.surf2, maxWidth: 260, lineHeight: 1.4 }}>
          {word}
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: pB.color }}>{Math.round(100 - value)}%</div>
      </div>
    </div>
  );
}

// ─── ScoreSlider ──────────────────────────────────────────────────────────────
function ScoreSlider({ value, onChange, color, min = 0, max = 100, label, sublabel, disabled = false }) {
  const pct = (value - min) / (max - min) * 100;
  return (
    <div style={{ marginBottom: 20, opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? "none" : "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>{label}</div>
          {sublabel && <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{sublabel}</div>}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: color || C.accent, lineHeight: 1 }}>{value}</div>
      </div>
      <div style={{ position: "relative", height: 24, display: "flex", alignItems: "center" }}>
        <input type="range" min={min} max={max} value={value} disabled={disabled}
          onChange={e => onChange(+e.target.value)}
          className="score-slider"
          style={{ width: "100%", background: `linear-gradient(to right, ${color || C.accent} 0%, ${color || C.accent} ${pct}%, ${C.border} ${pct}%, ${C.border} 100%)` }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ fontSize: 10, color: C.dim }}>{min}</span>
        <span style={{ fontSize: 10, color: C.dim }}>{max}</span>
      </div>
    </div>
  );
}

// ─── WeightBar ────────────────────────────────────────────────────────────────
function WeightBar({ pillar, weight, max }) {
  const pct = max > 0 ? (weight / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: pillar.color, flexShrink: 0 }} />
          <span style={{ fontSize: 15, fontWeight: 500, color: C.text }}>{pillar.name}</span>
        </div>
        <span style={{ fontSize: 18, fontWeight: 700, color: pillar.color }}>{weight.toFixed(1)}<span style={{ fontSize: 12, fontWeight: 400, color: C.muted }}>%</span></span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: C.surf2, overflow: "hidden", border: `1px solid ${C.border}` }}>
        <div style={{ height: "100%", borderRadius: 4, background: pillar.color, width: `${pct}%`, transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
      </div>
    </div>
  );
}

// BubbleShape is inlined in the Scatter shape prop below

// ─── Custom SVG Bubble Chart ──────────────────────────────────────────────────
function BubbleChart({ data }) {
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);

  const W = 740, H = 420;
  const margin = { top: 20, right: 40, bottom: 56, left: 54 };
  const innerW = W - margin.left - margin.right;
  const innerH = H - margin.top - margin.bottom;

  // Scale helpers
  const xScale = v => (v / 10) * innerW;                  // ease 0–10
  const yScale = v => innerH - (v / 100) * innerH;        // strategic 0–100
  const rScale = cost => 14 + (cost - 1) / 9 * 22;        // cost 1–10 → r 14–36

  const xTicks = [0,1,2,3,4,5,6,7,8,9,10];
  const yTicks = [0,20,40,60,80,100];

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        <defs>
          <clipPath id="chart-area">
            <rect x={0} y={0} width={innerW} height={innerH} />
          </clipPath>
        </defs>

        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Grid lines */}
          {yTicks.map(v => (
            <line key={v} x1={0} x2={innerW} y1={yScale(v)} y2={yScale(v)}
              stroke="#e7e7e5" strokeWidth={1} strokeDasharray={v===50?"6 4":"3 3"} />
          ))}
          {xTicks.map(v => (
            <line key={v} x1={xScale(v)} x2={xScale(v)} y1={0} y2={innerH}
              stroke="#e7e7e5" strokeWidth={1} strokeDasharray={v===5?"6 4":"3 3"} />
          ))}

          {/* Reference line labels */}
          <text x={xScale(5)+4} y={4} fontSize={9} fill="#d1d1ce" fontFamily="system-ui">mid</text>
          <text x={4} y={yScale(50)-4} fontSize={9} fill="#d1d1ce" fontFamily="system-ui">50</text>

          {/* Quadrant shading */}
          <rect x={xScale(5)} y={0} width={innerW-xScale(5)} height={yScale(50)}
            fill="#05966908" />

          {/* Bubbles — render in order of size so smaller ones are on top */}
          {[...data].sort((a,b) => b.rawCost - a.rawCost).map((d, i) => {
            const cx = xScale(d.ease);
            const cy = yScale(d.strategic);
            const r  = rScale(d.rawCost);
            const fill = complexityColor(d.rawComplexity);
            return (
              <g key={i} style={{ cursor: "pointer" }}
                onMouseEnter={e => setTooltip({ d, cx: cx + margin.left, cy: cy + margin.top })}
                onMouseLeave={() => setTooltip(null)}>
                <circle cx={cx} cy={cy} r={r} fill={fill} fillOpacity={0.55} stroke="none" />
                <text x={cx} y={cy + r + 13} textAnchor="middle"
                  fontSize={11} fill="#6b7280" fontFamily="system-ui, sans-serif" fontWeight="500">
                  {d.name.length > 17 ? d.name.slice(0,16)+"…" : d.name}
                </text>
              </g>
            );
          })}

          {/* X axis */}
          <line x1={0} x2={innerW} y1={innerH} y2={innerH} stroke="#d1d1ce" strokeWidth={1} />
          {xTicks.map(v => (
            <g key={v}>
              <line x1={xScale(v)} x2={xScale(v)} y1={innerH} y2={innerH+5} stroke="#d1d1ce" />
              <text x={xScale(v)} y={innerH+16} textAnchor="middle" fontSize={11} fill="#9ca3af" fontFamily="system-ui">{v}</text>
            </g>
          ))}
          <text x={innerW/2} y={innerH+42} textAnchor="middle" fontSize={12} fill="#6b7280" fontFamily="system-ui">
            Ease of Execution →
          </text>

          {/* Y axis */}
          <line x1={0} x2={0} y1={0} y2={innerH} stroke="#d1d1ce" strokeWidth={1} />
          {yTicks.map(v => (
            <g key={v}>
              <line x1={-5} x2={0} y1={yScale(v)} y2={yScale(v)} stroke="#d1d1ce" />
              <text x={-10} y={yScale(v)+1} textAnchor="end" dominantBaseline="central" fontSize={11} fill="#9ca3af" fontFamily="system-ui">{v}</text>
            </g>
          ))}
          <text transform={`translate(${-38},${innerH/2}) rotate(-90)`} textAnchor="middle" fontSize={12} fill="#6b7280" fontFamily="system-ui">
            Strategic Value →
          </text>

          {/* Quadrant corner labels */}
          <text x={8} y={14} fontSize={9} fontWeight="600" fill="#9ca3af" fontFamily="system-ui" letterSpacing="0.08em" textTransform="uppercase">HARD · HIGH VALUE</text>
          <text x={xScale(5)+8} y={14} fontSize={9} fontWeight="600" fill="#05966988" fontFamily="system-ui" letterSpacing="0.08em">★ EASY · HIGH VALUE</text>
          <text x={8} y={innerH-8} fontSize={9} fontWeight="600" fill="#d1d1ce" fontFamily="system-ui">HARD · LOW VALUE</text>
          <text x={xScale(5)+8} y={innerH-8} fontSize={9} fontWeight="600" fill="#d1d1ce" fontFamily="system-ui">EASY · LOW VALUE</text>
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (() => {
        const d = tooltip.d;
        const fill = complexityColor(d.rawComplexity);
        const complexLabel = d.rawComplexity<=3?"Low":d.rawComplexity<=6?"Medium":"High";
        return (
          <div style={{
            position: "absolute", pointerEvents: "none",
            left: tooltip.cx + 16, top: Math.max(0, tooltip.cy - 80),
            background: "#fff", border: "1px solid #e7e7e5", borderRadius: 10,
            padding: "14px 18px", fontSize: 13, minWidth: 220,
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 10,
          }}>
            <div style={{ fontWeight: 700, color: fill, marginBottom: 10, fontSize: 15, borderBottom: "1px solid #e7e7e5", paddingBottom: 8 }}>{d.name}</div>
            {/* Primary score */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #f0f0ef" }}>
              <span style={{ color: "#6b7280", fontWeight: 600 }}>Strategic Value</span>
              <span style={{ fontWeight: 800, fontSize: 22, color: d.strategic > 66 ? "#059669" : d.strategic > 33 ? "#d97706" : "#dc2626" }}>{d.strategic}<span style={{ fontSize: 12, fontWeight: 400, color: "#9ca3af" }}>/100</span></span>
            </div>
            {/* Implementation factors */}
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "6px 12px", alignItems: "center", marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #f0f0ef" }}>
              <span style={{ color: "#9ca3af", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Cost</span>
              <div style={{ height: 5, borderRadius: 3, background: "#f5f5f4", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${d.rawCost/10*100}%`, background: "#dc2626", borderRadius: 3 }} />
              </div>
              <span style={{ fontWeight: 700, color: "#dc2626", textAlign: "right" }}>{d.rawCost}/10</span>

              <span style={{ color: "#9ca3af", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Risk</span>
              <div style={{ height: 5, borderRadius: 3, background: "#f5f5f4", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${d.rawRisk/10*100}%`, background: "#d97706", borderRadius: 3 }} />
              </div>
              <span style={{ fontWeight: 700, color: "#d97706", textAlign: "right" }}>{d.rawRisk}/10</span>

              <span style={{ color: "#9ca3af", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Complexity</span>
              <div style={{ height: 5, borderRadius: 3, background: "#f5f5f4", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${d.rawComplexity/10*100}%`, background: fill, borderRadius: 3 }} />
              </div>
              <span style={{ fontWeight: 700, color: fill, textAlign: "right" }}>{d.rawComplexity}/10</span>

              <span style={{ color: "#9ca3af", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Ease</span>
              <div style={{ height: 5, borderRadius: 3, background: "#f5f5f4", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${d.ease/10*100}%`, background: "#059669", borderRadius: 3 }} />
              </div>
              <span style={{ fontWeight: 700, color: "#059669", textAlign: "right" }}>{d.ease}/10</span>
            </div>
            {/* Pillar scores */}
            {d.pillarScores && Object.keys(d.pillarScores).length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Pillar Alignment</div>
                {d.pillarNames && d.pillarNames.map((pn, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "5px 12px", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>{pn.name}</span>
                    <div style={{ height: 5, borderRadius: 3, background: "#f5f5f4", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pn.score}%`, background: pn.color, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: pn.color, textAlign: "right" }}>{pn.score}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ─── Seed Data ────────────────────────────────────────────────────────────────
const SEED_PILLARS = [
  { id: "p1", name: "Generate Revenue",   description: "Drive top-line growth and expand our client base", objectives: [{ id:"o1", name:"Increase revenue 20% YoY" },{ id:"o2", name:"Expand to two new markets" }], color: PILLAR_COLORS[0] },
  { id: "p2", name: "Improve Operations", description: "Increase efficiency, reduce waste, and scale delivery", objectives: [{ id:"o3", name:"Reduce delivery time by 30%" },{ id:"o4", name:"Automate repetitive workflows" }], color: PILLAR_COLORS[1] },
  { id: "p3", name: "Improve Culture",    description: "Strengthen team cohesion, engagement, and firm identity", objectives: [{ id:"o5", name:"Achieve 85%+ engagement score" },{ id:"o6", name:"Reduce voluntary turnover" }], color: PILLAR_COLORS[2] },
];
// Pairwise: Revenue > Operations > Culture
const SEED_COMPS = { "p1_p2": 65, "p1_p3": 62, "p2_p3": 58 };

const SEED_DECISIONS = [
  { id: "d1", name: "Hire a Rock Star",
    pillarScores: { p1: 85, p2: 40, p3: 62 },
    cost: 8, risk: 6, complexity: 4 },
  { id: "d2", name: "Team Coaching Program",
    pillarScores: { p1: 38, p2: 65, p3: 90 },
    cost: 4, risk: 2, complexity: 3 },
  { id: "d3", name: "New Software Platform",
    pillarScores: { p1: 55, p2: 88, p3: 30 },
    cost: 7, risk: 5, complexity: 8 },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DecisionFramework() {
  const [step, setStep]             = useState(5);
  const [pillars, setPillars]       = useState(SEED_PILLARS);
  const [newName, setNewName]       = useState("");
  const [newDesc, setNewDesc]       = useState("");
  const [expandedP, setExpandedP]   = useState(null);
  const [newObjText, setNewObjText] = useState("");
  const [comps, setComps]           = useState(SEED_COMPS);
  const [pairIdx, setPairIdx]       = useState(0);
  const [decisions, setDecisions]   = useState(SEED_DECISIONS);
  const [newDecName, setNewDecName] = useState("");
  const [openId, setOpenId]         = useState(null);
  const [locked, setLocked]         = useState(new Set(["d1","d2","d3"]));

  const pairs   = useMemo(() => getPairs(pillars), [pillars]);
  const weights = useMemo(() => calcWeights(pillars, comps), [pillars, comps]);
  const maxW    = useMemo(() => Math.max(...Object.values(weights), 0), [weights]);

  const scored = useMemo(() => decisions.map(d => ({
    ...d,
    strategic: calcStrategic(d, pillars, weights),
    ease:      calcEase(d),
  })), [decisions, pillars, weights]);

  const bubbleData = useMemo(() => scored.map(d => ({
    x:             calcEase(d),
    y:             d.strategic,
    z:             (d.cost ?? 5) * 70 + 120,
    strategic:     d.strategic,
    ease:          calcEase(d),
    name:          d.name,
    rawCost:       d.cost ?? 5,
    rawRisk:       d.risk ?? 5,
    rawComplexity: d.complexity ?? 5,
    pillarScores:  d.pillarScores ?? {},
    pillarNames:   pillars.map(p => ({ name: p.name, score: d.pillarScores?.[p.id] ?? 0, color: p.color })),
  })), [scored, pillars]);

  // ── Ops ──
  const addPillar = () => {
    if (!newName.trim() || pillars.length >= 8) return;
    setPillars(p => [...p, { id: uid(), name: newName.trim(), description: newDesc.trim(), objectives: [], color: PILLAR_COLORS[p.length % PILLAR_COLORS.length] }]);
    setNewName(""); setNewDesc("");
  };
  const removePillar = id => {
    setPillars(p => p.filter(x => x.id !== id));
    setComps(c => { const n = { ...c }; Object.keys(n).filter(k => k.includes(id)).forEach(k => delete n[k]); return n; });
  };
  const addObjective = pid => {
    if (!newObjText.trim()) return;
    setPillars(p => p.map(x => x.id === pid ? { ...x, objectives: [...x.objectives, { id: uid(), name: newObjText.trim() }] } : x));
    setNewObjText("");
  };
  const removeObjective = (pid, oid) => setPillars(p => p.map(x => x.id === pid ? { ...x, objectives: x.objectives.filter(o => o.id !== oid) } : x));

  const getComp = (a, b) => comps[`${a}_${b}`] ?? 50;
  const setComp = (a, b, v) => setComps(c => ({ ...c, [`${a}_${b}`]: v }));

  const addDecision = () => {
    if (!newDecName.trim()) return;
    const d = { id: uid(), name: newDecName.trim(), pillarScores: {}, cost: 5, risk: 5, complexity: 5 };
    setDecisions(p => [...p, d]);
    setOpenId(d.id);
    setNewDecName("");
  };
  const removeDecision = id => {
    setDecisions(p => p.filter(d => d.id !== id));
    if (openId === id) setOpenId(null);
    setLocked(l => { const n = new Set(l); n.delete(id); return n; });
  };
  const updateDec = (id, field, val) => setDecisions(p => p.map(d => d.id === id ? { ...d, [field]: val } : d));
  const updatePS  = (did, pid, val)  => setDecisions(p => p.map(d => d.id === did ? { ...d, pillarScores: { ...d.pillarScores, [pid]: val } } : d));

  const isLocked  = id => locked.has(id);
  const lockDec   = id => { setLocked(l => { const n = new Set(l); n.add(id); return n; }); setOpenId(null); };
  const unlockDec = id => { setLocked(l => { const n = new Set(l); n.delete(id); return n; }); setOpenId(id); };

  const isFullyScored = dec => pillars.length > 0 && pillars.every(p => (dec.pillarScores?.[p.id] ?? -1) >= 0);

  const numPairsSet = pairs.filter(([a, b]) => comps[`${a.id}_${b.id}`] !== undefined).length;

  // ── Styles ──
  const btn = (v = "default") => ({
    padding: "8px 18px", borderRadius: 7, fontSize: 14, fontWeight: 500,
    cursor: "pointer", lineHeight: 1, fontFamily: "inherit",
    border: v === "primary" ? "none" : v === "lock" ? `1px solid ${C.green}55` : v === "unlock" ? `1px solid ${C.green}55` : `1px solid ${C.border}`,
    background: v === "primary" ? C.accent : v === "danger" ? "#fef2f2" : v === "lock" ? "#f0fdf4" : v === "unlock" ? "#f0fdf4" : C.surface,
    color: v === "primary" ? "#fff" : v === "danger" ? C.red : v === "lock" || v === "unlock" ? C.green : C.text,
    transition: "all 0.15s",
  });
  const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 12 };
  const lbl  = { fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 };
  const STEPS = ["Pillars", "Compare", "Weights", "Decisions", "Insights"];

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", background: C.bg, minHeight: "100vh", color: C.text }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::placeholder { color: ${C.dim}; }
        input[type=text] {
          background: ${C.surface}; border: 1px solid ${C.border}; border-radius: 8px;
          color: ${C.text}; font-family: inherit; font-size: 14px;
          padding: 9px 13px; width: 100%; outline: none; transition: border-color 0.15s;
        }
        input[type=text]:focus { border-color: ${C.accent}; box-shadow: 0 0 0 3px ${C.accentBg}; }
        button { font-family: inherit; }
        button:hover { opacity: 0.85; }
        button:active { transform: scale(0.98); }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: ${C.border2}; border-radius: 3px; }

        input.pair-slider { -webkit-appearance: none; width: 100%; height: 10px; border-radius: 5px; outline: none; cursor: ew-resize; }
        input.pair-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 28px; height: 28px; border-radius: 50%; background: ${C.surface}; border: 3px solid ${C.accent}; cursor: ew-resize; box-shadow: 0 1px 6px rgba(0,0,0,0.15); }
        input.pair-slider::-moz-range-thumb { width: 28px; height: 28px; border-radius: 50%; background: ${C.surface}; border: 3px solid ${C.accent}; }

        input.score-slider { -webkit-appearance: none; height: 6px; border-radius: 3px; outline: none; cursor: pointer; }
        input.score-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: ${C.surface}; border: 2px solid; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.15); }
        input.score-slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: ${C.surface}; border: 2px solid; cursor: pointer; }
        input.score-slider:disabled { cursor: not-allowed; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .fade { animation: fadeUp 0.25s ease both; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 20, height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="white" strokeWidth="1.5"/>
              <path d="M4 7h6M7 4v6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Strategic Decision Framework</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {STEPS.map((s, i) => {
            const n = i + 1, active = step === n, done = step > n;
            const canGo = done || active || (n === 2 && pillars.length >= 2) || n === 3 || n === 4 || (n === 5 && decisions.length >= 2);
            return (
              <button key={n} onClick={() => canGo && setStep(n)} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "5px 12px",
                borderRadius: 6, border: "none",
                background: active ? C.accentBg : "transparent",
                color: active ? C.accent : done ? C.muted : C.dim,
                cursor: canGo ? "pointer" : "default", fontSize: 13, fontWeight: active ? 600 : 400, fontFamily: "inherit",
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: "50%", flexShrink: 0, fontSize: 10, fontWeight: 600,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: active ? C.accent : done ? C.green : C.surf2,
                  color: (active || done) ? "#fff" : C.dim,
                }}>{done ? "✓" : n}</span>
                {s}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 20px 80px" }}>

        {/* ═══ STEP 1 — PILLARS ═══ */}
        {step === 1 && (
          <div className="fade">
            <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Strategic Pillars</h2>
            <p style={{ fontSize: 14, color: C.muted, marginBottom: 28, lineHeight: 1.6 }}>Define 2–8 pillars your firm must deliver on over the next three years. Add measurable objectives beneath each.</p>

            <div style={{ ...card, marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 14 }}>Add Pillar</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <span style={{ ...lbl }}>Pillar name *</span>
                  <input type="text" placeholder="e.g. Revenue Growth" value={newName}
                    onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addPillar()} />
                </div>
                <div>
                  <span style={{ ...lbl }}>Description (optional)</span>
                  <input type="text" placeholder="Brief description" value={newDesc}
                    onChange={e => setNewDesc(e.target.value)} onKeyDown={e => e.key === "Enter" && addPillar()} />
                </div>
              </div>
              <button onClick={addPillar} style={{ ...btn("primary") }} disabled={!newName.trim() || pillars.length >= 8}>+ Add Pillar</button>
              {pillars.length >= 8 && <span style={{ fontSize: 12, color: C.dim, marginLeft: 12 }}>Maximum 8 pillars reached</span>}
            </div>

            {pillars.map((p, pi) => (
              <div key={p.id} style={{ ...card, borderLeft: `4px solid ${p.color}`, paddingLeft: 18 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: p.description ? 4 : 0 }}>
                      <span style={{ fontSize: 16, fontWeight: 600 }}>{p.name}</span>
                      <span style={{ fontSize: 11, color: C.dim, padding: "2px 7px", border: `1px solid ${C.border}`, borderRadius: 8, fontWeight: 500 }}>Pillar {pi + 1}</span>
                    </div>
                    {p.description && <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{p.description}</p>}
                    {p.objectives.length > 0 && (
                      <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: `2px solid ${p.color}30` }}>
                        {p.objectives.map(o => (
                          <div key={o.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 0" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <span style={{ width: 5, height: 5, borderRadius: "50%", background: p.color, display: "inline-block", flexShrink: 0 }} />
                              <span style={{ fontSize: 13, color: C.muted }}>{o.name}</span>
                            </div>
                            <button onClick={() => removeObjective(p.id, o.id)} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 12, padding: "2px 5px" }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {expandedP === p.id ? (
                      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                        <input type="text" placeholder="Add objective..." value={newObjText}
                          onChange={e => setNewObjText(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") addObjective(p.id); if (e.key === "Escape") { setExpandedP(null); setNewObjText(""); } }}
                          style={{ flex: 1, fontSize: 13, padding: "7px 11px" }} autoFocus />
                        <button onClick={() => addObjective(p.id)} style={{ ...btn("primary"), padding: "7px 14px" }}>Add</button>
                        <button onClick={() => { setExpandedP(null); setNewObjText(""); }} style={{ ...btn(), padding: "7px 12px" }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => { setExpandedP(p.id); setNewObjText(""); }}
                        style={{ marginTop: 10, background: "none", border: `1px dashed ${C.border2}`, borderRadius: 6, padding: "3px 12px", color: C.dim, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                        + Add objective
                      </button>
                    )}
                  </div>
                  <button onClick={() => removePillar(p.id)} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", fontSize: 14, padding: "2px 6px", marginLeft: 10 }}>✕</button>
                </div>
              </div>
            ))}

            {pillars.length === 0 && <div style={{ textAlign: "center", padding: "48px 0", color: C.dim, fontSize: 14, border: `2px dashed ${C.border}`, borderRadius: 12 }}>Add your first strategic pillar above</div>}
            {pillars.length === 1 && <p style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "10px 0" }}>Add at least one more pillar to proceed</p>}
            {pillars.length >= 2 && (
              <div style={{ textAlign: "right", marginTop: 24 }}>
                <button onClick={() => { setStep(2); setPairIdx(0); }} style={{ ...btn("primary") }}>Begin Pairwise Comparison →</button>
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 2 — COMPARE ═══ */}
        {step === 2 && (
          <div className="fade">
            <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Pairwise Comparison</h2>
            <p style={{ fontSize: 14, color: C.muted, marginBottom: 28, lineHeight: 1.6 }}>For each pair, drag the slider toward whichever pillar is more strategically important.</p>

            <div style={{ display: "flex", gap: 6, marginBottom: 28, alignItems: "center", justifyContent: "center" }}>
              {pairs.map(([a, b], i) => (
                <button key={i} onClick={() => setPairIdx(i)} style={{
                  width: i === pairIdx ? 24 : 8, height: 8, borderRadius: 4, border: "none", cursor: "pointer", padding: 0, transition: "all 0.2s",
                  background: i === pairIdx ? C.accent : comps[`${a.id}_${b.id}`] !== undefined ? C.green : C.border2,
                }} />
              ))}
              <span style={{ fontSize: 12, color: C.muted, marginLeft: 8 }}>{numPairsSet} of {pairs.length} compared</span>
            </div>

            {pairs[pairIdx] && (
              <div style={{ ...card, padding: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Comparison {pairIdx + 1} of {pairs.length}</span>
                  <span style={{ fontSize: 12, color: C.dim }}>{pairs[pairIdx][0].name} vs {pairs[pairIdx][1].name}</span>
                </div>
                <PairSlider
                  pA={pairs[pairIdx][0]} pB={pairs[pairIdx][1]}
                  value={getComp(pairs[pairIdx][0].id, pairs[pairIdx][1].id)}
                  onChange={v => setComp(pairs[pairIdx][0].id, pairs[pairIdx][1].id, v)}
                />
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
              <button onClick={() => pairIdx > 0 ? setPairIdx(pairIdx - 1) : setStep(1)} style={{ ...btn() }}>
                ← {pairIdx === 0 ? "Back to Pillars" : "Previous"}
              </button>
              {pairIdx < pairs.length - 1
                ? <button onClick={() => setPairIdx(pairIdx + 1)} style={{ ...btn("primary") }}>Next →</button>
                : <button onClick={() => setStep(3)} style={{ ...btn("primary") }}>View Weights →</button>
              }
            </div>

            {pairs.length > 3 && (
              <div style={{ ...card, marginTop: 20, padding: "14px 18px" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Jump to comparison</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {pairs.map(([a, b], i) => (
                    <button key={i} onClick={() => setPairIdx(i)} style={{
                      padding: "4px 10px", borderRadius: 6, border: `1px solid ${i === pairIdx ? C.accent : C.border}`,
                      background: i === pairIdx ? C.accentBg : C.surf2, color: i === pairIdx ? C.accent : C.muted,
                      cursor: "pointer", fontSize: 12, fontFamily: "inherit",
                    }}>
                      {a.name} / {b.name}{comps[`${a.id}_${b.id}`] !== undefined && <span style={{ color: C.green, marginLeft: 4 }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 3 — WEIGHTS ═══ */}
        {step === 3 && (
          <div className="fade">
            <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Strategic Weights</h2>
            <p style={{ fontSize: 14, color: C.muted, marginBottom: 28, lineHeight: 1.6 }}>Your comparisons produced these relative weights — they sum to 100 and drive all decision scores.</p>

            <div style={{ ...card, padding: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 18, borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Allocation</span>
                <div>
                  <span style={{ fontSize: 36, fontWeight: 800, color: C.accent }}>100</span>
                  <span style={{ fontSize: 14, color: C.muted, marginLeft: 4 }}>points</span>
                </div>
              </div>
              {[...pillars].sort((a, b) => (weights[b.id] || 0) - (weights[a.id] || 0)).map(p => (
                <WeightBar key={p.id} pillar={p} weight={weights[p.id] || 0} max={maxW} />
              ))}
              <div style={{ marginTop: 24, paddingTop: 18, borderTop: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Comparison Summary</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {pairs.map(([a, b], i) => {
                    const v = getComp(a.id, b.id);
                    return (
                      <div key={i} style={{ fontSize: 12, padding: "4px 10px", border: `1px solid ${C.border}`, borderRadius: 16, background: C.surf2, display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ color: a.color, fontWeight: 600 }}>{Math.round(v)}%</span>
                        <span style={{ color: C.dim }}>·</span>
                        <span style={{ color: b.color, fontWeight: 600 }}>{Math.round(100 - v)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
              <button onClick={() => setStep(2)} style={{ ...btn() }}>← Adjust Comparisons</button>
              <button onClick={() => setStep(4)} style={{ ...btn("primary") }}>Score Decisions →</button>
            </div>
          </div>
        )}

        {/* ═══ STEP 4 — DECISIONS ═══ */}
        {step === 4 && (
          <div className="fade">
            <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Decision Candidates</h2>
            <p style={{ fontSize: 14, color: C.muted, marginBottom: 28, lineHeight: 1.6 }}>
              Score each decision against your pillars and implementation factors, then lock it in. Locked scores can always be reopened.
            </p>

            <div style={{ ...card, display: "flex", gap: 10, alignItems: "center" }}>
              <input type="text" placeholder="Describe a decision candidate…" value={newDecName}
                onChange={e => setNewDecName(e.target.value)} onKeyDown={e => e.key === "Enter" && addDecision()} style={{ flex: 1 }} />
              <button onClick={addDecision} style={{ ...btn("primary"), whiteSpace: "nowrap", flexShrink: 0 }} disabled={!newDecName.trim()}>
                + Add Decision
              </button>
            </div>

            {scored.map(d => {
              const raw = decisions.find(x => x.id === d.id);
              const locked_ = isLocked(d.id);
              const isOpen  = openId === d.id && !locked_;
              const sc = d.strategic;
              const scoreColor = sc > 66 ? C.green : sc > 33 ? C.amber : C.red;
              const fullyScored = isFullyScored(raw);

              return (
                <div key={d.id} className="fade" style={{
                  ...card,
                  borderLeft: `4px solid ${locked_ ? C.green : isOpen ? C.accent : C.border}`,
                  transition: "border-color 0.2s",
                  paddingLeft: 18,
                }}>
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: C.text, maxWidth: 340, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                      <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />

                      {/* Lock badge */}
                      {locked_ && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.green, padding: "2px 8px", borderRadius: 10, background: "#f0fdf4", border: `1px solid ${C.green}40`, flexShrink: 0 }}>
                          🔒 Locked
                        </span>
                      )}

                      {/* Score badge */}
                      <div style={{ fontSize: 13, fontWeight: 700, padding: "3px 10px", borderRadius: 16, flexShrink: 0, background: `${scoreColor}14`, color: scoreColor, border: `1px solid ${scoreColor}44` }}>
                        {sc > 0 ? `${sc} pts` : "unscored"}
                      </div>

                      {/* Factor badges */}
                      {raw && [{ k: "C", v: raw.cost, c: C.red }, { k: "R", v: raw.risk, c: C.amber }, { k: "X", v: raw.complexity, c: "#7c3aed" }].map(({ k, v, c }) => (
                        <div key={k} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 10, background: `${c}12`, color: c, border: `1px solid ${c}30`, flexShrink: 0 }}>{k}: {v}</div>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {locked_ ? (
                        <button onClick={() => unlockDec(d.id)} style={{ ...btn("unlock"), padding: "6px 14px", fontSize: 13 }}>🔓 Unlock</button>
                      ) : (
                        <>
                          <button onClick={() => setOpenId(isOpen ? null : d.id)} style={{ ...btn(), padding: "6px 14px", fontSize: 13 }}>
                            {isOpen ? "Collapse ↑" : "Score ↓"}
                          </button>
                          {fullyScored && (
                            <button onClick={() => lockDec(d.id)} style={{ ...btn("lock"), padding: "6px 14px", fontSize: 13 }}>🔒 Lock In</button>
                          )}
                        </>
                      )}
                      <button onClick={() => removeDecision(d.id)} style={{ ...btn("danger"), padding: "6px 10px", fontSize: 13 }}>✕</button>
                    </div>
                  </div>

                  {/* Scoring panel */}
                  {isOpen && raw && (
                    <div style={{ marginTop: 24 }}>
                      {/* Live score banner */}
                      <div style={{ background: C.surf2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 24, textAlign: "center" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Strategic Value Score</div>
                        <div style={{ fontSize: 60, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{sc}</div>
                        <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>out of 100 points</div>
                        <div style={{ display: "flex", gap: 18, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
                          {pillars.map(p => {
                            const s = raw.pillarScores?.[p.id] ?? 0;
                            const contrib = Math.round((weights[p.id] || 0) / 100 * s / 100 * 100);
                            return (
                              <div key={p.id} style={{ textAlign: "center" }}>
                                <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{p.name}</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: p.color }}>+{contrib}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Pillar sliders */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>
                          Score Against Each Pillar
                          <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, marginLeft: 6, fontSize: 12 }}>— how well does this decision advance each pillar?</span>
                        </div>
                        {pillars.map(p => {
                          const score = raw.pillarScores?.[p.id] ?? 0;
                          return (
                            <div key={p.id} style={{ marginBottom: 14, padding: "14px 16px", background: C.surf2, borderRadius: 10, border: `1px solid ${C.border}`, borderLeft: `3px solid ${p.color}` }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
                                    <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
                                    <span style={{ fontSize: 11, color: C.dim }}>({(weights[p.id] || 0).toFixed(1)}% weight)</span>
                                  </div>
                                  {p.description && <div style={{ fontSize: 12, color: C.muted, marginLeft: 15, marginTop: 2 }}>{p.description}</div>}
                                </div>
                                <div style={{ fontSize: 11, color: C.muted }}>+{Math.round((weights[p.id] || 0) / 100 * score / 100 * 100)} pts</div>
                              </div>
                              <ScoreSlider value={score} onChange={v => updatePS(d.id, p.id, v)}
                                color={p.color} min={0} max={100}
                                label="Alignment Score"
                                sublabel="0 = not relevant  ·  100 = fully advances this pillar" />
                              {p.objectives.length > 0 && (
                                <div style={{ paddingLeft: 12, borderLeft: `2px solid ${p.color}25` }}>
                                  {p.objectives.map(o => (
                                    <div key={o.id} style={{ fontSize: 12, color: C.dim, padding: "2px 0", display: "flex", alignItems: "center", gap: 5 }}>
                                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: p.color, display: "inline-block", flexShrink: 0 }} />{o.name}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Implementation factors */}
                      <div style={{ background: C.surf2, borderRadius: 10, padding: "18px 20px", border: `1px solid ${C.border}`, marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 18 }}>Implementation Factors</div>
                        <ScoreSlider value={raw.cost} onChange={v => updateDec(d.id, "cost", v)}
                          color={C.red} label="Cost" sublabel="1 = minimal investment  ·  10 = very high cost" min={1} max={10} />
                        <ScoreSlider value={raw.risk} onChange={v => updateDec(d.id, "risk", v)}
                          color={C.amber} label="Risk" sublabel="1 = very low risk  ·  10 = high uncertainty" min={1} max={10} />
                        <ScoreSlider value={raw.complexity} onChange={v => updateDec(d.id, "complexity", v)}
                          color="#7c3aed" label="Complexity" sublabel="1 = simple to execute  ·  10 = highly complex" min={1} max={10} />
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 13, color: C.muted }}>Ease Score (composite)</span>
                          <span style={{ fontSize: 18, fontWeight: 700 }}>{calcEase(raw).toFixed(1)}<span style={{ fontSize: 12, color: C.dim }}>/10</span></span>
                        </div>
                      </div>

                      {/* Lock CTA */}
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button onClick={() => lockDec(d.id)} style={{ ...btn("lock"), padding: "9px 22px", fontSize: 14 }}>
                          🔒 Lock In Score
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {decisions.length === 0 && <div style={{ textAlign: "center", padding: "48px 0", color: C.dim, fontSize: 14, border: `2px dashed ${C.border}`, borderRadius: 12 }}>Add your first decision candidate above</div>}
            {decisions.length === 1 && <p style={{ color: C.muted, fontSize: 13, textAlign: "center", marginTop: 10 }}>Add at least one more decision to compare on the chart</p>}
            {decisions.length >= 2 && (
              <div style={{ textAlign: "right", marginTop: 24 }}>
                <button onClick={() => setStep(5)} style={{ ...btn("primary") }}>View Strategic Insights →</button>
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 5 — INSIGHTS ═══ */}
        {step === 5 && (
          <div className="fade">
            <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Strategic Insights</h2>
            <p style={{ fontSize: 14, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
              Each bubble shows a decision's strategic value vs. ease of execution. Color reflects complexity; size reflects cost.
            </p>

            {/* Chart legend */}
            <div style={{ ...card, padding: "14px 18px", marginBottom: 8, display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Complexity (color)</span>
                {[{ label: "Low (1–3)", color: C.green }, { label: "Medium (4–6)", color: C.amber }, { label: "High (7–10)", color: C.red }].map(({ label, color }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: color, opacity: 0.8 }} />
                    <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Size</span>
                <span style={{ fontSize: 12, color: C.muted }}>Cost — larger bubble = higher cost</span>
              </div>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Score</span>
                <span style={{ fontSize: 12, color: C.muted }}>Strategic value shown inside bubble</span>
              </div>
            </div>

            {/* Bubble chart */}
            <div style={{ ...card, padding: "20px 12px 16px", marginTop: 0 }}>
              <BubbleChart data={bubbleData} />
            </div>

            {/* Decision name legend */}
            <div style={{ ...card, display: "flex", flexWrap: "wrap", gap: 10, padding: "12px 18px", marginTop: 0 }}>
              {bubbleData.map((d, i) => {
                const fill = complexityColor(d.rawComplexity);
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: fill }} />
                    <span style={{ fontSize: 13, color: C.muted }}>{d.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: fill }}>{d.strategic}</span>
                  </div>
                );
              })}
            </div>

            {/* Quadrant guide */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6, marginBottom: 16 }}>
              {[
                { label: "↗ High Value · Easy", desc: "Ideal — prioritize these", color: C.green },
                { label: "↖ High Value · Hard", desc: "Strategic bets worth the effort", color: C.amber },
                { label: "↘ Low Value · Easy", desc: "Quick wins with modest impact", color: C.muted },
                { label: "↙ Low Value · Hard", desc: "Deprioritize or defer", color: C.red },
              ].map(q => (
                <div key={q.label} style={{ ...card, padding: "12px 16px", marginBottom: 0, borderLeft: `4px solid ${q.color}55` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: q.color, marginBottom: 3 }}>{q.label}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{q.desc}</div>
                </div>
              ))}
            </div>

            {/* Ranked table */}
            <div style={{ ...card, padding: 0, overflow: "hidden", marginBottom: 0 }}>
              <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.border}`, fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                All Candidates — Ranked by Strategic Value
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "inherit" }}>
                  <thead>
                    <tr style={{ background: C.surf2 }}>
                      {["#", "Decision", "Strategic Value", "Cost", "Risk", "Complexity", "Ease"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: C.muted, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...scored].sort((a, b) => b.strategic - a.strategic).map((d, i) => {
                      const sc = d.strategic, color = sc > 66 ? C.green : sc > 33 ? C.amber : C.red;
                      return (
                        <tr key={d.id} style={{ borderBottom: `1px solid ${C.border}50`, background: i % 2 === 0 ? "transparent" : C.surf2 + "80" }}>
                          <td style={{ padding: "12px 14px", fontSize: 12, color: C.dim }}>#{i + 1}</td>
                          <td style={{ padding: "12px 14px", fontSize: 15, fontWeight: 600 }}>{d.name}</td>
                          <td style={{ padding: "12px 14px" }}>
                            <span style={{ fontSize: 16, fontWeight: 800, color }}>{sc}</span>
                            <span style={{ fontSize: 11, color: C.dim }}>/100</span>
                          </td>
                          <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 600, color: C.red }}>{d.cost}</td>
                          <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 600, color: C.amber }}>{d.risk}</td>
                          <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 600, color: complexityColor(d.complexity) }}>{d.complexity}</td>
                          <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 600, color: C.text }}>{d.ease.toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
              <button onClick={() => setStep(4)} style={{ ...btn() }}>← Refine Decisions</button>
              <button onClick={() => { setStep(1); setPillars(SEED_PILLARS); setComps(SEED_COMPS); setDecisions(SEED_DECISIONS); setOpenId(null); setPairIdx(0); setLocked(new Set(["d1","d2","d3"])); }} style={{ ...btn("danger") }}>
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
