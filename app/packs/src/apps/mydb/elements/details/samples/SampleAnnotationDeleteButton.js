/* eslint-disable react/prefer-stateless-function */
import React, { Component } from "react";
import PropTypes from "prop-types";
import { Button, ButtonGroup, Tooltip, Overlay, OverlayTrigger } from "react-bootstrap";

export default class SampleAnnotationDeleteButton extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showTooltip: false,
    };

    this.getTargetButton = this.getTargetButton.bind(this);
  }

  onClickButton() {
    this.setState(
      prevState => ({ ...prevState, showTooltip: !prevState.showTooltip }),
      () => this.props.clickHandler(this.props.sample)
    );
  }

  getTargetButton() {
    return this.target;
  }

  renderActiveButton() {
    return (
      <>
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip id="annotate_tooltip">Delete annotation</Tooltip>}
        >
          <Button
            bsSize="xsmall"
            bsStyle="danger"
            className={
              this.props.horizontalAlignment ? this.props.horizontalAlignment : ""
            }
            onClick={() => this.setState({ showTooltip: true })}
            ref={(button) => { this.target = button; }}
          >
            <i className="fa fa-trash" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
        <Overlay
          container={this}
          target={this.getTargetButton()}
          show={this.state.showTooltip}
          placement='bottom'
          rootClose
          onHide={() => this.setState({ showTooltip: false })}
        >
          <Tooltip placement="left" className="in" id="tooltip-bottom">
            Delete annotation file?<br />
            <ButtonGroup>
              <Button
                bsStyle="danger"
                bsSize="xsmall"
                onClick={() => this.onClickButton()}
              >Yes
              </Button>
              <Button
                bsStyle="warning"
                bsSize="xsmall"
                onClick={() => this.setState({ showTooltip: false })}
              >No
              </Button>
            </ButtonGroup>
          </Tooltip>
        </Overlay>
      </>
    );
  }

  renderInactiveButton() {
    return (
      <OverlayTrigger
        overlay={
          <Tooltip id="annotate_tooltip">
            Only unchanged samples can be deleted
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
            bsStyle="default"
          >
            <i className="fa fa-trash" aria-hidden="true" />
          </Button>
        </span>
      </OverlayTrigger>
    );
  }

  render() {
    if (!this.props.sample) return null;
    if (this.props.sample.sample_svg_annotation_file === '') return null;

    return this.props.sample.isEdited
      ? this.renderInactiveButton()
      : this.renderActiveButton();
  }
}
SampleAnnotationDeleteButton.propTypes = {
  sample: PropTypes.object,
  clickHandler: PropTypes.func.isRequired,
  horizontalAlignment: PropTypes.string
};
