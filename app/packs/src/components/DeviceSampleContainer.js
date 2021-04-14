import React from 'react'
import {DropTarget} from 'react-dnd'
import DragDropItemTypes from './DragDropItemTypes'
import ElementActions from './actions/ElementActions'
import {ButtonGroup, Button} from 'react-bootstrap';
import { chmoConversions } from './OlsComponent';

const target = {
  drop(props, monitor){
    const {device} = props
    const item = monitor.getItem()
    const itemType = monitor.getItemType()
    if (itemType == 'sample') {
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
      <TypeButtonsHeader
        device={device}
        onTypeClick={(type) => ElementActions.openDeviceAnalysis(device, type)}
      />
      <div style={style}>
        {device.samples.length > 0
          ? device.samples.map((sample, key) => (
            <DeviceSample
              device={device}
              sample={sample}
              key={key}
            />
          ))
          : <div>
              There are currently no Samples associated with this Device.
            </div>
        }
      </div>
    </div>
  )
}

export default DropTarget([DragDropItemTypes.SAMPLE], target, collect)(DeviceSampleContainer)

const DeviceSample = ({sample, device}) => {
  return (
    <div
      style={{display: "flex", marginBottom: "5px"}}
    >
      <Button
        bsStyle={"danger"}
        onClick={() => ElementActions.removeSampleFromDevice(sample, device)}
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
        {sample.shortLabel}
      </div>
      <TypeButtons
        device={device}
        sample={sample}
        onTypeClick={(type) => ElementActions.toggleTypeOfDeviceSample(device, sample, type)}
      />
    </div>
  )
}

const TypeButtonsHeader = ({device, onTypeClick}) => {
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
          disabled={isDisabled(device, chmoConversions.nmr_1h.value)}
          onClick={() => onTypeClick(chmoConversions.nmr_1h.value)}
        >
          {chmoConversions.nmr_1h.label}
        </Button>
        <Button
          bsStyle={"primary"}
          disabled={isDisabled(device, chmoConversions.nmr_13c.value)}
          onClick={() => onTypeClick(chmoConversions.nmr_13c.value)}
        >
          {chmoConversions.nmr_13c.label}
        </Button>
        <Button
          bsStyle={"primary"}
          disabled={isDisabled(device, chmoConversions.ea.value)}
          onClick={() => onTypeClick(chmoConversions.ea.value)}
        >
          {chmoConversions.ea.label}
        </Button>
        <Button
          bsStyle={"primary"}
          disabled={isDisabled(device, chmoConversions.mass.value)}
          onClick={() => onTypeClick(chmoConversions.mass.value)}
        >
          {chmoConversions.mass.label}
        </Button>
        <Button
          bsStyle={"primary"}
          disabled={isDisabled(device, chmoConversions.ir.value)}
          onClick={() => onTypeClick(chmoConversions.ir.value)}
        >
          {chmoConversions.ir.label}
        </Button>
      </ButtonGroup>
    </div>
  )
}

const isDisabled = (device, type) => {
  // TODO remove this after implementing other Analysis-Type-UIs
  if (type === chmoConversions.ea.value || type === chmoConversions.mass.value || type === chmoConversions.ir.value) {
    return true;
  } else {
    return !device.types.includes(type)
  }
}

const TypeButtons = ({device, sample, onTypeClick}) => {
  const labelBySampleType = (type) => (
    sample.types.includes(type)
      ? <i className="fa fa-check"></i>
      : <i>&nbsp;</i>
  )
  return (
    <ButtonGroup>
      <Button
        onClick={() => onTypeClick(chmoConversions.nmr_1h.value)}
        disabled={isDisabled(device, chmoConversions.nmr_1h.value)}
        style={{width: "57.91px"}}
      >
        {labelBySampleType(chmoConversions.nmr_1h.value)}
      </Button>
      <Button
        onClick={() => onTypeClick(chmoConversions.nmr_13c.value)}
        disabled={isDisabled(device, chmoConversions.nmr_13c.value)}
        style={{ width: "57.91px" }}
      >
        {labelBySampleType(chmoConversions.nmr_13c.value)}
      </Button>
      <Button
        onClick={() => onTypeClick(chmoConversions.ea.value)}
        disabled={isDisabled(device, chmoConversions.ea.value)}
        style={{width: "43.64px"}}
      >
        {labelBySampleType(chmoConversions.ea.value)}
      </Button>
      <Button
        onClick={() => onTypeClick(chmoConversions.mass.value)}
        disabled={isDisabled(device, chmoConversions.mass.value)}
        style={{width: "47.28px"}}
      >
        {labelBySampleType(chmoConversions.mass.value)}
      </Button>
      <Button
        onClick={() => onTypeClick(chmoConversions.ir.value)}
        disabled={isDisabled(device, chmoConversions.ir.value)}
        style={{width: "39.22px"}}
      >
        {labelBySampleType(chmoConversions.ir.value)}
      </Button>
    </ButtonGroup>
  )
}
