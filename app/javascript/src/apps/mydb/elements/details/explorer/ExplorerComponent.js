import React, { useState, useMemo, useRef } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import { Button } from 'react-bootstrap';
import DetailActions from 'src/stores/alt/actions/DetailActions';

const clickToClose = (explorer) => {
  DetailActions.close(explorer, true);
};

export const CloseBtn = ({ explorer }) => (
  <Button
    variant="danger"
    size="xxsm"
    onClick={() => clickToClose(explorer)}
  >
    <i className="fa fa-times" />
  </Button>
);

export default function ExplorerComponent({ nodes, edges }) {
  const [rfNodes, , onNodesChange] = useNodesState(nodes);
  const [rfEdges, , onEdgesChange] = useEdgesState(edges);

  const [activeFilters] = useState([
    'molecule',
    'sample',
    'splitsample',
    'reaction',
  ]);

  const nodeMap = useMemo(() => {
    const map = {};
    rfNodes.forEach(n => (map[n.id] = n));
    return map;
  }, [rfNodes]);

  const filteredNodes = useMemo(
    () => rfNodes.filter(n => activeFilters.includes(n.type)),
    [rfNodes, activeFilters]
  );

  const filteredEdges = useMemo(() => {
    return rfEdges.filter(e => {
      const s = nodeMap[e.source];
      const t = nodeMap[e.target];
      return s && t &&
        activeFilters.includes(s.type) &&
        activeFilters.includes(t.type);
    });
  }, [rfEdges, nodeMap, activeFilters]);

  const wrapperRef = useRef(null);
  const [hover, setHover] = useState(null);

  const getHoverBoxSize = (kind) => {
    const reactionWidth = Math.min(900, window.innerWidth * 0.75);
    return kind === 'reaction'
      ? { w: reactionWidth, h: Math.min(window.innerHeight * 0.65 + 80, 560) }
      : { w: 220, h: 260 };
  };

  const clampHoverPos = (rawX, rawY, kind) => {
    if (!wrapperRef.current) return { x: rawX, y: rawY };
    const rect = wrapperRef.current.getBoundingClientRect();
    const { w, h } = getHoverBoxSize(kind);

    const maxX = Math.max(8, rect.width - w - 8);
    const maxY = Math.max(8, rect.height - h - 8);

    return {
      x: Math.min(Math.max(8, rawX), maxX),
      y: Math.min(Math.max(8, rawY), maxY),
    };
  };

  const updateHoverPos = (event) => {
    if (!hover || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const rawX = event.clientX - rect.left + 12;
    const rawY = event.clientY - rect.top + 12;
    const pos = clampHoverPos(rawX, rawY, hover.kind);

    setHover(prev => prev && ({
      ...prev,
      x: pos.x,
      y: pos.y,
    }));
  };

  return (
    <div
      ref={wrapperRef}
      style={{ height: '80vh', width: '100%', position: 'relative' }}
      onMouseMove={updateHoverPos}
    >
      {hover && (hover.src || hover.text) && (
        <div
          style={{
            position: 'absolute',
            left: hover.x,
            top: hover.y,
            background: 'white',
            border: '1px solid #d1d5db',
            padding: 10,
            borderRadius: 6,
            zIndex: 50,
            boxShadow: '0 6px 16px rgba(0,0,0,0.15)',
            width: hover.kind === 'reaction' ? Math.min(900, window.innerWidth * 0.75) : 220,
            pointerEvents: 'none',
          }}
        >
          {hover.text && (
            <div style={{ fontSize: 12, marginBottom: hover.src ? 8 : 0 }}>
              {hover.text}
            </div>
          )}

          {hover.src && (
            <img
              src={hover.src}
              alt={hover.text || 'Preview'}
              style={
                hover.kind === 'reaction'
                  ? {
                    display: 'block',
                    width: '100%',
                    height: 'auto',
                    maxHeight: '65vh',
                    objectFit: 'contain',
                  }
                  : {
                    width: 220,
                    height: 220,
                    objectFit: 'contain',
                  }
              }
            />
          )}
        </div>
      )}

      <ReactFlow
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        onNodeMouseEnter={(event, node) => {
          if (!wrapperRef.current) return;
          const rect = wrapperRef.current.getBoundingClientRect();

          const isSample = node?.type === 'sample';
          const isReaction = node?.type === 'reaction';

          let src = null;
          let text = null;
          let kind = null;

          if (isSample) {
            src = node?.data?.image;
            text = node?.data?.label;
            kind = 'sample';
          }

          if (isReaction) {
            src = node?.data?.reactionImage;
            const shortLabel = node?.data?.reactionShortLabel || '';
            const name = node?.data?.reactionName || '';
            text = shortLabel && name ? `${shortLabel}: ${name}` : (shortLabel || name);
            kind = 'reaction';
          }

          if (!src && !text) return;

          const rawX = event.clientX - rect.left + 12;
          const rawY = event.clientY - rect.top + 12;
          const pos = clampHoverPos(rawX, rawY, kind);

          setHover({
            src,
            text,
            kind,
            x: pos.x,
            y: pos.y,
          });
        }}
        onNodeMouseLeave={() => setHover(null)}
      >
        <MiniMap />
        <Controls />
        <Background gap={16} />
      </ReactFlow>
    </div>
  );
}
