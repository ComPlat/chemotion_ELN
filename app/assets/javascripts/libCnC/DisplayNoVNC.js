import React from 'react';
import PropTypes from 'prop-types';
// import RFB from '@novnc/novnc/lib/rfb';
import { Button, Label } from 'react-bootstrap';

// import omit from 'object.omit';

export default class DisplayNoVNC extends React.Component {
  constructor(props) {
    super();
    this.state = {
      connected: false,
      rfb: null
    };
    // this.connect = this.connect.bind(this);
    // this.disconnect = this.disconnect.bind(this);
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
  }

  componentDidMount() {
  }

  componentWillReceiveProps(nextProps) {
      this.connect(nextProps);
  }

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

  connect(props) {
    this.disconnect();
    const { id, novnc } = props.device;
    if (!this.canvas || !id || !novnc) { return; }

    /* 
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
    rfb.reconnect = true;
    rfb.addEventListener('connect', () => this.connected());
    rfb.addEventListener('disconnect', () => this.disconnected());
    this.setState(prevState => ({ ...prevState, rfb }));
   */
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
    return (
      <div>
        <div
          ref={(ref) => { this.canvas = ref; }}
          onMouseEnter={this.handleMouseEnter}
          onMouseLeave={this.handleMouseLeave}
        />
      </div>
    )
  }
}

DisplayNoVNC.propTypes = {
  device: PropTypes.object,
};

DisplayNoVNC.defaultProps = {
  device: { id: null },
};
