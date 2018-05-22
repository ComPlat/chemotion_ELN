import React from 'react';
import { ButtonGroup, Button, Tooltip } from 'react-bootstrap';

class GatePushBtn extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  toggleTooltip(e, params = {}) {
    e.stopPropagation();
    this.setState(prevState => ({ tooltip: !prevState.tooltip, ...params }));
  }

  transmitting(e, collection_id, method = 'GET') {
    e.stopPropagation();
    return fetch(`/api/v1/gate/transmitting/${collection_id}`, {
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      method
    }).then(resp => resp.json().then(data => ({
      status: resp.status, ok: resp.ok, error: data && data.error, target: data && data.target
    }))).then((response) => {
      const newState = { tooltip: true, redirect: true, target: response.target };
      if (response.status === 404) {
        newState.message = 'The access token is not set. Retrieve one now on chemotion.net?';
      } else if (response.status === 401) {
        if (response.error && response.error.match(/expired/)) {
          newState.message = 'The access token has expired. Renew it now on chemotion.net?';
        } else {
          newState.message = `The access token is misconfigured ('${response.error}'). Renew it now on chemotion.net?`;
        }
      } else if (!response.ok) {
        newState.redirect = false;
        newState.unavailable = true;
      } else {
        newState.redirect = false;
        newState.tooltip = method === 'GET';
        newState.confirm = true;
      }
      this.setState(() => (newState));
    }).catch((errorMessage) => {
      // console.log(errorMessage);
    });
  }

  tooltipContent() {
    const { confirm, unavailable, redirect, message, target } = this.state;
    if (confirm) {
      return (
        <div>
          Mirror Sample and Reaction data to your chemotion.net account ?
          <ButtonGroup>
            <Button
              bsStyle="danger"
              bsSize="xsmall"
              onClick={e => this.transmitting(e, this.props.collection_id, 'POST')}
            >Yes
            </Button>
            <Button
              bsStyle="warning"
              bsSize="xsmall"
              onClick={e => this.toggleTooltip(e)}
            >No
            </Button>
          </ButtonGroup>
        </div>
      );
    } else if (unavailable) {
      return (
        <div>
          Sorry, it seems chemotion.net can not be reached at the moment
          <ButtonGroup>
            <Button
              bsStyle="warning"
              bsSize="xsmall"
              onClick={e => this.toggleTooltip(e)}
            >OK
            </Button>
          </ButtonGroup>
        </div>
      );
    } else if (redirect) {
      return (
        <div>
          {message} &nbsp;
          <ButtonGroup>
            <Button
              bsStyle="danger"
              bsSize="xsmall"
              onClick={(e) => {
                this.toggleTooltip(e);
                // window.open(`${target}/pages/tokens`);
                window.location.replace(`${target}pages/tokens?origin=${encodeURI(window.location.origin)}`);
              }}
            >Yes
            </Button>
            <Button
              bsStyle="warning"
              bsSize="xsmall"
              onClick={e => this.toggleTooltip(e)}
            >No
            </Button>
          </ButtonGroup>
        </div>
      );
    }
    return null;
  }

  render() {
    const { tooltip } = this.state;
    return (
      <ButtonGroup>
        <Button
          bsStyle="success"
          bsSize="xsmall"
          onClick={e => this.transmitting(e, this.props.collection_id)}
        >
          <i className="fa fa-cloud">
            {tooltip ? (
              <Tooltip placement="bottom" className="cloud-tooltip" id="tooltip-bottom">
                { this.tooltipContent() }
              </Tooltip>
            ) : null}
          </i>
        </Button>
      </ButtonGroup>
    );
  }
}

export default GatePushBtn;
