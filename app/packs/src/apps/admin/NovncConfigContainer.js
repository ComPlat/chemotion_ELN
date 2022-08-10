import React, { Component } from 'react';
import { Button, ButtonGroup, Tooltip } from 'react-bootstrap';
import PropTypes from 'prop-types';

export default class NovncConfigContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      deletingTooltip: false,
    };

    this.toggleTooltip = this.toggleTooltip.bind(this);
  }

  toggleTooltip() {
    this.setState(prevState => ({ ...prevState, deletingTooltip: !prevState.deletingTooltip }));
  }

  render() {
    const { device } = this.props;
    const style = { marginLeft: '20px', marginTop: '-15px' };
    return (
      <Button
        bsSize="xsmall"
        bsStyle="danger"
        onClick={this.toggleTooltip}
      > {this.state.deletingTooltip ? (
        <Tooltip placement="right" className="in" id="tooltip-bottom" style={style}>
                  Delete configuration for {device.name}?<br />
          <ButtonGroup>
            <Button
              bsStyle="danger"
              bsSize="xsmall"
              onClick={this.props.handleRemoveConfig}
            >Yes
            </Button>
            <Button
              bsStyle="warning"
              bsSize="xsmall"
              onClick={() => this.setState({ deletingTooltip: true })}
            >No
            </Button>
          </ButtonGroup>
        </Tooltip>
              ) : null}
        <i className="fa fa-eraser" aria-hidden="true" />
      </Button>
    );
  }
}

NovncConfigContainer.propTypes = {
  device: PropTypes.objectOf.isRequired,
  handleRemoveConfig: PropTypes.func.isRequired
};
