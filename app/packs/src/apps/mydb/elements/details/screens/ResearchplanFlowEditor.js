import React, { useState, useCallback, useEffect, useRef } from 'react'
import ReactFlow, {
  ReactFlowProvider, Controls, Background, applyNodeChanges, applyEdgeChanges, addEdge, useReactFlow,
  Panel as ReactFlowPanel, useUpdateNodeInternals
} from 'reactflow'
import { Modal, Button, ButtonGroup, InputGroup } from 'react-bootstrap'
import Panel from 'src/components/legacyBootstrap/Panel'

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
    if (!currentEdge) { return (<div></div>); }

    return (
      <Panel bsStyle="primary">
        <Panel.Heading>
          <Panel.Title>Connection name</Panel.Title>
        </Panel.Heading>
        <Panel.Body>
          <InputGroup>
            <InputGroup.Button>
              <Button
                className="btn btn-danger"
                type="button"
                onClick={() => labelInput.current.value = currentEdge.label}
              >
                Reset
              </Button>
            </InputGroup.Button>
            <input name="edgeLabel" className="form-control" ref={labelInput} defaultValue={currentEdge.label} />
            <InputGroup.Button>
              <Button
                className="btn btn-success"
                type="button"
                onClick={() => changeLabelOfCurrentEdge(labelInput.current.value)}
              >
                Save
              </Button>
            </InputGroup.Button>
          </InputGroup>
        </Panel.Body>
      </Panel>
    );
  };
  const unassignedNodeButtons = () => {
    if (unassignedNodes.length == 0) { return (<div></div>) };

    return (
      <Panel bsStyle="primary">
        <Panel.Heading>
          <Panel.Title>Unused Research Plans</Panel.Title>
        </Panel.Heading>
        <Panel.Body>
          <ButtonGroup vertical>
            {
              unassignedNodes.map(
                (node, index) => <Button key={index} onClick={() => handleClickToAddNode(index)}>{node.data.label}</Button>)
            }
          </ButtonGroup>
        </Panel.Body>
      </Panel>
    );
  }

  return (
    <div>
      <Modal
        show={visible}
        animation
        dialogClassName="researchplan-flow-editor-modal"
        onHide={onHide}
        onEnter={onEnter}
      >
        <Modal.Header closeButton>
          <Modal.Title>ResearchPlan Flow Editor</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ width: '100%', height: '500px', display: 'block' }}>
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
        <Modal.Footer>
          <Button className="pull-left" bsStyle="default" onClick={onHide}>
            Cancel
          </Button>
          <Button className="pull-right" bsStyle="success" onClick={onClickSave}>
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
