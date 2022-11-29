import React from 'react'
import { useState, useCallback } from 'react'
import ReactFlow, { Controls, Background, applyNodeChanges, applyEdgeChanges } from 'reactflow'
import { Modal } from 'react-bootstrap'

const initialNodes = [
  {
    id: '1',
    data: { label: 'Hello' },
    position: { x: 0, y: 0 },
    type: 'input',
  },
  {
    id: '2',
    data: { label: 'World' },
    position: { x: 100, y: 100 },
  },
];

const initialEdges = [{ id: '1-2', source: '1', target: '2', label: 'to the', type: 'step' }];

const ResearchplanFlowEditor = (props) => {
  const { visible, toggleModal } = props
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  return (
    <div>
      <Modal
        show={visible}
        animation
        dialogClassName="researchplan-flow-editor-modal"
        onHide={() => toggleModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>ResearchPlan Flow Editor</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ width: '90%', height: '500px', display: 'block' }}>
            <ReactFlow
              nodes={nodes}
              onNodesChange={onNodesChange}
              edges={edges}
              onEdgesChange={onEdgesChange}
            >
              <Background />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
        </Modal.Body>
      </Modal>
    </div >
  )
}

export default ResearchplanFlowEditor
