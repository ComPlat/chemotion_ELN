import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Row, Col, Button, InputGroup, OverlayTrigger, Tooltip, Form } from 'react-bootstrap';
import 'moment-precise-range-plugin';
import { permitOn } from 'src/components/common/uis';
import { copyToClipboard } from 'src/utilities/clipboard';

export default class ReactionDetailsDuration extends Component {
  constructor(props) {
    super(props);
    this.setCurrentTime = this.setCurrentTime.bind(this);
    this.copyToDuration = this.copyToDuration.bind(this);
    this.handleDurationChange = this.handleDurationChange.bind(this);
  }

  setCurrentTime(type) {
    const currentTime = new Date().toLocaleString('en-GB').split(', ').join(' ');
    const { reaction } = this.props;
    const wrappedEvent = { target: { value: currentTime } };
    this.props.onInputChange(type, wrappedEvent);
    if (type === 'timestampStart' && (reaction.status === 'Planned' || !reaction.status)) {
      this.props.onInputChange('status', { target: { value: 'Running' } });
    } else if (type === 'timestampStop' && reaction.status === 'Running') {
      this.props.onInputChange('status', { target: { value: 'Done' } });
    }
  }

  changeDurationUnit() {
    this.props.onInputChange('duration', { nextUnit: true });
  }

  copyToDuration() {
    this.props.onInputChange('duration', { fromStartStop: true });
  }

  handleDurationChange(event) {
    const nextValue = event.target.value && event.target.value.replace(',', '.');
    if (!isNaN(nextValue) || nextValue === '') {
      this.props.onInputChange('duration', { nextValue });
    }
  }

  render() {
    const { reaction } = this.props;
    const durationCalc = reaction && reaction.durationCalc();
    const timePlaceholder = 'DD/MM/YYYY hh:mm:ss';
    return (
      <Row className='mb-3'>
        <Col md={3} sm={6}>
          <Form.Group>
            <Form.Label>Start</Form.Label>
            <InputGroup>
              <Form.Control
                type="text"
                value={reaction.timestamp_start || ''}
                disabled={!permitOn(reaction) || reaction.isMethodDisabled('timestamp_start') || reaction.gaseous}
                placeholder={timePlaceholder}
                onChange={event => this.props.onInputChange('timestampStart', event)}
              />
                <Button disabled={!permitOn(reaction) || reaction.gaseous} variant='secondary' active onClick={() => this.setCurrentTime('timestampStart')}>
                  <i className="fa fa-clock-o" aria-hidden="true" />
                </Button>
            </InputGroup>
          </Form.Group>
        </Col>
        <Col md={3} sm={6}>
          <Form.Group>
            <Form.Label>Stop</Form.Label>
            <InputGroup>
              <Form.Control
                type="text"
                value={reaction.timestamp_stop || ''}
                disabled={!permitOn(reaction) || reaction.isMethodDisabled('timestamp_stop') || reaction.gaseous}
                placeholder={timePlaceholder}
                onChange={event => this.props.onInputChange('timestampStop', event)}
              />
              <Button disabled={!permitOn(reaction) || reaction.gaseous} variant='secondary' active onClick={() => this.setCurrentTime('timestampStop')}>
                <i className="fa fa-clock-o" aria-hidden="true" />
              </Button>
            </InputGroup>
          </Form.Group>
        </Col>
        <Col md={3} sm={6}>
          <Form.Group>
            <Form.Label>Duration</Form.Label>
            <InputGroup>
              <Form.Control type="text" value={durationCalc || ''} disabled placeholder="Duration" />
              <OverlayTrigger
                placement="bottom"
                overlay={<Tooltip id="copy_duration_to_clipboard">copy to clipboard</Tooltip>}
              >
                <Button
                  disabled={!permitOn(reaction) || reaction.gaseous}
                  active
                  variant="secondary"
                  onClick={() => copyToClipboard(durationCalc || ' ')}
                >
                  <i className="fa fa-clipboard" aria-hidden="true" />
                </Button>
              </OverlayTrigger>
              <OverlayTrigger
                placement="bottom"
                overlay={<Tooltip id="copy_durationCalc_to_duration">use this duration<br />(rounded to precision 1)</Tooltip>}
              >
                <Button disabled={!permitOn(reaction) || reaction.gaseous} active variant='secondary' onClick={() => this.copyToDuration()}>
                  <i className="fa fa-arrow-right" aria-hidden="true" />
                </Button>
              </OverlayTrigger>
            </InputGroup>
          </Form.Group>
        </Col>
        <Col md={3} sm={6} className="d-flex flex-column justify-content-end">
          <InputGroup>
            <Form.Control
              disabled={!permitOn(reaction) || reaction.gaseous}
              type="text"
              value={reaction.durationDisplay.dispValue || ''}
              ref={this.refDuration}
              placeholder="Input duration..."
              onChange={event => this.handleDurationChange(event)}
            />
              <OverlayTrigger placement="bottom" overlay={<Tooltip id="switch_duration_unit">switch duration unit</Tooltip>}>
                <Button disabled={!permitOn(reaction) || reaction.gaseous} variant="success" onClick={() => this.changeDurationUnit()}>
                  {reaction.durationUnit}
                </Button>
              </OverlayTrigger>
          </InputGroup>
        </Col>
      </Row>
    );
  }
}

ReactionDetailsDuration.propTypes = {
  reaction: PropTypes.object,
  onInputChange: PropTypes.func
};

ReactionDetailsDuration.defaultProps = {
  reaction: {},
  onInputChange: () => {}
};
