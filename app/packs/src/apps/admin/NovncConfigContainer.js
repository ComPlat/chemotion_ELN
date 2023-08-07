import React, { Component } from 'react';
import {
  Button, Overlay, OverlayTrigger, Tooltip, Popover
} from 'react-bootstrap';
import PropTypes from 'prop-types';

import styles from 'Styles';

const tipRemoveConfig = <Tooltip id="remove_tooltip">Delete config</Tooltip>;

export default class NovncConfigContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      deletingTooltip: false,
    };
    this.toggleTooltip = this.toggleTooltip.bind(this);
    this.target = React.createRef();
  }

  toggleTooltip() {
    this.setState((prevState) => ({ deletingTooltip: !prevState.deletingTooltip }));
  }

  render() {
    const { device } = this.props;
    return (
      <>
        <OverlayTrigger placement="top" overlay={tipRemoveConfig}>
          <Button
            ref={this.target}
            bsSize="xsmall"
            bsStyle="danger"
            onClick={this.toggleTooltip}
            style={styles.panelIcons}
          >
            <i className="fa fa-eraser" aria-hidden="true" style={{ fontSize: '16px' }} />
          </Button>
        </OverlayTrigger>

        <Overlay
          show={this.state.deletingTooltip}
          target={this.target.current}
          placement="right"
          rootClose
          onHide={() => this.setState({ deletingTooltip: false })}
        >
          <Popover style={styles.popover} id="popover-positioned-scrolling-left">
            Delete configuration for
            &nbsp;
            {device.name}
            ?
            <div style={styles.popover2}>
              <Button
                bsSize="xsmall"
                bsStyle="danger"
                onClick={() => {
                  this.props.handleRemoveConfig();
                  this.toggleTooltip();
                }}
                style={styles.popoverBtn}
              >
                Yes
              </Button>
              <Button
                bsSize="xsmall"
                bsStyle="info"
                onClick={this.toggleTooltip}
                style={styles.popoverBtn}
              >
                No
              </Button>
            </div>
          </Popover>
        </Overlay>
      </>
    );
  }
}

NovncConfigContainer.propTypes = {
  device: PropTypes.object.isRequired,
  handleRemoveConfig: PropTypes.func.isRequired,
};
