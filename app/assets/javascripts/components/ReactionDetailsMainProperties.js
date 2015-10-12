import React, {Component} from 'react';
import {Row, Col, Input, ListGroupItem, ListGroup} from 'react-bootstrap'
import Select from 'react-select'

export default class ReactionDetailsMainProperties extends Component {

  constructor(props) {
    super(props);
    const {reaction} = props;
    this.state = { reaction };
  }

  componentWillReceiveProps(nextProps) {
    const {reaction} = this.state;
    const nextReaction = nextProps.reaction;
    this.setState({ reaction: nextReaction });
  }

  handleInputChange(type, event) {
    const {onReactionChange} = this.props;
    const {value} = event.target;
    let {reaction} = this.state;

    switch (type) {
      case 'name':
        reaction.name = value;
        break;
      case 'observation':
        reaction.observation = value;
        break;
      case 'status':
        reaction.status = value;
        break;
      case 'description':
        reaction.description = value;
        break;
      case 'purification':
        reaction.purification = value;
        break;
      case 'solvents':
        reaction.solvents = value;
        break;
      case 'rfValue':
        reaction.rf_value = value;
        break;
      case 'timestampStart':
        reaction.timestamp_start = value;
        break;
      case 'timestampStop':
        reaction.timestamp_stop = value;
        break;
      case 'tlcDescription':
        reaction.tlc_description = value;
        break;
      case 'temperature':
        reaction.temperature = value;
        break;
      case 'dangerousProducts':
        reaction.dangerous_products = value;
        break;
    }

    onReactionChange(reaction);
  }

  render() {
    const {reaction} = this.state;
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
            <Col md={3}>
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
                label="Description"
                value={reaction.description}
                placeholder="Description..."
                rows={6}
                onChange={event => this.handleInputChange('description', event)}/>
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
