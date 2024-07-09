import React from 'react';
import PropTypes from 'prop-types';
import { ButtonGroup, Button, Tooltip, Overlay } from 'react-bootstrap';

class GatePushButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showOverlay: false,
    };

    this.buttonRef = React.createRef();

    this.hideOverlay = this.hideOverlay.bind(this);
    this.transmitting = this.transmitting.bind(this);
  }

  hideOverlay() {
    this.setState({ showOverlay: false });
  }

  transmitting(method = 'GET') {
    this.hideOverlay();

    const { collectionId } = this.props;
    return fetch(`/api/v1/gate/transmitting/${collectionId}`, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method,
    })
      .then(resp =>
        resp.json().then(data => ({
          status: resp.status,
          ok: resp.ok,
          error: data && data.error,
          target: data && data.target,
        }))
      )
      .then(response => {
        const newState = {
          showOverlay: true,
          status: 'redirect',
          target: response.target
        };
        if (response.status === 404) {
          newState.message =
            'The access token is not set. Retrieve one now on chemotion.net?';
        } else if (response.status === 401) {
          if (response.error && response.error.match(/expired/)) {
            newState.message =
              'The access token has expired. Renew it now on chemotion.net?';
          } else {
            newState.message = `The access token is misconfigured ('${response.error}'). Renew it now on chemotion.net?`;
          }
        } else if (!response.ok) {
          newState.status = 'unavailable';
        } else {
          newState.status = 'confirm';
        }
        this.setState(newState);
      });
  }

  tooltipContent() {
    const { status, message, target } = this.state;
    let content;
    if (status === 'confirm') {
      content = (
        <div>
          Mirror Sample and Reaction data to your chemotion.net account ?
          <ButtonGroup>
            <Button
              variant="danger"
              size="sm"
              onClick={() => this.transmitting('POST')}
            >
              Yes
            </Button>
            <Button
              variant="warning"
              size="sm"
              onClick={this.hideOverlay}
            >
              No
            </Button>
          </ButtonGroup>
        </div>
      );
    } else if (status === 'unavailable') {
      content = (
        <div>
          Sorry, it seems chemotion-repository.net can not be reached at the
          moment
          <ButtonGroup>
            <Button
              variant="warning"
              size="sm"
              onClick={this.hideOverlay}
            >
              OK
            </Button>
          </ButtonGroup>
        </div>
      );
    } else if (status === 'redirect') {
      content = (
        <div>
          {message} &nbsp;
          <ButtonGroup>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                this.hideOverlay();
                window.location.assign(
                  `${target}pages/tokens?origin=${encodeURI(
                    window.location.origin
                  )}`
                );
                // window.open(`${target}pages/tokens?origin=${encodeURI(window.location.origin)}` , '_blank');
              }}
            >
              Yes
            </Button>
            <Button
              variant="warning"
              size="sm"
              onClick={this.hideOverlay}
            >
              No
            </Button>
          </ButtonGroup>
        </div>
      );
    }
    return <Tooltip id="chemotion-net-gate">{content}</Tooltip>;
  }

  render() {
    const { showOverlay } = this.state;
    return (
      <>
        <Button
          variant="success"
          size="sm"
          onClick={() => this.transmitting()}
          ref={this.buttonRef}
        >
          <i className="fa fa-cloud" />
        </Button>

        <Overlay
          show={showOverlay}
          placement="bottom"
          target={this.buttonRef}
        >
          {this.tooltipContent()}
        </Overlay>
      </>
    );
  }
}

GatePushButton.propTypes = {
  collectionId: PropTypes.number.isRequired,
};

export default GatePushButton;
