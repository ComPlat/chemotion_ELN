import React from 'react'
import { useState } from 'react'
import ReactFlow, { Controls, ControlButton, Background } from 'reactflow'

import ResearchplanFlowEditorWithProvider from 'src/apps/mydb/elements/details/screens/ResearchplanFlowEditor';

const ResearchplanFlowDisplay = (props) => {
  const researchplans = props.researchplans || []
  const defaultNodesWithoutLabel = props.initialData.nodes || []
  const defaultEdges = props.initialData.edges || []
  const [showEditor, toggleModal] = useState(false);

  const defaultNodes = defaultNodesWithoutLabel.map((node) => {
    const researchplan = researchplans.find((plan) => {
      return plan.id === parseInt(node.id)
    })

    return {
      ...node,
      data: { label: researchplan ? researchplan.name : 'Deleted researchplan' },
      style: {
        border: researchplan ? '1px solid #000' : '1px solid #f00',
        color: researchplan ? '#000' : '#f00',
      },
    }
  })

  const initialEditorData = {
    nodes: defaultNodes,
    edges: defaultEdges,
  }

  const onSave = (editorData) => {
    console.log(editorData)
  }

  return (
    <div style={{ marginBottom: "10px", width: "100%", height: "250px" }}>
      <ReactFlow
        fitView
        defaultNodes={defaultNodes}
        defaultEdges={defaultEdges}
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
