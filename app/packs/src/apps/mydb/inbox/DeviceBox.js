import React from 'react';
import PropTypes from 'prop-types';

import DatasetContainer from 'src/apps/mydb/inbox/DatasetContainer';
import DragDropItemTypes from 'src/components/DragDropItemTypes';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import InboxStore from 'src/stores/alt/stores/InboxStore';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';

export default class DeviceBox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: false
    };
  }

  handleDeviceBoxClick(deviceBox) {
    const { visible } = this.state;
    if (!visible) {
      if (Array.isArray(deviceBox.children) && !deviceBox.children.length) {
        LoadingActions.start();
        InboxActions.fetchInboxContainer(deviceBox);
      }
    }
    this.setState({ visible: !visible });
  }

  deleteDeviceBox(deviceBox) {
    InboxActions.deleteContainer(deviceBox);
  }

  render() {
    const { device_box, largerInbox } = this.props;
    const { visible } = this.state;
    const cache = InboxStore.getState().cache;

    device_box.children.sort((a, b) => {
      if (a.name > b.name) { return 1; } if (a.name < b.name) { return -1; } return 0;
    });

    const datasets = device_box.children.map((dataset) => {
      return (
        <DatasetContainer
          key={`dataset_${dataset.id}`}
          sourceType={DragDropItemTypes.DATASET}
          dataset={dataset}
          cache={cache}
          largerInbox={largerInbox}
        />
      );
    });

    const textStyle = {
      display: 'block',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: '100%',
      cursor: 'move'
    };

    return (
      <div className="tree-view">
        <div className="title" style={textStyle}>
          {device_box.children_count && device_box.children_count === 0
            ? (
              <i
                className="fa fa-trash-o"
                onClick={() => this.deleteDeviceBox(device_box)}
                style={{ cursor: 'pointer' }}
              >
                &nbsp;&nbsp;
              </i>
            ) : null
          }
          <button
            type="button"
            className="btn-inbox"
            onClick={() => this.setState({ visible: !visible })}
          >
            <i
              className={`fa fa-folder${visible ? '-open' : ''}`}
              aria-hidden="true"
              style={{ marginRight: '5px' }}
              onClick={() => this.handleDeviceBoxClick(device_box)}
            />
            {device_box.name}
          </button>
        </div>
        <div>{visible ? datasets : null}</div>
      </div>
    );
  }
}

DeviceBox.propTypes = {
  device_box: PropTypes.object.isRequired,
  largerInbox: PropTypes.bool
};

DeviceBox.defaultProps = {
  largerInbox: false
};
