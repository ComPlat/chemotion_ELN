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

    return (
      visible
          ?
          <li><div className="tree-view"><div className="title"><i className="fa fa-folder-open" aria-hidden="true"
          onClick={() => this.setState({visible: !visible})}> {device_box.name} </i>
            {datasets.length == 0
              ? <a className="close" onClick={() => this.deleteDeviceBox(device_box)}>&times;</a>
              : ""
            }</div></div>
              <ul> {datasets} </ul>
            </li>

          : <li><div className="tree-view"><div className="title"><i className="fa fa-folder" aria-hidden="true"
          onClick={() => this.setState({visible: !visible})}> {device_box.name}</i>
            {datasets.length == 0
              ? <a className="close" onClick={() => this.deleteDeviceBox(device_box)}>&times;</a>
              : ""
            }
            </div></div>
            </li>
    )
  }
}
