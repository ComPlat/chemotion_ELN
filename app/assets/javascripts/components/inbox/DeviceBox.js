import React from 'react';

import DatasetContainer from './DatasetContainer';
import DragDropItemTypes from '../DragDropItemTypes';
import InboxActions from '../actions/InboxActions';
import InboxStore from '../stores/InboxStore';

export default class DeviceBox extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      visible: false
    }
  }

  deleteDeviceBox(deviceBox) {
    InboxActions.deleteContainer(deviceBox);
  }

  render() {
    const { device_box } = this.props;
    const { visible } = this.state;
    const cache = InboxStore.getState().cache;

    const datasets = device_box.children.map((dataset) => {
      return(
        <DatasetContainer
          key={`dataset_${dataset.id}`}
          sourceType={DragDropItemTypes.DATASET}
          dataset={dataset}
          cache={cache}
        />
      )
    })

    const textStyle = {
      display: "block",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      maxWidth: "100%",
      cursor: 'move'
    }

    return (
      <div className="tree-view">
        <div className="title" style={textStyle}>
          {datasets.length === 0
            ? (
              <i
                className="fa fa-trash-o"
                onClick={() => this.deleteDeviceBox(device_box)}
                style={{ cursor: "pointer" }}
              >&nbsp;&nbsp;</i>
            ) : null
          }
          <i
            className={`fa fa-folder${visible ? '-open' : null}`}
            aria-hidden="true"
            onClick={() => this.setState({ visible: !visible })}
          > {device_box.name}</i>
        </div>
        <div>{visible ? datasets : null}</div>
      </div>
    )
  }
}
