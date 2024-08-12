import React from 'react';
import PropTypes from 'prop-types';
import { Button, Tooltip, ButtonGroup, OverlayTrigger } from 'react-bootstrap';

import AttachmentContainer from 'src/apps/mydb/inbox/AttachmentContainer';
import Pagination from 'src/apps/mydb/inbox/Pagination';
import { DragDropItemTypes } from 'src/utilities/DndConst';

import Container from 'src/models/Container';
import UnsortedDatasetModal from 'src/apps/mydb/inbox/UnsortedDatasetModal';
import InboxStore from 'src/stores/alt/stores/InboxStore';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import UserStore from 'src/stores/alt/stores/UserStore';

export default class UnsortedBox extends React.Component {
  constructor(props) {
    super(props);

    const inboxState = InboxStore.getState();

    this.state = {
      visible: false,
      checkedAll: inboxState.checkedAll,
      checkedIds: inboxState.checkedIds,
      deletingTooltip: false,
      modal: {
        show: false,
        datasetContainer: null
      },
      currentUnsortedBoxPage: inboxState.currentUnsortedBoxPage,
      dataItemsPerPage: inboxState.dataItemsPerPage,
    };
    this.toggleSelectAllCheckbox = this.toggleSelectAllCheckbox.bind(this);
    this.deleteCheckedAttachment = this.deleteCheckedAttachment.bind(this);
    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    const { unsortedVisible } = this.props;
    this.setState({ visible: unsortedVisible });
    InboxStore.listen(this.onChange);
  }

  componentDidUpdate(prevProps) {
    const { unsortedVisible } = this.props;
    if (unsortedVisible !== prevProps.unsortedVisible) {
      this.setState({ visible: unsortedVisible });
    }
  }

  componentWillUnmount() {
    InboxStore.unlisten(this.onChange);
  }

  handleClick() {
    const { visible } = this.state;

    InboxActions.setActiveDeviceBoxId(-1);

    this.setState({ visible: !visible });
  }

  handleFileModalOpen(datasetContainer) {
    const { modal } = this.state;
    modal.datasetContainer = datasetContainer;
    modal.show = true;
    this.setState({ modal });
  }

  handleFileModalHide() {
    const { modal } = this.state;
    modal.datasetContainer = null;
    modal.show = false;
    this.setState({ modal });
    document.body.className = document.body.className.replace('modal-open', '');
  }

  handlePrevClick = () => {
    InboxActions.prevClick();
  };

  handleNextClick = () => {
    InboxActions.nextClick();
  };

  handleUploadButton() {
    const datasetContainer = Container.buildEmpty();
    datasetContainer.container_type = 'dataset';
    this.handleFileModalOpen(datasetContainer);
  }

  onChange(state) {
    this.setState(state);
  }

  sortUnsortedItem = (currentItems) => {
    const type = 'inbox';
    const userState = UserStore.getState();
    const filters = userState?.profile?.data?.filters || {};
    const sortColumn = filters[type]?.sort || 'created_at';

    switch (sortColumn) {
      case 'created_at':
        return currentItems.slice().sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();

          // Sort in descending order
          return dateB - dateA;
        });

      case 'name':
        return currentItems.slice().sort((a, b) => {
          if (a.filename > b.filename) {
            return 1;
          }
          if (a.filename < b.filename) {
            return -1;
          }
          return 0;
        });

      default:
        // Default case: return currentItems as they are
        return currentItems.slice();
    }
  };

  toggleSelectAllCheckbox() {
    const { checkedAll } = this.state;
    const params = {
      type: false,
      range: 'all'
    };
    if (!checkedAll) {
      params.type = true;
    }
    this.setState((prevState) => ({ ...prevState.inboxState, checkedAll: !checkedAll }));
    InboxActions.checkedAll(params);
    InboxActions.checkedIds(params);
  }

  toggleTooltip() {
    this.setState((prevState) => ({ ...prevState, deletingTooltip: !prevState.deletingTooltip }));
  }

  deleteCheckedAttachment(unsortedBox) {
    const { checkedIds, currentUnsortedBoxPage, dataItemsPerPage } = this.state;
    const startIndex = (currentUnsortedBoxPage - 1) * dataItemsPerPage;
    const endIndex = startIndex + dataItemsPerPage;
    const currentItems = unsortedBox.slice(startIndex, endIndex);
    const currentItemsCount = currentItems.length;
    const itemsDeleted = checkedIds.length;

    checkedIds.forEach((checkedId) => {
      // eslint-disable-next-line array-callback-return
      unsortedBox.map((attachment) => {
        if (checkedId === attachment.id) {
          InboxActions.deleteAttachment(attachment, true);
        }
      });
    });
    if (currentUnsortedBoxPage > 1 && itemsDeleted === currentItemsCount) {
      InboxActions.prevClick();
    } else {
      InboxActions.fetchInboxUnsorted();
    }
    checkedIds.length = 0;
    this.toggleTooltip();
    this.setState({ checkedAll: false });
  }

  render() {
    const { unsorted_box, largerInbox } = this.props;
    const {
      visible, modal, checkedAll, checkedIds, currentUnsortedBoxPage, dataItemsPerPage, deletingTooltip
    } = this.state;
    const startIndex = (currentUnsortedBoxPage - 1) * dataItemsPerPage;
    const endIndex = startIndex + dataItemsPerPage;
    const totalPages = Math.ceil(unsorted_box.length / dataItemsPerPage);
    const currentItems = this.sortUnsortedItem(unsorted_box.slice(startIndex, endIndex));

    const renderCheckAll = (
      <div>
        <input
          type="checkbox"
          checked={checkedAll && checkedIds.length === currentItems.length}
          onChange={this.toggleSelectAllCheckbox}
        />
        <span className="ms-2 fw-bold">
          {checkedAll && checkedIds.length === currentItems.length ? 'Deselect all' : 'Select all'}
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
            {`Delete ${checkedIds.length} attachment${checkedIds.length > 1 ? 's' : ''}?`}
            <ButtonGroup className="ms-1">
              <Button
                variant="danger"
                size="sm"
                onClick={() => this.deleteCheckedAttachment(unsorted_box)}
              >
                Yes
              </Button>
              <Button
                variant="warning"
                size="sm"
                onClick={() => this.toggleTooltip()}
              >
                No
              </Button>
            </ButtonGroup>
          </Tooltip>
        )}
      >
        <i
          className="fa fa-trash-o"
          aria-hidden="true"
          onClick={() => this.toggleTooltip()}
          role="button"
        />
      </OverlayTrigger>
    );

    const attachments = visible && currentItems.map((attachment) => (
      <AttachmentContainer
        key={`attach_${attachment.id}`}
        sourceType={DragDropItemTypes.UNLINKED_DATA}
        attachment={attachment}
        largerInbox={largerInbox}
        fromUnsorted
        isSelected={checkedIds.includes(attachment.id)}
      />
    ));

    const folderClass = `fa fa-folder${visible ? '-open' : ''}`;

    const uploadModal = (
      <UnsortedDatasetModal
        onHide={() => this.handleFileModalHide()}
        show={modal.show}
        datasetContainer={modal.datasetContainer}
      />
    );

    const uploadButton = (
      <Button
        size="sm"
        variant="outline-dark"
        onClick={(e) => {
          e.stopPropagation();
          this.handleUploadButton();
        }}
        className="ms-auto"
      >
        <i className="fa fa-upload" aria-hidden="true" />
      </Button>
    );

    return (
      <div>
        <div className="bg-gray-200 p-1 overflow-auto d-flex align-items-between"
          onClick={() => this.handleClick()}
          role="button"
          tabIndex={0}
          onKeyDown={() => {}}
        >
          <button
            type="button"
            className="border-0 bg-transparent"
            onClick={InboxActions.showInboxModal}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                InboxActions.showInboxModal();
              }
            }}
          >
            <i
              className={`${folderClass} me-1`}
              aria-hidden="true"
            />
            Unsorted
          </button>
          {uploadButton}
        </div>
        {
          visible && unsorted_box.length > dataItemsPerPage && (
            <Pagination
              currentDataSetPage={currentUnsortedBoxPage}
              totalPages={totalPages}
              handlePrevClick={this.handlePrevClick}
              handleNextClick={this.handleNextClick}
            />
          )
        }
        <table>
          <tbody>
            <tr>
              <td className="w-75 pe-5">
                <div>{visible ? renderCheckAll : null}</div>
              </td>
              <td className="w-25">
                <div>{visible ? trash : null}</div>
              </td>
            </tr>
          </tbody>
        </table>
        <div> {attachments} </div>
        {uploadModal}
      </div>
    );
  }
}

UnsortedBox.propTypes = {
  unsorted_box: PropTypes.array.isRequired,
  largerInbox: PropTypes.bool,
  unsortedVisible: PropTypes.bool,
};

UnsortedBox.defaultProps = {
  largerInbox: false,
  unsortedVisible: false,
};
