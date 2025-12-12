/* eslint-disable lines-between-class-members */
/* eslint-disable no-param-reassign */
/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { Button, ButtonToolbar } from 'react-bootstrap';
import { last, findKey } from 'lodash';
import { StoreContext } from 'src/stores/mobx/RootStore';
import EditorFetcher from 'src/fetchers/EditorFetcher';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import ImageAnnotationModalSVG from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationModalSVG';
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

class GenericAttachments extends Component {
  // eslint-disable-next-line react/static-property-placement
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    const { thirdPartyApps } = UIStore.getState() || [];
    this.thirdPartyApps = thirdPartyApps;

    this.state = {
      imageEditModalShown: false,
      showImportConfirm: [],
      filteredAttachments: [...props.attachments],
      filterText: '',
      sortBy: 'name',
      sortDirection: 'asc',
    };
    this.createAttachmentPreviews = this.createAttachmentPreviews.bind(this);
    this.onImport = this.onImport.bind(this);
    this.handleFilterChange = this.handleFilterChange.bind(this);
    this.handleSortChange = this.handleSortChange.bind(this);
    this.toggleSortDirection = this.toggleSortDirection.bind(this);
    this.confirmAttachmentImport = this.confirmAttachmentImport.bind(this);
    this.showImportConfirm = this.showImportConfirm.bind(this);
    this.hideImportConfirm = this.hideImportConfirm.bind(this);
  }

  componentDidMount() {
    this.createAttachmentPreviews();
  }

  componentDidUpdate(prevProps) {
    const { attachments } = this.props;
    if (attachments !== prevProps.attachments) {
      this.createAttachmentPreviews();
      this.setState({ filteredAttachments: [...attachments] }, this.filterAndSortAttachments);
    }
  }

  onImport(attachment) {
    const { genericEl, onAttachmentImportComplete } = this.props;
    const genericElId = genericEl.id;
    LoadingActions.start();
    ElementActions.importTableFromSpreadsheet(
      genericElId,
      attachment.id,
      onAttachmentImportComplete
    );
    LoadingActions.stop();
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
    const { attachments } = this.props;
    const { filterText, sortBy } = this.state;

    const filteredAttachments = attachments.filter(
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
    const { attachments } = this.props;
    attachments?.map((attachment) => {
      if (attachment.thumb) {
        AttachmentFetcher.fetchThumbnail({ id: attachment.id }).then(
          (result) => {
            if (result != null) {
              attachment.preview = `data:image/png;base64,${result}`;
              this.forceUpdate();
            }
          }
        );
      } else {
        attachment.preview = '/images/wild_card/not_available.svg';
        this.forceUpdate();
      }
      return attachment;
    });
  }

  showImportConfirm(attachmentId) {
    const { showImportConfirm } = this.state;
    showImportConfirm[attachmentId] = true;
    this.setState({ showImportConfirm });
  }

  hideImportConfirm(attachmentId) {
    const { showImportConfirm } = this.state;
    showImportConfirm[attachmentId] = false;
    this.setState({ showImportConfirm });
  }

  confirmAttachmentImport(attachment) {
    this.onImport(attachment);
    this.hideImportConfirm(attachment.id);
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
            onEdit(chosenAttachment);
          }
        }
        handleOnClose={() => { this.setState({ imageEditModalShown: false }); }}
      />
    );
  }

  render() {
    const {
      filteredAttachments, sortDirection
    } = this.state;
    const {
      onDelete, onDrop, onUndoDelete, attachments, genericEl, readOnly
    } = this.props;

    let combinedAttachments = filteredAttachments;
    if (this.context.attachmentNotificationStore) {
      combinedAttachments = this.context.attachmentNotificationStore
        .getCombinedAttachments(filteredAttachments, 'genericEl', genericEl);
    }
    combinedAttachments = combinedAttachments.filter(Boolean);

    return (
      <div className="p-3 border-rounded">
        {this.renderImageEditModal()}
        <div className="d-flex justify-content-between align-items-center gap-4 mb-4">
          <div className="flex-grow-1">
            {customDropzone(onDrop)}
          </div>
          {attachments?.length > 0
          && sortingAndFilteringUI(
            sortDirection,
            this.handleSortChange,
            this.toggleSortDirection,
            this.handleFilterChange,
            true
          )}
        </div>
        {combinedAttachments?.length === 0 ? (
          <div className="text-center text-gray-500 fs-5">
            There are currently no attachments.
          </div>
        ) : (
          combinedAttachments.map((attachment) => (
            <div className="attachment-row" key={attachment?.id}>
              {attachmentThumbnail(attachment)}
              <div className="attachment-row-text" title={attachment.filename}>
                {attachment.is_deleted ? (
                  <strike>{attachment.filename}</strike>
                ) : (
                  attachment.filename
                )}
                <div className="attachment-row-subtext">
                  <div>
                    Created:
                    <span className="ms-1">
                      {formatDate(attachment.created_at)}
                    </span>
                  </div>
                  <span className="ms-2 me-2">|</span>
                  <div>
                    Size:
                    <span className="fw-bold text-gray-700 ms-1">
                      {formatFileSize(attachment.filesize)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="attachment-row-actions d-flex justify-content-end align-items-center gap-1">
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
                    <ButtonToolbar className="gap-1">
                      {downloadButton(attachment)}
                      <ThirdPartyAppButton attachment={attachment} options={this.thirdPartyApps} />
                      <EditButton attachment={attachment} onChange={this.props.onEdit} />
                      {annotateButton(attachment, () => {
                        this.setState({
                          imageEditModalShown: true,
                          chosenAttachment: attachment,
                        });
                      })}
                    </ButtonToolbar>
                    <div className="ms-2">
                      {removeButton(attachment, onDelete, readOnly)}
                    </div>
                  </>
                )}
              </div>
              {attachment.updatedAnnotation && (
                <div
                  className="position-absolute top-50 start-50 translate-middle"
                  style={{ whiteSpace: 'nowrap', height: 'auto', lineHeight: '1.5' }}
                >
                  <SaveEditedImageWarning visible />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  }
}

GenericAttachments.propTypes = {
  genericEl: PropTypes.shape({
    id: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]).isRequired,
    attachments: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([
          PropTypes.string,
          PropTypes.number
        ]).isRequired,
        aasm_state: PropTypes.string.isRequired,
        content_type: PropTypes.string.isRequired,
        filename: PropTypes.string.isRequired,
        filesize: PropTypes.number.isRequired,
        identifier: PropTypes.oneOfType([
          PropTypes.string,
          PropTypes.number
        ]).isRequired,
        thumb: PropTypes.bool.isRequired
      })
    )
  }).isRequired,
  attachments: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]).isRequired,
    aasm_state: PropTypes.string.isRequired,
    content_type: PropTypes.string.isRequired,
    filename: PropTypes.string.isRequired,
    filesize: PropTypes.number.isRequired,
    identifier: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]).isRequired,
    thumb: PropTypes.bool.isRequired
  })),
  onDrop: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onUndoDelete: PropTypes.func.isRequired,
  onAttachmentImportComplete: PropTypes.func,
  onEdit: PropTypes.func.isRequired,
  readOnly: PropTypes.bool.isRequired
};

export default observer(GenericAttachments);

GenericAttachments.defaultProps = {
  attachments: [],
  onAttachmentImportComplete: () => { }
};
