import React from 'react';
import { ButtonToolbar, Button, ButtonGroup } from 'react-bootstrap';
import PropTypes from 'prop-types';

export default class FocusNovnc extends React.Component {
  constructor(props) {
    super(props);

    this.handleFocus = this.handleFocus.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
  }

  handleFocus() {
    this.props.handleFocus();
  }

  handleBlur() {
    this.props.handleBlur();
  }

  render() {
    const { connected } = this.props;
    const { isNotFocused } = this.props;
    const focusedColor = 'btn btn-sm btn-success m-4';
    const blurredColor = 'btn btn-sm btn-danger m-4';
    const normalColor = 'btn btn-sm m-2';
    const somePadding = { padding: '0 0 5px 5px' };

    return (
      <ButtonToolbar>
        <ButtonGroup style={somePadding}>
          <Button
            className={(!isNotFocused || !connected) ? normalColor : blurredColor}
            disabled={isNotFocused || !connected}
            onClick={this.handleBlur}
          > {(!isNotFocused || !connected) ? 'Blur' : 'Blurred'}
          </Button>
          <Button
            className={(isNotFocused || !connected) ? normalColor : focusedColor}
            disabled={!isNotFocused || !connected}
            onClick={this.handleFocus}
          > {isNotFocused ? 'Focus' : 'Focused'}
          </Button>
        </ButtonGroup>
      </ButtonToolbar>
    );
  }
}

FocusNovnc.propTypes = {
  isNotFocused: PropTypes.bool.isRequired,
  handleBlur: PropTypes.func.isRequired,
  handleFocus: PropTypes.func.isRequired,
  connected: PropTypes.bool.isRequired
};
