import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Row, Col, FormGroup, ControlLabel, FormControl, MenuItem,
  ListGroupItem, ListGroup, InputGroup, DropdownButton
} from 'react-bootstrap';
import Select from 'react-select';
import 'moment-precise-range-plugin';
import Clipboard from 'clipboard';
import { dangerousProductsOptions } from './staticDropdownOptions/options';
import ReactionDetailsMainProperties from './ReactionDetailsMainProperties';
import StringTag from './StringTag';
import { solventsTL } from './utils/reactionPredefined';
import OlsTreeSelect from './OlsComponent';

export default class ReactionDetailsProperties extends Component {
  constructor(props) {
    super(props);
    props.reaction.convertDurationDisplay();

    this.clipboard = new Clipboard('.clipboardBtn');
    this.handleOnReactionChange = this.handleOnReactionChange.bind(this);
    this.handleOnSolventSelect = this.handleOnSolventSelect.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.reaction) { return; }
    nextProps.reaction.convertDurationDisplay();
  }

  componentWillUnmount() {
    this.clipboard.destroy();
  }

  handleOnReactionChange(reaction) {
    this.props.onReactionChange(reaction);
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

  render() {
    const { reaction } = this.props;
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
            <FormGroup>
              <ControlLabel>Type (Name Reaction Ontology)</ControlLabel>
              <OlsTreeSelect
                selectName="rxno"
                selectedValue={(reaction.rxno && reaction.rxno.trim()) || ''}
                onSelectChange={event => this.props.onInputChange('rxno', event.trim())}
                selectedDisable={reaction.isMethodDisabled('rxno')}
              />
            </FormGroup>
            <Row>
              <Col md={12}>
                <div><b>Dangerous Products</b></div>
                <Select
                  name="dangerous_products"
                  multi
                  options={dangerousProductsOptions}
                  value={reaction.dangerous_products}
                  disabled={reaction.isMethodDisabled('dangerous_products')}
                  onChange={selectedOptions => this.handleMultiselectChange('dangerousProducts', selectedOptions)}
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
                    onChange={event => this.props.onInputChange('rfValue', event)}
                  />
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
                    onChange={event => this.props.onInputChange('tlcDescription', event)}
                  />
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
};
