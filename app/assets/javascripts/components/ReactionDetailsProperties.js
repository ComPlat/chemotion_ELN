import React, {Component} from 'react';
import {Row, Col, FormGroup, ControlLabel, FormControl, MenuItem, Button, 
  ListGroupItem, ListGroup, InputGroup, OverlayTrigger, Tooltip,
  DropdownButton} from 'react-bootstrap'
import Select from 'react-select'
import {purificationOptions,
        dangerousProductsOptions} from './staticDropdownOptions/options';
import ReactionDetailsMainProperties from './ReactionDetailsMainProperties';
import {observationPurification, solventsTL} from './utils/reactionPredefined.js';
import Clipboard from 'clipboard';
import moment from 'moment';

export default class ReactionDetailsProperties extends Component {

  constructor(props) {
    super(props);
    const {reaction} = props;

    this.state = {
      reaction,
      durationButtonDisabled: false
    }

    this.clipboard = new Clipboard('.clipboardBtn');

    this.handlePurificationChange = this.handlePurificationChange.bind(this);
    this.handleOnReactionChange = this.handleOnReactionChange.bind(this);
    this.handleOnSolventSelect = this.handleOnSolventSelect.bind(this);
    this.setCurrentTime = this.setCurrentTime.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    let nextReaction = nextProps.reaction
    let durationButtonDisabled = false
    nextReaction.duration = this.calcDuration(nextReaction)

    if (nextReaction.duration == null) {
      nextReaction.duration = "No time traveling here"
      durationButtonDisabled = true
    }

    this.setState({ reaction: nextReaction, durationButtonDisabled });
  }

  componentWillUnmount() {
    this.clipboard.destroy()
  }

  handleOnReactionChange(reaction) {
    this.props.onReactionChange(reaction);
  }

  handlePurificationChange(selected) {
    if (selected.length == 0) {
      return this.handleMultiselectChange('purification', selected);
    }

    const obs = observationPurification;
    let {reaction} = this.state;

    const selectedVal = selected[selected.length - 1].value;
    const predefinedObs = obs.filter(x => {
      return Object.keys(x).filter(k => { 
        return k.toLowerCase().localeCompare(selectedVal.toLowerCase()) == 0;
      }).length > 0;
    });

    if (predefinedObs.length > 0) {
      const values = selected.map(option => option.value);
      reaction.purification = values;

      const predefined = predefinedObs[0][selectedVal.toLowerCase()];
      reaction.observation = (reaction.observation || "") + "\n" + predefined;

      this.handleOnReactionChange(reaction);
    } else {
      this.handleMultiselectChange('purification', selected);
    }
  }

  handleMultiselectChange(type, selectedOptions) {
    const values = selectedOptions.map(option => option.value);
    const wrappedEvent = {target: {value: values}};
    this.props.onInputChange(type, wrappedEvent)
  }

  handleOnSolventSelect(eventKey) {
    const key = Object.keys(solventsTL[eventKey])[0];
    const val = solventsTL[eventKey][key];

    let {reaction} = this.state;
    reaction.tlc_solvents = val;
    this.handleOnReactionChange(reaction);
  }

  setCurrentTime(type) {
    const currentTime = new Date().toLocaleString('en-GB').split(', ').join(' ')

    let wrappedEvent = {target: {value: currentTime}}
    let inputType = type === 'start' ? 'timestampStart' : 'timestampStop'
    this.props.onInputChange(inputType, wrappedEvent)
  }

  calcDuration(reaction) {
    let duration = null

    if(reaction.timestamp_start && reaction.timestamp_stop) {
      const start = moment(reaction.timestamp_start, "DD-MM-YYYY HH:mm:ss")
      const stop = moment(reaction.timestamp_stop, "DD-MM-YYYY HH:mm:ss")
      if (start < stop) {
        duration = moment.preciseDiff(start, stop)
      }
    }

    return duration
  }

  clipboardTooltip() {
    return(
      <Tooltip id="copy_duration_to_clipboard">copy to clipboard</Tooltip>
    )
  }

  render() {
    const {reaction} = this.state
    const {durationButtonDisabled} = this.state

    return (
      <div>
      <ReactionDetailsMainProperties
        reaction={reaction}
        onInputChange={(type, event) => this.props.onInputChange(type, event)} />
      <ListGroup>
        <ListGroupItem>
          <Row className="small-padding">
            <Col md={4}>
              <FormGroup>
                <ControlLabel>Start</ControlLabel>
                <InputGroup>
                  <FormControl
                    type="text"
                    value={reaction.timestamp_start || ''}
                    disabled={reaction.isMethodDisabled('timestamp_start')}
                    placeholder="DD/MM/YYYY hh:mm:ss"
                    onChange={event => this.props.onInputChange('timestampStart', event)}/>
                  <InputGroup.Button>
                    <Button active style={ {padding: '6px'}}
                            onClick={this.setCurrentTime.bind(this, 'start')} >
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
                    placeholder="DD/MM/YYYY hh:mm:ss"
                    onChange={event => this.props.onInputChange('timestampStop', event)}/>
                  <InputGroup.Button>
                    <Button active style={ {padding: '6px'}}
                            onClick={this.setCurrentTime.bind(this, 'stop')} >
                      <i className="fa fa-clock-o"></i>
                    </Button>
                  </InputGroup.Button>
                </InputGroup>
              </FormGroup>
            </Col>
            <Col md={4}>
              <FormGroup>
                <ControlLabel>Duration</ControlLabel>
                <InputGroup>
                  <FormControl
                    type="text"
                    value={reaction.duration || ''}
                    disabled="true"
                    placeholder="Duration" />
                  <InputGroup.Button>
                    <OverlayTrigger placement="bottom" overlay={this.clipboardTooltip()}>
                      <Button active className="clipboardBtn"
                              disabled={durationButtonDisabled}
                              data-clipboard-text={reaction.duration || " "} >
                        <i className="fa fa-clipboard"></i>
                      </Button>
                    </OverlayTrigger>
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
                  componentClass="textarea" rows="4"
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
                onChange={this.handlePurificationChange}
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
                onChange={selectedOptions => this.handleMultiselectChange(
                  'dangerousProducts', selectedOptions)}
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
                <FormGroup>
                  <InputGroup>
                    <DropdownButton componentClass={InputGroup.Button}
                      id="solvents_dd" title=""
                      onSelect={this.handleOnSolventSelect}
                    >
                      {
                        solventsTL.map((x, i) => (
                          <MenuItem key={i} eventKey={i}>
                            {Object.keys(x)[0]}
                          </MenuItem>
                        ))
                      }
                    </DropdownButton>
                    <FormControl style={{zIndex: 0}}
                      type="text"
                      value={reaction.tlc_solvents || ''}
                      disabled={reaction.isMethodDisabled('tlc_solvents')}
                      placeholder="Solvents as parts..."
                      onChange={event => this.props.onInputChange('tlc_solvents', event)}
                    />
                  </InputGroup>
                </FormGroup>
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
  onReactionChange: React.PropTypes.func,
  onInputChange: React.PropTypes.func
}
