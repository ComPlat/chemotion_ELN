import React from 'react';
import PropTypes from 'prop-types';
import {
  Button
} from 'react-bootstrap';
import ConfirmationOverlay from 'src/components/common/ConfirmationOverlay';
import GateFetcher from 'src/fetchers/GateFetcher';

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
    GateFetcher.transmittingByCollectionId(method, collectionId, this.buttonRef.current)
      .then((json) => {
        this.setState(json);
      });
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
