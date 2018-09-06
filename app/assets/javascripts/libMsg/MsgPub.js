import React from 'react';
import ReactDOM from 'react-dom';
import { FormGroup, ControlLabel, FormControl, Button, Panel } from 'react-bootstrap';
import Select from 'react-select';

import MessagesFetcher from '../components/fetchers/MessagesFetcher';

class MsgPub extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      channels: [],
      selectedChannel: null,
    };
    this.toggleChannelList = this.toggleChannelList.bind(this);
    this.handleChannelChange = this.handleChannelChange.bind(this);
    this.messageSend = this.messageSend.bind(this);
  }

  componentDidMount() {
    this.toggleChannelList();
  }

  handleChannelChange(selectedChannel) {
    if (selectedChannel) {
      this.setState({ selectedChannel });
    }
  }

  toggleChannelList() {
    MessagesFetcher.fetchChannels(9)
      .then((result) => {
        const channels = result.channels.map(c =>
          ({ value: c.id, name: c.subject, label: c.subject }));
        channels.sort((a, b) => (a.value - b.value));
        this.setState({ channels });
      });
  }

  messageSend() {
    const { selectedChannel } = this.state;

    if (!selectedChannel) {
      alert('Please select channel!');
    } else {
      const params = {
        channel_id: selectedChannel.value,
        content: this.myMessage.value,
      };

      MessagesFetcher.createMessage(params)
        .then((result) => {
          this.myMessage.value = '';
          alert('Message sent!');
        });
    }
  }

  render() {
    const { selectedChannel, channels } = this.state;

    return (
      <div>
        <Panel style={{ height: 'calc(100vh - 20px)' }}>
          <div className="col-md-3">
            <ControlLabel>Channel</ControlLabel>
            <Select
              value={selectedChannel}
              onChange={this.handleChannelChange}
              options={channels}
              placeholder="Select your channel"
              autoFocus
            />
          </div>
          <div className="col-md-9">
            <form>
              <FormGroup controlId="formControlsTextarea">
                <ControlLabel>Message</ControlLabel>
                <FormControl componentClass="textarea" placeholder="message..." rows="20" inputRef={(ref) => { this.myMessage = ref; }} />
              </FormGroup>
              <Button
                bsStyle="primary"
                onClick={() => this.messageSend()}
              >
                Publish&nbsp;
                <i className="fa fa-paper-plane" />
              </Button>
            </form>
          </div>
        </Panel>
      </div>
    );
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('MsgPub');
  if (domElement) { ReactDOM.render(<MsgPub />, domElement); }
});
