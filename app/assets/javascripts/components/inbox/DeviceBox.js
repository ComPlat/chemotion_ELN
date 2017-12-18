import React from 'react';
import {Button} from 'react-bootstrap';

import DatasetContainer from './DatasetContainer';
import DragDropItemTypes from '../DragDropItemTypes';
import InboxActions from '../actions/InboxActions';

export default class DeviceBox extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      visible: false
    }
  }

  deleteDeviceBox(device_box){
    InboxActions.deleteContainer(device_box)
  }

  render() {
    let {device_box} = this.props
    let {visible} = this.state
    let datasets = device_box.children.map(dataset => {
      return(
        <DatasetContainer key={"dataset_"+dataset.id}
            sourceType={DragDropItemTypes.DATASET}
            dataset={dataset} />
      )
    })

    let textStyle = {
      display: "block", whiteSpace: "nowrap", overflow: "hidden",
      textOverflow: "ellipsis", maxWidth: "100%", cursor: 'move'
    }

    return (
      visible
          ?
          <div className="tree-view">
            <div className="title" style={textStyle}>
            {datasets.length == 0
              ? <i className="fa fa-trash-o" onClick={() => this.deleteDeviceBox(device_box)} style={{cursor: "pointer"}}>&nbsp;&nbsp;</i>
              : ""
            }
              <i className="fa fa-folder-open" aria-hidden="true"
                onClick={() => this.setState({visible: !visible})}> {device_box.name}
              </i>
            </div>
            <div>{datasets}</div>
          </div>

          : <div className="tree-view">
              <div className="title" style={textStyle}>
              {datasets.length == 0
                ? <i className="fa fa-trash-o" onClick={() => this.deleteDeviceBox(device_box)} style={{cursor: "pointer"}}>&nbsp;&nbsp;</i>
                : ""
              }
                <i className="fa fa-folder" aria-hidden="true"
                  onClick={() => this.setState({visible: !visible})}> {device_box.name}
                </i>
              </div>
            </div>
          )
  }
}
