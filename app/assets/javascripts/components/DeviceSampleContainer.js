import React from 'react'
import {DropTarget} from 'react-dnd'
import DragDropItemTypes from './DragDropItemTypes'
import ElementActions from './actions/ElementActions'
import {ButtonGroup, Button} from 'react-bootstrap';

const target = {
  drop(props, monitor){
    const {device} = props
    const item = monitor.getItem()
    const itemType = monitor.getItemType()
    if (itemType == 'sample') { // TODO without analysis
      ElementActions.addSampleToDevice(item.element, device)
    }
  },
  canDrop(props, monitor){
    const {materialGroup} = props
    const item = monitor.getItem()
    const itemType = monitor.getItemType()
    if (itemType == 'sample') {
      return true
    }
  }
}

const collect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
})

const DeviceSampleContainer = ({device, isOver, canDrop, connectDropTarget}) => {
  const handleTypeClick = (type) => {
  }

  let style = {
    marginBottom: "10px",
    minHeight: "39px"
  }
  if (isOver && canDrop) {
    style.borderStyle = 'dashed'
    style.borderColor = '#337ab7'
  } else if (canDrop) {
    style.borderStyle = 'dashed'
  }
  return connectDropTarget(
    <div>
      <TypeButtonsHeader/>
      <div style={style}>
        {device.samples.map((sample, key) => {
          return (
            <div
              key={key}
              style={{display: "flex", marginBottom: "5px"}}
            >
              <Button
                bsStyle={"danger"}
              >
                <i className="fa fa-trash-o"></i>
              </Button>
              <div
                style={{
                  padding: "6px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                  margin: "0 5px",
                  flex: 1
                }}
              >
                {sample._short_label}
              </div>
              <TypeButtons
                device={device}
                onTypeClick={(type) => handleTypeClick(type, sample)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DropTarget([DragDropItemTypes.SAMPLE], target, collect)(DeviceSampleContainer)

const TypeButtonsHeader = () => {
  const style = {
    cursor:'default'
  }
  return (
    <div
      style={{display: "flex"}}
    >
      <div style={{flex: 1}}></div>
      <ButtonGroup
        style={{marginBottom: "5px"}}
      >
        <Button
          bsStyle={"primary"}
          disabled={true}
          style={{cursor: "default"}}
        >
          NMR
        </Button>
        <Button
          bsStyle={"primary"}
          disabled={true}
          style={{cursor: "default"}}
        >
          EA
        </Button>
        <Button
          bsStyle={"primary"}
          disabled={true}
          style={{cursor: "default"}}
        >
          MS
        </Button>
        <Button
          bsStyle={"primary"}
          disabled={true}
          style={{cursor: "default"}}
        >
          IR
        </Button>
      </ButtonGroup>
    </div>
  )
}

const TypeButtons = ({device, onTypeClick}) => {
  console.log(device)
  const isDisabled = (type) => !device.types.includes(type)

  return (
    <ButtonGroup>
      <Button
        onClick={() => onTypeClick("NMR")}
        disabled={isDisabled("NMR")}
        style={{width: "57.91px"}}
      >
        &nbsp;
      </Button>
      <Button
        onClick={() => onTypeClick("EA")}
        disabled={isDisabled("EA")}
        style={{width: "43.64px"}}
      >
        &nbsp;
      </Button>
      <Button
        onClick={() => onTypeClick("MS")}
        disabled={isDisabled("MS")}
        style={{width: "47.28px"}}
      >
        &nbsp;
      </Button>
      <Button
        onClick={() => onTypeClick("IR")}
        disabled={isDisabled("IR")}
        style={{width: "39.22px"}}
      >
        &nbsp;
      </Button>
    </ButtonGroup>
  )
}
