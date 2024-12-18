import React from 'react'
import { useState } from 'react'
import ReactFlow, { Controls, ControlButton, Background } from 'reactflow'

import ResearchplanFlowEditorWithProvider from 'src/apps/mydb/elements/details/screens/ResearchplanFlowEditor';

const ResearchplanFlowDisplay = (props) => {
  const researchplans = props.researchplans || []
  const defaultNodesWithoutLabel = props.initialData.nodes || []
  const defaultEdges = props.initialData.edges || []
  const [showEditor, toggleModal] = useState(false);
  const [previewFlowInstance, setPreviewFlowInstance] = useState(null);

  const buildNodes = (nodes) => {
    return nodes.map((node) => {
      const researchplan = researchplans.find(plan => plan.id === parseInt(node.id))

      return {
        ...node,
        data: { label: researchplan ? researchplan.name : 'Deleted researchplan' },
        style: {
          border: researchplan ? '1px solid #000' : '1px solid #f00',
          color: researchplan ? '#000' : '#f00',
        },
      }
    })
  }

  const defaultNodes = buildNodes(defaultNodesWithoutLabel)

  const initialEditorData = {
    nodes: defaultNodes,
    edges: defaultEdges,
  }

  const onSave = (data) => {
    previewFlowInstance.setNodes(buildNodes(data.nodes));
    previewFlowInstance.setEdges(data.edges);
    previewFlowInstance.fitView();

    props.flowConfiguration.editor.onSave(data);
  }

  const optionsForPreviewDisplay = {
    elementsSelectable: true,
    nodesDraggable: false,
    nodesConnectable: false,
    panOnDrag: true,
    zoomOnScroll: true,
    zoomOnDoubleClick: false,
    selectNodesOnDrag: false
  }

  return (
    <div className="w-100 mb-2" style={{ height: "250px" }}>
      <ReactFlow
        fitView
        nodes={defaultNodes}
        edges={defaultEdges}
        onInit={(instance) => setPreviewFlowInstance(instance)}
        onNodeDoubleClick={props.flowConfiguration.preview.onNodeDoubleClick}
        {...optionsForPreviewDisplay}
      >
        <Background />
        <Controls showInteractive={false}>
          <ControlButton onClick={() => toggleModal(true)}>
            <div>Edit</div>
          </ControlButton>
        </Controls>
      </ReactFlow>
      <ResearchplanFlowEditorWithProvider
        visible={showEditor}
        toggleModal={toggleModal}
        initialEditorData={initialEditorData}
        researchplans={researchplans}
        onSave={onSave}
      />
    </div>
  )
}

export default ResearchplanFlowDisplay
