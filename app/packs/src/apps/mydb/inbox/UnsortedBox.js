import React from 'react';
import PropTypes from 'prop-types';
import { Button, Tooltip, ButtonGroup } from 'react-bootstrap';

import AttachmentContainer from 'src/apps/mydb/inbox/AttachmentContainer';
import Pagination from 'src/apps/mydb/inbox/Pagination';
import DragDropItemTypes from 'src/components/DragDropItemTypes';

import Container from 'src/models/Container';
import UnsortedDatasetModal from 'src/apps/mydb/inbox/UnsortedDatasetModal';
import InboxStore from 'src/stores/alt/stores/InboxStore';
import InboxActions from 'src/stores/alt/actions/InboxActions';

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
      currentPage: 1,
      itemsPerPage: inboxState.dataItemsPerPage,
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

  onChange(state) {
    this.setState(state);
  }

  handleClick() {
    const { visible } = this.state;
    const { fromCollectionTree } = this.props;

    InboxActions.setActiveDeviceBoxId(-1);

    if (fromCollectionTree) {
      return;
    }

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
    this.setState((prevState) => ({
      currentPage: prevState.currentPage - 1,
    }));
  };

  handleNextClick = () => {
    this.setState((prevState) => ({
      currentPage: prevState.currentPage + 1,
    }));
  };

  handleUploadButton() {
    const datasetContainer = Container.buildEmpty();
    datasetContainer.container_type = 'dataset';
    this.handleFileModalOpen(datasetContainer);
  }

  hasChecked() {
    const { checkedAll } = this.state;
    return checkedAll;
  }

  toggleSelectAllCheckbox() {
    const { checkedAll } = this.state;
    const params = {
      type: false,
      range: 'all'
    };
    if (!checkedAll) {
      params.type = true;
    }
    this.setState(prevState => ({ ...prevState.inboxState, checkedAll: !this.state.checkedAll }));
    InboxActions.checkedAll(params);
    InboxActions.checkedIds(params);
  }

  toggleTooltip() {
    this.setState(prevState => ({ ...prevState, deletingTooltip: !prevState.deletingTooltip }));
  }

  deleteCheckedAttachment(unsortedBox) {
    const { checkedIds } = this.state;
    checkedIds.forEach((checkedId) => {
      // eslint-disable-next-line array-callback-return
      unsortedBox.map((attachment) => {
        if (checkedId === attachment.id) {
          InboxActions.deleteAttachment(attachment, true);
        }
      });
    });
    checkedIds.length = 0;
    this.toggleTooltip();
    this.setState({ checkedAll: false });
  }

  render() {
    const { unsorted_box, largerInbox, fromCollectionTree } = this.props;
    const {
      visible, modal, checkedAll, currentPage, itemsPerPage
    } = this.state;

    const renderCheckAll = (
      <div>
        <input
          type="checkbox"
          checked={checkedAll}
          onChange={this.toggleSelectAllCheckbox}
        />
        <span
          className="g-marginLeft--10"
          style={{ fontWeight: 'bold' }}
        >
          {this.hasChecked() ? 'Deselect all' : 'Select all'}
        </span>
      </div>
    );

    const trash = (
      <span>
        <i
          className="fa fa-trash-o"
          aria-hidden="true"
          onClick={() => this.toggleTooltip()}
          style={{ cursor: 'pointer' }}
        >
          &nbsp;
        </i>
        {this.state.deletingTooltip ? (
          <Tooltip placement="bottom" className="in" id="tooltip-bottom">
            Delete this attachment?
            <ButtonGroup>
              <Button
                bsStyle="danger"
                bsSize="xsmall"
                onClick={() => this.deleteCheckedAttachment(unsorted_box)}
              >
                Yes
              </Button>
              <Button
                bsStyle="warning"
                bsSize="xsmall"
                onClick={() => this.toggleTooltip()}
              >
                No
              </Button>
            </ButtonGroup>
          </Tooltip>
        ) : null}
      </span>
    );

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const totalPages = Math.ceil(unsorted_box.length / itemsPerPage);

    const attachments = visible ? unsorted_box.slice(startIndex, endIndex).map((attachment) => (
      <AttachmentContainer
        key={`attach_${attachment.id}`}
        sourceType={DragDropItemTypes.UNLINKED_DATA}
        attachment={attachment}
        largerInbox={largerInbox}
        fromUnsorted
      />
    )) : <div />;

    const folderClass = `fa fa-folder${visible ? '-open' : ''}`;

    const uploadModal = (
      <UnsortedDatasetModal
        onHide={() => this.handleFileModalHide()}
        show={modal.show}
        datasetContainer={modal.datasetContainer}
      />
    );

    const uploadButton = (
      <Button style={{ position: 'absolute', right: 0 }} bsSize="xsmall" onClick={() => this.handleUploadButton()}>
        <i className="fa fa-upload" aria-hidden="true" />
      </Button>
    );

    return (
      <div className="tree-view">
        <div
          className="title"
          onClick={() => this.handleClick()}
          role="button"
        >
          <button
            type="button"
            className="btn-inbox"
            onClick={InboxActions.showInboxModal}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                InboxActions.showInboxModal();
              }
            }}
          >
            <i
              className={folderClass}
              aria-hidden="true"
              style={{ marginRight: '5px' }}
            />
            Unsorted
          </button>
          {' '}
          {uploadButton}
        </div>
        {
          visible && !fromCollectionTree && unsorted_box.length > itemsPerPage ? (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              handlePrevClick={this.handlePrevClick}
              handleNextClick={this.handleNextClick}
            />
          ) : null
        }
        <table>
          <tbody>
            <tr>
              <td style={{ width: '80%', paddingRight: '30px' }}>
                <div>{visible ? renderCheckAll : null}</div>
              </td>
              <td style={{ width: '20%' }}>
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
  fromCollectionTree: PropTypes.bool,
};

UnsortedBox.defaultProps = {
  largerInbox: false,
  unsortedVisible: false,
  fromCollectionTree: false,
};
