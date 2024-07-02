import React, { Component } from 'react';
import { Button, ButtonGroup, Tooltip, Overlay, OverlayTrigger } from 'react-bootstrap';
import PropTypes from 'prop-types';

import DetailActions from 'src/stores/alt/actions/DetailActions';

export default class ConfirmClose extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showTooltip: false,
    };

    this.onClickButton = this.onClickButton.bind(this);
    this.getTargetButton = this.getTargetButton.bind(this);
  }

  onClickButton(el) {
    this.setState(
      prevState => ({ ...prevState, showTooltip: !prevState.showTooltip }),
      () => DetailActions.close(el, this.props.forceClose)
    );
  }

  getTargetButton() {
    return this.target;
  }

  render() {
    const { el } = this.props;
    const popover = (
      <Tooltip placement="left" className="in" id="tooltip-bottom">
        Unsaved data will be lost.<br /> Close {el.type}?<br />
        <ButtonGroup>
          <Button
            variant="danger"
            size="sm"
            onClick={DetailActions.confirmDelete}
          >Yes
          </Button>
          <Button
            variant="warning"
            size="sm"
            onClick={() => this.setState({ showTooltip: false })}
          >No
          </Button>
        </ButtonGroup>
      </Tooltip>
    );
    const sharedProps = {
      containter: this,
      target: this.getTargetButton,
      show: this.state.showTooltip,
      placement: 'bottom',
    };

    return (
      <>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="closeSample">Close {el.type}</Tooltip>}>
          <Button
            variant="danger"
            size="xxsm"
            onClick={() => this.onClickButton(el)}
            ref={(button) => { this.target = button; }}
          >
            <i className="fa fa-times" />
          </Button>
        </OverlayTrigger>
        <Overlay
          {...sharedProps}
          rootClose
          onHide={() => this.setState({ showTooltip: false })}
        >
          { popover }
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
