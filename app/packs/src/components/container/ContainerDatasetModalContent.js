/* eslint-disable no-param-reassign */
/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import {
  FormGroup, FormControl, ControlLabel, ListGroup,
  ListGroupItem, Button, Overlay
} from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import EditorFetcher from 'src/fetchers/EditorFetcher';
import SaveEditedImageWarning from 'src/apps/mydb/elements/details/researchPlans/SaveEditedImageWarning';
import debounce from 'es6-promise-debounce';
import {
  findIndex, cloneDeep, last, findKey
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
  thirdPartyAppButton
} from 'src/apps/mydb/elements/list/AttachmentList';
import { formatDate } from 'src/utilities/timezoneHelper';
import UIStore from 'src/stores/alt/stores/UIStore';

export default class ContainerDatasetModalContent extends Component {
  constructor(props) {
    super(props);
    const datasetContainer = { ...props.datasetContainer };
    const {
      onImport
    } = props;
    const { thirdPartyApps } = UIStore.getState() || [];
    this.thirdPartyApps = thirdPartyApps;
    this.state = {
      datasetContainer,
      instruments: null,
      valueBeforeFocus: null,
      timeoutReference: null,
      attachmentEditor: false,
      extension: null,
      imageEditModalShown: false,
      filteredAttachments: [...props.datasetContainer.attachments],
      filterText: '',
      attachmentGroups: {
        Original: [],
        BagitZip: [],
        Combined: [],
        Processed: {},
      }
    };
    this.timeout = 6e2; // 600ms timeout for input typing
    this.doneInstrumentTyping = this.doneInstrumentTyping.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleAddLink = this.handleAddLink.bind(this);
    this.handleRemoveLink = this.handleRemoveLink.bind(this);
    this.handleDSChange = this.handleDSChange.bind(this);
    this.editorInitial = this.editorInitial.bind(this);
    this.createAttachmentPreviews = this.createAttachmentPreviews.bind(this);
    this.handleEdit = this.handleEdit.bind(this);
    this.handleFilterChange = this.handleFilterChange.bind(this);
    this.handleAttachmentRemove = this.handleAttachmentRemove.bind(this);
    this.handleAttachmentBackToInbox = this.handleAttachmentBackToInbox.bind(this);
    this.classifyAttachments = this.classifyAttachments.bind(this);
    this.state.attachmentGroups = this.classifyAttachments(props.datasetContainer.attachments);
  }

  componentDidMount() {
    this.editorInitial();
    this.createAttachmentPreviews();
    this.setState({
      attachmentGroups: this.classifyAttachments(this.props.datasetContainer.attachments)
    });
  }

  componentDidUpdate(prevProps) {
    const { attachments } = this.props.datasetContainer;
    if (attachments !== prevProps.datasetContainer.attachments) {
      this.createAttachmentPreviews();
      this.setState({
        filteredAttachments: [...attachments],
        attachmentGroups: this.classifyAttachments(attachments)
      }, this.filterAttachments);
    }
  }

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
      this.props.onChange({ ...this.state.datasetContainer });
      this.createAttachmentPreviews();
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
  handleSave() {
    const { datasetContainer } = this.state;
    const { onChange, onModalHide } = this.props;
    onChange(datasetContainer);
    onModalHide();
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

  resetInstrumentComponent() {
    const { datasetContainer } = this.state;
    this.setState({
      value: '',
      showInstruments: false,
      instruments: null,
      valueBeforeFocus: null,
      error: '',
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
    debounced(value)
      .then((result) => {
        const newState = {};
        if (result.length > 0) {
          newState.instruments = result;
          newState.showInstruments = show;
        } else {
          newState.instruments = null;
          newState.error = '';
          newState.showInstruments = false;
        }
        this.setState(newState);
      })
      .catch((error) => console.log(error));
  }

  selectInstrument() {
    const { datasetContainer, timeoutReference, value } = this.state;

    this.setState({
      showInstruments: false,
      valueBeforeFocus: null,
    });

    if (!value || value.trim() === '') {
      this.setState({ value: '' });
      return 0;
    }
    datasetContainer.extended_metadata.instrument = value;
    clearTimeout(timeoutReference);
    return value;
  }

  focusInstrument(newFocus) {
    const { instruments, valueBeforeFocus } = this.state;
    const newState = {};
    if (!valueBeforeFocus) {
      newState.valueBeforeFocus = instruments[newFocus].name;
    }
    newState.value = instruments[newFocus].name;
    this.setState(newState);
  }

  abortAutoSelection() {
    const { valueBeforeFocus } = this.state;
    this.setState({
      value: valueBeforeFocus,
      valueBeforeFocus: null,
    });
  }

  createAttachmentPreviews() {
    const { datasetContainer } = this.props;
    datasetContainer.attachments.map((attachment) => {
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

  renderInstruments() {
    const { instruments, error } = this.state;

    if (instruments) {
      return (
        <div>
          {instruments.map((instrument, index) => (
            <ListGroupItem
              onClick={() => this.selectInstrument()}
              onMouseEnter={() => this.focusInstrument(index)}
              // eslint-disable-next-line react/no-array-index-key
              key={`instrument_${index}`}
              ref={`instrument_${index}`}
              header={instrument.name}
            />
          ))}
        </div>
      );
    } if (error) {
      return <ListGroupItem>{error}</ListGroupItem>;
    }
    return <div />;
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
              Created:&nbsp;
              {formatDate(attachment.created_at)}
            </div>
            &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
            <div>
              Size:&nbsp;
              <span style={{ fontWeight: 'bold', color: '#444' }}>
                {formatFileSize(attachment.filesize)}
              </span>
            </div>
          </div>
        </div>
        <div className="attachment-row-actions" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {attachment.is_deleted ? (
            <Button
              bsSize="xs"
              bsStyle="danger"
              className="attachment-button-size"
              onClick={() => this.handleUndo(attachment)}
            >
              <i className="fa fa-undo" aria-hidden="true" />
            </Button>
          ) : (
            <>
            {thirdPartyAppButton(
                      attachment,
                      this.thirdPartyApps,
                    )}
              {downloadButton(attachment)}
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
              {annotateButton(attachment, this)}
              {moveBackButton(attachment, this.handleAttachmentBackToInbox, readOnly)}
              &nbsp;
              {removeButton(attachment, this.handleAttachmentRemove, readOnly)}
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

    const renderGroup = (attachments, title, key) => (
      <div key={key} style={{ marginTop: '10px' }}>
        <div style={{
          backgroundColor: '#D3D3D3',
          fontWeight: 'bold',
          marginBottom: '5px',
          borderRadius: '5px',
          padding: '5px'
        }}
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
      <div className="attachment-main-container">
        {this.renderImageEditModal()}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: '1', alignSelf: 'center' }}>
            {this.customDropzone()}
          </div>
          <div style={{ marginLeft: '20px', alignSelf: 'center' }}>
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
          <div style={{ marginBottom: '20px' }}>
            {attachmentGroups.Pending && attachmentGroups.Pending.length > 0
            && renderGroup(attachmentGroups.Pending, 'Pending')}
            {attachmentGroups.Original.length > 0 && renderGroup(attachmentGroups.Original, 'Original')}
            {attachmentGroups.BagitZip.length > 0 && renderGroup(attachmentGroups.BagitZip, 'Bagit / Zip')}
            {hasProcessedAttachments && Object.keys(attachmentGroups.Processed)
              .map((groupName) => attachmentGroups.Processed[groupName].length > 0
            && renderGroup(attachmentGroups.Processed[groupName], `Processed: ${groupName}`, groupName))}
            {attachmentGroups.Combined.length > 0 && renderGroup(attachmentGroups.Combined, 'Combined')}
          </div>
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
    const { datasetContainer, showInstruments } = this.state;
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
        <FormGroup controlId="datasetInstrument">
          <ControlLabel>Instrument</ControlLabel>
          <FormControl
            type="text"
            value={datasetContainer.extended_metadata.instrument || ''}
            disabled={readOnly || disabled}
            onChange={(event) => this.handleInstrumentValueChange(
              event,
              this.doneInstrumentTyping
            )}
            ref={(form) => { this.instRef = form; }}
            autoComplete="off"
          />
          <Overlay
            target={() => ReactDOM.findDOMNode(this.instRef)}
            shouldUpdatePosition
            placement="bottom"
            show={showInstruments}
            container={this}
            rootClose
            onHide={() => this.abortAutoSelection()}
          >
            <ListGroup
              style={{
                position: 'absolute', marginLeft: 0, marginTop: 17, width: '95%'
              }}
            >
              {this.renderInstruments()}
            </ListGroup>
          </Overlay>
        </FormGroup>
        <FormGroup controlId="datasetDescription">
          <ControlLabel>Description</ControlLabel>
          <FormControl
            componentClass="textarea"
            value={datasetContainer.description || ''}
            disabled={readOnly || disabled}
            onChange={(event) => this.handleInputChange('description', event)}
            rows={4}
          />
        </FormGroup>
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
  onInstrumentChange: () => {},
};
