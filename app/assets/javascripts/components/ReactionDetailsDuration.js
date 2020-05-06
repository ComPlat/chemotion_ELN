import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Row, Col, FormGroup, ControlLabel, FormControl, Button,
  InputGroup, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import 'moment-precise-range-plugin';
import Clipboard from 'clipboard';

export default class ReactionDetailsDuration extends Component {
  constructor(props) {
    super(props);
    props.reaction.convertDurationDisplay();
    this.setCurrentTime = this.setCurrentTime.bind(this);
    this.copyToDuration = this.copyToDuration.bind(this);
    this.handleDurationChange = this.handleDurationChange.bind(this);
  }

  componentDidMount() {
    this.clipboard = new Clipboard('.clipboardBtn');
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.reaction) { return; }
    nextProps.reaction.convertDurationDisplay();
  }

  componentWillUnmount() {
    this.clipboard.destroy();
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
      <Row className="small-padding">
        <Col md={3} sm={6}>
          <FormGroup>
            <ControlLabel>Start</ControlLabel>
            <InputGroup>
              <FormControl
                type="text"
                value={reaction.timestamp_start || ''}
                disabled={reaction.isMethodDisabled('timestamp_start')}
                placeholder={timePlaceholder}
                onChange={event => this.props.onInputChange('timestampStart', event)}
              />
              <InputGroup.Button>
                <Button active style={{ padding: '6px' }} onClick={() => this.setCurrentTime('timestampStart')}>
                  <i className="fa fa-clock-o" aria-hidden="true" />
                </Button>
              </InputGroup.Button>
            </InputGroup>
          </FormGroup>
        </Col>
        <Col md={3} sm={6}>
          <FormGroup>
            <ControlLabel>Stop</ControlLabel>
            <InputGroup>
              <FormControl
                type="text"
                value={reaction.timestamp_stop || ''}
                disabled={reaction.isMethodDisabled('timestamp_stop')}
                placeholder={timePlaceholder}
                onChange={event => this.props.onInputChange('timestampStop', event)}
              />
              <InputGroup.Button>
                <Button active style={{ padding: '6px' }} onClick={() => this.setCurrentTime('timestampStop')}>
                  <i className="fa fa-clock-o" aria-hidden="true" />
                </Button>
              </InputGroup.Button>
            </InputGroup>
          </FormGroup>
        </Col>
        <Col md={3} sm={6}>
          <FormGroup>
            <ControlLabel>Duration</ControlLabel>
            <InputGroup>
              <FormControl type="text" value={durationCalc || ''} disabled placeholder="Duration" />
              <InputGroup.Button>
                <OverlayTrigger
                  placement="bottom"
                  overlay={<Tooltip id="copy_duration_to_clipboard">copy to clipboard</Tooltip>}
                >
                  <Button active className="clipboardBtn" data-clipboard-text={durationCalc || ' '}>
                    <i className="fa fa-clipboard" aria-hidden="true" />
                  </Button>
                </OverlayTrigger>
                <OverlayTrigger
                  placement="bottom"
                  overlay={<Tooltip id="copy_durationCalc_to_duration">use this duration<br />(rounded to precision 1)</Tooltip>}
                >
                  <Button active className="clipboardBtn" onClick={() => this.copyToDuration()}>
                    <i className="fa fa-arrow-right" aria-hidden="true" />
                  </Button>
                </OverlayTrigger>
              </InputGroup.Button>
            </InputGroup>
          </FormGroup>
        </Col>
        <Col md={3} sm={6}>
          <FormGroup>
            <ControlLabel>&nbsp;</ControlLabel>
            <InputGroup>
              <FormControl
                type="text"
                value={reaction.durationDisplay.dispValue || ''}
                inputRef={this.refDuration}
                placeholder="Input Duration..."
                onChange={event => this.handleDurationChange(event)}
              />
              <InputGroup.Button>
                <OverlayTrigger placement="bottom" overlay={<Tooltip id="switch_duration_unit">switch duration unit</Tooltip>}>
                  <Button bsStyle="success" onClick={() => this.changeDurationUnit()}>
                    {reaction.durationUnit}
                  </Button>
                </OverlayTrigger>
              </InputGroup.Button>
            </InputGroup>
          </FormGroup>
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
