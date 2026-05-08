import React from 'react';
import PropTypes from 'prop-types';
import {
  Form, Button, Row, Col
} from 'react-bootstrap';
import { FormattedMessage, injectIntl } from 'react-intl';
import { Select } from 'src/components/common/Select';

import MessagesFetcher from 'src/fetchers/MessagesFetcher';

class MessagePublish extends React.Component {
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
    const { intl } = this.props;

    if (!selectedChannel) {
      alert(intl.formatMessage({ id: 'message_publish-please_select_channel' }));
    } else {
      const params = {
        channel_id: selectedChannel.value,
        content: this.myMessage.value,
      };

      MessagesFetcher.createMessage(params)
        .then(() => {
          this.myMessage.value = '';
          alert(intl.formatMessage({ id: 'message_publish-message_sent' }));
        });
    }
  }

  render() {
    const { selectedChannel, channels } = this.state;
    const { intl } = this.props;

    return (
      <Row className="flex-grow-1 d-flex">
        <Col md={3} className="d-flex flex-column">
          <Form.Group controlId="channelSelect" className="flex-grow-1 d-flex flex-column m-3">
            <Form.Label className="fs-5"><FormattedMessage id="message_publish-channel" /></Form.Label>
            <Select
              value={selectedChannel}
              onChange={this.handleChannelChange}
              options={channels}
              placeholder={intl.formatMessage({ id: 'message_publish-select_channel' })}
              autoFocus
              className="mt-1"
            />
          </Form.Group>
        </Col>
        <Col md={9} className="d-flex flex-column">
          <Form>
            <Form.Group controlId="formControlsTextarea" className="flex-grow-1 d-flex flex-column m-3">
              <Form.Label className="fs-5"><FormattedMessage id="message_publish-message" /></Form.Label>
              <Form.Control
                as="textarea"
                placeholder={intl.formatMessage({ id: 'message_publish-message_placeholder' })}
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
              <FormattedMessage id="message_publish-publish" />
              <i className="fa fa-paper-plane ms-1" />
            </Button>
          </Form>
        </Col>
      </Row>
    );
  }
}

MessagePublish.propTypes = {
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
};

export default injectIntl(MessagePublish);
