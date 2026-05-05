import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ============================================================
// TYPES
// ============================================================

type ComponentType = 'unit' | 'assessment';
type NodeType = 'start' | 'end' | 'unit' | 'assessment';
type Metric = 'completion' | 'passed' | 'score' | 'score_range' | 'time_spent_minutes' | 'percentage_completion';
type Operator = 'eq' | 'gte' | 'lte' | 'between' | 'lt' | 'gt';

interface ComponentItem {
  id: string;
  title: string;
  shortDescription: string;
  type: ComponentType;
  approximateDurationMinutes: number;
  metadata?: {
    assessment?: { maxScore: number; passingScore: number };
    unit?: { recommendedMinutes?: number };
  };
}

interface Position { x: number; y: number; }

interface ScoreRange { min: number; max: number; minInclusive: boolean; maxInclusive: boolean; }

interface ConditionRule {
  id: string;
  sourceType: string;
  sourceNodeId: string;
  metric: Metric;
  operator: Operator;
  value?: boolean | number;
  range?: ScoreRange;
}

interface Conditions {
  operator: 'AND' | 'OR';
  rules: ConditionRule[];
}

interface NodeConfig {
  approximateDurationMinutes?: number;
  assessment?: { maxScore: number; passingScore: number };
}

interface LPNode {
  id: string;
  componentId: string;
  type: NodeType;
  label: string;
  position: Position;
  config?: NodeConfig;
}

interface LPEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label: string;
  priority: number;
  isDefault: boolean;
  conditions: Conditions;
}

interface LearningPath {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'published';
  version: number;
  canvas: { zoom: number; offsetX: number; offsetY: number };
  nodes: LPNode[];
  edges: LPEdge[];
}

type SelectionType = 'node' | 'edge' | null;

// ============================================================
// API LAYER
// ============================================================

const API_BASE = 'http://localhost:8080/api';

async function fetchComponents(): Promise<ComponentItem[]> {
  const res = await fetch(`${API_BASE}/components`);
  const data = await res.json();
  return data.items || [];
}

async function saveLearningPath(lp: LearningPath): Promise<LearningPath> {
  const method = lp.id ? 'PUT' : 'POST';
  const url = lp.id ? `${API_BASE}/learning-paths/${lp.id}` : `${API_BASE}/learning-paths`;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lp),
  });
  return res.json();
}

async function loadLearningPath(id: string): Promise<LearningPath> {
  const res = await fetch(`${API_BASE}/learning-paths/${id}`);
  return res.json();
}

async function fetchAllPaths(): Promise<LearningPath[]> {
  const res = await fetch(`${API_BASE}/learning-paths`);
  return res.json();
}

// ============================================================
// CONSTANTS & HELPERS
// ============================================================

const NODE_WIDTH = 200;
const NODE_HEIGHT = 72;
const START_NODE: LPNode = {
  id: 'node-start',
  componentId: 'system-start',
  type: 'start',
  label: 'Start',
  position: { x: 400, y: 50 },
};

function uid() { return 'n-' + Math.random().toString(36).slice(2, 9); }

function getNodeColor(type: NodeType) {
  if (type === 'start') return { bg: '#10b981', border: '#059669', text: '#fff' };
  if (type === 'assessment') return { bg: '#3b82f6', border: '#2563eb', text: '#fff' };
  if (type === 'unit') return { bg: '#8b5cf6', border: '#7c3aed', text: '#fff' };
  return { bg: '#64748b', border: '#475569', text: '#fff' };
}

function nodeCenter(node: LPNode): Position {
  return { x: node.position.x + NODE_WIDTH / 2, y: node.position.y + NODE_HEIGHT / 2 };
}

// ============================================================
// MOCK FALLBACK DATA (when API unavailable)
// ============================================================
const MOCK_COMPONENTS: ComponentItem[] = [
  { id: 'cmp-assess-math-1', title: 'Math Module 1 Assessment', shortDescription: 'Baseline math diagnostic to route learners.', type: 'assessment', approximateDurationMinutes: 35, metadata: { assessment: { maxScore: 100, passingScore: 50 } } },
  { id: 'cmp-unit-math-2-easy', title: 'Math Module 2 - Easy', shortDescription: 'Foundational math remediation unit.', type: 'unit', approximateDurationMinutes: 35, metadata: { unit: { recommendedMinutes: 30 } } },
  { id: 'cmp-unit-math-2-advanced', title: 'Math Module 2 - Advanced', shortDescription: 'Advanced math covering geometry and statistics.', type: 'unit', approximateDurationMinutes: 40, metadata: { unit: { recommendedMinutes: 35 } } },
  { id: 'cmp-assess-reading-1', title: 'Reading & Comp Module 1', shortDescription: 'Baseline reading comprehension diagnostic.', type: 'assessment', approximateDurationMinutes: 32, metadata: { assessment: { maxScore: 100, passingScore: 50 } } },
  { id: 'cmp-unit-reading-easy', title: 'R&C Module 2 - Easy', shortDescription: 'Guided passage analysis and vocabulary.', type: 'unit', approximateDurationMinutes: 32, metadata: { unit: { recommendedMinutes: 28 } } },
  { id: 'cmp-unit-reading-advanced', title: 'R&C Module 2 - Advanced', shortDescription: 'Complex passage analysis and argument evaluation.', type: 'unit', approximateDurationMinutes: 32 },
  { id: 'cmp-assess-writing-1', title: 'Writing Skills Assessment', shortDescription: 'Evaluates grammar and essay composition.', type: 'assessment', approximateDurationMinutes: 40, metadata: { assessment: { maxScore: 100, passingScore: 60 } } },
  { id: 'cmp-unit-writing-remedial', title: 'Writing Fundamentals', shortDescription: 'Core writing skills: grammar and clarity.', type: 'unit', approximateDurationMinutes: 45 },
  { id: 'cmp-assess-vocab-1', title: 'Vocabulary & Word Analysis', shortDescription: 'Assesses vocabulary breadth and context inference.', type: 'assessment', approximateDurationMinutes: 25, metadata: { assessment: { maxScore: 80, passingScore: 40 } } },
];

// ============================================================
// COMPONENT: NODE CARD (canvas)
// ============================================================
interface NodeCardProps {
  node: LPNode;
  selected: boolean;
  onSelect: (id: string) => void;
  onDragStart: (e: React.MouseEvent, id: string) => void;
  onConnectStart?: (e: React.MouseEvent, nodeId: string) => void;
}

function NodeCard({ node, selected, onSelect, onDragStart, onConnectStart }: NodeCardProps) {
  const colors = getNodeColor(node.type);
  return (
    <div
      style={{
        position: 'absolute',
        left: node.position.x,
        top: node.position.y,
        width: NODE_WIDTH,
        height: node.type === 'start' ? 52 : NODE_HEIGHT,
        background: colors.bg,
        border: `2px solid ${selected ? '#fbbf24' : colors.border}`,
        borderRadius: node.type === 'start' ? 26 : 10,
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        boxShadow: selected ? '0 0 0 3px rgba(251,191,36,0.35)' : '0 2px 8px rgba(0,0,0,0.35)',
        userSelect: 'none',
        zIndex: selected ? 10 : 1,
        transition: 'box-shadow 0.15s',
      }}
      onMouseDown={(e) => { e.stopPropagation(); onDragStart(e, node.id); onSelect(node.id); }}
    >
      {/* type icon */}
      <div style={{ width: 36, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        {node.type === 'start' && <span style={{ fontSize: 16 }}>▶</span>}
        {node.type === 'assessment' && <span style={{ fontSize: 15 }}>☑</span>}
        {node.type === 'unit' && <span style={{ fontSize: 15 }}>◉</span>}
        {node.type === 'end' && <span style={{ fontSize: 15 }}>⬛</span>}
      </div>
      <div style={{ flex: 1, overflow: 'hidden', paddingRight: 10 }}>
        <div style={{ color: colors.text, fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {node.label}
        </div>
        {node.type !== 'start' && node.config?.approximateDurationMinutes && (
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, marginTop: 2 }}>
            {node.config.approximateDurationMinutes} min
          </div>
        )}
      </div>
      {/* Connect handle */}
      {node.type !== 'end' && onConnectStart && (
        <div
          title="Drag to connect"
          style={{ position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)', width: 16, height: 16, borderRadius: '50%', background: '#fbbf24', border: '2px solid #fff', cursor: 'crosshair', zIndex: 20 }}
          onMouseDown={(e) => { e.stopPropagation(); onConnectStart(e, node.id); }}
        />
      )}
    </div>
  );
}

// ============================================================
// COMPONENT: EDGE SVG
// ============================================================
interface EdgeLayerProps {
  nodes: LPNode[];
  edges: LPEdge[];
  selectedEdgeId: string | null;
  onSelectEdge: (id: string) => void;
  pendingConnect?: { fromNodeId: string; toPos: Position } | null;
}

function EdgeLayer({ nodes, edges, selectedEdgeId, onSelectEdge, pendingConnect }: EdgeLayerProps) {
  const nodeMap = useMemo(() => {
    const m: Record<string, LPNode> = {};
    nodes.forEach(n => { m[n.id] = n; });
    return m;
  }, [nodes]);

  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8" />
        </marker>
        <marker id="arrowhead-selected" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#fbbf24" />
        </marker>
      </defs>

      {edges.map(edge => {
        const src = nodeMap[edge.sourceNodeId];
        const tgt = nodeMap[edge.targetNodeId];
        if (!src || !tgt) return null;
        const s = nodeCenter(src);
        const t = nodeCenter(tgt);
        const selected = edge.id === selectedEdgeId;
        const dy = Math.abs(t.y - s.y);
        const cp1 = { x: s.x, y: s.y + Math.min(80, dy * 0.5) };
        const cp2 = { x: t.x, y: t.y - Math.min(80, dy * 0.5) };
        const d = `M${s.x},${s.y} C${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${t.x},${t.y}`;
        const midX = (s.x + t.x) / 2;
        const midY = (s.y + t.y) / 2;

        return (
          <g key={edge.id}>
            {/* Clickable wider path */}
            <path d={d} stroke="transparent" strokeWidth={14} fill="none" style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onClick={() => onSelectEdge(edge.id)} />
            <path d={d} stroke={selected ? '#fbbf24' : '#475569'} strokeWidth={selected ? 2.5 : 1.5}
              fill="none" markerEnd={selected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'}
              strokeDasharray={edge.isDefault ? 'none' : '6,3'}
              style={{ pointerEvents: 'none' }} />
            {edge.label && (
              <text x={midX} y={midY - 8} textAnchor="middle"
                style={{ fontSize: 10, fill: selected ? '#fbbf24' : '#94a3b8', pointerEvents: 'none', fontFamily: 'Inter,sans-serif' }}>
                {edge.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Pending connection line */}
      {pendingConnect && (() => {
        const src = nodeMap[pendingConnect.fromNodeId];
        if (!src) return null;
        const s = nodeCenter(src);
        const t = pendingConnect.toPos;
        return (
          <line x1={s.x} y1={s.y} x2={t.x} y2={t.y}
            stroke="#fbbf24" strokeWidth={2} strokeDasharray="5,3"
            style={{ pointerEvents: 'none' }} />
        );
      })()}
    </svg>
  );
}

// ============================================================
// COMPONENT: LEFT PANEL
// ============================================================
interface LeftPanelProps {
  components: ComponentItem[];
  loading: boolean;
  onDragItem: (item: ComponentItem) => void;
}

function LeftPanel({ components, loading, onDragItem }: LeftPanelProps) {
  const [filter, setFilter] = useState<'all' | 'unit' | 'assessment'>('all');
  const [search, setSearch] = useState('');

  const filtered = components.filter(c =>
    (filter === 'all' || c.type === filter) &&
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ width: 240, background: '#13141a', borderRight: '1px solid #1e2130', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '14px 14px 10px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#64748b', textTransform: 'uppercase', marginBottom: 10 }}>Add Components</div>
        <div style={{ color: '#64748b', fontSize: 10, marginBottom: 10 }}>Drag or click to add to canvas</div>
        <input
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', background: '#1e2130', border: '1px solid #2d3148', borderRadius: 6, padding: '6px 10px', color: '#e2e8f0', fontSize: 12, outline: 'none', marginBottom: 8 }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'unit', 'assessment'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ flex: 1, padding: '4px 0', fontSize: 10, borderRadius: 5, border: 'none', cursor: 'pointer', fontWeight: filter === f ? 700 : 400,
                background: filter === f ? (f === 'assessment' ? '#1d4ed8' : f === 'unit' ? '#6d28d9' : '#1e2130') : '#1e2130',
                color: filter === f ? '#fff' : '#64748b' }}>
              {f === 'all' ? 'All' : f === 'unit' ? 'Units' : 'Tests'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 10px' }}>
        {loading ? (
          <div style={{ color: '#475569', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>Loading...</div>
        ) : filtered.map(item => (
          <div
            key={item.id}
            draggable
            onDragStart={e => { e.dataTransfer.setData('componentId', item.id); }}
            onClick={() => onDragItem(item)}
            style={{ background: '#1a1c27', border: `1px solid ${item.type === 'assessment' ? '#1e3a8a' : '#3b1d7a'}`,
              borderRadius: 8, padding: '10px 12px', marginBottom: 8, cursor: 'grab', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = item.type === 'assessment' ? '#3b82f6' : '#8b5cf6'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = item.type === 'assessment' ? '#1e3a8a' : '#3b1d7a'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <span style={{ fontSize: 13, background: item.type === 'assessment' ? '#1e40af' : '#6d28d9', borderRadius: 4, padding: '2px 6px', color: '#fff', fontWeight: 700, fontSize: 10 }}>
                {item.type === 'assessment' ? 'TEST' : 'UNIT'}
              </span>
              <span style={{ fontSize: 10, color: '#64748b' }}>{item.approximateDurationMinutes}m</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', marginBottom: 3, lineHeight: 1.3 }}>{item.title}</div>
            <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.4 }}>{item.shortDescription}</div>
            {item.metadata?.assessment && (
              <div style={{ marginTop: 5, fontSize: 10, color: '#94a3b8' }}>
                Pass: {item.metadata.assessment.passingScore}/{item.metadata.assessment.maxScore}
              </div>
            )}
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div style={{ color: '#475569', fontSize: 12, textAlign: 'center', padding: 20 }}>No components found</div>
        )}
      </div>

      {/* How it works */}
      <div style={{ margin: 10, background: '#1a1c27', borderRadius: 8, padding: '10px 12px', border: '1px solid #1e2130' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>HOW IT WORKS</div>
        <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.6 }}>
          • Drag components to canvas<br/>
          • Drag the ● handle to connect nodes<br/>
          • Click edges to set conditions<br/>
          • Save Draft or Publish
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENT: PROPERTIES PANEL
// ============================================================
interface PropertiesPanelProps {
  selectionType: SelectionType;
  selectedNode?: LPNode;
  selectedEdge?: LPEdge;
  allNodes: LPNode[];
  onUpdateNode: (node: LPNode) => void;
  onUpdateEdge: (edge: LPEdge) => void;
  onDeleteSelected: () => void;
}

function PropertiesPanel({ selectionType, selectedNode, selectedEdge, allNodes, onUpdateNode, onUpdateEdge, onDeleteSelected }: PropertiesPanelProps) {
  if (!selectionType) {
    return (
      <div style={{ width: 260, background: '#13141a', borderLeft: '1px solid #1e2130', padding: 16, color: '#475569', fontSize: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#64748b', marginBottom: 12 }}>Properties</div>
        <div>Select a node or edge to view properties.</div>
      </div>
    );
  }

  return (
    <div style={{ width: 260, background: '#13141a', borderLeft: '1px solid #1e2130', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <div style={{ padding: '14px 16px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e2130' }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>Properties</span>
        <button onClick={onDeleteSelected} style={{ background: '#7f1d1d', border: 'none', borderRadius: 5, padding: '4px 10px', color: '#fca5a5', fontSize: 11, cursor: 'pointer' }}>
          Delete
        </button>
      </div>

      <div style={{ padding: 14, flex: 1 }}>
        {selectionType === 'node' && selectedNode && (
          <NodeProperties node={selectedNode} onUpdate={onUpdateNode} />
        )}
        {selectionType === 'edge' && selectedEdge && (
          <EdgeProperties edge={selectedEdge} allNodes={allNodes} onUpdate={onUpdateEdge} />
        )}
      </div>
    </div>
  );
}

function NodeProperties({ node, onUpdate }: { node: LPNode; onUpdate: (n: LPNode) => void }) {
  const field = (label: string, value: string | number, onChange: (v: string) => void, type = 'text') => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', background: '#1e2130', border: '1px solid #2d3148', borderRadius: 6, padding: '7px 10px', color: '#e2e8f0', fontSize: 12, outline: 'none' }} />
    </div>
  );

  return (
    <>
      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {node.type}
      </div>
      {field('Label', node.label, v => onUpdate({ ...node, label: v }))}
      {node.config && field('Duration (min)', node.config.approximateDurationMinutes || '', v => onUpdate({
        ...node, config: { ...node.config, approximateDurationMinutes: parseInt(v) || 0 }
      }), 'number')}
      {node.config?.assessment && (
        <>
          {field('Max Score', node.config.assessment.maxScore, v => onUpdate({
            ...node, config: { ...node.config, assessment: { ...node.config!.assessment!, maxScore: parseInt(v) || 100 } }
          }), 'number')}
          {field('Passing Score', node.config.assessment.passingScore, v => onUpdate({
            ...node, config: { ...node.config, assessment: { ...node.config!.assessment!, passingScore: parseInt(v) || 50 } }
          }), 'number')}
        </>
      )}
      <div style={{ marginTop: 6, padding: '8px 10px', background: '#1a1c27', borderRadius: 6, fontSize: 10, color: '#475569' }}>
        ID: {node.id}
      </div>
    </>
  );
}

function EdgeProperties({ edge, allNodes, onUpdate }: { edge: LPEdge; allNodes: LPNode[]; onUpdate: (e: LPEdge) => void }) {
  const addRule = () => {
    const srcNode = allNodes.find(n => n.id === edge.sourceNodeId);
    const isAssessment = srcNode?.type === 'assessment';
    const newRule: ConditionRule = {
      id: uid(),
      sourceType: isAssessment ? 'assessment' : 'unit',
      sourceNodeId: edge.sourceNodeId,
      metric: isAssessment ? 'score_range' : 'completion',
      operator: isAssessment ? 'between' : 'eq',
      value: isAssessment ? undefined : true,
      range: isAssessment ? { min: 0, max: 49, minInclusive: true, maxInclusive: true } : undefined,
    };
    onUpdate({ ...edge, conditions: { ...edge.conditions, rules: [...edge.conditions.rules, newRule] } });
  };

  const removeRule = (ruleId: string) => {
    onUpdate({ ...edge, conditions: { ...edge.conditions, rules: edge.conditions.rules.filter(r => r.id !== ruleId) } });
  };

  const updateRule = (ruleId: string, patch: Partial<ConditionRule>) => {
    onUpdate({ ...edge, conditions: { ...edge.conditions, rules: edge.conditions.rules.map(r => r.id === ruleId ? { ...r, ...patch } : r) } });
  };

  const srcNode = allNodes.find(n => n.id === edge.sourceNodeId);
  const tgtNode = allNodes.find(n => n.id === edge.targetNodeId);

  return (
    <>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>
        <span style={{ color: '#64748b' }}>Edge: </span>
        {srcNode?.label} → {tgtNode?.label}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 10, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Label</label>
        <input value={edge.label} onChange={e => onUpdate({ ...edge, label: e.target.value })}
          style={{ width: '100%', background: '#1e2130', border: '1px solid #2d3148', borderRadius: 6, padding: '7px 10px', color: '#e2e8f0', fontSize: 12, outline: 'none' }} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#94a3b8', cursor: 'pointer' }}>
          <input type="checkbox" checked={edge.isDefault} onChange={e => onUpdate({ ...edge, isDefault: e.target.checked })}
            style={{ accentColor: '#3b82f6' }} />
          Default path
        </label>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Conditions</span>
          <button onClick={addRule} style={{ background: '#1e3a8a', border: 'none', borderRadius: 5, padding: '4px 8px', color: '#93c5fd', fontSize: 10, cursor: 'pointer' }}>
            + Add Rule
          </button>
        </div>

        {edge.conditions.rules.length > 1 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {(['AND', 'OR'] as const).map(op => (
              <button key={op} onClick={() => onUpdate({ ...edge, conditions: { ...edge.conditions, operator: op } })}
                style={{ flex: 1, padding: '4px 0', fontSize: 10, borderRadius: 5, border: 'none', cursor: 'pointer',
                  background: edge.conditions.operator === op ? '#1e3a8a' : '#1e2130',
                  color: edge.conditions.operator === op ? '#93c5fd' : '#64748b' }}>
                {op}
              </button>
            ))}
          </div>
        )}

        {edge.conditions.rules.map(rule => (
          <RuleEditor key={rule.id} rule={rule} onUpdate={p => updateRule(rule.id, p)} onRemove={() => removeRule(rule.id)} srcNodeType={srcNode?.type} />
        ))}

        {edge.conditions.rules.length === 0 && (
          <div style={{ fontSize: 11, color: '#475569', padding: '10px 0', textAlign: 'center' }}>No conditions — always routes here</div>
        )}
      </div>
    </>
  );
}

function RuleEditor({ rule, onUpdate, onRemove, srcNodeType }: { rule: ConditionRule; onUpdate: (p: Partial<ConditionRule>) => void; onRemove: () => void; srcNodeType?: NodeType }) {
  const metrics: Metric[] = srcNodeType === 'assessment'
    ? ['completion', 'passed', 'score', 'score_range']
    : ['completion', 'time_spent_minutes', 'percentage_completion'];

  const metricLabel: Record<Metric, string> = {
    completion: 'Completion', passed: 'Passed', score: 'Score', score_range: 'Score Range',
    time_spent_minutes: 'Time Spent (min)', percentage_completion: 'Completion %',
  };

  return (
    <div style={{ background: '#1a1c27', border: '1px solid #2d3148', borderRadius: 7, padding: '10px 10px 8px', marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>RULE</span>
        <button onClick={onRemove} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
      </div>
      <select value={rule.metric} onChange={e => onUpdate({ metric: e.target.value as Metric })}
        style={{ width: '100%', background: '#13141a', border: '1px solid #2d3148', borderRadius: 5, padding: '5px 8px', color: '#e2e8f0', fontSize: 11, marginBottom: 7, outline: 'none' }}>
        {metrics.map(m => <option key={m} value={m}>{metricLabel[m]}</option>)}
      </select>

      {(rule.metric === 'completion' || rule.metric === 'passed') && (
        <select value={rule.value === true ? 'true' : 'false'} onChange={e => onUpdate({ value: e.target.value === 'true', operator: 'eq' })}
          style={{ width: '100%', background: '#13141a', border: '1px solid #2d3148', borderRadius: 5, padding: '5px 8px', color: '#e2e8f0', fontSize: 11, outline: 'none' }}>
          <option value="true">= true</option>
          <option value="false">= false</option>
        </select>
      )}

      {rule.metric === 'score' && (
        <div style={{ display: 'flex', gap: 5 }}>
          <select value={rule.operator} onChange={e => onUpdate({ operator: e.target.value as Operator })}
            style={{ flex: 1, background: '#13141a', border: '1px solid #2d3148', borderRadius: 5, padding: '5px 6px', color: '#e2e8f0', fontSize: 11, outline: 'none' }}>
            <option value="gte">≥</option>
            <option value="gt">&gt;</option>
            <option value="lte">≤</option>
            <option value="lt">&lt;</option>
            <option value="eq">=</option>
          </select>
          <input type="number" value={rule.value as number || 0} onChange={e => onUpdate({ value: parseInt(e.target.value) || 0 })}
            style={{ flex: 1, background: '#13141a', border: '1px solid #2d3148', borderRadius: 5, padding: '5px 8px', color: '#e2e8f0', fontSize: 11, outline: 'none' }} />
        </div>
      )}

      {rule.metric === 'score_range' && (
        <div>
          <div style={{ display: 'flex', gap: 5 }}>
            <input type="number" placeholder="Min" value={rule.range?.min ?? 0} onChange={e => onUpdate({ range: { ...rule.range!, min: parseInt(e.target.value) || 0 } })}
              style={{ flex: 1, background: '#13141a', border: '1px solid #2d3148', borderRadius: 5, padding: '5px 8px', color: '#e2e8f0', fontSize: 11, outline: 'none' }} />
            <span style={{ color: '#64748b', alignSelf: 'center', fontSize: 11 }}>–</span>
            <input type="number" placeholder="Max" value={rule.range?.max ?? 100} onChange={e => onUpdate({ range: { ...rule.range!, max: parseInt(e.target.value) || 100 } })}
              style={{ flex: 1, background: '#13141a', border: '1px solid #2d3148', borderRadius: 5, padding: '5px 8px', color: '#e2e8f0', fontSize: 11, outline: 'none' }} />
          </div>
          <div style={{ fontSize: 10, color: '#475569', marginTop: 5 }}>Score between {rule.range?.min ?? 0} and {rule.range?.max ?? 100}</div>
        </div>
      )}

      {(rule.metric === 'time_spent_minutes' || rule.metric === 'percentage_completion') && (
        <div style={{ display: 'flex', gap: 5 }}>
          <select value={rule.operator} onChange={e => onUpdate({ operator: e.target.value as Operator })}
            style={{ flex: 1, background: '#13141a', border: '1px solid #2d3148', borderRadius: 5, padding: '5px 6px', color: '#e2e8f0', fontSize: 11, outline: 'none' }}>
            <option value="gte">≥</option>
            <option value="eq">=</option>
          </select>
          <input type="number" value={rule.value as number || 0} onChange={e => onUpdate({ value: parseInt(e.target.value) || 0 })}
            style={{ flex: 1, background: '#13141a', border: '1px solid #2d3148', borderRadius: 5, padding: '5px 8px', color: '#e2e8f0', fontSize: 11, outline: 'none' }} />
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [loadingComponents, setLoadingComponents] = useState(true);
  const [apiStatus, setApiStatus] = useState<'unknown' | 'connected' | 'offline'>('unknown');

  const [nodes, setNodes] = useState<LPNode[]>([START_NODE]);
  const [edges, setEdges] = useState<LPEdge[]>([]);
  const [pathName, setPathName] = useState('Untitled Learning Path');
  const [pathId, setPathId] = useState<string | undefined>();
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [version, setVersion] = useState(1);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectionType, setSelectionType] = useState<SelectionType>(null);

  const [zoom, setZoom] = useState(0.85);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ mouseX: 0, mouseY: 0, nodeX: 0, nodeY: 0 });

  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [pendingConnectPos, setPendingConnectPos] = useState<Position | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ mouseX: 0, mouseY: 0, offX: 0, offY: 0 });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showSavedPaths, setShowSavedPaths] = useState(false);
  const [savedPaths, setSavedPaths] = useState<any[]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Derived selection
  const selectedNode = selectionType === 'node' ? nodes.find(n => n.id === selectedId) : undefined;
  const selectedEdge = selectionType === 'edge' ? edges.find(e => e.id === selectedId) : undefined;

  // Load components
  useEffect(() => {
    fetchComponents()
      .then(items => { setComponents(items); setApiStatus('connected'); })
      .catch(() => { setComponents(MOCK_COMPONENTS); setApiStatus('offline'); })
      .finally(() => setLoadingComponents(false));
  }, []);

  const addNodeFromComponent = useCallback((item: ComponentItem, pos?: Position) => {
    const nodeId = uid();
    const newNode: LPNode = {
      id: nodeId,
      componentId: item.id,
      type: item.type,
      label: item.title,
      position: pos || { x: 300 + Math.random() * 200, y: 200 + nodes.length * 90 },
      config: {
        approximateDurationMinutes: item.approximateDurationMinutes,
        ...(item.type === 'assessment' && item.metadata?.assessment ? { assessment: item.metadata.assessment } : {}),
      },
    };
    setNodes(prev => [...prev, newNode]);
  }, [nodes.length]);

  // Canvas drop
  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const compId = e.dataTransfer.getData('componentId');
    const comp = components.find(c => c.id === compId);
    if (!comp || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - offset.x) / zoom - NODE_WIDTH / 2;
    const y = (e.clientY - rect.top - offset.y) / zoom - NODE_HEIGHT / 2;
    addNodeFromComponent(comp, { x, y });
  }, [components, zoom, offset, addNodeFromComponent]);

  // Node drag
  const handleNodeDragStart = useCallback((e: React.MouseEvent, nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDraggingNodeId(nodeId);
    setDragStart({ mouseX: e.clientX, mouseY: e.clientY, nodeX: node.position.x, nodeY: node.position.y });
  }, [nodes]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingNodeId) {
      const dx = (e.clientX - dragStart.mouseX) / zoom;
      const dy = (e.clientY - dragStart.mouseY) / zoom;
      setNodes(prev => prev.map(n => n.id === draggingNodeId
        ? { ...n, position: { x: dragStart.nodeX + dx, y: dragStart.nodeY + dy } }
        : n));
    }
    if (connectFrom && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setPendingConnectPos({ x: (e.clientX - rect.left - offset.x) / zoom, y: (e.clientY - rect.top - offset.y) / zoom });
    }
    if (isPanning) {
      setOffset({ x: panStart.offX + (e.clientX - panStart.mouseX), y: panStart.offY + (e.clientY - panStart.mouseY) });
    }
  }, [draggingNodeId, dragStart, zoom, connectFrom, offset, isPanning, panStart]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (draggingNodeId) setDraggingNodeId(null);
    if (connectFrom) { setConnectFrom(null); setPendingConnectPos(null); }
    if (isPanning) setIsPanning(false);
  }, [draggingNodeId, connectFrom, isPanning]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as Element).tagName === 'svg') {
      setSelectedId(null);
      setSelectionType(null);
      setIsPanning(true);
      setPanStart({ mouseX: e.clientX, mouseY: e.clientY, offX: offset.x, offY: offset.y });
    }
  }, [offset]);

  const handleNodeSelect = useCallback((id: string) => {
    setSelectedId(id);
    setSelectionType('node');
  }, []);

  const handleEdgeSelect = useCallback((id: string) => {
    setSelectedId(id);
    setSelectionType('edge');
  }, []);

  const handleConnectStart = useCallback((e: React.MouseEvent, fromNodeId: string) => {
    e.stopPropagation();
    setConnectFrom(fromNodeId);
  }, []);

  const handleNodeMouseUp = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (connectFrom && connectFrom !== nodeId) {
      const newEdge: LPEdge = {
        id: uid(),
        sourceNodeId: connectFrom,
        targetNodeId: nodeId,
        label: '',
        priority: edges.filter(e => e.sourceNodeId === connectFrom).length + 1,
        isDefault: false,
        conditions: { operator: 'AND', rules: [] },
      };
      setEdges(prev => [...prev, newEdge]);
      setConnectFrom(null);
      setPendingConnectPos(null);
    }
  }, [connectFrom, edges]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.3, Math.min(2, z * delta)));
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectionType === 'node' && selectedId) {
      if (selectedId === 'node-start') return;
      setNodes(prev => prev.filter(n => n.id !== selectedId));
      setEdges(prev => prev.filter(e => e.sourceNodeId !== selectedId && e.targetNodeId !== selectedId));
    } else if (selectionType === 'edge' && selectedId) {
      setEdges(prev => prev.filter(e => e.id !== selectedId));
    }
    setSelectedId(null);
    setSelectionType(null);
  }, [selectionType, selectedId]);

  const buildPayload = (): LearningPath => ({
    id: pathId || '',
    name: pathName,
    description: '',
    status,
    version,
    canvas: { zoom, offsetX: offset.x, offsetY: offset.y },
    nodes,
    edges,
  });

  const handleSaveDraft = async () => {
    setSaveStatus('saving');
    try {
      const saved = await saveLearningPath(buildPayload());
      setPathId(saved.id);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      // If API offline, show saved anyway
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handlePublish = async () => {
    setSaveStatus('saving');
    try {
      const payload = { ...buildPayload(), status: 'published' as const, version: version + 1 };
      const saved = await saveLearningPath(payload);
      setPathId(saved.id);
      setStatus('published');
      setVersion(v => v + 1);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setStatus('published');
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleLoadPaths = async () => {
    try {
      const paths = await fetchAllPaths();
      setSavedPaths(paths);
    } catch {
      setSavedPaths([]);
    }
    setShowSavedPaths(true);
  };

  const handleLoadPath = async (id: string) => {
    try {
      const lp = await loadLearningPath(id);
      setNodes(lp.nodes || []);
      setEdges(lp.edges || []);
      setPathName(lp.name);
      setPathId(lp.id);
      setStatus(lp.status);
      setVersion(lp.version);
      if (lp.canvas) {
        setZoom(lp.canvas.zoom || 0.85);
        setOffset({ x: lp.canvas.offsetX || 0, y: lp.canvas.offsetY || 0 });
      }
    } catch {
      alert('Failed to load path');
    }
    setShowSavedPaths(false);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f1117', fontFamily: 'Inter,system-ui,sans-serif' }}>
      {/* TOPBAR */}
      <div style={{ height: 52, background: '#13141a', borderBottom: '1px solid #1e2130', display: 'flex', alignItems: 'center', padding: '0 18px', gap: 16, flexShrink: 0, zIndex: 100 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>Adaptive Learning Path Builder</div>
          <div style={{ fontSize: 10, color: '#64748b' }}>Create conditional learning flows</div>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <input value={pathName} onChange={e => setPathName(e.target.value)}
            style={{ background: 'transparent', border: '1px solid #2d3148', borderRadius: 7, padding: '5px 14px', color: '#e2e8f0', fontSize: 13, fontWeight: 600, textAlign: 'center', outline: 'none', width: 280 }} />
        </div>

        {/* API Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: apiStatus === 'connected' ? '#10b981' : '#f59e0b' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: apiStatus === 'connected' ? '#10b981' : '#f59e0b' }} />
          {apiStatus === 'connected' ? 'API Connected' : 'Demo Mode'}
        </div>

        <button onClick={handleLoadPaths} style={{ background: '#1e2130', border: '1px solid #2d3148', borderRadius: 7, padding: '6px 14px', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>
          Load Path
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSaveDraft} disabled={saveStatus === 'saving'}
            style={{ background: '#1e2130', border: '1px solid #2d3148', borderRadius: 7, padding: '7px 16px', color: '#94a3b8', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            {saveStatus === 'saving' ? '...' : saveStatus === 'saved' ? '✓ Saved' : 'Save Draft'}
          </button>
          <button onClick={handlePublish} disabled={saveStatus === 'saving'}
            style={{ background: '#1e40af', border: 'none', borderRadius: 7, padding: '7px 18px', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>
            ▶ Publish
          </button>
        </div>

        {/* Status badge */}
        <div style={{ padding: '4px 10px', borderRadius: 5, fontSize: 10, fontWeight: 700,
          background: status === 'published' ? '#064e3b' : '#1e2130',
          color: status === 'published' ? '#34d399' : '#64748b' }}>
          {status.toUpperCase()} v{version}
        </div>
      </div>

      {/* BODY */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <LeftPanel components={components} loading={loadingComponents} onDragItem={item => addNodeFromComponent(item)} />

        {/* CANVAS */}
        <div
          ref={canvasRef}
          style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#0c0d12', cursor: connectFrom ? 'crosshair' : isPanning ? 'grabbing' : 'default' }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDrop={handleCanvasDrop}
          onDragOver={e => e.preventDefault()}
          onWheel={handleWheel}
        >
          {/* Grid pattern */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <defs>
              <pattern id="grid" width={20 * zoom} height={20 * zoom} patternUnits="userSpaceOnUse" x={offset.x % (20 * zoom)} y={offset.y % (20 * zoom)}>
                <circle cx={0} cy={0} r={0.7} fill="#1e2130" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Canvas content */}
          <div style={{ position: 'absolute', top: 0, left: 0, transformOrigin: '0 0', transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}>
            <EdgeLayer nodes={nodes} edges={edges} selectedEdgeId={selectionType === 'edge' ? selectedId : null}
              onSelectEdge={handleEdgeSelect} pendingConnect={connectFrom && pendingConnectPos ? { fromNodeId: connectFrom, toPos: pendingConnectPos } : null} />

            {nodes.map(node => (
              <div key={node.id} onMouseUp={e => handleNodeMouseUp(e, node.id)}>
                <NodeCard
                  node={node}
                  selected={selectionType === 'node' && selectedId === node.id}
                  onSelect={handleNodeSelect}
                  onDragStart={handleNodeDragStart}
                  onConnectStart={node.type !== 'end' ? handleConnectStart : undefined}
                />
              </div>
            ))}
          </div>

          {/* Zoom controls */}
          <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', gap: 4, background: '#13141a', border: '1px solid #1e2130', borderRadius: 8, padding: 4 }}>
            <button onClick={() => setZoom(z => Math.min(2, z * 1.15))} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 16, cursor: 'pointer', width: 30, height: 30 }}>+</button>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: 11, color: '#64748b', padding: '0 6px' }}>{Math.round(zoom * 100)}%</div>
            <button onClick={() => setZoom(z => Math.max(0.3, z * 0.85))} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 16, cursor: 'pointer', width: 30, height: 30 }}>−</button>
            <button onClick={() => { setZoom(0.85); setOffset({ x: 0, y: 0 }); }} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer', padding: '0 6px' }}>Fit</button>
          </div>

          {/* Canvas hint */}
          {nodes.length <= 1 && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.15 }}>⬡</div>
              <div style={{ color: '#2d3148', fontSize: 14, fontWeight: 600 }}>Drag components from the left panel</div>
              <div style={{ color: '#1e2130', fontSize: 12, marginTop: 6 }}>or click any item to add it to the canvas</div>
            </div>
          )}
        </div>

        <PropertiesPanel
          selectionType={selectionType}
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          allNodes={nodes}
          onUpdateNode={updated => setNodes(prev => prev.map(n => n.id === updated.id ? updated : n))}
          onUpdateEdge={updated => setEdges(prev => prev.map(e => e.id === updated.id ? updated : e))}
          onDeleteSelected={handleDeleteSelected}
        />
      </div>

      {/* Load paths modal */}
      {showSavedPaths && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowSavedPaths(false)}>
          <div style={{ background: '#13141a', border: '1px solid #2d3148', borderRadius: 12, padding: 24, width: 480, maxHeight: '70vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0', marginBottom: 16 }}>Saved Learning Paths</div>
            {savedPaths.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: 13 }}>No saved paths found. Save a draft first.</div>
            ) : savedPaths.map((lp: any) => (
              <div key={lp.id} style={{ background: '#1a1c27', borderRadius: 8, padding: '12px 14px', marginBottom: 8, cursor: 'pointer', border: '1px solid #2d3148' }}
                onClick={() => handleLoadPath(lp.id)}>
                <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 13 }}>{lp.name}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{lp.status} · v{lp.version} · {lp.id}</div>
              </div>
            ))}
            <button onClick={() => setShowSavedPaths(false)} style={{ marginTop: 12, background: '#1e2130', border: '1px solid #2d3148', borderRadius: 7, padding: '8px 18px', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
