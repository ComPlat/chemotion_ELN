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

  const [searchTerm, setSearchTerm] = useState('');

  const nodeMap = useMemo(() => {
    const map = {};
    rfNodes.forEach((n) => {
      map[n.id] = n;
    });
    return map;
  }, [rfNodes]);

  const filteredNodes = useMemo(
    () => rfNodes.filter((n) => activeFilters.includes(n.type)),
    [rfNodes, activeFilters]
  );

  const filteredEdges = useMemo(() => {
    return rfEdges.filter((e) => {
      const s = nodeMap[e.source];
      const t = nodeMap[e.target];
      return s && t &&
        activeFilters.includes(s.type) &&
        activeFilters.includes(t.type);
    });
  }, [rfEdges, nodeMap, activeFilters]);

  const reactionSearchResult = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      return {
        hasSearch: false,
        matchedReactionIds: new Set(),
        highlightedNodeIds: new Set(),
      };
    }

    const reactionNodes = filteredNodes.filter((n) => n.type === 'reaction');

    const matchedReactionIds = new Set(
      reactionNodes
        .filter((n) => {
          const shortLabel = (n.data?.reactionShortLabel || '').toLowerCase();
          const name = (n.data?.reactionName || '').toLowerCase();
          const label = (n.data?.label || '').toLowerCase();
          return shortLabel.includes(q) || name.includes(q) || label.includes(q);
        })
        .map((n) => n.id)
    );

    const highlightedNodeIds = new Set();

    const reactionToSamples = {};
    const sampleToConsumerReactions = {};
    const splitChildren = {};

    filteredEdges.forEach((e) => {
      const srcIsSample = e.source.startsWith('sample-');
      const srcIsReaction = e.source.startsWith('reaction-');
      const tgtIsSample = e.target.startsWith('sample-');
      const tgtIsReaction = e.target.startsWith('reaction-');

      if (srcIsSample && tgtIsReaction) {
        if (!reactionToSamples[e.target]) reactionToSamples[e.target] = new Set();
        reactionToSamples[e.target].add(e.source);

        if (!sampleToConsumerReactions[e.source]) {
          sampleToConsumerReactions[e.source] = new Set();
        }
        sampleToConsumerReactions[e.source].add(e.target);
      }

      if (srcIsReaction && tgtIsSample) {
        if (!reactionToSamples[e.source]) reactionToSamples[e.source] = new Set();
        reactionToSamples[e.source].add(e.target);
      }

      if (srcIsSample && tgtIsSample) {
        if (!splitChildren[e.source]) splitChildren[e.source] = new Set();
        splitChildren[e.source].add(e.target);
      }
    });

    const reactionQueue = [...matchedReactionIds];
    const visitedReactions = new Set();
    const visitedSplitSamples = new Set();

    while (reactionQueue.length > 0) {
      const rid = reactionQueue.shift();
      if (visitedReactions.has(rid)) continue;

      visitedReactions.add(rid);
      highlightedNodeIds.add(rid);

      const blockSamples = reactionToSamples[rid] || new Set();
      blockSamples.forEach((sid) => highlightedNodeIds.add(sid));

      const splitQueue = [...blockSamples];
      while (splitQueue.length > 0) {
        const sid = splitQueue.shift();
        if (visitedSplitSamples.has(sid)) continue;

        visitedSplitSamples.add(sid);

        const children = splitChildren[sid] || new Set();
        children.forEach((childSid) => {
          highlightedNodeIds.add(childSid);
          splitQueue.push(childSid);

          const childReactions = sampleToConsumerReactions[childSid] || new Set();
          childReactions.forEach((crid) => {
            if (!visitedReactions.has(crid)) reactionQueue.push(crid);
          });
        });
      }
    }

    return {
      hasSearch: true,
      matchedReactionIds,
      highlightedNodeIds,
    };
  }, [searchTerm, filteredNodes, filteredEdges]);

  const displayNodes = useMemo(() => {
    if (!reactionSearchResult.hasSearch) return filteredNodes;

    const { matchedReactionIds, highlightedNodeIds } = reactionSearchResult;

    return filteredNodes.map((n) => {
      const isHighlighted = highlightedNodeIds.has(n.id);
      const isMatchedReaction = matchedReactionIds.has(n.id);

      if (!isHighlighted) {
        return {
          ...n,
          style: {
            ...(n.style || {}),
            opacity: 0.2,
          },
        };
      }

      if (isMatchedReaction) {
        return {
          ...n,
          style: {
            ...(n.style || {}),
            opacity: 1,
            boxShadow: '0 0 0 3px #2563eb',
          },
        };
      }

      if (n.type === 'reaction') {
        return {
          ...n,
          style: {
            ...(n.style || {}),
            opacity: 1,
            boxShadow: '0 0 0 2px #60a5fa',
          },
        };
      }

      return {
        ...n,
        style: {
          ...(n.style || {}),
          opacity: 1,
          boxShadow: '0 0 0 2px #22c55e',
        },
      };
    });
  }, [filteredNodes, reactionSearchResult]);

  const displayEdges = useMemo(() => {
    if (!reactionSearchResult.hasSearch) return filteredEdges;

    const { highlightedNodeIds } = reactionSearchResult;

    return filteredEdges.map((e) => {
      const isHighlighted =
        highlightedNodeIds.has(e.source) && highlightedNodeIds.has(e.target);

      if (!isHighlighted) {
        return {
          ...e,
          style: {
            ...(e.style || {}),
            opacity: 0.12,
          },
          labelStyle: {
            ...(e.labelStyle || {}),
            opacity: 0.12,
          },
        };
      }

      return {
        ...e,
        style: {
          ...(e.style || {}),
          opacity: 1,
          strokeWidth: (e.style?.strokeWidth || 1.5) + 0.5,
        },
        labelStyle: {
          ...(e.labelStyle || {}),
          opacity: 1,
          fontWeight: 600,
        },
      };
    });
  }, [filteredEdges, reactionSearchResult]);

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

    setHover((prev) => prev && ({
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
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 60,
          background: 'white',
          border: '1px solid #d1d5db',
          borderRadius: 6,
          padding: 8,
          width: 320,
        }}
      >
        <input
          type="text"
          placeholder="Search reaction by short label or name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            border: '1px solid #d1d5db',
            borderRadius: 4,
            padding: '6px 8px',
            fontSize: 12,
          }}
        />
      </div>

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
        nodes={displayNodes}
        edges={displayEdges}
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
