import React from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip} from 'react-bootstrap';
import PanelHeader from 'src/components/common/PanelHeader';

const MetadataHeader = ({ title, saveBtnDisplay, onSave, onClose }) => {
  const onSaveAndClose = () => {
    onSave()
    onClose()
  }
  const btns = [
     <OverlayTrigger placement="bottom" key="closeMetadata"
        overlay={<Tooltip id="closeMetadata">Close Metadata</Tooltip>}>
      <Button
        variant="danger"
        size="sm"
        onClick={onClose}>
        <i className="fa fa-times" />
      </Button>
    </OverlayTrigger>
  ]
  if (saveBtnDisplay) {
    btns.push(
      <OverlayTrigger placement="bottom" key="saveCloseMetadata"
          overlay={<Tooltip id="saveCloseMetadata">Save and Close Metadata</Tooltip>}>
        <Button variant="warning" size="sm"
          onClick={onSaveAndClose}>
          <i className="fa fa-floppy-o" />
          <i className="fa fa-times"  />
        </Button>
      </OverlayTrigger>,
      <OverlayTrigger placement="bottom" key="saveMetadata"
          overlay={<Tooltip id="saveMetadata">Save Metadata</Tooltip>}>
        <Button variant="warning" size="sm"
          onClick={onSave}>
          <i className="fa fa-floppy-o "></i>
        </Button>
      </OverlayTrigger>
    )
  }

  return <PanelHeader title={title} btns={btns} />
}

MetadataHeader.propTypes = {
  title: PropTypes.string,
  onSave: PropTypes.func.isRequired,
  saveBtnDisplay: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
}

export default MetadataHeader
