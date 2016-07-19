import React, {Component} from 'react';
import {Row, Col, FormGroup, FormControl, ControlLabel, ListGroupItem, ListGroup} from 'react-bootstrap'
import Select from 'react-select'
import {solventOptions} from './staticDropdownOptions/options'

const ReactionDetailsMainProperties = ({reaction, onInputChange}) => {
  return (
    <ListGroup>
      <ListGroupItem header="">
        <Row>
          <Col md={5}>
            <FormGroup>
              <ControlLabel>Name</ControlLabel>
              <FormControl
                type="text"
                value={reaction.name}
                placeholder="Name..."
                disabled={reaction.isMethodDisabled('name')}
                onChange={event => onInputChange('name', event)}/>
            </FormGroup>
          </Col>
          <Col md={4}>
            <label>Solvent</label>
            <Select
              name='solvent'
              multi={false}
              options={solventOptions}
              value={reaction.solvent}
              disabled={reaction.isMethodDisabled('solvent')}
              onChange={event => {
                const wrappedEvent = {target: {value: event}};
                onInputChange('solvent', wrappedEvent)
              }}
            />
          </Col>
          <Col md={3}>
            <FormGroup>
              <ControlLabel>Temperature</ControlLabel>
              <FormControl
                type="text"
                value={reaction.temperature}
                disabled={reaction.isMethodDisabled('temperature')}
                placeholder="Temperature..."
                onChange={event => onInputChange('temperature', event)}/>
            </FormGroup>
          </Col>
        </Row>
        <Row>
          <Col md={12}>
            <FormGroup>
              <ControlLabel>Description</ControlLabel>
              <FormControl
                componentClass="textarea"
                value={reaction.description}
                disabled={reaction.isMethodDisabled('description')}
                placeholder="Description..."
                onChange={event => onInputChange('description', event)}/>
            </FormGroup>
          </Col>
        </Row>
      </ListGroupItem>
    </ListGroup>
  )
}

ReactionDetailsMainProperties.propTypes = {
  reaction: React.PropTypes.object,
  onInputChange: React.PropTypes.func
}

export default ReactionDetailsMainProperties
