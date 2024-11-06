import React, { useState, useCallback, useEffect, useRef } from 'react'
import ReactFlow, {
  ReactFlowProvider, Controls, Background, applyNodeChanges, applyEdgeChanges, addEdge, useReactFlow,
  Panel as ReactFlowPanel, useUpdateNodeInternals
} from 'reactflow'
import { Modal, Button, ButtonGroup, InputGroup, Card, ListGroup } from 'react-bootstrap'

const buildUnassignedNodes = (nodes, researchplans) => {
  return researchplans.reduce((newNodes, plan) => {
    const nodeIds = nodes.map(({ id }) => parseInt(id))
    if (!nodeIds.includes(plan.id)) {
      const { id, name } = plan
      newNodes.push({
        id: String(id),
        data: { label: name },
        position: { x: 10, y: 10 },
      })
    }
    return newNodes
  }, [])
}

const ResearchplanFlowEditor = (props) => {
  const { visible, initialEditorData, researchplans, toggleModal, onSave } = props
  const labelInput = useRef(null);
  const reactFlowInstance = useReactFlow()
  const updateNodeInternals = useUpdateNodeInternals()

  const initialNodes = initialEditorData.nodes || []
  const initialEdges = initialEditorData.edges || []
  const initialUnassignedNodes = buildUnassignedNodes(initialNodes, researchplans)

  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [unassignedNodes, setUnassignedNodes] = useState(initialUnassignedNodes);
  const [currentEdge, setCurrentEdge] = useState(null);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  )

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  )

  const onConnect = useCallback(
    (params) => {
      const newEdge = { ...params, label: 'followed by', animated: true }
      setEdges((eds) => addEdge(newEdge, eds))
    },
    []
  )

  const changeLabelOfCurrentEdge = (newLabel) => {
    const newEdge = { ...currentEdge, label: newLabel, animated: true }
    const changes = [
      { id: currentEdge.id, type: 'remove' },
      { item: newEdge, type: 'add' },
    ]
    setEdges((eds) => applyEdgeChanges(changes, eds));
    setCurrentEdge(newEdge);
  };

  const onEdgeClick = useCallback((_event, edge) => setCurrentEdge(edge));
  const onPaneClick = useCallback((_event) => setCurrentEdge(null));

  useEffect(() => {
    setUnassignedNodes(buildUnassignedNodes(nodes, researchplans))
  }, [nodes, researchplans])

  const onHide = () => {
    setNodes(initialNodes)
    setEdges(initialEdges)
    setUnassignedNodes(initialUnassignedNodes)
    toggleModal(false)
  }

  const onEnter = () => {
    setNodes(initialNodes)
  }

  const onClickSave = () => {
    const data = reactFlowInstance.toObject()
    const cleanedNodes = data.nodes.map((node) => {
      const { id, position } = node
      return {
        id,
        position
      }
    })

    onSave({ nodes: cleanedNodes, edges: data.edges })
    toggleModal(false)
  }

  const handleClickToAddNode = (index) => {
    const newNode = unassignedNodes[index]
    const newNodes = [...nodes, newNode]
    setNodes(newNodes)
    updateNodeInternals(newNode.id)
  }

  const edgeLabelEditor = () => {
    if (!currentEdge) { return null; }

    return (
      <Card className="mb-4">
        <Card.Header className="text-bg-primary">
          Connection name
        </Card.Header>
        <Card.Body>
          <InputGroup>
            <Button
              variant="danger"
              onClick={() => labelInput.current.value = currentEdge.label}
            >
              Reset
            </Button>
            <input name="edgeLabel" className="form-control" ref={labelInput} defaultValue={currentEdge.label} />

            <Button
              variant="success"
              onClick={() => changeLabelOfCurrentEdge(labelInput.current.value)}
            >
              Save
            </Button>
          </InputGroup>
        </Card.Body>
      </Card>
    );
  };

  const unassignedNodeButtons = () => {
    if (unassignedNodes.length == 0) { return null };

    return (
      <Card>
        <Card.Header className="text-bg-primary">
          Unused Research Plans
        </Card.Header>
        <Card.Body>
          <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
            <ListGroup>
              {
                unassignedNodes.map(
                  (node, index) => 
                    <ListGroup.Item key={index} onClick={() => handleClickToAddNode(index)}>
                      {node.data.label}
                    </ListGroup.Item>)
              }
            </ListGroup>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div>
      <Modal
        centered
        show={visible}
        animation
        size="xxxl"
        onHide={onHide}
        onEnter={onEnter}
      >
        <Modal.Header closeButton>
          <Modal.Title>ResearchPlan Flow Editor</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="w-100 block" style={{ height: '500px' }}>
            <ReactFlow
              nodes={nodes}
              onNodesChange={onNodesChange}
              edges={edges}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onEdgeClick={onEdgeClick}
              onPaneClick={onPaneClick}
            >
              <Background />
              <Controls showInteractive={false} />
              <ReactFlowPanel position="top-right" style={{ width: '20%' }}>
                {edgeLabelEditor()}
                {unassignedNodeButtons()}
              </ReactFlowPanel>
            </ReactFlow>
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-content-between">
          <Button variant="light" onClick={onHide}>
            Cancel
          </Button>
          <Button variant="success" onClick={onClickSave}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

const ResearchplanFlowEditorWithProvider = (props) => {
  return (
    <ReactFlowProvider>
      <ResearchplanFlowEditor {...props} />
    </ReactFlowProvider>
  );
}

export default ResearchplanFlowEditorWithProvider
