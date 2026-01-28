import React, { useState, useMemo } from 'react';
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

  const [activeFilters, setActiveFilters] = useState([
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

  return (
    <div style={{ height: '80vh', width: '100%' }}>
      <ReactFlow
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background gap={16} />
      </ReactFlow>
    </div>
  );
}
