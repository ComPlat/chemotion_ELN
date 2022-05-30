import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, FormGroup, FormControl } from 'react-bootstrap';
import { sortBy } from 'lodash';

import { genUnits, unitConversion } from '../../admin/generic/Utils';
import { BaseFieldTypes } from '../elements/ElementField'
import { GenProperties } from './GenericElCommon'
import ElementActions from '../actions/ElementActions'

export default class GenericElInlineProperties extends Component {

  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this)
    this.handleSubChange = this.handleSubChange.bind(this)
  }

  handleChange(event, field, layer, type) {
    const { genericEl } = this.props
    const { properties } = genericEl

    let value
    if (type == 'checkbox') {
      value = event.target.checked
    } else if (['select', 'formula-field'].includes(type)) {
      value = event
    } else if (['system-defined', 'text'].includes(type)) {
       value = event.target.value
    }

    if (value !== undefined) {
      properties.layers[layer].fields.find(e => e.field === field).value = value;
      ElementActions.changeElementProperty(genericEl, 'properties', properties)
    }
  }


  handleSubChange(event) {
    console.log('handleSubChange', event);
  }

  handleClick(layer, field, value_system) {
    // adopted from GenPropertiesLayer in app/packs/src/components/generic/GenericElCommon.js
    const units = genUnits(field.option_layers)
    let uIdx = units.findIndex(e => e.key === value_system)
    if (uIdx < units.length - 1) uIdx += 1; else uIdx = 0
    field.value_system = units.length > 0 ? units[uIdx].key : ''

    // adopted from GenericElDetails in app/packs/src/components/generic/GenericElDetails.js
    const { genericEl } = this.props
    const { properties } = genericEl
    const newVal = unitConversion(field.option_layers, field.value_system, field.value)
    properties.layers[layer].fields.find(e => e.field === field.field).value_system = field.value_system;
    properties.layers[layer].fields.find(e => e.field === field.field).value = newVal;
    ElementActions.changeElementProperty(genericEl, 'properties', properties)
  }

  renderButtons() {
    const { genericEl, onSave } = this.props;

    return (
      <FormGroup>
        <Button bsSize="xsmall" bsStyle="warning"
          onClick={(event) => onSave(event, [genericEl], genericEl.type)}>
          <i className="fa fa-floppy-o" />
        </Button>
      </FormGroup>
    )
  }

  render() {
    const { genericEl, showDetails } = this.props
    const sortedLayers = sortBy(genericEl.properties.layers, l => l.position) || []
    const selectOptions = genericEl.properties.select_options

    return (
      <tr>
        <td style={{ cursor: 'pointer' }} onClick={() => showDetails(genericEl)}>
          {genericEl.isNew ? <i>{genericEl.title()}</i> : genericEl.title()}
        </td>
        {
          sortedLayers.map(layer => {
            const sortedFields = sortBy(layer.fields, f => f.position) || []

            return sortedFields.map(field => {
              if (BaseFieldTypes.map(type => type.value).includes(field.type)) {
                const unit = genUnits(field.option_layers)[0] || {};
                return (
                  <td key={field.field}>
                    <GenProperties
                      key={`${genericEl.id}_${field.field}_GenPropertiesLayer`}
                      layers={genericEl.properties.layers}
                      id={genericEl.id}
                      layer={layer}
                      f_obj={field}
                      label={field.label}
                      value={field.value || ''}
                      description={field.description || ''}
                      type={field.type || 'text'}
                      field={field.field || 'field'}
                      formula={field.formula || ''}
                      options={(selectOptions && selectOptions[field.option_layers] && selectOptions[field.option_layers].options) || []}
                      onChange={event => this.handleChange(event, field.field, layer.key, field.type)}
                      onSubChange={this.handleSubChange}
                      isEditable
                      readOnly={false}
                      isRequired={field.required || false}
                      placeholder={field.placeholder || ''}
                      option_layers={field.option_layers}
                      value_system={field.value_system || unit.key}
                      onClick={() => this.handleClick(layer.key, field, (field.value_system || unit.key))}
                      inline={true}
                    />
                  </td>
                )
              }
            })
          })
        }
        <td>
          {this.renderButtons()}
        </td>
      </tr>
    )
  }
}

GenericElInlineProperties.propTypes = {
  genericEl: PropTypes.object,
  onSave: PropTypes.func,
  showDetails: PropTypes.func
};
