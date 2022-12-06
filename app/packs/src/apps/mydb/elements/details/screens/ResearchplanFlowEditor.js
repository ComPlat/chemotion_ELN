import React from 'react'
import { useState, useCallback, useEffect } from 'react'
import ReactFlow, { ReactFlowProvider, Controls, Background, applyNodeChanges, applyEdgeChanges, addEdge, useReactFlow, Panel, useUpdateNodeInternals } from 'reactflow'
import { Modal, Button, ButtonGroup } from 'react-bootstrap'

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
  const reactFlowInstance = useReactFlow()
  const updateNodeInternals = useUpdateNodeInternals()

  const initialNodes = initialEditorData.nodes || []
  const initialEdges = initialEditorData.edges || []
  const initialUnassignedNodes = buildUnassignedNodes(initialNodes, researchplans)

  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [unassignedNodes, setUnassignedNodes] = useState(initialUnassignedNodes);

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
      const newEdge = {
        ...params,
        label: 'followed by',
        animated: true,
      }
      setEdges((eds) => addEdge(newEdge, eds))
    },
    []
  )

  useEffect(() => {
    setUnassignedNodes(buildUnassignedNodes(nodes, researchplans))
  }, [nodes])

  const onHide = () => {
    setNodes(initialNodes)
    setEdges(initialEdges)
    setUnassignedNodes(initialUnassignedNodes)
    toggleModal(false)
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

  return (
    <div>
      <Modal
        show={visible}
        animation
        dialogClassName="researchplan-flow-editor-modal"
        onHide={onHide}
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
            >
              <Background />
              <Controls showInteractive={false} />
              <Panel position="top-right">
                <ButtonGroup vertical>
                  {
                    unassignedNodes.map((node, index) => <Button key={index} onClick={() => handleClickToAddNode(index)}>{node.data.label}</Button>)
                  }
                </ButtonGroup>
              </Panel>
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
    </div >
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
