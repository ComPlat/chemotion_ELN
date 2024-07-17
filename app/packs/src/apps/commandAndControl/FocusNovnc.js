import React from 'react';
import { ButtonToolbar, Button, ButtonGroup } from 'react-bootstrap';
import PropTypes from 'prop-types';

export default class FocusNovnc extends React.Component {
  constructor(props) {
    super(props);

    this.handleFocus = this.handleFocus.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleCursor = this.handleCursor.bind(this);
    this.handleForceScreenResizing = this.handleForceScreenResizing.bind(this);
  }

  handleFocus() {
    this.props.handleFocus();
  }

  handleBlur() {
    this.props.handleBlur();
  }

  handleCursor() {
    this.props.handleCursor();
  }

  handleForceScreenResizing() {
    this.props.handleForceScreenResizing();
  }

  render() {
    const { connected, isNotFocused, forceCursor, isForcedScreenResizing, using, watching } = this.props;
    const BlurBtn = () => (
      <Button
        size="xs"
        variant={(!isNotFocused || !connected) ? 'primary' : 'danger'}
        disabled={isNotFocused || !connected}
        onClick={this.handleBlur}
      > {(!isNotFocused || !connected) ? 'Blur' : 'Blurred'}
      </Button>
    );
    const FocusBtn = () => (
      <Button
        size="xs"
        variant={(isNotFocused || !connected) ? 'primary' : 'success'}
        disabled={!isNotFocused || !connected}
        onClick={this.handleFocus}
      > {isNotFocused ? 'Focus' : 'Focused'}
      </Button>
    );
    const ScreenResizingBtn = () => (
      <Button
        size="xs"
        className="ms-2"
        variant={(!isForcedScreenResizing || !connected) ? 'primary' : 'success'}
        disabled={!connected}
        onClick={this.handleForceScreenResizing}
        title="Fit width screen"
      >
        <i className="fa fa-desktop" aria-hidden="true"/>
        <i className="fa fa-arrows-alt ms-1" aria-hidden="true" />
      </Button>
    );
    const UsersConnected = () => (
      <span className="title">
        <i className="fa fa-eye">
          {watching}
        </i>
        &nbsp;
        <i className="fa fa-pencil-square-o">
          {using}
        </i>
      </span>);

    return (
      <ButtonToolbar>
        <ButtonGroup>
          <BlurBtn />
          <FocusBtn />
        </ButtonGroup>

        <Button
          size="xs"
          variant={(!forceCursor) ? 'primary' : 'success'}
          className="ms-2"
          onClick={this.handleCursor}
          title="force mouse cursor"
        >
          <i className="fa fa-desktop" aria-hidden="true" />
          <i className="fa fa-mouse-pointer text-danger" aria-hidden="true" />
        </Button>

        {connected ? <UsersConnected /> : null}
        <ScreenResizingBtn />
      </ButtonToolbar>

    );
  }
}

FocusNovnc.propTypes = {
  watching: PropTypes.number.isRequired,
  using: PropTypes.number.isRequired,
  isNotFocused: PropTypes.bool.isRequired,
  isForcedScreenResizing: PropTypes.bool.isRequired,
  connected: PropTypes.bool.isRequired,
  forceCursor: PropTypes.bool.isRequired,
  handleBlur: PropTypes.func.isRequired,
  handleFocus: PropTypes.func.isRequired,
  handleCursor: PropTypes.func.isRequired,
  handleForceScreenResizing: PropTypes.func.isRequired,
};
