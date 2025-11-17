import React, {
  useState, useEffect, useMemo, useCallback
} from 'react';
import {
  Button, OverlayTrigger, Tooltip, Dropdown, Overlay, ButtonGroup
} from 'react-bootstrap';
import ImageAnnotationEditButton from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationEditButton';
import { values, last } from 'lodash';
import uuid from 'uuid';
import mime from 'mime-types';
import SpinnerPencilIcon from 'src/components/common/SpinnerPencilIcon';
import Dropzone from 'react-dropzone';
import Utils from 'src/utilities/Functions';
import ImageModal from 'src/components/common/ImageModal';
import ThirdPartyAppFetcher from 'src/fetchers/ThirdPartyAppFetcher';
import UIStore from 'src/stores/alt/stores/UIStore';
import EditorFetcher from 'src/fetchers/EditorFetcher';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

export const attachmentThumbnail = (attachment) => (
  <div className="attachment-row-image">
    <ImageModal
      attachment={attachment}
      popObject={{
        title: attachment?.filename,
      }}
    />
  </div>
);

const isImageFile = (fileName) => {
  const acceptedImageTypes = ['png', 'jpg', 'bmp', 'tif', 'svg', 'jpeg', 'tiff'];
  const dataType = fileName.split('.').pop().toLowerCase();
  return acceptedImageTypes.includes(dataType);
};

export const formatFileSize = (sizeInB) => {
  if (sizeInB >= 1024 * 1024) {
    return `${(sizeInB / (1024 * 1024)).toFixed(2)} MB`;
  } if (sizeInB >= 1024) {
    return `${(sizeInB / 1024).toFixed(1)} kB`;
  }
  return `${sizeInB} bytes`;
};

const handleDownloadAnnotated = (attachment) => {
  const isImage = isImageFile(attachment.filename);
  if (isImage && !attachment.isNew) {
    Utils.downloadFile({
      contents: `/api/v1/attachments/${attachment.id}?annotated=true`,
      name: attachment.filename
    });
  }
};

const handleDownloadOriginal = (attachment) => {
  Utils.downloadFile({
    contents: `/api/v1/attachments/${attachment.id}`,
    name: attachment.filename,
  });
};

const handleOpenLocally = (attachment, option = 0) => {
  ThirdPartyAppFetcher.getHandlerUrl(attachment.id, option).then((url) => {
    const link = document.createElement('a');
    link.download = attachment.filename;
    link.href = url;
    const event = new window.MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    link.dispatchEvent(event);
  });
};

export const undoButton = (attachment, onUndoDelete) => (
  <Button
    size="xs"
    variant="danger"
    className="attachment-button-size"
    onClick={() => onUndoDelete(attachment)}
  >
    <i className="fa fa-undo" aria-hidden="true" />
  </Button>
);

export const downloadButton = (attachment) => (
  <Dropdown id={`dropdown-download-${attachment.id}`}>
    <Dropdown.Toggle size="sm" variant="primary">
      <i className="fa fa-download" aria-hidden="true" />
    </Dropdown.Toggle>
    <Dropdown.Menu>
      <Dropdown.Item eventKey="1" onClick={() => handleDownloadOriginal(attachment)}>
        Download Original
      </Dropdown.Item>
      <Dropdown.Item
        eventKey="2"
        onClick={() => handleDownloadAnnotated(attachment)}
        disabled={!isImageFile(attachment.filename) || attachment.isNew}
      >
        Download Annotated
      </Dropdown.Item>
      <Dropdown.Item
        eventKey="3"
        onClick={() => handleOpenLocally(attachment, 0)}
        disabled={attachment.isNew}
      >
        Open locally
      </Dropdown.Item>
    </Dropdown.Menu>
  </Dropdown>
);

export const removeButton = (attachment, onDelete, readOnly, tooltipText = 'Delete attachment') => (
  <OverlayTrigger placement="top" overlay={<Tooltip id="delete_tooltip">{tooltipText}</Tooltip>}>
    <span>
      <Button
        size="sm"
        variant="danger"
        onClick={() => onDelete(attachment)}
        disabled={readOnly}
      >
        <i className="fa fa-trash-o" aria-hidden="true" />
      </Button>
    </span>
  </OverlayTrigger>
);

export const moveBackButton = (attachment, onBack, readOnly) => (
  <OverlayTrigger placement="top" overlay={<Tooltip id="back_tooltip">Move attachment back to inbox</Tooltip>}>
    <Button
      size="sm"
      variant="danger"
      onClick={() => onBack(attachment)}
      disabled={readOnly}
    >
      <i className="fa fa-backward" aria-hidden="true" />
    </Button>
  </OverlayTrigger>

);

export const annotateButton = (attachment, onClick) => (
  <ImageAnnotationEditButton
    onClick={onClick}
    attachment={attachment}
  />
);

// EditButton
/**
 * Props:
 *  - attachment: Attachment instance
 *  - disabled: boolean
 *  - onChange: function
 */
export function EditButton({ attachment, disabled, onChange }) {
  const { docserver } = UIStore.getState() || {};
  const extensionsObj = docserver.extensions || {};
  // Previously "attachmentEditor" -> now available at UserStore.editorConfig.available (bool)
  const attachmentEditor = Boolean(docserver?.available);
  const editDisable = disabled || !attachmentEditor || attachment.edit_state === 'editing';

  const extsList = useMemo(
    () => values(extensionsObj).join(','),
    [extensionsObj]
  );

  const editorTooltip = useCallback(
    (exts) => (
      <Tooltip id="editor_tooltip">
        {disabled ? (
          <span>
            Editing is only available for these files:&nbsp;
            <strong>{exts}</strong>
            .
            <br />
            Or you are not authorized to edit this file.
          </span>
        ) : (
          <span>Edit attachment</span>
        )}
      </Tooltip>
    ),
    [disabled]
  );

  const documentType = (filename) => {
    const extension = filename.split('.').pop()?.toLowerCase();

    if (!extension) return 'unknown';

    const textExts = ['doc', 'docx', 'txt', 'odt', 'rtf'];
    const spreadsheetExts = ['xls', 'xlsx', 'ods', 'csv'];
    const presentationExts = ['ppt', 'pptx', 'odp'];
    const pdfExts = ['pdf'];
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp'];

    if (textExts.includes(extension)) return 'text';
    if (spreadsheetExts.includes(extension)) return 'spreadsheet';
    if (presentationExts.includes(extension)) return 'presentation';
    if (pdfExts.includes(extension)) return 'pdf';
    if (imageExts.includes(extension)) return 'image';

    return 'unknown';
  };

  const handleEdit = useCallback(() => {
    if (editDisable) return;

    const fileType = last(attachment.filename.split('.'));
    const docType = documentType(attachment.filename);
    const forceStop = attachment.edit_state === 'editing';

    EditorFetcher.startEditing({ attachmentId: attachment.id, forceStop })
      .then((result) => {
        const newAttachment = { ...attachment };

        if (!forceStop && result.token) {
          const url = `/editor?id=${newAttachment.id}`
          + `&docType=${docType}`
          + `&fileType=${fileType}`
          + `&title=${newAttachment.filename}`
          + `&key=${result.token}`
          + `&only_office_token=${result.only_office_token}`;

          newAttachment.edit_state = 'editing';
          newAttachment.updated_at = new Date();

          onChange(newAttachment); // <-- UI updates here first

          setTimeout(() => {
            window.open(url, '_blank'); // <-- new tab opens AFTER state flush
          }, 0);
        } else if (forceStop) {
          newAttachment.edit_state = 'not_editing';
          newAttachment.updated_at = new Date();
          onChange(newAttachment);
        } else {
          NotificationActions.add({ message: 'Cannot edit this file.', level: 'error', position: 'tc' });
          onChange(newAttachment);
        }
      });
  }, [attachment, editDisable]);

  return (
    <OverlayTrigger placement="top" overlay={editorTooltip(extsList)}>
      <Button
        size="sm"
        variant="success"
        disabled={editDisable}
        onClick={handleEdit}
      >
        <SpinnerPencilIcon
          spinningLock={attachment.edit_state === 'editing'}
        />
      </Button>
    </OverlayTrigger>
  );
}

export const importButton = (
  attachment,
  showImportConfirm,
  importDisabled,
  showImportConfirmFunction,
  hideImportConfirmFunction,
  confirmAttachmentImportFunction
) => {
  if (showImportConfirm.length === 0) { return null; }

  const show = showImportConfirm[attachment.id];
  const extension = attachment.filename.split('.').pop();

  const importTooltip = importDisabled || extension !== 'xlsx'
    ? <Tooltip id="import_tooltip">Invalid type for import or element must be saved before import</Tooltip>
    : <Tooltip id="import_tooltip">Import as element data</Tooltip>;

  const confirmTooltip = (
    <Tooltip placement="bottom" className="in" id="tooltip-bottom">
      Import data from Spreadsheet? This will overwrite existing data.
      <br />
      <ButtonGroup>
        <Button
          variant="success"
          size="sm"
          onClick={() => confirmAttachmentImportFunction(attachment)}
        >
          Yes
        </Button>
        <Button
          variant="warning"
          size="sm"
          onClick={() => hideImportConfirmFunction(attachment.id)}
        >
          No
        </Button>
      </ButtonGroup>
    </Tooltip>
  );

  const buttonRef = React.createRef();
  return (
    <div>
      <OverlayTrigger placement="top" overlay={importTooltip}>
        {/* add span because disabled buttons cannot trigger tooltip overlay */}
        <span>
          <Button
            size="sm"
            variant="success"
            disabled={importDisabled || extension !== 'xlsx'}
            ref={buttonRef}
            onClick={() => showImportConfirmFunction(attachment.id)}
          >
            <i className="fa fa-plus-circle" />
          </Button>
        </span>
      </OverlayTrigger>
      <Overlay
        show={show}
        placement="bottom"
        rootClose
        onHide={() => hideImportConfirmFunction(attachment.id)}
        target={buttonRef}
      >
        {confirmTooltip}
      </Overlay>
    </div>
  );
};

export const customDropzone = (onDrop) => (
  <Dropzone onDrop={onDrop} className="attachment-dropzone">
    Drop files here, or click to upload.
  </Dropzone>
);

export const sortingAndFilteringUI = (
  sortDirection,
  handleSortChange,
  toggleSortDirection,
  handleFilterChange,
  isSortingEnabled
) => (
  <>
    {isSortingEnabled && (
      <div className="d-flex align-items-center gap-2">
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label>Sort:</label>
        <select
          onChange={handleSortChange}
          className="sorting-row-style"
          style={{ width: '100px' }}
        >
          <option value="name">Name</option>
          <option value="size">Size</option>
          <option value="date">Date</option>
        </select>
        <Button
          onClick={toggleSortDirection}
          variant="light"
        >
          {sortDirection === 'asc' ? '▲' : '▼'}
        </Button>
      </div>
    )}
    <div className="d-flex align-items-center gap-2">
      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label className="me-2">Filter: </label>
      <input
        type="text"
        placeholder="Filter by name..."
        onChange={handleFilterChange}
        className="p-2 border rounded border-gray-300"
        style={{ width: '250px' }}
      />
    </div>
  </>
);

// validate id as uuid
// TODO replace with uuid.validate after upgrade to uuid 10
const isUUID = (id) => {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-6][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(id);
};

const filterOptions = (contentType, options) => {
  const [itemType, itemSubtype] = (contentType || '').split('/');
  return (options || [])
    .filter((option) => {
      if (!option.fileTypes || option.fileTypes.length === 0) { return false; }
      return option.fileTypes.split(',').some((filter) => {
        const [type, subtype] = filter.split('/');
        return (type === '*' || type === itemType) && (!subtype || subtype === '*' || subtype === itemSubtype);
      });
    });
};

const noChoice = [<Dropdown.Item key={uuid.v4()} disabled>None Available</Dropdown.Item>];

export function ThirdPartyAppButton({ attachment, options = [] }) {
  const [menuItems, setMenuItems] = useState([]);
  const contentType = mime.contentType(attachment.content_type)
    ? attachment.content_type : mime.lookup(attachment.filename);

  useEffect(() => {
    const generatedMenuItems = () => {
      if (isUUID(attachment?.id)) { return noChoice; }
      const filteredOptions = filterOptions(contentType, options);
      if (filteredOptions.length === 0) { return noChoice; }
      return filteredOptions.map((option) => (
        <Dropdown.Item
          key={uuid.v4()}
          eventKey={option.id}
          onClick={() => {
            ThirdPartyAppFetcher.fetchAttachmentToken(attachment.id, option.id)
              .then((result) => window.open(result, '_blank'));
          }}
        >
          {option.name}
        </Dropdown.Item>
      ));
    };
    setMenuItems(generatedMenuItems());
  }, [attachment, options]);

  return (
    <Dropdown id={`dropdown-TPA-attachment${attachment?.id || uuid.v4()}`}>
      <Dropdown.Toggle size="sm" variant="primary">
        <i className="fa fa-external-link" aria-hidden="true" />
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {menuItems}
      </Dropdown.Menu>
    </Dropdown>
  );
}
