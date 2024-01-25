/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import Attachment from 'src/models/Attachment';

export default class ImageAnnotationEditButton extends Component {
  allowedFileTypes = ['png', 'jpg', 'bmp', 'tif', 'svg', 'jpeg', 'tiff'];

  renderActiveAnnotationButton() {
    return (
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id="annotate_tooltip">Annotate image</Tooltip>}
      >
        <Button
          bsSize="xsmall"
          bsStyle="warning"
          className={
            this.props.horizontalAlignment ? this.props.horizontalAlignment : ""
          }
          onClick={() => {
            this.props.onSelectAttachment(this.props.attachment);
          }}
        >
          <i className="fa fa-pencil" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    );
  }

  renderInactiveAnnotationButton() {
    return (
      <OverlayTrigger
        overlay={
          <Tooltip id="annotate_tooltip">
            Cannot annotate - invalid file type or the image is new
          </Tooltip>
        }
      >
        <span
          className={
            this.props.horizontalAlignment ? this.props.horizontalAlignment : ""
          }
        >
          <Button
            bsSize="xs"
            bsStyle="warning"
            style={this.props.style}
            className={this.props.className}
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
            <i className="fa fa-pencil-square-o" aria-hidden="true" />
          </Button>
        </span>
      </OverlayTrigger>
    );
  }

  render() {
    if (!this.props.attachment) return null;
    if (!this.props.attachment.filename) return null;

    const extension = this.props.attachment.filename.split('.').pop();
    const isAllowedFileType = this.allowedFileTypes.includes(extension);
    if (!this.allowedFileTypes.includes(extension)) return null;

    return this.props.attachment.isNew
      ? this.renderInactiveAnnotationButton()
      : this.renderActiveAnnotationButton();
  }
}

ImageAnnotationEditButton.propTypes = {
  attachment: PropTypes.instanceOf(Attachment),
  parent: PropTypes.object.isRequired,
  style: PropTypes.object,
  className: PropTypes.string
  onSelectAttachment: PropTypes.func.isRequired,
  horizontalAlignment: PropTypes.string
};

ImageAnnotationEditButton.defaultProps = {
  attachment: null,
  style: {},
  className: ''
};
