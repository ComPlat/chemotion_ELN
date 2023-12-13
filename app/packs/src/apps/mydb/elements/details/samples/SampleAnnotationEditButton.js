/* eslint-disable react/prefer-stateless-function */
import React, { Component } from "react";
import PropTypes from "prop-types";
import { Button, OverlayTrigger, Tooltip } from "react-bootstrap";

export default class SampleAnnotationEditButton extends Component {
  constructor(props) {
    super(props);
  }

  renderActiveButton() {
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
            this.props.clickHandler(this.props.sample);
          }}
        >
          <i className="fa fa-pencil" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    );
  }

  renderInactiveButton() {
    return (
      <OverlayTrigger
        overlay={
          <Tooltip id="annotate_tooltip">
            Please save the sample to annotate the structure svg
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
    if (!this.props.sample) return null;
    if (!this.props.sample.sample_svg_file) return null;

    return this.props.sample.isNew
      ? this.renderInactiveButton()
      : this.renderActiveButton();
  }
}
SampleAnnotationEditButton.propTypes = {
  sample: PropTypes.object,
  clickHandler: PropTypes.func.isRequired,
  horizontalAlignment: PropTypes.string
};
