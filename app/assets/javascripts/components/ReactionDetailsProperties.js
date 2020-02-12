import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Row, Col, FormGroup, ControlLabel, FormControl, MenuItem, Button,
  ListGroupItem, ListGroup, InputGroup, OverlayTrigger, Tooltip,
  DropdownButton
} from 'react-bootstrap';
import Select from 'react-select';
import moment from 'moment';
import 'moment-precise-range-plugin';
import Clipboard from 'clipboard';
import { difference, concat } from 'lodash';
import {
  purificationOptions,
  dangerousProductsOptions
} from './staticDropdownOptions/options';
import Reaction from './models/Reaction';
import ReactionDetailsMainProperties from './ReactionDetailsMainProperties';
import MaterialGroupContainer from './MaterialGroupContainer';
import QuillEditor from './QuillEditor';
import Sample from './models/Sample';
import StringTag from './StringTag';
import { observationPurification, solventsTL } from './utils/reactionPredefined';

function dummy() { return true; }

export default class ReactionDetailsProperties extends Component {
  constructor(props) {
    super(props);
    props.reaction.convertDurationDisplay();

    this.clipboard = new Clipboard('.clipboardBtn');
    this.handlePurificationChange = this.handlePurificationChange.bind(this);
    this.handleOnReactionChange = this.handleOnReactionChange.bind(this);
    this.handleOnSolventSelect = this.handleOnSolventSelect.bind(this);
    this.setCurrentTime = this.setCurrentTime.bind(this);
    this.handlePSolventChange = this.handlePSolventChange.bind(this);
    this.deletePSolvent = this.deletePSolvent.bind(this);
    this.dropPSolvent = this.dropPSolvent.bind(this);

    this.copyToDuration = this.copyToDuration.bind(this);
    this.handleDurationChange = this.handleDurationChange.bind(this);
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

  handleOnReactionChange(reaction) {
    this.props.onReactionChange(reaction);
  }

  handlePurificationChange(selected) {
    if (selected.length === 0) {
      return this.handleMultiselectChange('purification', selected);
    }

    const obs = observationPurification;
    const { reaction } = this.props;

    const selectedVal = selected[selected.length - 1].value;
    const predefinedObs = obs.filter(x =>
      Object.keys(x).filter(k =>
        k.toLowerCase().localeCompare(selectedVal.toLowerCase()) === 0,
      ).length > 0,
    );

    if (predefinedObs.length > 0) {
      const values = selected.map(option => option.value);
      reaction.purification = values;

      const predefined = predefinedObs[0][selectedVal.toLowerCase()];
      reaction.concat_text_observation(predefined);

      this.handleOnReactionChange(reaction);
    } else {
      this.handleMultiselectChange('purification', selected);
    }

    return 0;
  }

  handlePSolventChange(changeEvent) {
    const { sampleID, amount } = changeEvent;
    const { reaction, onReactionChange } = this.props;

    const updatedSample = reaction.sampleById(sampleID);
    updatedSample.setAmount(amount);

    onReactionChange(reaction);
  }

  deletePSolvent(material) {
    const { reaction, onReactionChange } = this.props;
    reaction.deleteMaterial(material, 'purification_solvents');

    this.props.onReactionChange(reaction);
  }

  dropPSolvent(srcSample, tagMaterial, tagGroup, extLabel) {
    const { reaction } = this.props;
    let splitSample = Sample.buildNew(srcSample, reaction.collection_id, tagGroup);
    splitSample.short_label = tagGroup.slice(0, -1);
    splitSample.external_label = extLabel;
    reaction.addMaterialAt(splitSample, null, tagMaterial, tagGroup);
    this.props.onReactionChange(reaction, { schemaChanged: true });
  }

  handleMultiselectChange(type, selectedOptions) {
    const values = selectedOptions.map(option => option.value);
    const wrappedEvent = { target: { value: values } };
    this.props.onInputChange(type, wrappedEvent);
  }

  handleOnSolventSelect(eventKey) {
    const { reaction } = this.props;

    let val;
    if (eventKey > solventsTL.length) {
      val = '';
    } else {
      const key = Object.keys(solventsTL[eventKey])[0];
      val = solventsTL[eventKey][key];
    }

    reaction.tlc_solvents = val;
    this.handleOnReactionChange(reaction);
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

  clipboardTooltip() {
    return (
      <Tooltip id="copy_duration_to_clipboard">copy to clipboard</Tooltip>
    )
  }

  render() {
    const { reaction } = this.props;
    const durationCalc = reaction && reaction.durationCalc();


    const solventsItems = solventsTL.map((x, i) => {
      const val = Object.keys(x)[0];
      return (
        <MenuItem key={i} eventKey={i}>
          <StringTag key={i} string={val} />
        </MenuItem>
      )
    });

    solventsItems.unshift(
      <MenuItem key={solventsTL.length + 1} eventKey={solventsTL.length + 1}>
        -
      </MenuItem>
    );

    return (
      <div>
        <ListGroup>
          <ListGroupItem>
            <div className="reaction-scheme-props">
              <ReactionDetailsMainProperties
                reaction={reaction}
                onInputChange={(type, event) => this.props.onInputChange(type, event)}
              />
            </div>
            <Row className="small-padding">
              <Col md={3}>
                <FormGroup>
                  <ControlLabel>Start</ControlLabel>
                  <InputGroup>
                    <FormControl
                      type="text"
                      value={reaction.timestamp_start || ''}
                      disabled={reaction.isMethodDisabled('timestamp_start')}
                      placeholder="DD/MM/YYYY hh:mm:ss"
                      onChange={event => this.props.onInputChange('timestampStart', event)}
                    />
                    <InputGroup.Button>
                      <Button
                        active
                        style={{ padding: '6px' }}
                        onClick={() => this.setCurrentTime('timestampStart')}
                      >
                        <i className="fa fa-clock-o" />
                      </Button>
                    </InputGroup.Button>
                  </InputGroup>
                </FormGroup>
              </Col>
              <Col md={3}>
                <FormGroup>
                  <ControlLabel>Stop</ControlLabel>
                  <InputGroup>
                    <FormControl
                      type="text"
                      value={reaction.timestamp_stop || ''}
                      disabled={reaction.isMethodDisabled('timestamp_stop')}
                      placeholder="DD/MM/YYYY hh:mm:ss"
                      onChange={event => this.props.onInputChange('timestampStop', event)}
                    />
                    <InputGroup.Button>
                      <Button
                        active
                        style={{ padding: '6px' }}
                        onClick={() => this.setCurrentTime('timestampStop')}
                      >
                        <i className="fa fa-clock-o" />
                      </Button>
                    </InputGroup.Button>
                  </InputGroup>
                </FormGroup>
              </Col>
              <Col md={3}>
                <FormGroup>
                  <ControlLabel>Duration</ControlLabel>
                  <InputGroup>
                    <FormControl
                      type="text"
                      value={durationCalc || ''}
                      disabled
                      placeholder="Duration"
                    />
                    <InputGroup.Button>
                      <OverlayTrigger
                        placement="bottom"
                        overlay={this.clipboardTooltip()}
                      >
                        <Button
                          active
                          className="clipboardBtn"
                          data-clipboard-text={durationCalc || ' '}
                        >
                          <i className="fa fa-clipboard" />
                        </Button>
                      </OverlayTrigger>
                      <OverlayTrigger
                        placement="bottom"
                        overlay={<Tooltip id="copy_durationCalc_to_duration">use this duration<br />(rounded to precision 1)</Tooltip>}
                      >
                        <Button
                          active
                          className="clipboardBtn"
                          onClick={() => this.copyToDuration()}
                        >
                          <i className="fa fa-arrow-right" />
                        </Button>
                      </OverlayTrigger>
                    </InputGroup.Button>
                  </InputGroup>
                </FormGroup>
              </Col>
              <Col md={3}>
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
                      <OverlayTrigger
                        placement="bottom"
                        overlay={<Tooltip id="switch_duration_unit">switch duration unit</Tooltip>}
                      >
                        <Button
                          bsStyle="success"
                          onClick={() => this.changeDurationUnit()}
                        >
                          {reaction.durationUnit}
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
                  <ControlLabel>
                    Additional information for publication and purification details
                  </ControlLabel>
                  <QuillEditor
                    value={reaction.observation}
                    height="95px"
                    disabled={reaction.isMethodDisabled('observation')}
                    onChange={event => this.props.onInputChange('observation', event)}
                  />
                </FormGroup>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <label>Purification</label>
                <Select
                  name="purification"
                  multi
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
                  multi
                  options={dangerousProductsOptions}
                  value={reaction.dangerous_products}
                  disabled={reaction.isMethodDisabled('dangerous_products')}
                  onChange={selectedOptions => this.handleMultiselectChange(
                    'dangerousProducts', selectedOptions)}
                />
              </Col>
            </Row>
            <Row style={{ marginTop: '10px' }}>
              <Col md={12}>
                <label>Purification Solvents</label>
                <MaterialGroupContainer
                  reaction={reaction}
                  materialGroup="purification_solvents"
                  materials={reaction.purification_solvents}
                  dropMaterial={dummy}
                  deleteMaterial={this.deletePSolvent}
                  dropSample={this.dropPSolvent}
                  showLoadingColumn={!!reaction.hasPolymers()}
                  onChange={this.handlePSolventChange}
                  headIndex={0}
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
                      <DropdownButton
                        componentClass={InputGroup.Button}
                        id="solvents_dd"
                        title=""
                        onSelect={this.handleOnSolventSelect}
                      >
                        { solventsItems }
                      </DropdownButton>
                      <FormControl
                        style={{ zIndex: 0 }}
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
  reaction: PropTypes.object,
  onReactionChange: PropTypes.func,
  onInputChange: PropTypes.func
}
