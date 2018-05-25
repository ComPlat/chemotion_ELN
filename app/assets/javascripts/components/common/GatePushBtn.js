import React from 'react';
import { ButtonGroup, Button, Tooltip, OverlayTrigger } from 'react-bootstrap';

class GatePushBtn extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  transmitting(e, collection_id, method = 'GET') {
    if (this.ovltg) { this.ovltg.hide(); }
    this.setState(() => ({}))
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
      const newState = { status: 'redirect', target: response.target };
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
      this.setState(() => (newState));
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
              bsStyle="danger"
              bsSize="xsmall"
              onClick={e => this.transmitting(e, this.props.collection_id, 'POST')}
            >Yes
            </Button>
            <Button
              bsStyle="warning"
              bsSize="xsmall"
              onClick={() => this.ovltg.hide()}
            >No
            </Button>
          </ButtonGroup>
        </div>
      );
    } else if (status === 'unavailable') {
      content = (
        <div>
          Sorry, it seems chemotion.net can not be reached at the moment
          <ButtonGroup>
            <Button
              bsStyle="warning"
              bsSize="xsmall"
              onClick={() => this.ovltg.hide()}
            >OK
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
              bsStyle="danger"
              bsSize="xsmall"
              onClick={(e) => {
                this.ovltg.hide();
                window.location.assign(`${target}pages/tokens?origin=${encodeURI(window.location.origin)}`);
                // window.open(`${target}pages/tokens?origin=${encodeURI(window.location.origin)}` , '_blank');
              }}
            >Yes
            </Button>
            <Button
              bsStyle="warning"
              bsSize="xsmall"
              onClick={() => this.ovltg.hide()}
            >No
            </Button>
          </ButtonGroup>
        </div>
      );
    } else if (this.ovlg) { this.ovltg.hide(); }
    return <Tooltip id="chemotion-net-gate">{content}</Tooltip>;
  }

  render() {
    return (
      <ButtonGroup>
        <OverlayTrigger trigger="click" overlay={this.tooltipContent()} placement="bottom" ref={(ov) => { this.ovltg = ov }}>
          <Button
            bsStyle="success"
            bsSize="xsmall"
            onClick={e => this.transmitting(e, this.props.collection_id)}
          ><i className="fa fa-cloud" />
          </Button>
        </OverlayTrigger>
      </ButtonGroup>
    );
  }
}

export default GatePushBtn;
