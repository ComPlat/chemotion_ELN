import React from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip} from 'react-bootstrap';
import PanelHeader from '../common/PanelHeader';

const MetadataHeader = ({ title, onSave, onClose }) => {
  const onSaveAndClose = () => {
    onSave()
    onClose()
  }
  const btns = [
     <OverlayTrigger placement="bottom" key="closeMetadata"
        overlay={<Tooltip id="closeMetadata">Close Metadata</Tooltip>}>
      <Button
        bsStyle="danger"
        bsSize="xsmall"
        className="button-right"
        onClick={onClose}>
        <i className="fa fa-times" />
      </Button>
    </OverlayTrigger>,
    <OverlayTrigger placement="bottom" key="saveCloseMetadata"
        overlay={<Tooltip id="saveCloseMetadata">Save and Close Metadata</Tooltip>}>
      <Button bsStyle="warning" bsSize="xsmall" className="button-right"
        onClick={onSaveAndClose}>
        <i className="fa fa-floppy-o" />
        <i className="fa fa-times"  />
      </Button>
    </OverlayTrigger>,
    <OverlayTrigger placement="bottom" key="saveMetadata"
        overlay={<Tooltip id="saveMetadata">Save Metadata</Tooltip>}>
      <Button bsStyle="warning" bsSize="xsmall" className="button-right"
        onClick={onSave}>
        <i className="fa fa-floppy-o "></i>
      </Button>
    </OverlayTrigger>
  ]

  return <PanelHeader title={title} btns={btns} />
}

MetadataHeader.propTypes = {
  title: PropTypes.string,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
}

export default MetadataHeader
