/* eslint-disable no-param-reassign */
/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import {
  Form, ListGroup, ListGroupItem, Button, Overlay, ButtonToolbar, Alert
} from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import EditorFetcher from 'src/fetchers/EditorFetcher';
import SaveEditedImageWarning from 'src/apps/mydb/elements/details/researchPlans/SaveEditedImageWarning';
import debounce from 'es6-promise-debounce';
import {
  findIndex, cloneDeep, last, findKey,
  create
} from 'lodash';
import { absOlsTermId } from 'chem-generic-ui';
import Attachment from 'src/models/Attachment';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import UserStore from 'src/stores/alt/stores/UserStore';
import GenericDS from 'src/models/GenericDS';
import GenericDSDetails from 'src/components/generic/GenericDSDetails';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import InstrumentsFetcher from 'src/fetchers/InstrumentsFetcher';
import HyperLinksSection from 'src/components/common/HyperLinksSection';
import ImageAnnotationModalSVG from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationModalSVG';
import PropTypes from 'prop-types';
import {
  downloadButton,
  removeButton,
  annotateButton,
  editButton,
  sortingAndFilteringUI,
  formatFileSize,
  moveBackButton,
  attachmentThumbnail,
  ThirdPartyAppButton
} from 'src/apps/mydb/elements/list/AttachmentList';
import { formatDate } from 'src/utilities/timezoneHelper';
import UIStore from 'src/stores/alt/stores/UIStore';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import { CreatableSelect } from 'src/components/common/Select';

export function classifyAttachments(attachments) {
  const groups = {
    Original: [],
    BagitZip: [],
    Combined: [],
    Processed: {},
    Pending: [],
  };

  attachments.forEach((attachment) => {
    if (attachment.is_pending) {
      groups.Pending.push(attachment);
      return;
    }

    if (attachment.aasm_state === 'queueing' && attachment.content_type === 'application/zip') {
      groups.BagitZip.push(attachment);
    } else if (attachment.aasm_state === 'image'
        && (attachment.filename.includes('.combined')
            || attachment.filename.includes('.new_combined'))) {
      groups.Combined.push(attachment);
    } else if (attachment.filename.includes('bagit')) {
      const baseName = attachment.filename.split('_bagit')[0].trim();
      if (!groups.Processed[baseName]) {
        groups.Processed[baseName] = [];
      }
      groups.Processed[baseName].push(attachment);
    } else if (attachment.aasm_state === 'non_jcamp' && attachment.filename.includes('.new_combined')) {
      groups.Combined.push(attachment);
    } else {
      groups.Original.push(attachment);
    }
  });

  return groups;
}

export class ContainerDatasetModalContent extends Component {
  // eslint-disable-next-line react/static-property-placement
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    const datasetContainer = { ...props.datasetContainer };
    const { thirdPartyApps } = UIStore.getState() || [];
    this.thirdPartyApps = thirdPartyApps;
    this.state = {
      datasetContainer,
      instruments: [],
      timeoutReference: null,
      attachmentEditor: false,
      extension: null,
      imageEditModalShown: false,
      filteredAttachments: [...props.datasetContainer.attachments],
      prevMessages: [],
      newMessages: [],
      filterText: '',
      chosenAttachment: null,
      attachmentGroups: {
        Original: [],
        BagitZip: [],
        Combined: [],
        Processed: {},
      }
    };
    this.overlayContainerRef = React.createRef();
    this.timeout = 6e2; // 600ms timeout for input typing
    this.doneInstrumentTyping = this.doneInstrumentTyping.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleAddLink = this.handleAddLink.bind(this);
    this.handleRemoveLink = this.handleRemoveLink.bind(this);
    this.handleDSChange = this.handleDSChange.bind(this);
    this.editorInitial = this.editorInitial.bind(this);
    this.handleEdit = this.handleEdit.bind(this);
    this.handleFilterChange = this.handleFilterChange.bind(this);
    this.handleAttachmentRemove = this.handleAttachmentRemove.bind(this);
    this.handleAttachmentBackToInbox = this.handleAttachmentBackToInbox.bind(this);
    this.classifyAttachments = this.classifyAttachments.bind(this);
    this.state.attachmentGroups = this.classifyAttachments(props.datasetContainer.attachments);
  }

  componentDidMount() {
    this.editorInitial();
    this.setState({
      attachmentGroups: this.classifyAttachments(this.props.datasetContainer.attachments)
    });
  }

  componentDidUpdate(prevProps) {
    const { prevMessages, newMessages } = this.state;
    const { attachments } = this.props.datasetContainer;

    const prevAttachments = [...attachments];

    if (prevMessages.length !== newMessages.length) {
      this.setState({
        prevMessages: newMessages
      });

      this.updateAttachmentsFromContext();
    }

    if (prevAttachments.length !== prevProps.datasetContainer.attachments.length) {
      this.setState({
        filteredAttachments: [...attachments],
        attachmentGroups: this.classifyAttachments(attachments),
        datasetContainer: { ...this.props.datasetContainer }
      }, () => {
        this.props.onChange({ ...this.state.datasetContainer });
        this.filterAttachments();
      });
    }
  }

  // This function is being called from ContainerDatasetModal.js
  // eslint-disable-next-line react/no-unused-class-component-methods
  setLocalName(localName) {
    const { datasetContainer } = this.state;
    datasetContainer.name = localName;
    this.setState({ datasetContainer });
  }

  // eslint-disable-next-line react/sort-comp
  updateAttachmentsFromContext = () => {
    const { datasetContainer } = this.props;
    const { filteredAttachments } = this.state;

    let combinedAttachments = [...filteredAttachments];

    if (this.context.attachmentNotificationStore) {
      combinedAttachments = this.context.attachmentNotificationStore
        .getCombinedAttachments(filteredAttachments, 'Container', datasetContainer);
    }
    return combinedAttachments;
  };

  handleInputChange(type, event) {
    const { datasetContainer } = this.state;
    const { value } = event.target;
    switch (type) {
      case 'name':
        datasetContainer.name = value;
        break;
      case 'instrument':
        datasetContainer.extended_metadata.instrument = value;
        break;
      case 'description':
        datasetContainer.description = value;
        break;
      case 'dataset':
        datasetContainer.dataset = value;
        break;
      default:
        console.warn(`Unhandled input type: ${type}`);
        break;
    }
    this.setState({ datasetContainer });
  }

  handleDSChange(ds) {
    this.handleInputChange('dataset', { target: { value: ds } });
  }

  handleFileDrop(files) {
    this.setState((prevState) => {
      const newAttachments = files.map((f) => {
        const newAttachment = Attachment.fromFile(f);
        newAttachment.is_pending = true;
        return newAttachment;
      });

      const updatedAttachments = [...prevState.datasetContainer.attachments, ...newAttachments];
      const updatedDatasetContainer = { ...prevState.datasetContainer, attachments: updatedAttachments };

      return {
        datasetContainer: updatedDatasetContainer,
        filteredAttachments: updatedAttachments,
        attachmentGroups: this.classifyAttachments(updatedAttachments),
      };
    }, () => {
    });
  }

  handleAttachmentRemove(attachment) {
    const { datasetContainer } = this.state;
    const index = datasetContainer.attachments.indexOf(attachment);
    datasetContainer.attachments[index].is_deleted = true;
    this.setState({ datasetContainer });
  }

  handleAttachmentBackToInbox(attachment) {
    const { onChange } = this.props;
    const { datasetContainer } = this.state;
    const index = datasetContainer.attachments.indexOf(attachment);
    if (index !== -1) {
      InboxActions.backToInbox(attachment);
      datasetContainer.attachments.splice(index, 1);
      onChange(datasetContainer);
    }
  }

  handleUndo(attachment) {
    const { datasetContainer } = this.state;
    const index = datasetContainer.attachments.indexOf(attachment);

    datasetContainer.attachments[index].is_deleted = false;
    this.setState({ datasetContainer });
  }

  // the next method is used in ContainerDatasetModal.js please ignore eslint warning
  // eslint-disable-next-line react/no-unused-class-component-methods
  handleSave(shouldClose = false) {
    const { datasetContainer } = this.state;
    const {
      onChange, onModalHide, handleContainerSubmit, isNew
    } = this.props;
    this.context.attachmentNotificationStore.clearMessages();
    onChange(datasetContainer);
    if (!isNew) {
      handleContainerSubmit(shouldClose);
      if (shouldClose) onModalHide();
      return;
    }
    if (shouldClose) {
      onModalHide();
    }
  }

  // eslint-disable-next-line react/no-unused-class-component-methods, react/sort-comp
  resetAnnotation() {
    const { chosenAttachment } = this.state;
    if (chosenAttachment && chosenAttachment.updatedAnnotation) {
      chosenAttachment.updatedAnnotation = null;
      this.setState({ chosenAttachment });
    }
  }

  handleInstrumentValueChange(event, doneInstrumentTyping) {
    const { value } = event.target;
    const { timeoutReference } = this.state;
    if (!value) {
      this.resetInstrumentComponent();
      return;
    }
    if (timeoutReference) {
      clearTimeout(timeoutReference);
    }
    this.setState({
      value,
      timeoutReference: setTimeout(() => {
        doneInstrumentTyping();
      }, this.timeout),
    });
    this.handleInputChange('instrument', event);
    this.props.onInstrumentChange(value);
  }

  handleAddLink(link) {
    const { datasetContainer } = this.state;
    if (datasetContainer.extended_metadata.hyperlinks == null) {
      datasetContainer.extended_metadata.hyperlinks = [link];
    } else {
      datasetContainer.extended_metadata.hyperlinks.push(link);
    }
    this.setState({ datasetContainer });
  }

  handleRemoveLink(link) {
    const { datasetContainer } = this.state;
    const index = datasetContainer.extended_metadata.hyperlinks.indexOf(link);
    if (index !== -1) {
      datasetContainer.extended_metadata.hyperlinks.splice(index, 1);
    }
    this.setState({ datasetContainer });
  }

  handleEdit(attachment) {
    const fileType = last(attachment.filename.split('.'));
    const docType = this.documentType(attachment.filename);

    EditorFetcher.startEditing({ attachment_id: attachment.id })
      .then((result) => {
        if (result.token) {
          const url = `/editor?id=${attachment.id}&docType=${docType}
          &fileType=${fileType}&title=${attachment.filename}&key=${result.token}
          &only_office_token=${result.only_office_token}`;
          window.open(url, '_blank');

          attachment.aasm_state = 'oo_editing';
          attachment.updated_at = new Date();

          this.props.onChange(attachment);
        } else {
          alert('Unauthorized to edit this file.');
        }
      });
  }

  handleFilterChange = (e) => {
    this.setState({ filterText: e.target.value }, this.filterAttachments);
  };

  filterAttachments() {
    const filterTextLower = this.state.filterText.toLowerCase();
    const filteredGroups = this.classifyAttachments(this.props.datasetContainer.attachments);

    Object.keys(filteredGroups).forEach((group) => {
      if (Array.isArray(filteredGroups[group])) {
        filteredGroups[group] = filteredGroups[group]
          .filter((attachment) => attachment.filename.toLowerCase().includes(filterTextLower));
      } else {
        Object.keys(filteredGroups[group]).forEach((subGroup) => {
          filteredGroups[group][subGroup] = filteredGroups[group][subGroup]
            .filter((attachment) => attachment.filename.toLowerCase().includes(filterTextLower));
        });
      }
    });

    this.setState({ attachmentGroups: filteredGroups });
  }

  // eslint-disable-next-line class-methods-use-this
  classifyAttachments(attachments) {
    return classifyAttachments(attachments);
  }

  resetInstrumentComponent() {
    const { datasetContainer } = this.state;
    this.setState({
      value: '',
      instruments: [],
    });
    datasetContainer.extended_metadata.instrument = '';
  }

  doneInstrumentTyping() {
    const { value } = this.state;
    if (!value) {
      this.resetInstrumentComponent();
    } else {
      this.fetchInstruments(value);
    }
  }

  fetchInstruments(value, show = true) {
    const debounced = debounce((query) => InstrumentsFetcher.fetchInstrumentsForCurrentUser(query), 200);
    const query = (value || '').trim();

    if (!query) {
      this.setState({ instruments: [] });
      return;
    }

    debounced(query)
      .then((result) => {
        const newState = {};
        if (result.length > 0) {
          newState.instruments = result;
          newState.showInstruments = show;
        } else {
          newState.instruments = [];
          newState.error = '';
          newState.showInstruments = false;
        }
        this.setState(newState);
      })
      .catch((error) => console.log(error));
  }

  documentType(filename) {
    const { extension } = this.state;

    const ext = last(filename.split('.'));
    const docType = findKey(extension, (o) => o.includes(ext));

    if (typeof docType === 'undefined' || !docType) {
      return null;
    }

    return docType;
  }

  editorInitial() {
    EditorFetcher.initial().then((result) => {
      this.setState({
        attachmentEditor: result.installed,
        extension: result.ext,
      });
    });
  }

  customDropzone() {
    return (
      <Dropzone
        onDrop={(files) => this.handleFileDrop(files)}
        className="attachment-dropzone"
      >
        Drop files here, or click to upload.
      </Dropzone>
    );
  }

  renderImageEditModal() {
    const { chosenAttachment, imageEditModalShown } = this.state;
    const { onChange } = this.props;
    return (
      <ImageAnnotationModalSVG
        attachment={chosenAttachment}
        isShow={imageEditModalShown}
        handleSave={
          () => {
            const newAnnotation = document.getElementById('svgEditId').contentWindow.svgEditor.svgCanvas.getSvgString();
            chosenAttachment.updatedAnnotation = newAnnotation;
            this.setState({ imageEditModalShown: false });
            onChange(chosenAttachment);
          }
        }
        handleOnClose={() => { this.setState({ imageEditModalShown: false }); }}
      />
    );
  }

  renderAttachmentRow(attachment) {
    const { extension, attachmentEditor } = this.state;
    const { readOnly } = this.props;
    return (
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
              onClick={() => this.handleUndo(attachment)}
            >
              <i className="fa fa-undo" aria-hidden="true" />
            </Button>
          ) : (
            <>
              <ButtonToolbar className="gap-1">
                {downloadButton(attachment)}
                <ThirdPartyAppButton attachment={attachment} options={this.thirdPartyApps} />
                {editButton(
                  attachment,
                  extension,
                  attachmentEditor,
                  attachment.aasm_state === 'oo_editing' && new Date().getTime()
                  < (new Date(attachment.updated_at).getTime() + 15 * 60 * 1000),
                  !attachmentEditor || attachment.aasm_state === 'oo_editing'
                  || attachment.is_new || this.documentType(attachment.filename) === null,
                  this.handleEdit
                )}
                {annotateButton(attachment, () => {
                  this.setState({
                    imageEditModalShown: true,
                    chosenAttachment: attachment,
                  });
                })}
                {moveBackButton(attachment, this.handleAttachmentBackToInbox, readOnly)}
              </ButtonToolbar>
              <div className="ms-2">
                {removeButton(attachment, this.handleAttachmentRemove, readOnly)}
              </div>
            </>
          )}
        </div>
        {attachment.updatedAnnotation && <SaveEditedImageWarning visible />}
      </div>
    );
  }

  renderAttachments() {
    const {
      filteredAttachments, sortDirection, attachmentGroups
    } = this.state;
    const { datasetContainer } = this.props;
    const { currentUser } = UserStore.getState();

    const renderGroup = (attachments, title, key) => (
      <div key={key} className="mt-2">
        <div
          className="fw-bold mb-2 border rounded p-1"
          style={{ backgroundColor: '#D3D3D3' }}
        >
          {title}
        </div>
        {attachments.map((attachment) => this.renderAttachmentRow(attachment))}
      </div>
    );

    const hasProcessedAttachments = Object.keys(attachmentGroups.Processed).some(
      (groupName) => attachmentGroups.Processed[groupName].length > 0
    );

    return (
      <div className="p-2 border rounded">
        {this.renderImageEditModal()}
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex flex-grow-1 align-self-center">
            {this.customDropzone()}
          </div>
          <div className="ms-4 align-self-center">
            {datasetContainer.attachments.length > 0
              && sortingAndFilteringUI(
                sortDirection,
                this.handleSortChange,
                this.toggleSortDirection,
                this.handleFilterChange,
                false
              )}
          </div>
        </div>
        {filteredAttachments.length === 0 ? (
          <div className="no-attachments-text">
            There are currently no attachments.
          </div>
        ) : (
          <>
            <div className="mb-5">
              {attachmentGroups.Pending && attachmentGroups.Pending.length > 0
                && renderGroup(attachmentGroups.Pending, 'Pending')}
              {attachmentGroups.Original.length > 0 && renderGroup(attachmentGroups.Original, 'Original')}
              {attachmentGroups.BagitZip.length > 0 && renderGroup(attachmentGroups.BagitZip, 'Bagit / Zip')}
              {hasProcessedAttachments && Object.keys(attachmentGroups.Processed)
                .map((groupName) => attachmentGroups.Processed[groupName].length > 0
                  && renderGroup(attachmentGroups.Processed[groupName], `Processed: ${groupName}`, groupName))}
              {attachmentGroups.Combined.length > 0 && renderGroup(attachmentGroups.Combined, 'Combined')}
            </div>
            <Alert variant="warning" show={UserStore.isUserQuotaExceeded(filteredAttachments)}>
              Uploading attachments will fail; User quota
              {currentUser !== null ? ` (${currentUser.allocated_space / 1024 / 1024} MB) ` : ' '}
              will be exceeded.
            </Alert>
          </>
        )}
        <HyperLinksSection
          data={this.state.datasetContainer.extended_metadata.hyperlinks}
          onAddLink={this.handleAddLink}
          onRemoveLink={this.handleRemoveLink}
          disabled={this.props.disabled}
        />
      </div>
    );
  }

  renderMetadata() {
    const { datasetContainer, instruments } = this.state;
    const { readOnly, disabled, kind } = this.props;
    const termId = absOlsTermId(kind);
    const klasses = (UserStore.getState() && UserStore.getState().dsKlasses) || [];
    let klass = {};
    const idx = findIndex(klasses, (o) => o.ols_term_id === termId);
    if (idx > -1) {
      klass = klasses[idx];
    }
    let genericDS = {};
    if (datasetContainer?.dataset?.id) {
      genericDS = datasetContainer.dataset;
    } else if (klass.ols_term_id !== undefined) {
      genericDS = GenericDS.buildEmpty(cloneDeep(klass), datasetContainer.id);
    }
    return (
      <>
        <div ref={this.overlayContainerRef} style={{ position: 'relative' }}>
          <Form.Group controlId="datasetInstrument">
            <Form.Label>Instrument</Form.Label>
            <CreatableSelect
              isClearable
              className="w-100"
              value={
                datasetContainer?.extended_metadata?.instrument
                  ? {
                    label: datasetContainer.extended_metadata.instrument,
                    value: datasetContainer.extended_metadata.instrument
                  }
                  : null
              }
              isDisabled={readOnly || disabled}
              onChange={(selectedOption) => {
                const value = selectedOption ? selectedOption.value : '';
                this.handleInstrumentValueChange({ target: { value } }, this.doneInstrumentTyping);
              }}
              onInputChange={(inputValue, { action }) => {
                if (action === 'input-change') {
                  this.handleInstrumentValueChange({ target: { value: inputValue } }, this.doneInstrumentTyping);
                }
              }}
              options={instruments?.map((item) => ({
                label: item.name,
                value: item.name,
              }))}
              placeholder="Enter or select an instrument"
            />
          </Form.Group>
        </div>
        <Form.Group controlId="datasetDescription">
          <Form.Label>Description</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            value={datasetContainer.description || ''}
            disabled={readOnly || disabled}
            onChange={(event) => this.handleInputChange('description', event)}
          />
        </Form.Group>
        <GenericDSDetails
          genericDS={genericDS}
          klass={klass}
          kind={kind}
          onChange={this.handleDSChange}
        />
      </>
    );
  }

  render() {
    const { mode } = this.props;
    const { prevMessages } = this.state;
    const newMessages = this.context?.attachmentNotificationStore.getAttachmentsOfMessages();

    if (prevMessages.length !== newMessages.length) {
      this.setState({
        newMessages
      });
    }
    return (
      <div>
        {mode === 'attachments' && this.renderAttachments()}
        {mode === 'metadata' && this.renderMetadata()}
      </div>
    );
  }
}

ContainerDatasetModalContent.propTypes = {
  datasetContainer: PropTypes.shape({
    name: PropTypes.string.isRequired,
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
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  handleContainerSubmit: PropTypes.func.isRequired,
  isNew: PropTypes.bool.isRequired,
  onInstrumentChange: PropTypes.func,
  onModalHide: PropTypes.func.isRequired,
  readOnly: PropTypes.bool,
  disabled: PropTypes.bool,
  kind: PropTypes.string,
  mode: PropTypes.oneOf(['attachments', 'metadata']),
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
};

ContainerDatasetModalContent.defaultProps = {
  mode: 'attachments',
  disabled: false,
  readOnly: false,
  attachments: [],
  kind: null,
  onInstrumentChange: () => { },
};

export default observer(ContainerDatasetModalContent);
