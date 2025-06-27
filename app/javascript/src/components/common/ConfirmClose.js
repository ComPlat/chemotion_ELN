import React, { Component, createRef } from 'react';
import { Button, Tooltip, Overlay, OverlayTrigger, ButtonToolbar } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { StoreContext } from 'src/stores/mobx/RootStore';

import DetailActions from 'src/stores/alt/actions/DetailActions';

export default class ConfirmClose extends Component {
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.state = {
      showTooltip: false,
    };

    this.closeElement = this.closeElement.bind(this);
    this.onClickButton = this.onClickButton.bind(this);
  }

  closeByContextType(el) {
    if (el && el.type == 'device_description') {
      this.context.deviceDescriptions.removeFromOpenDeviceDescriptions(el);
    }
    if (el && el.type == 'sequence_based_macromolecule_sample') {
      this.context.sequenceBasedMacromoleculeSamples.removeFromOpenSequenceBasedMacromoleculeSamples(el);
    }
  }

  onClickButton(el) {
    this.setState(
      prevState => ({ ...prevState, showTooltip: !prevState.showTooltip }),
      () => DetailActions.close(el, this.props.forceClose)
    );
    this.closeByContextType(el);
  }

  closeElement(e) {
    const { el } = this.props;
    this.closeByContextType(el);
    DetailActions.confirmDelete(e);
  }

  render() {
    const { el } = this.props;
    const popover = (
      <Tooltip placement="left" className="in" id="tooltip-bottom">
        Unsaved data will be lost.<br /> Close {el.type}?<br />
        <ButtonToolbar className="gap-2 justify-content-center">
          <Button
            variant="danger"
            size="xxsm"
            onClick={(e) => this.closeElement(e)}
          >
            Yes
          </Button>
          <Button
            variant="warning"
            size="xxsm"
            onClick={() => this.setState({ showTooltip: false })}
          >
            No
          </Button>
        </ButtonToolbar>
      </Tooltip>
    );

    const buttonRef = createRef(null);

    return (
      <>
        <OverlayTrigger
          placement="bottom"
          overlay={
            <Tooltip id="closeSample">Close {el.type}</Tooltip>
          }
        >
          <Button
            variant="danger"
            size="xxsm"
            onClick={() => this.onClickButton(el)}
            ref={buttonRef}
          >
            <i className="fa fa-times" />
          </Button>
        </OverlayTrigger>
        <Overlay
          target={() => buttonRef.current}
          show={this.state.showTooltip}
          placement="bottom"
          rootClose
          onHide={() => this.setState({ showTooltip: false })}
        >
          {popover}
        </Overlay>
      </>
    );
  }
}

ConfirmClose.propTypes = {
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
