import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Row, Col, Button, InputGroup, OverlayTrigger, Tooltip, Form } from 'react-bootstrap';
import 'moment-precise-range-plugin';
import { permitOn } from 'src/components/common/uis';
import { copyToClipboard } from 'src/utilities/clipboard';

function ReactionDetailsDuration({ reaction, onInputChange }) {
  const setCurrentTime = useCallback((type) => {
    const currentTime = new Date().toLocaleString('en-GB').split(', ').join(' ');
    const wrappedEvent = { target: { value: currentTime } };
    onInputChange(type, wrappedEvent);
    if (type === 'timestampStart' && (reaction.status === 'Planned' || !reaction.status)) {
      onInputChange('status', { target: { value: 'Running' } });
    } else if (type === 'timestampStop' && reaction.status === 'Running') {
      onInputChange('status', { target: { value: 'Done' } });
    }
  }, [reaction, onInputChange]);

  const changeDurationUnit = useCallback(() => {
    onInputChange('duration', { nextUnit: true });
  }, [onInputChange]);

  const copyToDuration = useCallback(() => {
    onInputChange('duration', { fromStartStop: true });
  }, [onInputChange]);

  const handleDurationChange = useCallback((event) => {
    const nextValue = event.target.value && event.target.value.replace(',', '.');
    if (!isNaN(nextValue) || nextValue === '') {
      onInputChange('duration', { nextValue });
    }
  }, [onInputChange]);

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
              onChange={event => onInputChange('timestampStart', event)}
            />
              <Button disabled={!permitOn(reaction) || reaction.gaseous} variant='light' onClick={() => setCurrentTime('timestampStart')}>
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
              onChange={event => onInputChange('timestampStop', event)}
            />
            <Button disabled={!permitOn(reaction) || reaction.gaseous} variant='light' onClick={() => setCurrentTime('timestampStop')}>
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
                variant="light"
                onClick={() => copyToClipboard(durationCalc || ' ')}
              >
                <i className="fa fa-clipboard" aria-hidden="true" />
              </Button>
            </OverlayTrigger>
            <OverlayTrigger
              placement="bottom"
              overlay={<Tooltip id="copy_durationCalc_to_duration">use this duration<br />(rounded to precision 1)</Tooltip>}
            >
              <Button disabled={!permitOn(reaction) || reaction.gaseous} variant='light' onClick={() => copyToDuration()}>
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
            placeholder="Input duration..."
            onChange={event => handleDurationChange(event)}
          />
            <OverlayTrigger placement="bottom" overlay={<Tooltip id="switch_duration_unit">switch duration unit</Tooltip>}>
              <Button disabled={!permitOn(reaction) || reaction.gaseous} variant="light" onClick={() => changeDurationUnit()}>
                {reaction.durationUnit}
              </Button>
            </OverlayTrigger>
        </InputGroup>
      </Col>
    </Row>
  );
}

ReactionDetailsDuration.propTypes = {
  reaction: PropTypes.object,
  onInputChange: PropTypes.func
};

ReactionDetailsDuration.defaultProps = {
  reaction: {},
  onInputChange: () => {}
};

export default ReactionDetailsDuration;
