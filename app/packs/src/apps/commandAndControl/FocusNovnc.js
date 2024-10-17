import React from 'react';
import { Badge, ButtonToolbar, Button, ButtonGroup } from 'react-bootstrap';
import PropTypes from 'prop-types';

const FocusNovnc = ({
  watching,
  using,
  isNotFocused,
  isForcedScreenResizing,
  connected,
  forceCursor,
  handleBlur,
  handleFocus,
  handleCursor,
  handleForceScreenResizing,
}) => (
  <ButtonToolbar className="gap-1">
    <ButtonGroup>
      <Button
        size="xxsm"
        variant={(!isNotFocused || !connected) ? 'primary' : 'danger'}
        disabled={isNotFocused || !connected}
        onClick={handleBlur}
      >
        {(!isNotFocused || !connected) ? 'Blur' : 'Blurred'}
      </Button>
      <Button
        size="xxsm"
        variant={(isNotFocused || !connected) ? 'primary' : 'success'}
        disabled={!isNotFocused || !connected}
        onClick={handleFocus}
      >
        {isNotFocused ? 'Focus' : 'Focused'}
      </Button>
    </ButtonGroup>

    <Button
      size="xxsm"
      variant={(!forceCursor) ? 'primary' : 'success'}
      onClick={handleCursor}
      title="force mouse cursor"
    >
      <i className="fa fa-desktop" aria-hidden="true" />
      <i className="fa fa-mouse-pointer text-danger" aria-hidden="true" />
    </Button>


    <Button
      size="xxsm"
      variant={(!isForcedScreenResizing || !connected) ? 'primary' : 'success'}
      disabled={!connected}
      onClick={handleForceScreenResizing}
      title="Fit width screen"
    >
      <i className="fa fa-desktop" aria-hidden="true" />
      <i className="fa fa-arrows-alt ms-1" aria-hidden="true" />
    </Button>

    {connected && (
      <>
        <Badge>
          <i className="fa fa-eye" /> {watching}
        </Badge>

        <Badge>
          <i className="fa fa-pencil-square-o" /> {using}
        </Badge>
      </>
    )}
  </ButtonToolbar>
);

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

export default FocusNovnc;
