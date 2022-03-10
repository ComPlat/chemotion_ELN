import React, { Component } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Button, ButtonGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import FreeScanActions from '../actions/FreeScanActions';
import Utils from '../utils/Functions';
import FreeScanDataModal from './FreeScanDataModal';

const handleAttachmentDownload = attachment => Utils.downloadFile({
  contents: `/api/v1/attachments/${attachment && attachment.id}`, name: attachment && attachment.filename
});

export default class FreeScanDataContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      deletingTooltip: false,
      modal: {
        show: false,
        datasetContainer: null
      }
    };
  }


  toggleTooltip() {
    this.setState(prevState => ({ ...prevState, deletingTooltip: !prevState.deletingTooltip }));
  }

  handleFileModalOpen(attachment) {
    const { modal } = this.state;
    modal.datasetContainer = attachment;
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

  handleUploadButton(attachment) {
    this.handleFileModalOpen(attachment);
  }

  render() {
    const { attachment, largerInbox } = this.props;
    const { visible, modal } = this.state;

    const textStyle = {
      display: 'block',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'clip',
      maxWidth: '100%',
      cursor: 'move'
    };

    if (largerInbox === true) {
      textStyle.marginTop = '6px';
      textStyle.marginBottom = '6px';
    }

    const detailModal = (
      <FreeScanDataModal
        onHide={() => this.handleFileModalHide(attachment)}
        show={modal.show}
        attachment={attachment}
      />
    );

    const trash = (
      <span>
        <i className="fa fa-trash-o" onClick={() => this.toggleTooltip()} style={{ cursor: "pointer" }}>&nbsp;</i>
        {this.state.deletingTooltip ? (
          <Tooltip placement="bottom" className="in" id="tooltip-bottom">
            Delete this free scan data?
            <ButtonGroup>
              <Button
                bsStyle="danger"
                bsSize="xsmall"
                onClick={() => FreeScanActions.deleteContainer(attachment)}
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

    const filenameTooltip = (
      <Tooltip
        id="filename_tooltip"
        className="tooltip"
        style={{ maxWidth: '100%' }}
      >
        <p>
          {attachment.filename}
        </p>
      </Tooltip>);

    return (
      <div style={textStyle}>
        &nbsp;&nbsp;{trash}&nbsp;
        <i className="fa fa-download" onClick={() => handleAttachmentDownload(attachment)} style={{ cursor: 'pointer' }} />
        &nbsp;&nbsp;
          <a onClick={() => this.handleUploadButton(attachment)}>
            {attachment.filename}
          </a>
        <span className="text-info" style={{ float: 'right', display: largerInbox ? '' : 'none' }}>
          {moment(attachment.created_at).format('DD.MM.YYYY HH:mm')}
        </span>
        {detailModal}
      </div>
    );
  }
}

FreeScanDataContainer.propTypes = {
  attachment: PropTypes.object.isRequired,
  largerInbox: PropTypes.bool,
};

FreeScanDataContainer.defaultProps = {
  largerInbox: false,
};
