import React from 'react';
import PropTypes from 'prop-types';

import DatasetContainer from 'src/apps/mydb/inbox/DatasetContainer';
import Pagination from 'src/apps/mydb/inbox/Pagination';
import DragDropItemTypes from 'src/components/DragDropItemTypes';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import InboxStore from 'src/stores/alt/stores/InboxStore';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';

export default class DeviceBox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: false,
      currentPage: 1,
      itemsPerPage: InboxStore.getState().dataItemsPerPage,
    };
  }

  componentDidMount() {
    const { device_box, deviceBoxVisible } = this.props;
    const { currentPage } = this.state;
    if (deviceBoxVisible) {
      if (Array.isArray(device_box.children) && !device_box.children.length) {
        LoadingActions.start();
        InboxActions.fetchInboxContainer(device_box.id, currentPage);
      }
    }
    this.setState({ visible: deviceBoxVisible });
  }

  componentDidUpdate(prevProps) {
    const { deviceBoxVisible } = this.props;
    if (deviceBoxVisible !== prevProps.deviceBoxVisible) {
      this.setState({ visible: deviceBoxVisible });
    }
  }

  handleDeviceBoxClick(deviceBox) {
    const { visible, currentPage } = this.state;
    const { fromCollectionTree } = this.props;

    InboxActions.setActiveDeviceBoxId(deviceBox.id);

    if (fromCollectionTree) {
      return;
    }

    if (!visible) {
      if (Array.isArray(deviceBox.children) && !deviceBox.children.length) {
        LoadingActions.start();
        InboxActions.fetchInboxContainer(deviceBox.id, currentPage);
      }
    }
    this.setState({ visible: !visible });
  }

  handlePrevClick = (deviceBox) => {
    const { currentPage } = this.state;
    const updatedPage = currentPage - 1;
    this.setState({ currentPage: updatedPage });
    InboxActions.fetchInboxContainer(deviceBox.id, updatedPage);
  };

  handleNextClick = (deviceBox) => {
    const { currentPage } = this.state;
    const updatedPage = currentPage + 1;
    this.setState({ currentPage: updatedPage });
    InboxActions.fetchInboxContainer(deviceBox.id, updatedPage);
  };

  deleteDeviceBox(deviceBox) {
    const { fromCollectionTree } = this.props;
    if (fromCollectionTree) {
      return;
    }

    InboxActions.deleteContainer(deviceBox);
  }

  render() {
    const { device_box, largerInbox, fromCollectionTree } = this.props;
    const { visible, currentPage, itemsPerPage } = this.state;
    const cache = InboxStore.getState().cache;

    // device_box.children_count gives the total number of children of each DeviceBox
    // while device_box.children contains only the paginated entries

    const totalPages = Math.ceil(device_box.children_count / itemsPerPage);

    device_box.children.sort((a, b) => {
      if (a.name > b.name) { return 1; } if (a.name < b.name) { return -1; } return 0;
    });

    const datasets = device_box.children.map((dataset) => (
      <DatasetContainer
        key={`dataset_${dataset.id}`}
        sourceType={DragDropItemTypes.DATASET}
        dataset={dataset}
        cache={cache}
        largerInbox={largerInbox}
      />
    ));

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
        <div
          className="title"
          style={textStyle}
          onClick={() => this.handleDeviceBoxClick(device_box)}
        >
          {
            device_box?.children_count === 0
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
            onClick={!fromCollectionTree ? () => this.setState({ visible: !visible }) : null}
          >
            <i
              className={`fa fa-folder${visible ? '-open' : ''}`}
              aria-hidden="true"
              style={{ marginRight: '5px' }}
            />
            {device_box.name}
          </button>
        </div>
        {
          visible && !fromCollectionTree && device_box?.children_count > itemsPerPage ? (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              handlePrevClick={() => this.handlePrevClick(device_box)}
              handleNextClick={() => this.handleNextClick(device_box)}
            />
          ) : null
        }
        <div>{visible && !fromCollectionTree ? datasets : null}</div>
      </div>
    );
  }
}

DeviceBox.propTypes = {
  device_box: PropTypes.object.isRequired,
  largerInbox: PropTypes.bool,
  fromCollectionTree: PropTypes.bool,
  deviceBoxVisible: PropTypes.bool,
};

DeviceBox.defaultProps = {
  largerInbox: false,
  fromCollectionTree: false,
  deviceBoxVisible: false,
};
