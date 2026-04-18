import React, { Component, createRef } from 'react';
import { Button, Tooltip, OverlayTrigger } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { StoreContext } from 'src/stores/mobx/RootStore';
import ConfirmationOverlay from 'src/components/common/ConfirmationOverlay';

import DetailActions from 'src/stores/alt/actions/DetailActions';

export default class ConfirmClose extends Component {
  constructor(props) {
    super(props);
    this.state = {
      overlayTarget: null,
    };

    this.buttonRef = createRef();

    this.closeElement = this.closeElement.bind(this);
    this.onClickButton = this.onClickButton.bind(this);
    this.hideOverlay = this.hideOverlay.bind(this);
  }

  onClickButton(el) {
    const { forceClose } = this.props;

    this.setState(
      (prevState) => ({
        ...prevState,
        overlayTarget: prevState.overlayTarget ? null : this.buttonRef.current,
      }),
      () => DetailActions.close(el, forceClose)
    );

    if (!el.isEdited) {
      this.closeByContextType(el);
    }
  }

  closeByContextType(el) {
    const {
      deviceDescriptions,
      sequenceBasedMacromoleculeSamples,
    } = this.context;

    if (el && el.type === 'device_description') {
      deviceDescriptions.removeFromOpenDeviceDescriptions(el);
    }
    if (el && el.type === 'sequence_based_macromolecule_sample') {
      sequenceBasedMacromoleculeSamples.removeFromOpenSequenceBasedMacromoleculeSamples(el);
    }
  }

  closeElement(e) {
    const { el } = this.props;
    this.hideOverlay();
    this.closeByContextType(el);
    DetailActions.confirmDelete(e);
  }

  hideOverlay() {
    this.setState({ overlayTarget: null });
  }

  render() {
    const { el } = this.props;
    const { overlayTarget } = this.state;
    const closeTooltip = `Close ${el.type}`;

    return (
      <>
        <OverlayTrigger
          placement="bottom"
          overlay={
            <Tooltip id="closeSample">{closeTooltip}</Tooltip>
          }
        >
          <Button
            variant="danger"
            size="xxsm"
            onClick={() => this.onClickButton(el)}
            ref={this.buttonRef}
          >
            <i className="fa fa-times" />
          </Button>
        </OverlayTrigger>
        <ConfirmationOverlay
          overlayTarget={overlayTarget}
          placement="bottom"
          warningText={`Unsaved data will be lost. Close ${el.type}?`}
          destructiveAction={this.closeElement}
          destructiveActionLabel="Yes"
          hideAction={this.hideOverlay}
          hideActionLabel="No"
        />
      </>
    );
  }
}

ConfirmClose.contextType = StoreContext;

ConfirmClose.propTypes = {
  el: PropTypes.shape({
    type: PropTypes.string.isRequired,
    isEdited: PropTypes.bool,
  }).isRequired,
  // el: PropTypes.oneOfType([
  //   PropTypes.instanceOf(ResearchPlan),
  //   PropTypes.instanceOf(Reaction),
  //   PropTypes.instanceOf(Sample),
  //   PropTypes.instanceOf(Wellplate),
  //   PropTypes.instanceOf(Screen),
  // ]).isRequired,
  forceClose: PropTypes.bool
};

ConfirmClose.defaultProps = {
  forceClose: false
};
