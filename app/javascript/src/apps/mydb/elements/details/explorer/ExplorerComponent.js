import React, { useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle, 
  Position
} from 'reactflow';
// import DetailActions from 'src/stores/alt/actions/DetailActions';

// const CloseBtn = ({ explorer }) => {
//   const onClickToClose = () => DetailActions.close(explorer);
//   return (
//     <Button
//       variant="danger"
//       size="xxsm"
//       onClick={onClickToClose}
//       style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}
//     >
//       <i className="fa fa-times" />
//     </Button>
//   );
// };

// 🟢 Molecule node (circle)
// const MoleculeNode = ({ data }) => (
//   <div
//     style={{
//       backgroundColor: '#d4edda',
//       border: '2px solid #28a745',
//       borderRadius: '50%',
//       width: 80,
//       height: 80,
//       display: 'flex',
//       alignItems: 'center',
//       justifyContent: 'center',
//       fontWeight: 600,
//       color: '#155724',
//       position: 'relative', // ⬅️ required for absolute Handles
//     }}
//   >
//     {data?.label || 'Molecule'}
//     <Handle type="source" position="bottom" />
//     <Handle type="target" position="bottom" />
//   </div>
// );

// // 🟦 Sample node (rectangle)
// const SampleNode = ({ data }) => (
//   <div
//     style={{
//       backgroundColor: '#cce5ff',
//       border: '2px solid #007bff',
//       borderRadius: '8px',
//       padding: '10px 15px',
//       fontWeight: 600,
//       color: '#004085',
//       minWidth: 100,
//       textAlign: 'center',
//     }}
//   >
//     {data?.label || 'Sample'}
//     <Handle type="source" position="top" />
//     <Handle type="target" position="top" />
//   </div>
// );

// // Register node types
// const nodeTypes = {
//   moleculeNode: MoleculeNode,
//   sampleNode: SampleNode,
// };


export default function ExplorerComponent({ nodes, edges }) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(nodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(edges);

  // const handleNodeClick = useCallback(
  //   (_, node) => {
  //     if (onNodeClick) onNodeClick(node);
  //   },
  //   [onNodeClick]
  // );

  return (
    <div
      className="explorer-graph-container"
      style={{ height: '80vh', width: '100%', backgroundColor: '#f8f9fa' }}
    >
      <h4 className="p-2">Sample Explorer</h4>

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
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
