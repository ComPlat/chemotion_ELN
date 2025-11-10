import React, { useState, useMemo} from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle, 
  Position
} from 'reactflow';
import { Button } from 'react-bootstrap';
import DetailActions from 'src/stores/alt/actions/DetailActions';


const clickToClose = (explorer) => {
  console.log('Close button clicked for explorer:', explorer);
  DetailActions.close(explorer, true);
};

const CloseBtn = ({ explorer }) => {
  const onClickToClose = () => clickToClose(explorer);
  return (
    <Button
      variant="danger"
      size="xxsm"
      onClick={onClickToClose}
      style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}
    >
      <i className="fa fa-times" />
    </Button>
  );
};

export default function ExplorerComponent({ nodes, edges }) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(nodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(edges);

  // const handleNodeClick = useCallback(
  //   (_, node) => {
  //     if (onNodeClick) onNodeClick(node);
  //   },
  //   [onNodeClick]
  // );

  const [activeFilters, setActiveFilters] = useState([
    'molecule',
    'sample',
    'splitsample',
    'reaction',
  ]);

  const handleFilterChange = (type) => {
    setActiveFilters((prev) =>
      prev.includes(type)
        ? prev.filter((f) => f !== type)
        : [...prev, type]
    );
  };

  const nodeMap = useMemo(() => {
  const map = {};
  rfNodes.forEach((n) => (map[n.id] = n));
  return map;
}, [rfNodes]);

const filteredNodes = useMemo(
  () => rfNodes.filter((node) => activeFilters.includes(node.type)),
  [rfNodes, activeFilters]
);

const filteredEdges = useMemo(() => {
  return rfEdges.filter((edge) => {
    const sourceNode = nodeMap[edge.source];
    const targetNode = nodeMap[edge.target];
    return (
      sourceNode &&
      targetNode &&
      activeFilters.includes(sourceNode.type) &&
      activeFilters.includes(targetNode.type)
    );
  });
}, [rfEdges, nodeMap, activeFilters]);

  return (
    <div
      className="explorer-graph-container"
      style={{ height: '80vh', width: '100%', backgroundColor: '#f8f9fa' }}
    >

      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 50,
          zIndex: 10,
          background: 'white',
          padding: '8px 12px',
          borderRadius: 6,
          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          display: 'flex',
          gap: '10px',
        }}
      >
        {['molecule', 'sample', 'splitsample', 'reaction'].map((type) => (
          <label key={type} style={{ textTransform: 'capitalize' }}>
            <input
              type="checkbox"
              checked={activeFilters.includes(type)}
              onChange={() => handleFilterChange(type)}
              style={{ marginRight: 4 }}
            />
            {type}
          </label>
        ))}
      </div>

      <ReactFlow
        nodes={filteredNodes}
        edges={filteredEdges}
        // nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        // onNodeClick={handleNodeClick}
        fitView
        style={{ border: '1px solid #ccc', borderRadius: '8px' }}
      >
        <MiniMap />
        <Controls />
        <Background color="#aaa" gap={16} />
      </ReactFlow>
    </div>
  );
}

export { CloseBtn };
