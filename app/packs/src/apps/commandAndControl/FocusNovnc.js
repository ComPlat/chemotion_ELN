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
    const { connected, isNotFocused, forceCursor, isForcedScreenResizing } = this.props;
    const focusedColor = 'btn btn-xs btn-success m-4';
    const blurredColor = 'btn btn-xs btn-danger m-4';
    const normalColor = 'btn btn-xs m-2';
    const somePadding = { padding: '0 0 5px 5px' };
    const BlurBtn = () => (
      <Button
        className={(!isNotFocused || !connected) ? normalColor : blurredColor}
        disabled={isNotFocused || !connected}
        onClick={this.handleBlur}
      > {(!isNotFocused || !connected) ? 'Blur' : 'Blurred'}
      </Button>
    );
    const FocusBtn = () => (
      <Button
        className={(isNotFocused || !connected) ? normalColor : focusedColor}
        disabled={!isNotFocused || !connected}
        onClick={this.handleFocus}
      > {isNotFocused ? 'Focus' : 'Focused'}
      </Button>
    );
    const ScreenResizingBtn = () => (
      <Button
        className={(!isForcedScreenResizing || !connected) ? normalColor : focusedColor}
        disabled={!connected}
        onClick={this.handleForceScreenResizing}
        title="force screen resizing"
      >
        {isForcedScreenResizing ? 'Unfit Screen Width' : 'Fit Screen Width'}
      </Button>
    );
    const UsersConnected = () => (
      <span className="title">
        <i className="fa fa-eye">
          {this.props.watching}
        </i>
        &nbsp;
        <i className="fa fa-pencil-square-o">
          {this.props.using}
        </i>
      </span>);

    return (
      <ButtonToolbar>
        <ButtonGroup style={somePadding}>
          <BlurBtn />
          <FocusBtn />
        </ButtonGroup>

        <Button
          className={(!forceCursor) ? normalColor : focusedColor}
          onClick={this.handleCursor}
          title="force mouse cursor"
        >
          <span className="fa-stack ">
            <i className="fa fa-desktop" aria-hidden="true" />
            <i className="fa fa-mouse-pointer text-danger" aria-hidden="true" />
          </span>
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
