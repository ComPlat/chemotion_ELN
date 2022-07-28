import React from 'react';
import PropTypes from 'prop-types';
import { Button, Tooltip, ButtonGroup } from 'react-bootstrap';

import AttachmentContainer from './AttachmentContainer';
import DragDropItemTypes from '../DragDropItemTypes';

import Container from '../models/Container';
import UnsortedDatasetModal from './UnsortedDatasetModal';
import InboxStore from '../stores/InboxStore';
import InboxActions from '../actions/InboxActions';

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
      }
    };
    this.toggleSelectAllCheckbox = this.toggleSelectAllCheckbox.bind(this);
    this.deleteCheckedAttachment = this.deleteCheckedAttachment.bind(this);
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
          InboxActions.deleteAttachment(attachment);
        }
      });
    });
    checkedIds.length = 0;
    this.toggleTooltip();
    this.setState({ checkedAll: false });
  }

  render() {
    const { unsorted_box, largerInbox } = this.props;
    const { visible, modal, checkedAll } = this.state;

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
          {this.hasChecked() ? 'Deselect all' : 'Select all' }
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


    const attachments = visible ? unsorted_box.map((attachment) => {
      return (
        <AttachmentContainer
          key={`attach_${attachment.id}`}
          sourceType={DragDropItemTypes.UNLINKED_DATA}
          attachment={attachment}
          largerInbox={largerInbox}
        />
      );
    })
      :
    <div />;

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
        <div className="title">
          <i
            className={folderClass}
            aria-hidden="true"
            onClick={() => this.setState({ visible: !visible })}
          > Unsorted
          </i>
          {' '}
          {uploadButton}
        </div>
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
  largerInbox: PropTypes.bool
};

UnsortedBox.defaultProps = {
  largerInbox: false
};
