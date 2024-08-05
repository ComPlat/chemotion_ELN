/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import Attachment from 'src/models/Attachment';

export default class ImageAnnotationEditButton extends Component {
  allowedFileTypes = ['png', 'jpg', 'bmp', 'tif', 'svg', 'jpeg', 'tiff'];

  renderButton(isActive, tooltipText) {
    return (
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id="annotate_tooltip">{tooltipText}</Tooltip>}
      >
        <Button
          size="sm"
          variant="warning"
          className="d-flex align-items-center justify-content-center ms-1"
          onClick={() => {
            if (isActive) {
              this.props.parent.setState({
                imageEditModalShown: true,
                chosenAttachment: this.props.attachment,
                imageName: this.props.attachment.filename,
              });
            }
          }}
          disabled={!isActive}
        >
          <i className="fa fa-pencil-square-o text-white" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    );
  }

  render() {
    if (!this.props.attachment || !this.props.attachment.filename) {
      return null;
    }

    const extension = this.props.attachment.filename.split('.').pop();
    const isAllowedFileType = this.allowedFileTypes.includes(extension);
    const isActive = isAllowedFileType && !this.props.attachment.isNew;

    const tooltipText = isActive
      ? 'Annotate image'
      : 'Cannot annotate - invalid file type or the image is new';

    return this.renderButton(isActive, tooltipText);
  }
}

ImageAnnotationEditButton.propTypes = {
  attachment: PropTypes.instanceOf(Attachment),
  parent: PropTypes.object.isRequired,
  style: PropTypes.object,
  className: PropTypes.string
};

ImageAnnotationEditButton.defaultProps = {
  attachment: null,
  style: {},
  className: ''
};
