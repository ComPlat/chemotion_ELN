import React from 'react';
import PropTypes from 'prop-types';
import RFB from '@novnc/novnc/lib/rfb';
import { Button, Label } from 'react-bootstrap';

// import omit from 'object.omit';

export default class DisplayNoVNC extends React.Component {
  constructor(props) {
    super();
    this.state = {
      connected: false,
      rfb: null
    };

    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
  }

  componentDidMount() {
    this.connect();
  }

  // componentWillReceiveProps(nextProps) {
  //   const { rfb } = this.state;
  //   // if (!rfb) { return; }
  // }

  shouldComponentUpdate(nextProps, nextState) {
    return this.state.connected !== nextState.connected
      || this.state.rfb !== nextState.rfb
      || this.props.device.id !== nextProps.device.id;
  }

  componentWillUnmount() {
    this.disconnect();
  }

  connected() {
    this.setState({ connected: true });
  }

  disconnected() {
    this.setState({ connected: false });
  }

  disconnect() {
    if (!this.state.rfb) {
      return;
    }

    this.state.rfb.disconnect();
    this.setState(prevState => ({ ...prevState, rfb: null }));
  }

  connect() {
    this.disconnect();
    const { id, novnc } = this.props.device;
    if (!this.canvas || !id || !novnc) { return; }

    const rfb = new RFB(
      this.canvas,
      novnc.target,
      {
        repeaterID: '',
        shared: true,
        credentials: { password: novnc.password },
      }
    );
    rfb.viewOnly = false;
    rfb.addEventListener('connect', () => this.connected());
    rfb.addEventListener('disconnect', () => this.disconnected());
    this.setState(prevState => ({ ...prevState, rfb }));
  }


  handleMouseEnter() {
    if (!this.state.rfb) { return; }
    this.state.rfb.focus();
  }

  handleMouseLeave() {
    if (!this.state.rfb) { return; }
    this.state.rfb.blur();
  }

  render() {
    const { connected } = this.state;
    const { id } = this.props.device;
    return id ? (
      <div>
        <Label bsStyle={connected ? 'success' : 'default'}>
          {connected ? 'Connected' : 'Disconnected'}
        </Label>
        {connected ? null : <Button onClick={this.connect} > Connect </Button>}
        <div
          ref={(ref) => { this.canvas = ref; }}
          onMouseEnter={this.handleMouseEnter}
          onMouseLeave={this.handleMouseLeave}
        />
      </div>
    ) : null;
  }
}

DisplayNoVNC.propTypes = {
  device: PropTypes.object,
};

DisplayNoVNC.defaultProps = {
  device: { id: null },
};
