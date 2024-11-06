import React from 'react';
import PropTypes from 'prop-types';
import { Button, Tooltip, ButtonGroup, OverlayTrigger } from 'react-bootstrap';

import DatasetContainer from 'src/apps/mydb/inbox/DatasetContainer';
import Pagination from 'src/apps/mydb/inbox/Pagination';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import InboxStore from 'src/stores/alt/stores/InboxStore';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';

export default class DeviceBox extends React.Component {
  constructor(props) {
    super(props);

    const inboxState = InboxStore.getState();

    this.state = {
      visible: false,
      checkedDeviceAll: inboxState.checkedDeviceAll,
      checkedDeviceIds: inboxState.checkedDeviceIds,
      checkedIds: inboxState.checkedIds,
      deletingTooltip: false,
      currentDeviceBoxPage: inboxState.currentDeviceBoxPage,
      dataItemsPerPage: inboxState.dataItemsPerPage,
    };

    this.handleDatasetSelect = this.handleDatasetSelect.bind(this);
    this.toggleSelectAllFiles = this.toggleSelectAllFiles.bind(this);
    this.deleteCheckedDataset = this.deleteCheckedDataset.bind(this);
    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    const { device_box, deviceBoxVisible } = this.props;
    const { currentDeviceBoxPage } = this.state;
    if (deviceBoxVisible) {
      if (Array.isArray(device_box.children) && !device_box.children.length) {
        LoadingActions.start();
        InboxActions.fetchInboxContainer(device_box.id, currentDeviceBoxPage);
      }
    }
    this.setState({ visible: deviceBoxVisible });
    InboxStore.listen(this.onChange);
  }

  componentDidUpdate(prevProps) {
    const { deviceBoxVisible, device_box } = this.props;
    const { currentDeviceBoxPage } = this.state;

    if (deviceBoxVisible !== prevProps.deviceBoxVisible) {
      this.setState({ visible: deviceBoxVisible });
    }
  }

  componentWillUnmount() {
    InboxStore.unlisten(this.onChange);
  }

  handleDeviceBoxClick(deviceBox) {
    const { visible, currentDeviceBoxPage } = this.state;

    if (!visible) {
      if (Array.isArray(deviceBox.children) && !deviceBox.children.length) {
        LoadingActions.start();
        InboxActions.fetchInboxContainer(deviceBox.id, currentDeviceBoxPage);
      }
    }
    this.setState({
      visible: !visible,
      checkedDeviceAll: false,
      checkedDeviceIds: [],
      checkedIds: [],
    });
  }

  handleDatasetSelect(datasetId) {
    const { checkedDeviceIds, checkedIds } = this.state;
    const newCheckedIds = [...checkedIds];
    const datasetIndex = checkedDeviceIds.indexOf(datasetId);
    const datasetSelected = datasetIndex !== -1;

    if (datasetSelected) {
      const newCheckedDeviceIds = checkedDeviceIds.filter((id) => id !== datasetId);
      const currentDeviceBox = this.props.device_box;
      const dataset = currentDeviceBox.children.find((d) => d.id === datasetId);
      dataset.attachments.forEach((attachment) => {
        const attachmentIndex = newCheckedIds.indexOf(attachment.id);
        if (attachmentIndex !== -1) {
          newCheckedIds.splice(attachmentIndex, 1);
        }
      });

      const params = {
        checkedDeviceIds: newCheckedDeviceIds,
        checkedIds: newCheckedIds,
      };

      InboxActions.checkedDeviceIds(params);
    } else {
      const newCheckedDeviceIds = [...checkedDeviceIds, datasetId];
      const currentDeviceBox = this.props.device_box;
      const dataset = currentDeviceBox.children.find((d) => d.id === datasetId);
      dataset.attachments.forEach((attachment) => {
        if (!newCheckedIds.includes(attachment.id)) {
          newCheckedIds.push(attachment.id);
        }
      });

      const params = {
        checkedDeviceIds: newCheckedDeviceIds,
        checkedIds: newCheckedIds,
      };
      InboxActions.checkedDeviceIds(params);
    }
  }

  onChange(state) {
    const { checkedDeviceAll, checkedDeviceIds, checkedIds } = state;
    this.setState({
      checkedDeviceAll,
      checkedDeviceIds,
      checkedIds,
    });
  }

  handlePrevClick = (deviceBox) => {
    const { currentDeviceBoxPage } = this.state;
    const updatedPage = currentDeviceBoxPage - 1;
    this.setState({ currentDeviceBoxPage: updatedPage });
    const params = {
      checkedDeviceIds: [],
      checkedIds: [],
    };
    InboxActions.checkedDeviceIds(params);
    LoadingActions.start();
    InboxActions.fetchInboxContainer(deviceBox.id, updatedPage);
  };

  handleNextClick = (deviceBox) => {
    const { currentDeviceBoxPage } = this.state;
    const updatedPage = currentDeviceBoxPage + 1;
    this.setState({ currentDeviceBoxPage: updatedPage });
    const params = {
      checkedDeviceIds: [],
      checkedIds: [],
    };
    InboxActions.checkedDeviceIds(params);
    LoadingActions.start();
    InboxActions.fetchInboxContainer(deviceBox.id, updatedPage);
  };

  toggleSelectAllFiles() {
    const { checkedDeviceAll } = this.state;

    const params = {
      type: false,
      range: 'all'
    };

    if (!checkedDeviceAll) {
      params.type = true;
    }

    this.setState((prevState) => ({
      ...prevState.inboxState,
      checkedDeviceAll: !this.state.checkedDeviceAll
    }));

    InboxActions.checkedDeviceAll(params);
  }

  toggleTooltip() {
    this.setState((prevState) => ({ ...prevState, deletingTooltip: !prevState.deletingTooltip }));
  }

  deleteCheckedDataset(device_box) {
    const { checkedDeviceIds, currentDeviceBoxPage, checkedIds } = this.state;

    const currentItemsCount = device_box.children.length;
    const itemsDeleted = checkedDeviceIds.length;

    const attachmentIdsToDelete = [];

    checkedDeviceIds.forEach((checkedDeviceId) => {
      const datasetToDelete = device_box.children.find((dataset) => dataset.id === checkedDeviceId);
      if (datasetToDelete) {
        InboxActions.deleteContainer(datasetToDelete, true);
      }
    });

    checkedIds.forEach((checkedId) => {
      device_box.children.forEach((dataset) => {
        const attachmentToDelete = dataset.attachments.find((attachment) => attachment.id === checkedId);
        if (attachmentToDelete) {
          attachmentIdsToDelete.push(checkedId);
        }
      });
    });

    if (attachmentIdsToDelete.length > 0) {
      InboxActions.bulkDeleteAttachments(attachmentIdsToDelete, false);
    }

    const params = {
      checkedDeviceIds: [],
      checkedIds: [],
    };
    InboxActions.checkedDeviceIds(params);

    if (currentDeviceBoxPage > 1 && itemsDeleted === currentItemsCount) {
      this.handlePrevClick(device_box);
    }

    this.toggleTooltip();
  }

  deleteDeviceBox(deviceBox) {
    InboxActions.deleteContainer(deviceBox);
  }

  render() {
    const { device_box, largerInbox } = this.props;
    const {
      visible, checkedDeviceAll, checkedDeviceIds, checkedIds, currentDeviceBoxPage, dataItemsPerPage, deletingTooltip
    } = this.state;
    const cache = InboxStore.getState().cache;


    // device_box.children_count gives the total number of children of each DeviceBox
    // while device_box.children contains only the paginated entries

    const totalPages = Math.ceil(device_box.children_count / dataItemsPerPage);
    const currentItemsCount = device_box.children.length;

    const renderCheckAll = (
      <div>
        <input
          type="checkbox"
          checked={checkedDeviceIds.length === currentItemsCount && currentItemsCount !== 0}
          onChange={this.toggleSelectAllFiles}
        />
        <span className="ms-2 fw-bold">
          {checkedDeviceIds.length === currentItemsCount
          && currentItemsCount !== 0 ? 'Deselect all' : 'Select all'}
        </span>
      </div>
    );

    const trash = (
      <OverlayTrigger
        show={deletingTooltip}
        animation
        trigger="click"
        placement="bottom"
        overlay={(
          <Tooltip placement="bottom" className="in" id="tooltip-bottom">
            Delete this item(s)?
            <ButtonGroup className="mt-1">
              <Button
                variant="danger"
                size="sm"
                onClick={() => this.deleteCheckedDataset(device_box)}
              >
                Yes
              </Button>
              <Button variant="warning" size="sm" onClick={() => this.toggleTooltip()}>
                No
              </Button>
            </ButtonGroup>
          </Tooltip>
        )}>
        <i
          className="fa fa-trash-o mt-1"
          aria-hidden="true"
          onClick={() => this.toggleTooltip()}
          role="button"
        />
      </OverlayTrigger>
    );

    const datasets = device_box.children.map((dataset) => (
      <DatasetContainer
        key={`dataset_${dataset.id}`}
        sourceType={DragDropItemTypes.DATASET}
        dataset={dataset}
        cache={cache}
        largerInbox={largerInbox}
        isSelected={checkedDeviceIds.includes(dataset.id)}
        onDatasetSelect={this.handleDatasetSelect}
        checkedIds={checkedIds}
      />
    ));

    return (
      <div>
        <div
          className="bg-gray-200 p-1 overflow-auto d-flex align-items-between"
          onClick={() => this.handleDeviceBoxClick(device_box)}
          role="button"
          tabIndex={0}
          onKeyDown={() => {}}
        >
          {
            device_box?.children_count === 0
              && (
                <i
                  className="fa fa-trash-o"
                  onClick={() => this.deleteDeviceBox(device_box)}
                  role="button"
                />
          )}
          <button
            type="button"
            className="border-0 bg-transparent"
            onClick={() => this.setState({ visible: !visible })}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                InboxActions.showInboxModal();
              }
            }}
          >
            <i
              className={`fa fa-folder${visible ? '-open' : ''} me-1`}
              aria-hidden="true"
            />
            {device_box.name}
          </button>
        </div>
        {
          visible && device_box?.children_count > dataItemsPerPage && (
            <Pagination
              currentDataSetPage={currentDeviceBoxPage}
              totalPages={totalPages}
              handlePrevClick={() => this.handlePrevClick(device_box)}
              handleNextClick={() => this.handleNextClick(device_box)}
            />
        )}
        <table>
          <tbody>
            <tr>
              <td className="w-75 pe-5">
                <div>{visible && renderCheckAll}</div>
              </td>
              <td className="w-25">
                <div>{visible && trash}</div>
              </td>
            </tr>
          </tbody>
        </table>
        <div>{visible && datasets}</div>
      </div>
    );
  }
}

DeviceBox.propTypes = {
  device_box: PropTypes.object.isRequired,
  largerInbox: PropTypes.bool,
  deviceBoxVisible: PropTypes.bool,
};

DeviceBox.defaultProps = {
  largerInbox: false,
  deviceBoxVisible: false,
};
