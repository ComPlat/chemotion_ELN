import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Row, Col, Form, InputGroup, DropdownButton, Dropdown
} from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import 'moment-precise-range-plugin';
import { dangerousProductsOptions } from 'src/components/staticDropdownOptions/options';
import ReactionDetailsMainProperties from 'src/apps/mydb/elements/details/reactions/ReactionDetailsMainProperties';
import StringTag from 'src/apps/mydb/elements/details/reactions/propertiesTab/StringTag';
import { solventsTL } from 'src/utilities/reactionPredefined';
import OlsTreeSelect from 'src/components/OlsComponent';
import { permitOn } from 'src/components/common/uis';
import { EditUserLabels } from 'src/components/UserLabels';

export default class ReactionDetailsProperties extends Component {
  constructor(props) {
    super(props);

    this.handleOnReactionChange = this.handleOnReactionChange.bind(this);
    this.handleOnSolventSelect = this.handleOnSolventSelect.bind(this);
  }

  handleOnReactionChange(reaction) {
    this.props.onReactionChange(reaction);
  }

  handleMultiselectChange(type, selectedOptions) {
    const values = selectedOptions.map((option) => option.value);
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
        <Dropdown.Item key={i} eventKey={i}>
          <StringTag key={i} string={val} />
        </Dropdown.Item>
      );
    });

    solventsItems.unshift(
      <Dropdown.Item key={solventsTL.length + 1} eventKey={solventsTL.length + 1}>
        -
      </Dropdown.Item>
    );

    return (
      <Form>
        <ReactionDetailsMainProperties
          reaction={reaction}
          onInputChange={(type, event) => this.props.onInputChange(type, event)}
        />
        <Form.Group className="mx-1">
          <Form.Label>Type (Name Reaction Ontology)</Form.Label>
          <OlsTreeSelect
            selectName="rxno"
            selectedValue={(reaction.rxno && reaction.rxno.trim()) || ''}
            onSelectChange={(event) => this.props.onInputChange('rxno', event.trim())}
            selectedDisable={!permitOn(reaction) || reaction.isMethodDisabled('rxno')}
          />
        </Form.Group>
        <Form.Group className="mx-1 my-3">
          <Form.Label>Dangerous Products</Form.Label>
          <Select
            name="dangerous_products"
            isMulti
            options={dangerousProductsOptions}
            value={dangerousProductsOptions.filter((o) => reaction.dangerous_products?.includes(o.value))}
            isDisabled={!permitOn(reaction) || reaction.isMethodDisabled('dangerous_products')}
            onChange={(selectedOptions) => this.handleMultiselectChange('dangerousProducts', selectedOptions)}
            className="rounded"
          />
        </Form.Group>
        <hr className="my-4" />
        <h4 className="m-0">TLC-Control</h4>
        <Row className="mt-3">
          <Col sm={6}>
            <Form.Group>
              <Form.Label>Solvents (parts)</Form.Label>
              <InputGroup>
                <DropdownButton
                  disabled={!permitOn(reaction)}
                  id="solvents_dd"
                  onSelect={this.handleOnSolventSelect}
                  variant="light"
                  title={reaction.tlc_solvents || ""}
                >
                  {solventsItems}
                </DropdownButton>
                <Form.Control
                  type="text"
                  value={reaction.tlc_solvents || ''}
                  disabled={!permitOn(reaction) || reaction.isMethodDisabled('tlc_solvents')}
                  placeholder="Solvents as parts..."
                  onChange={(event) => this.props.onInputChange('tlc_solvents', event)}
                />
              </InputGroup>
            </Form.Group>
          </Col>
          <Col sm={6}>
            <Form.Group>
              <Form.Label>Rf-Value</Form.Label>
              <Form.Control
                type="text"
                value={reaction.rf_value || ''}
                disabled={!permitOn(reaction) || reaction.isMethodDisabled('rf_value')}
                placeholder="Rf-Value..."
                onChange={(event) => this.props.onInputChange('rfValue', event)}
              />
            </Form.Group>
          </Col>
        </Row>
        <Form.Group className="mx-0 mt-2">
          <Form.Label>TLC-Description</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            value={reaction.tlc_description || ''}
            disabled={!permitOn(reaction) || reaction.isMethodDisabled('tlc_description')}
            placeholder="TLC-Description..."
            onChange={(event) => this.props.onInputChange('tlcDescription', event)}
          />
        </Form.Group>
        <div className="mx-0 mt-2">
          <EditUserLabels element={reaction} fnCb={this.handleOnReactionChange} />
        </div>
      </Form>
    );
  }
}

ReactionDetailsProperties.propTypes = {
  reaction: PropTypes.object,
  onReactionChange: PropTypes.func,
  onInputChange: PropTypes.func
};
