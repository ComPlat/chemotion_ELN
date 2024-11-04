import React from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

const MetadataHeader = ({
  title, saveBtnDisplay, onSave, onClose
}) => {
  const onSaveAndClose = () => {
    onSave();
    onClose();
  };

  return (
    <div className="d-flex justify-content-between">
      {title}
      <div className="d-flex align-items-center gap-1">
        {saveBtnDisplay && (
          <>
            <OverlayTrigger
              placement="bottom"
              overlay={<Tooltip id="saveMetadata">Save Metadata</Tooltip>}
            >
              <Button
                variant="warning"
                size="xxsm"
                onClick={onSave}
              >
                <i className="fa fa-floppy-o " />
              </Button>
            </OverlayTrigger>

            <OverlayTrigger
              placement="bottom"
              overlay={<Tooltip id="saveCloseMetadata">Save and Close Metadata</Tooltip>}
            >
              <Button
                variant="warning"
                size="xxsm"
                onClick={onSaveAndClose}
              >
                <i className="fa fa-floppy-o" />
                <i className="fa fa-times" />
              </Button>
            </OverlayTrigger>
          </>
        )}

        <OverlayTrigger
          placement="bottom"
          key="closeMetadata"
          overlay={<Tooltip id="closeMetadata">Close Metadata</Tooltip>}
        >
          <Button
            variant="danger"
            size="xxsm"
            onClick={onClose}
          >
            <i className="fa fa-times" />
          </Button>
        </OverlayTrigger>
      </div>
    </div>
  );
};

MetadataHeader.propTypes = {
  title: PropTypes.string.isRequired,
  onSave: PropTypes.func.isRequired,
  saveBtnDisplay: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

export default MetadataHeader;
