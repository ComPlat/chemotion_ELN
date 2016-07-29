import React, {Component} from 'react';
import {Row, Col, FormGroup, ControlLabel, FormControl,
        ListGroupItem, ListGroup, InputGroup, Button} from 'react-bootstrap'
import Select from 'react-select'
import {solventOptions, purificationOptions, statusOptions,
        dangerousProductsOptions} from './staticDropdownOptions/options';
import ReactionDetailsMainProperties from './ReactionDetailsMainProperties';

export default class ReactionDetailsProperties extends Component {

  constructor(props) {
    super(props);
    const {reaction} = props;
    this.state = { reaction };
  }

  componentWillReceiveProps(nextProps) {
    const nextReaction = nextProps.reaction;
    this.setState({ reaction: nextReaction });
  }

  handleMultiselectChange(type, selectedOptions) {
    const values = selectedOptions.map(option => option.value);
    const wrappedEvent = {target: {value: values}};
    this.props.onInputChange(type, wrappedEvent)
  }

  setCurrentTime(type) {
    const currentTime = new Date().toLocaleString('en-GB').split(', ').join(' ')
    const {reaction} = this.state
    if(type === 'start') {
      reaction.timestamp_start = currentTime
    } else {
      reaction.timestamp_stop = currentTime
    }
    this.setState({ reaction: reaction });
  }

  render() {
    const {reaction} = this.state;
    return (
      <div>
      <ReactionDetailsMainProperties
        reaction={reaction}
        onInputChange={(type, event) => this.props.onInputChange(type, event)} />
      <ListGroup>
        <ListGroupItem>
          <Row>
            <Col md={4}>
              <label>Status</label>
              <Select
                name='status'
                multi={false}
                options={statusOptions}
                value={reaction.status}
                disabled={reaction.isMethodDisabled('status')}
                onChange={event => {
                  const wrappedEvent = {target: {value: event}};
                  this.props.onInputChange('status', wrappedEvent)
                }}
                />
            </Col>
            <Col md={4}>
              <FormGroup>
                <ControlLabel>Start</ControlLabel>
                <InputGroup>
                  <FormControl
                    type="text"
                    value={reaction.timestamp_start || ''}
                    disabled={reaction.isMethodDisabled('timestamp_start')}
                    placeholder="Start..."
                    onChange={event => this.props.onInputChange('timestampStart', event)}/>
                  <InputGroup.Button>
                    <Button active style={ {padding: '6px'}} onClick={e => this.setCurrentTime('start')} >
                      <i className="fa fa-clock-o"></i>
                    </Button>
                  </InputGroup.Button>
                </InputGroup>
              </FormGroup>
            </Col>
            <Col md={4}>
              <FormGroup>
                <ControlLabel>Stop</ControlLabel>
                <InputGroup>
                  <FormControl
                    type="text"
                    value={reaction.timestamp_stop || ''}
                    disabled={reaction.isMethodDisabled('timestamp_stop')}
                    placeholder="Stop..."
                    onChange={event => this.props.onInputChange('timestampStop', event)}/>
                  <InputGroup.Button>
                    <Button active style={ {padding: '6px'}} onClick={e => this.setCurrentTime('stop')} >
                      <i className="fa fa-clock-o"></i>
                    </Button>
                  </InputGroup.Button>
                </InputGroup>
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={12}>
              <FormGroup>
                <ControlLabel>Observation</ControlLabel>
                <FormControl
                  componentClass="textarea"
                  value={reaction.observation || ''}
                  disabled={reaction.isMethodDisabled('observation')}
                  placeholder="Observation..."
                  onChange={event => this.props.onInputChange('observation', event)}/>
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <label>Purification</label>
              <Select
                name='purification'
                multi={true}
                disabled={reaction.isMethodDisabled('purification')}
                options={purificationOptions}
                onChange={(event, selectedOptions) =>
                  this.handleMultiselectChange('purification', selectedOptions)}
                value={reaction.purification}
                />
            </Col>
            <Col md={6}>
              <label>Dangerous Products</label>
              <Select
                name='dangerous_products'
                multi={true}
                options={dangerousProductsOptions}
                value={reaction.dangerous_products}
                disabled={reaction.isMethodDisabled('dangerous_products')}
                onChange={(event, selectedOptions) =>
                  this.handleMultiselectChange('dangerousProducts', selectedOptions)}
              />
            </Col>
          </Row>
        </ListGroupItem>
        <ListGroupItem>
          <h4 className="list-group-item-heading" >TLC-Control</h4>
          <Row>
            <Col md={6}>
              <FormGroup>
                <ControlLabel>Solvents (parts)</ControlLabel>
                <FormControl
                  type="text"
                  value={reaction.tlc_solvents || ''}
                  disabled={reaction.isMethodDisabled('tlc_solvents')}
                  placeholder="Solvents as parts..."
                  onChange={event => this.props.onInputChange('tlc_solvents', event)}/>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <ControlLabel>Rf-Value</ControlLabel>
                <FormControl
                  type="text"
                  value={reaction.rf_value || ''}
                  disabled={reaction.isMethodDisabled('rf_value')}
                  placeholder="Rf-Value..."
                  onChange={event => this.props.onInputChange('rfValue', event)}/>
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={12}>
              <FormGroup>
                <ControlLabel>TLC-Description</ControlLabel>
                <FormControl
                  componentClass="textarea"
                  value={reaction.tlc_description || ''}
                  disabled={reaction.isMethodDisabled('tlc_description')}
                  placeholder="TLC-Description..."
                  onChange={event => this.props.onInputChange('tlcDescription', event)}/>
              </FormGroup>
            </Col>
          </Row>
        </ListGroupItem>
      </ListGroup>
      </div>
    );
  }
}

ReactionDetailsProperties.propTypes = {
  reaction: React.PropTypes.object,
  onInputChange: React.PropTypes.func
}
