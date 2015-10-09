import React, {Component} from 'react';
import {Row, Col, Input, ListGroupItem, ListGroup} from 'react-bootstrap'
import Select from 'react-select'

export default class ReactionDetailsProperties extends Component {
  handleInputChange(type, event) {
    const {changeProperties} = this.props;
    const {value} = event.target;
    let properties = {};
    switch (type) {
      case 'name':
        properties.name = value;
        break;
      case 'observation':
        properties.observation = value;
        break;
      case 'status':
        properties.status = value;
        break;
      case 'description':
        properties.description = value;
        break;
      case 'purification':
        properties.purification = value;
        break;
      case 'solvents':
        properties.solvents = value;
        break;
      case 'rfValue':
        properties.rf_value = value;
        break;
      case 'timestampStart':
        properties.timestamp_start = value;
        break;
      case 'timestampStop':
        properties.timestamp_stop = value;
        break;
      case 'tlcDescription':
        properties.tlc_description = value;
        break;
      case 'temperature':
        properties.temperature = value;
        break;
      case 'dangerousProducts':
        properties.dangerous_products = value;
        break;
    }
    changeProperties(properties);
  }

  render() {
    const {reaction} = this.props;
    return (
      <ListGroup>
        <ListGroupItem header="">
          <Row>
            <Col md={6}>
              <Input
                type="text"
                label="Name"
                value={reaction.name}
                placeholder="Name..."
                onChange={event => this.handleInputChange('name', event)}/>
            </Col>
            <Col md={6}>
              <label>Status</label>
              <Select
                name='status'
                multi={false}
                options={statusOptions}
                value={reaction.status}
                onChange={event => {
                  const wrappedEvent = {target: {value: event}};
                  this.handleInputChange('status', wrappedEvent)
                }}
                />
            </Col>
          </Row>
          <Row>
            <Col md={12}>
              <Input
                type="textarea"
                label="Description"
                value={reaction.description}
                placeholder="Description..."
                onChange={event => this.handleInputChange('description', event)}/>
            </Col>
          </Row>
        </ListGroupItem>
        <ListGroupItem header="">
          <Row>
            <Col md={6}>
              <Input
                type="text"
                label="Start"
                value={reaction.timestamp_start}
                placeholder="Start..."
                onChange={event => this.handleInputChange('timestampStart', event)}/>
            </Col>
            <Col md={6}>
              <Input
                type="text"
                label="Stop"
                value={reaction.timestamp_end}
                placeholder="Stop..."
                onChange={event => this.handleInputChange('timestampStop', event)}/>
            </Col>
          </Row>
          <Row>
            <Col md={12}>
              <Input
                type="textarea"
                label="Observation"
                value={reaction.observation}
                placeholder="Observation..."
                onChange={event => this.handleInputChange('observation', event)}/>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <label>Purification</label>
              <Select
                name='purification'
                multi={true}
                options={purificationOptions}
                onChange={event => {
                  const wrappedEvent = {target: {value: event}};
                  this.handleInputChange('purification', wrappedEvent)
                }}
                value={reaction.purification}
                />
            </Col>
            <Col md={6}>
              <label>Dangerous Products</label>
              <Select
                name='dangerous_products'
                multi={true}
                options={dangerousProductsOptions}
                value={reaction.purification}
                onChange={event => {
                  const wrappedEvent = {target: {value: event}};
                  this.handleInputChange('dangerousProducts', wrappedEvent)
                }}
                />
            </Col>
          </Row>
        </ListGroupItem>
        <ListGroupItem header="TLC-Control">
          <Row>
            <Col md={6}>
              <Input
                type="text"
                label="Solvents (parts)"
                value={reaction.solvents}
                placeholder="Solvents as parts..."
                onChange={event => this.handleInputChange('solvents', event)}/>
            </Col>
            <Col md={3}>
              <Input
                type="text"
                label="Rf-Value"
                value={reaction.rf_value}
                placeholder="Rf-Value..."
                onChange={event => this.handleInputChange('rfValue', event)}/>
            </Col>
            <Col md={3}>
              <Input
                type="text"
                label="Temperature"
                value={reaction.temperature}
                placeholder="Temperature..."
                onChange={event => this.handleInputChange('temperature', event)}/>
            </Col>
          </Row>
          <Row>
            <Col md={12}>
              <Input
                type="textarea"
                label="TLC-Description"
                value={reaction.tlc_description}
                placeholder="TLC-Description..."
                onChange={event => this.handleInputChange('tlcDescription', event)}/>
            </Col>
          </Row>
        </ListGroupItem>
      </ListGroup>
    );
  }
}

const purificationOptions = [{
  label: 'Flash-Chromatography',
  value: 'Flash-Chromatography'
}, {
  label: 'TLC',
  value: 'TLC'
}, {
  label: 'HPLC',
  value: 'HPLC'
}, {
  label: 'Distillation',
  value: 'Distillation'
}, {
  label: 'Sublimation',
  value: 'Sublimation'
}, {
  label: 'Crystallisation',
  value: 'Crystallisation'
}];

const statusOptions = [{
  label: 'Planned',
  value: 'Planned'
}, {
  label: 'Successful',
  value: 'Successful'
}, {
  label: 'Not Successful',
  value: 'Not Successful'
}];

const dangerousProductsOptions = [{
  label: 'Product 1',
  value: 'Product 1'
}, {
  label: 'Product 2',
  value: 'Product 2'
}, {
  label: 'Product 3',
  value: 'Product 3'
}];