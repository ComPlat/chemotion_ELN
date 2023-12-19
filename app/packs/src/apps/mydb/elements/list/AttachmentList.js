import React from 'react';
import {
  Button, OverlayTrigger, Tooltip, Dropdown, MenuItem, Glyphicon, Overlay, ButtonGroup
} from 'react-bootstrap';
import ImageAnnotationEditButton from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationEditButton';
import { values } from 'lodash';
import SpinnerPencilIcon from 'src/components/common/SpinnerPencilIcon';
import Dropzone from 'react-dropzone';

export const isImageFile = (fileName) => {
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

export const downloadButton = (attachment, handleDownloadOriginal, handleDownloadAnnotated) => (
  <Dropdown id={`dropdown-download-${attachment.id}`}>
    <Dropdown.Toggle style={{ height: '30px' }} bsSize="xs" bsStyle="primary">
      <i className="fa fa-download" aria-hidden="true" />
    </Dropdown.Toggle>
    <Dropdown.Menu>
      <MenuItem eventKey="1" onClick={() => handleDownloadOriginal(attachment)}>
        Download Original
      </MenuItem>
      <MenuItem
        eventKey="2"
        onClick={() => handleDownloadAnnotated(attachment)}
        disabled={!isImageFile(attachment.filename) || attachment.isNew}
      >
        Download Annotated
      </MenuItem>
    </Dropdown.Menu>
  </Dropdown>
);

export const removeButton = (attachment, onDelete, readOnly) => (
  <OverlayTrigger placement="top" overlay={<Tooltip id="delete_tooltip">Delete attachment</Tooltip>}>
    <Button
      bsSize="xs"
      bsStyle="danger"
      className="attachment-button-size"
      onClick={() => onDelete(attachment)}
      disabled={readOnly}
    >
      <i className="fa fa-trash-o" aria-hidden="true" />
    </Button>
  </OverlayTrigger>
);

export const moveBackButton = (attachment, onBack, readOnly) => (
  <OverlayTrigger placement="top" overlay={<Tooltip id="back_tooltip">Move attachment back to inbox</Tooltip>}>
    <Button
      bsSize="xs"
      bsStyle="danger"
      className="attachment-button-size"
      onClick={() => onBack(attachment)}
      disabled={readOnly}
    >
      <i className="fa fa-backward" aria-hidden="true" />
    </Button>
  </OverlayTrigger>

);

export const annotateButton = (attachment, parent) => (
  <ImageAnnotationEditButton
    parent={parent}
    attachment={attachment}
    className={`attachment-button-size ${!isImageFile(attachment.filename) ? 'attachment-gray-button' : ''}`}
    disabled={!isImageFile(attachment.filename)}
  />
);

export const editButton = (
  attachment,
  extension,
  attachmentEditor,
  isEditing,
  editDisable,
  handleEdit
) => {
  const editorTooltip = (exts) => (
    <Tooltip id="editor_tooltip">
      {editDisable ? (
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
  );
  return (
    <OverlayTrigger placement="top" overlay={editorTooltip(values(extension).join(','))}>
      <Button
        className={`attachment-button-size ${editDisable ? 'attachment-gray-button' : ''}`}
        bsSize="xs"
        bsStyle="success"
        disabled={editDisable}
        onClick={() => handleEdit(attachment)}
      >
        <SpinnerPencilIcon spinningLock={!attachmentEditor || isEditing} />
      </Button>
    </OverlayTrigger>
  );
};

export const importButton = (
  attachment,
  showImportConfirm,
  importDisabled,
  importButtonRefs,
  showImportConfirmFunction,
  hideImportConfirmFunction,
  confirmAttachmentImportFunction
) => {
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
          bsStyle="success"
          bsSize="xs"
          onClick={() => confirmAttachmentImportFunction(attachment)}
        >
          Yes
        </Button>
        <Button
          bsStyle="warning"
          bsSize="xs"
          onClick={() => hideImportConfirmFunction(attachment.id)}
        >
          No
        </Button>
      </ButtonGroup>
    </Tooltip>
  );

  return (
    <div>
      <OverlayTrigger placement="top" overlay={importTooltip}>
        <div style={{ float: 'right' }}>
          <Button
            bsSize="xs"
            bsStyle="success"
            disabled={importDisabled || extension !== 'xlsx'}
            // eslint-disable-next-line no-param-reassign
            ref={(ref) => { importButtonRefs[attachment.id] = ref; }}
            className={`attachment-button-size ${importDisabled
              || extension !== 'xlsx' ? 'attachment-gray-button' : ''}`}
            onClick={() => showImportConfirmFunction(attachment.id)}
          >
            <Glyphicon glyph="import" />
          </Button>
        </div>
      </OverlayTrigger>
      <Overlay
        show={show}
        placement="bottom"
        rootClose
        onHide={() => hideImportConfirmFunction(attachment.id)}
        target={importButtonRefs[attachment.id]}
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
  handleFilterChange
) => (
  <div style={{
    marginBottom: '20px', display: 'flex', justifyContent: 'space-between',
  }}
  >
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label style={{ marginRight: '10px' }}>Sort: </label>
      <div className="sort-container" style={{ display: 'flex', alignItems: 'center' }}>
        <select
          onChange={handleSortChange}
          className="sorting-row-style"
          style={{ width: '100px', marginRight: '10px' }}
        >
          <option value="name">Name</option>
          <option value="size">Size</option>
          <option value="date">Date</option>
        </select>
        <Button
          style={{ marginRight: '10px', marginLeft: '-15px' }}
          onClick={toggleSortDirection}
          className="sort-icon-style"
        >
          {sortDirection === 'asc' ? '▲' : '▼'}
        </Button>
      </div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label style={{ marginRight: '10px' }}>Filter: </label>
      <input
        type="text"
        placeholder="Filter by name..."
        onChange={handleFilterChange}
        className="sorting-row-style"
        style={{ width: '250px' }}
      />
    </div>
  </div>
);
