import React, {Component} from 'react';
import {Row, Col, FormGroup, FormControl, ControlLabel, ListGroupItem, ListGroup} from 'react-bootstrap'
import Select from 'react-select'
import {solventOptions, statusOptions} from './staticDropdownOptions/options'

const ReactionDetailsMainProperties = ({reaction, onInputChange}) => {

  return (
    <ListGroup>
      <ListGroupItem header="">
        <Row>
          <Col md={6}>
            <FormGroup>
              <ControlLabel>Name</ControlLabel>
              <FormControl
                type="text"
                value={reaction.name || ''}
                placeholder="Name..."
                disabled={reaction.isMethodDisabled('name')}
                onChange={event => onInputChange('name', event)}/>
            </FormGroup>
          </Col>
          <Col md={3}>
            <FormGroup>
              <ControlLabel>Status</ControlLabel>
              <Select
                name='status'
                multi={false}
                options={statusOptions}
                value={reaction.status}
                disabled={reaction.isMethodDisabled('status')}
                onChange={event => {
                  const wrappedEvent = {target: {value: event}};
                  onInputChange('status', wrappedEvent)
                }}
              />
            </FormGroup>
          </Col>
          <Col md={3}>
            <FormGroup>
              <ControlLabel>Temperature</ControlLabel>
              <FormControl
                type="text"
                value={reaction.temperature || ''}
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
                rows={10}
                value={reaction.description || ''}
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
