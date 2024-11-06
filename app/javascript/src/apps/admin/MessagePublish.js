import React from 'react';
import ReactDOM from 'react-dom';
import {
  Form, Button, Row, Col
} from 'react-bootstrap';
import { Select } from 'src/components/common/Select';

import MessagesFetcher from 'src/fetchers/MessagesFetcher';

export default class MessagePublish extends React.Component {
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
    this.setState({ selectedChannel });
  }

  toggleChannelList() {
    MessagesFetcher.fetchChannels(9)
      .then((result) => {
        const channels = result.channels.map((c) => ({ value: c.id, name: c.subject, label: c.subject }));
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
      <Row className="flex-grow-1 d-flex">
        <Col md={3} className="d-flex flex-column">
          <Form.Group controlId="channelSelect" className="flex-grow-1 d-flex flex-column m-3">
            <Form.Label className="fs-5">Channel</Form.Label>
            <Select
              value={selectedChannel}
              onChange={this.handleChannelChange}
              options={channels}
              placeholder="Select your channel"
              autoFocus
              className="mt-1"
            />
          </Form.Group>
        </Col>
        <Col md={9} className="d-flex flex-column">
          <Form>
            <Form.Group controlId="formControlsTextarea" className="flex-grow-1 d-flex flex-column m-3">
              <Form.Label className="fs-5">Message</Form.Label>
              <Form.Control
                as="textarea"
                placeholder="message..."
                rows="20"
                ref={(ref) => { this.myMessage = ref; }}
                className="fs-5 mt-1"
              />
            </Form.Group>
            <Button
              variant="primary"
              onClick={() => this.messageSend()}
              className="mt-3 ms-3"
              size="lg"
            >
              Publish
              <i className="fa fa-paper-plane ms-1" />
            </Button>
          </Form>
        </Col>
      </Row>
    );
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('MsgPub');
  if (domElement) { ReactDOM.render(<MsgPub />, domElement); }
});
