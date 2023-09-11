/* eslint-disable react/prefer-stateless-function */
import React, { Component } from "react";
import PropTypes from "prop-types";
import { Button, OverlayTrigger, Tooltip } from "react-bootstrap";

export default class ImageAnnotationEditButton extends Component {
  allowedFileTypes = ['png', 'jpg', 'bmp', 'tif', 'svg', 'jpeg', 'tiff']

  constructor(props) {
    super(props);
  }

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
            Please save the research plan to annotate the image
          </Tooltip>
        }
      >
        <span
          className={
            this.props.horizontalAlignment ? this.props.horizontalAlignment : ""
          }
        >
          <Button
            disabled
            style={{ pointerEvents: "none" }}
            bsSize="xsmall"
            bsStyle="warning"
          >
            <i className="fa fa-pencil" aria-hidden="true" />
          </Button>
        </span>
      </OverlayTrigger>
    );
  }

  render() {
    if (!this.props.attachment) return null;
    if (!this.props.attachment.filename) return null;

    const extension = this.props.attachment.filename.split('.').pop();
    if (!this.allowedFileTypes.includes(extension)) return null;

    return this.props.attachment.isNew
      ? this.renderInactiveAnnotationButton()
      : this.renderActiveAnnotationButton();
  }
}
ImageAnnotationEditButton.propTypes = {
  attachment: PropTypes.object,
  onSelectAttachment: PropTypes.func.isRequired,
  horizontalAlignment: PropTypes.string
};
