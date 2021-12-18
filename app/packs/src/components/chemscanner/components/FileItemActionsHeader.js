import PropTypes from 'prop-types';
import React from 'react';
import {
  Button, DropdownButton, MenuItem,
  OverlayTrigger, Tooltip
} from 'react-bootstrap';

function FileItemActionsHeader({
  deleteItems, beilsteinExport, openImportModal,
  rescanFiles, uploadInput, showSelectedItems,
  setArchived, unsetArchived
}) {
  if (!uploadInput) return <span />;

  const uploadTooltip = <Tooltip id="cs-show-files">Upload</Tooltip>;
  const openUpload = () => uploadInput.current.click();

  const rescanTooltip = <Tooltip id="cs-rescan-files">Rescan Files</Tooltip>;
  const deleteTooltip = <Tooltip id="cs-rescan-files">Delete Items</Tooltip>;

  const dropdownTitle = <i className="fa fa-eye" />;
  const exportTitle = <i className="fa fa-cloud-upload" />;

  const toggleArchiveTitle = <i className="fa fa-archive" />;

  return (
    <div>
      <OverlayTrigger placement="top" overlay={deleteTooltip}>
        <Button
          bsSize="xsmall"
          bsStyle="danger"
          style={{ float: 'right' }}
          onClick={deleteItems}
        >
          <i className="fa fa-trash" />
        </Button>
      </OverlayTrigger>
      <div style={{ float: 'right', marginRight: '5px', lineHeight: '0px' }}>
        <DropdownButton
          bsSize="xsmall"
          bsStyle="info"
          pullRight
          id="cs-show-multiple-items-dropdown"
          title={dropdownTitle}
        >
          <MenuItem
            eventKey="1"
            onClick={() => showSelectedItems('reactions')}
          >
            Show Reactions
          </MenuItem>
          <MenuItem
            eventKey="2"
            onClick={() => showSelectedItems('molecules')}
          >
            Show Molecules
          </MenuItem>
        </DropdownButton>
      </div>
      <div style={{ float: 'right', marginRight: '5px', lineHeight: '0px' }}>
        <DropdownButton
          bsSize="xsmall"
          pullRight
          id="cs-show-multiple-items-dropdown"
          title={exportTitle}
        >
          <MenuItem
            eventKey="1"
            onClick={openImportModal}
          >
            Import to ELN
          </MenuItem>
          <MenuItem
            eventKey="2"
            onClick={beilsteinExport}
          >
            Beilstein export
          </MenuItem>
        </DropdownButton>
      </div>
      <OverlayTrigger placement="top" overlay={rescanTooltip}>
        <Button
          bsSize="xsmall"
          bsStyle="primary"
          style={{ float: 'right', marginRight: '5px' }}
          onClick={rescanFiles}
        >
          <i className="fa fa-refresh" />
        </Button>
      </OverlayTrigger>
      <OverlayTrigger placement="top" overlay={uploadTooltip}>
        <Button
          bsSize="xsmall"
          bsStyle="success"
          style={{ float: 'right', marginRight: '5px' }}
          onClick={openUpload}
        >
          <i className="fa fa-plus-circle" />
        </Button>
      </OverlayTrigger>
      <div style={{ float: 'right', marginRight: '5px', lineHeight: '0px' }}>
        <DropdownButton
          bsSize="xsmall"
          pullRight
          id="cs-toggle-archive-dropdown"
          title={toggleArchiveTitle}
        >
          <MenuItem
            eventKey="1"
            onClick={setArchived}
          >
            Set archive
          </MenuItem>
          <MenuItem
            eventKey="2"
            onClick={unsetArchived}
          >
            Unset archive
          </MenuItem>
        </DropdownButton>
      </div>
    </div>
  );
}

FileItemActionsHeader.propTypes = {
  uploadInput: PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  rescanFiles: PropTypes.func.isRequired,
  deleteItems: PropTypes.func.isRequired,
  beilsteinExport: PropTypes.func.isRequired,
  openImportModal: PropTypes.func.isRequired,
  showSelectedItems: PropTypes.func.isRequired,
  setArchived: PropTypes.func.isRequired,
  unsetArchived: PropTypes.func.isRequired,
};

FileItemActionsHeader.defaultProps = {
  uploadInput: null
};

export default FileItemActionsHeader;
