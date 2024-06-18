import React from 'react';
import ReactDOM from 'react-dom';
import { FormGroup, FormControl, Form, Button, Container, Row, Col } from 'react-bootstrap';
import Select from 'react-select';

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
      <Container fluid className=" min-vh-100 border d-flex flex-column" >
        <Row className="flex-grow-1 d-flex">
          <Col md={3} className="d-flex flex-column">
            <Form.Group controlId="channelSelect" className="flex-grow-1 d-flex flex-column m-3">
              <Form.Label className='fw-bold fs-3'>Channel</Form.Label>
              <Select
                value={selectedChannel}
                onChange={this.handleChannelChange}
                options={channels}
                placeholder="Select your channel"
                autoFocus
                className='mt-1'
              />
            </Form.Group>
          </Col>
          <Col md={9} className="d-flex flex-column">
            <Form>
              <FormGroup controlId="formControlsTextarea" className="flex-grow-1 d-flex flex-column m-3">
                <Form.Label className='fw-bold fs-3'>Message</Form.Label>
                <FormControl as="textarea" placeholder="message..." rows="20" ref={(ref) => { this.myMessage = ref; }} className='fs-4 mt-1' />
              </FormGroup>
              <Button
                variant="primary"
                onClick={() => this.messageSend()}
                className='mt-3 ms-3'
                size='lg'
                >
                Publish&nbsp;
                <i className="fa fa-paper-plane" />
              </Button>
            </Form>
          </Col>
        </Row>
      </Container>
    );
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('MsgPub');
  if (domElement) { ReactDOM.render(<MsgPub />, domElement); }
});
