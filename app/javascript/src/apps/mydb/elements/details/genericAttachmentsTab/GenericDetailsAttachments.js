/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import UIStore from 'src/stores/alt/stores/UIStore';
import ImageAnnotationModalSVG from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationModalSVG';
import { Button, Alert } from 'react-bootstrap';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import SaveEditedImageWarning from 'src/apps/mydb/elements/details/researchPlans/SaveEditedImageWarning';
import {
  downloadButton,
  removeButton,
  annotateButton,
  EditButton,
  customDropzone,
  sortingAndFilteringUI,
  formatFileSize,
  attachmentThumbnail,
  ThirdPartyAppButton,
} from 'src/apps/mydb/elements/list/AttachmentList';
import { formatDate, parseDate } from 'src/utilities/timezoneHelper';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import UserStore from 'src/stores/alt/stores/UserStore';

export class GenericDetailsAttachments extends Component {
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    const { thirdPartyApps } = UIStore.getState() || [];
    this.thirdPartyApps = thirdPartyApps;

    this.state = {
      imageEditModalShown: false,
      filteredAttachments: Array.isArray(props.attachments) ? [...props.attachments] : [],
      filterText: '',
      sortBy: 'name',
      sortDirection: 'asc',
    };

    this.createAttachmentPreviews = this.createAttachmentPreviews.bind(this);
    this.handleFilterChange = this.handleFilterChange.bind(this);
    this.handleSortChange = this.handleSortChange.bind(this);
    this.toggleSortDirection = this.toggleSortDirection.bind(this);
  }

  componentDidMount() {
    this.createAttachmentPreviews();
    this.filterAndSortAttachments();
  }

  componentDidUpdate(prevProps) {
    const { attachments } = this.props;
    if (attachments !== prevProps.attachments) {
      this.createAttachmentPreviews();
      const safe = Array.isArray(attachments) ? [...attachments] : [];
      this.setState({ filteredAttachments: safe }, this.filterAndSortAttachments);
    }
  }

  handleFilterChange = (e) => {
    this.setState({ filterText: e.target.value }, this.filterAndSortAttachments);
  };

  handleSortChange = (e) => {
    this.setState({ sortBy: e.target.value }, this.filterAndSortAttachments);
  };

  toggleSortDirection = () => {
    this.setState((prevState) => ({
      sortDirection: prevState.sortDirection === 'asc' ? 'desc' : 'asc'
    }), this.filterAndSortAttachments);
  };

  filterAndSortAttachments() {
    const { filterText, sortBy } = this.state;

    const filteredAttachments = (this.props.attachments || []).filter(
      (attachment) => attachment.filename.toLowerCase().includes(filterText.toLowerCase())
    );

    filteredAttachments.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.filename.localeCompare(b.filename);
          break;
        case 'size':
          comparison = a.filesize - b.filesize;
          break;
        case 'date': {
          const dateA = parseDate(a.created_at);
          const dateB = parseDate(b.created_at);
          comparison = dateA.valueOf() - dateB.valueOf();
          break;
        }
        default:
          break;
      }
      return this.state.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.setState({ filteredAttachments });
  }

  createAttachmentPreviews() {
    const { attachments, element } = this.props;
    attachments.map((attachment) => {
      if (attachment.thumb) {
        AttachmentFetcher.fetchThumbnail({ id: attachment.id }).then(
          (result) => {
            if (result != null) {
              attachment.preview = `data:image/png;base64,${result}`;
              // Update _checksum without resetting `changed` — calling updateChecksum()
              // would clear `changed: true` set by handleAttachmentDrop, hiding the save button.
              // eslint-disable-next-line no-underscore-dangle
              element._checksum = element.checksum();
              this.forceUpdate();
            }
          }
        );
      } else {
        attachment.preview = '/images/wild_card/not_available.svg';
        // eslint-disable-next-line no-underscore-dangle
        element._checksum = element.checksum();
        this.forceUpdate();
      }
      return attachment;
    });
  }

  renderImageEditModal() {
    const { chosenAttachment, imageEditModalShown } = this.state;
    const { onEdit } = this.props;
    return (
      <ImageAnnotationModalSVG
        attachment={chosenAttachment}
        isShow={imageEditModalShown}
        handleSave={
          () => {
            const newAnnotation = document.getElementById('svgEditId').contentWindow.svgEditor.svgCanvas.getSvgString();
            chosenAttachment.updatedAnnotation = newAnnotation;
            this.setState({ imageEditModalShown: false });
            if (onEdit) onEdit(chosenAttachment);
          }
        }
        handleOnClose={() => { this.setState({ imageEditModalShown: false }); }}
      />
    );
  }

  render() {
    const { filteredAttachments, sortDirection } = this.state;
    const { onUndoDelete, attachments, elementType, element } = this.props;
    const { currentUser } = UserStore.getState();

    let combinedAttachments = filteredAttachments;
    if (this.context.attachmentNotificationStore) {
      combinedAttachments = this.context.attachmentNotificationStore.getCombinedAttachments(
        filteredAttachments,
        elementType,
        element
      );
    }

    return (
      <div className="attachment-main-container">
        {this.renderImageEditModal()}
        <div className="d-flex justify-content-between align-items-center">
          <div className="flex-grow-1 align-self-center">
            {customDropzone(this.props.onDrop)}
          </div>
          <div className="ms-3 align-self-center">
            {
              attachments.length > 0
              && sortingAndFilteringUI(
                sortDirection,
                this.handleSortChange,
                this.toggleSortDirection,
                this.handleFilterChange,
                true
              )
            }
          </div>
        </div>
        {combinedAttachments.length === 0 ? (
          <div className="no-attachments-text">
            There are currently no attachments.
          </div>
        ) : (
          <>
            {combinedAttachments.map((attachment) => (
              <div className="attachment-row" key={attachment.id}>
                {attachmentThumbnail(attachment)}

                <div className="attachment-row-text" title={attachment.filename}>
                  {attachment.is_deleted ? (
                    <strike>{attachment.filename}</strike>
                  ) : (
                    attachment.filename
                  )}
                  <div className="attachment-row-subtext">
                    <div>
                      Created:&nbsp;
                      {formatDate(attachment.created_at)}
                    </div>
                    <span className="mx-2">|</span>
                    <div>
                      Size:&nbsp;
                      <strong>
                        {formatFileSize(attachment.filesize)}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="attachment-row-actions d-flex align-items-center gap-1">
                  {attachment.is_deleted ? (
                    <Button
                      size="sm"
                      variant="danger"
                      className="attachment-button-size"
                      onClick={() => onUndoDelete(attachment)}
                    >
                      <i className="fa fa-undo" aria-hidden="true" />
                    </Button>
                  ) : (
                    <>
                      {downloadButton(attachment)}
                      <ThirdPartyAppButton attachment={attachment} options={this.thirdPartyApps} />
                      <EditButton attachment={attachment} onChange={this.props.onEdit} />
                      {annotateButton(attachment, () => {
                        this.setState({
                          imageEditModalShown: true,
                          chosenAttachment: attachment,
                        });
                      })}
                      &nbsp;
                      {removeButton(attachment, this.props.onDelete, this.props.readOnly)}
                    </>
                  )}
                </div>
                {attachment.updatedAnnotation && <SaveEditedImageWarning visible />}
              </div>
            ))}
            <Alert variant="warning" show={UserStore.isUserQuotaExceeded(filteredAttachments)}>
              Uploading attachments will fail; User quota
              {currentUser !== null ? ` (${currentUser.allocated_space / 1024 / 1024} MB) ` : ' '}
              will be exceeded.
            </Alert>
          </>
        )}
      </div>
    );
  }
}

GenericDetailsAttachments.propTypes = {
  element: PropTypes.object.isRequired,
  elementType: PropTypes.string.isRequired,
  attachments: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    filename: PropTypes.string.isRequired,
    filesize: PropTypes.number,
    thumb: PropTypes.bool,
  })),
  onDrop: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onUndoDelete: PropTypes.func.isRequired,
  onEdit: PropTypes.func,
  readOnly: PropTypes.bool,
};

GenericDetailsAttachments.defaultProps = {
  attachments: [],
  onEdit: null,
  readOnly: false,
};

export default observer(GenericDetailsAttachments);
