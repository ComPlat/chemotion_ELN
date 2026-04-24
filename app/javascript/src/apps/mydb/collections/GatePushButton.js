import React from 'react';
import PropTypes from 'prop-types';
import {
  Button
} from 'react-bootstrap';
import ConfirmationOverlay from 'src/components/common/ConfirmationOverlay';

class GatePushButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      overlayTarget: null,
    };

    this.buttonRef = React.createRef();

    this.hideOverlay = this.hideOverlay.bind(this);
    this.transmit = this.transmit.bind(this);
  }

  hideOverlay() {
    this.setState({ overlayTarget: null });
  }

  async transmit(method = 'GET') {
    this.hideOverlay();

    const { collectionId } = this.props;
    const resp = await fetch(`/api/v1/gate/transmitting/${collectionId}`, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method,
    });
    const data = await resp.json();

    const response = {
      status: resp.status,
      ok: resp.ok,
      error: data && data.error,
      target: data && data.target,
    };

    const newState = {
      overlayTarget: method === 'GET' ? this.buttonRef.current : null,
      status: 'redirect',
      target: response.target
    };

    if (response.status === 404) {
      newState.message = 'The access token is not set. Retrieve one now on chemotion.net?';
    } else if (response.status === 401) {
      if (response.error && response.error.match(/expired/)) {
        newState.message = 'The access token has expired. Renew it now on chemotion.net?';
      } else {
        newState.message = `The access token is misconfigured ('${response.error}'). Renew it now on chemotion.net?`;
      }
    } else if (!response.ok) {
      newState.status = 'unavailable';
    } else {
      newState.status = 'confirm';
    }

    this.setState(newState);
  }

  confirmationOverlayProps() {
    const { status, message, target } = this.state;

    if (status === 'confirm') {
      return {
        warningText: 'Mirror Sample and Reaction data to your chemotion.net account?',
        destructiveAction: () => this.transmit('POST'),
        destructiveActionLabel: 'Yes',
        hideAction: this.hideOverlay,
        hideActionLabel: 'No',
      };
    }

    if (status === 'unavailable') {
      return {
        warningText: 'Sorry, it seems chemotion-repository.net can not be reached at the moment',
        hideAction: this.hideOverlay,
        hideActionLabel: 'OK',
      };
    }

    if (status === 'redirect') {
      return {
        warningText: message,
        destructiveAction: () => {
          this.hideOverlay();
          window.location.assign(
            `${target}pages/tokens?origin=${encodeURI(
              window.location.origin
            )}`
          );
        },
        destructiveActionLabel: 'Yes',
        hideAction: this.hideOverlay,
        hideActionLabel: 'No',
      };
    }

    return null;
  }

  render() {
    const { overlayTarget } = this.state;
    const overlayProps = this.confirmationOverlayProps();
    const {
      warningText,
      destructiveAction,
      destructiveActionLabel,
      hideAction,
      hideActionLabel,
    } = overlayProps || {};

    return (
      <>
        <Button
          variant="surface"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            this.transmit();
          }}
          ref={this.buttonRef}
          className="border-0"
        >
          <i className="fa fa-paper-plane" />
        </Button>
        {overlayProps && (
          <ConfirmationOverlay
            overlayTarget={overlayTarget}
            placement="bottom"
            warningText={warningText}
            destructiveAction={destructiveAction}
            destructiveActionLabel={destructiveActionLabel}
            hideAction={hideAction}
            hideActionLabel={hideActionLabel}
          />
        )}
      </>
    );
  }
}

GatePushButton.propTypes = {
  collectionId: PropTypes.number.isRequired,
};

export default GatePushButton;
