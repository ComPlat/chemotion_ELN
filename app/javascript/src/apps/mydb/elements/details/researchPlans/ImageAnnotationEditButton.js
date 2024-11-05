/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

export default class ImageAnnotationEditButton extends Component {
  allowedFileTypes = ['png', 'jpg', 'bmp', 'tif', 'svg', 'jpeg', 'tiff'];

  render() {
    const { attachment, onClick } = this.props;
    if (!attachment || !attachment.filename) {
      return null;
    }

    const extension = this.props.attachment.filename.split('.').pop().toLowerCase();
    const isAllowedFileType = this.allowedFileTypes.includes(extension);
    const isActive = isAllowedFileType && !this.props.attachment.isNew;

    const tooltipText = isActive
      ? 'Annotate image'
      : 'Cannot annotate - invalid file type or the image is new';

    return (
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id="annotate_tooltip">{tooltipText}</Tooltip>}
      >
        {/* add div because disabled buttons cannot trigger tooltip overlay */}
        <div>
          <Button
            size="sm"
            variant={isAllowedFileType ? 'warning' : 'secondary'}
            onClick={onClick}
            disabled={!isActive}
          >
            <i className="fa fa-pencil-square" aria-hidden="true" />
          </Button>
        </div>
      </OverlayTrigger>
    );
  }
}

ImageAnnotationEditButton.propTypes = {
  attachment: PropTypes.instanceOf(Object),
  onClick: PropTypes.func.isRequired,
};

ImageAnnotationEditButton.defaultProps = {
  attachment: null,
};
