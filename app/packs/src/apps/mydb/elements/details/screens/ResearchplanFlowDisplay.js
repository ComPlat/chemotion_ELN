import React from 'react'
import { useState } from 'react'
import ReactFlow, { Controls, ControlButton, Background, applyNodeChanges, applyEdgeChanges } from 'reactflow'

import ResearchplanFlowEditor from 'src/apps/mydb/elements/details/screens/ResearchplanFlowEditor';

const initialNodes = [
  {
    id: '1',
    data: { label: 'Matt Research Plan' },
    position: { x: 150, y: 0 },
  },
  {
    id: '2',
    data: { label: 'Research Plan Nov.' },
    position: { x: 150, y: 100 },
  },
  {
    id: '3',
    data: { label: 'New Research Plan 1 for New Screen' },
    position: { x: 50, y: 200 },
  },
  {
    id: '4',
    data: { label: 'New Research Plan 2 for New Screen' },
    position: { x: 250, y: 200 },
  },
];

const initialEdges = [
  { id: '1-2', source: '1', target: '2', label: 'followed by', animated: true },
  { id: '2-3', source: '2', target: '3', label: 'followed by', animated: true },
  { id: '2-4', source: '2', target: '4', label: 'followed by', animated: true },
];

const ResearchplanFlowDisplay = () => {
  const [nodes] = useState(initialNodes);
  const [edges] = useState(initialEdges);
  const [showEditor, toggleModal] = useState(false);

  return (
    <div style={{ marginBottom: "10px", width: "100%", height: "250px" }}>
      <ReactFlow
        fitView
        nodes={nodes}
        edges={edges}
      >
        <Background />
        <Controls showInteractive={false}>
          <ControlButton onClick={() => toggleModal(!showEditor)}>
            <div>Edit</div>
          </ControlButton>
        </Controls>
      </ReactFlow>
      <ResearchplanFlowEditor visible={showEditor} toggleModal={toggleModal} />
    </div>
  )
}

export default ResearchplanFlowDisplay
