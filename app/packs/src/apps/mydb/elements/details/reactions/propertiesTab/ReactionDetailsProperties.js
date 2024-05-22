import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Row, Col, Form, InputGroup, DropdownButton, Dropdown
} from 'react-bootstrap';
import Select from 'react-select';
import 'moment-precise-range-plugin';
import Clipboard from 'clipboard';
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
    props.reaction.convertDurationDisplay();

    this.clipboard = new Clipboard('.clipboardBtn');
    this.handleOnReactionChange = this.handleOnReactionChange.bind(this);
    this.handleOnSolventSelect = this.handleOnSolventSelect.bind(this);
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
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
      <Form className="border">
        <Row className="mt-2 mb-2">
          <ReactionDetailsMainProperties
            reaction={reaction}
            onInputChange={(type, event) => this.props.onInputChange(type, event)}
          />
        </Row>
        <Row className="ms-2">
          <Form.Group >
            <Form.Label className="fs-6">Type (Name Reaction Ontology)</Form.Label>
            <div className="pe-5">
              <OlsTreeSelect
                selectName="rxno"
                selectedValue={(reaction.rxno && reaction.rxno.trim()) || ''}
                onSelectChange={(event) => this.props.onInputChange('rxno', event.trim())}
                selectedDisable={!permitOn(reaction) || reaction.isMethodDisabled('rxno')}
              />
            </div>
          </Form.Group>
        </Row>
        <Row className="my-2 ms-2">
          <Col sm={12}>
            <div className="fs-6">Dangerous Products</div>
            <Select
              name="dangerous_products"
              multi
              options={dangerousProductsOptions}
              value={reaction.dangerous_products}
              disabled={!permitOn(reaction) || reaction.isMethodDisabled('dangerous_products')}
              onChange={(selectedOptions) => this.handleMultiselectChange('dangerousProducts', selectedOptions)}
              className="mt-1 rounded-lg me-5"
            />
          </Col>
        </Row>
        <hr className="mt-4" />
        <h4 className="my-3 ms-3">TLC-Control</h4>
        <Row className="mt-2">
          <Col sm={6}>
            <Form.Group className="mx-3">
              <Form.Label className="fs-6">Solvents (parts)</Form.Label>
              <InputGroup className="z-0">
                <DropdownButton
                  disabled={!permitOn(reaction)}
                  componentClass={InputGroup.Button}
                  id="solvents_dd"
                  onSelect={this.handleOnSolventSelect}
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
            <Form.Group className="me-5">
              <Form.Label className="fs-6">Rf-Value</Form.Label>
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
        <Row className="my-3 ms-2 me-4">
          <Col sm={12}>
            <Form.Group>
              <Form.Label className="fs-6">TLC-Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={reaction.tlc_description || ''}
                disabled={!permitOn(reaction) || reaction.isMethodDisabled('tlc_description')}
                placeholder="TLC-Description..."
                onChange={(event) => this.props.onInputChange('tlcDescription', event)}
                className="mb-4"
              />
            </Form.Group>
          </Col>
        </Row>
        <Row>
          <Col md={12}>
            <EditUserLabels element={reaction} fnCb={this.handleOnReactionChange} />
          </Col>
        </Row>
      </Form>
    );
  }
}

ReactionDetailsProperties.propTypes = {
  reaction: PropTypes.object,
  onReactionChange: PropTypes.func,
  onInputChange: PropTypes.func
};
