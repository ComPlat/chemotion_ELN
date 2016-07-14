import React, {Component} from 'react';
import {Row, Col, FormGroup, FormControl, ControlLabel, ListGroupItem, ListGroup} from 'react-bootstrap'
import Select from 'react-select'
import {statusOptions} from './staticDropdownOptions/options'

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
              <FormGroup>
                <ControlLabel>Name</ControlLabel>
                <FormControl
                  type="text"
                  value={reaction.name}
                  placeholder="Name..."
                  disabled={reaction.isMethodDisabled('name')}
                  onChange={event => this.handleInputChange('name', event)}/>
              </FormGroup>
            </Col>
            <Col md={3}>
              <label>Status</label>
              <Select
                name='status'
                multi={false}
                options={statusOptions}
                value={reaction.status}
                disabled={reaction.isMethodDisabled('status')}
                onChange={event => {
                  const wrappedEvent = {target: {value: event}};
                  this.handleInputChange('status', wrappedEvent)
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
                  onChange={event => this.handleInputChange('temperature', event)}/>
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={12}>
              <FormGroup>
                <ControlLabel>Description</ControlLabel>
                <FormControl
                  type="textarea"
                  value={reaction.description}
                  disabled={reaction.isMethodDisabled('description')}
                  placeholder="Description..."
                  rows={6}
                  onChange={event => this.handleInputChange('description', event)}/>
              </FormGroup>
            </Col>
          </Row>
        </ListGroupItem>
      </ListGroup>
    );
  }
}
