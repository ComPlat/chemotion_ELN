/* eslint-disable react/prefer-stateless-function */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip} from 'react-bootstrap';

export default class ImageAnnotationEditButton extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
          this.props.attachment.isNew?
            this.renderInactiveAnnotationButton():
            this.renderActiveAnnotationButton()
        );
  }

  renderActiveAnnotationButton() {
    return (
      <OverlayTrigger placement="top" overlay={<Tooltip id="annotate_tooltip">Annotate image</Tooltip>}>
      <Button
        bsSize="xsmall"
        bsStyle="warning"
        className={this.props.horizontalAlignment?this.props.horizontalAlignment:""}
        onClick={() => {
          this.props.parent.setState(
            {
              imageEditModalShown: true,
              choosenAttachment: this.props.attachment,
              imageName: this.props.attachment.filename
            });
        } }>
        <i className="fa fa-pencil" aria-hidden="true" />
      </Button>
    </OverlayTrigger>
    );
  }

  renderInactiveAnnotationButton(attachment) {
    return (
      <OverlayTrigger overlay={<Tooltip id="annotate_tooltip">Please save the research plan to annotate the image</Tooltip>}>
      <span  className={this.props.horizontalAlignment?this.props.horizontalAlignment:""}>
        <Button
          disabled
          style={{ pointerEvents: 'none' }}
          bsSize="xsmall"
          bsStyle="warning"
        >
          <i className="fa fa-pencil" aria-hidden="true" />
        </Button>
      </span>
    </OverlayTrigger>
    );
  }
}
ImageAnnotationEditButton.propTypes = {
  attachment: PropTypes.object.isRequired,
  parent: PropTypes.object.isRequired,
  horizontalAlignment: PropTypes.string
};
