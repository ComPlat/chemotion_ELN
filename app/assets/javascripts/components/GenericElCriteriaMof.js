import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import { sortBy, filter } from 'lodash';
import { GenProperties, GenPropertiesLayerSearchCriteria } from './GenericElCommon';
import GenericEl from './models/GenericEl';

const buildCriteriaMof = (props) => {
  const { genericEl } = props;
  if (!genericEl) return (<span />);
  const options = [];
  const defaultName = <GenProperties label="name" value={genericEl.name || ''} type="text" onChange={event => props.onChange(event, 'name', '')} isEditable isRequired={false} />;
  options.push(defaultName);
  const filterLayers = filter(genericEl.properties, l => l.condition == null || l.condition.trim().length === 0) || [];
  const sortedLayers = sortBy(filterLayers, l => l.position) || [];
  sortedLayers.forEach((layerProps) => {
    const ig = (
      <GenPropertiesLayerSearchCriteria
        layer={layerProps}
        onChange={props.onChange}
        selectOptions={genericEl.select_options || {}}
      />
    );
    options.push(ig);
  });
  //const specific = genericEl.properties.type_layer && genericEl.properties.type_layer.fields.find(e => e.field === 'mof_method').value;

  const filterConLayers = filter(genericEl.properties, l => l.condition && l.condition.trim().length > 0) || [];
  const sortedConLayers = sortBy(filterConLayers, l => l.position) || [];

  sortedConLayers.forEach((layerProps) => {
    const arr = layerProps.condition.split(',');
    if (arr.length >= 3) {
      const specific = genericEl.properties[`${arr[0].trim()}`] && genericEl.properties[`${arr[0].trim()}`].fields.find(e => e.field === `${arr[1].trim()}`).value;

      if (specific == arr[2] && arr[2].trim()) {
        const igs = (
          <GenPropertiesLayerSearchCriteria
            layer={layerProps}
            onChange={props.onChange}
            selectOptions={genericEl.select_options || {}}
          />
        );
        options.push(igs);
      }
    }
  });

  return (
    <div style={{ margin: '15px' }}>
      {options}
    </div>
  );
};

buildCriteriaMof.propTypes = {
  genericEl: PropTypes.instanceOf(GenericEl),
  onChange: PropTypes.func,
};

buildCriteriaMof.defaultProps = {
  genericEl: null,
  onChange: () => {}
};

export default class GenericElCriteriaMof extends Component {
  constructor(props) {
    super(props);
    this.state = {
      genericEl: props.genericEl,
    };

    this.onChange = this.onChange.bind(this);
  }

  onChange(event, field, layer, type = 'text') {
    const { genericEl } = this.state;
    const { properties } = genericEl;
    let value = '';
    if (type === 'select') {
      ({ value } = event);
    } else {
      ({ value } = event.target);
    }
    if (typeof value === 'string') value = value.trim();
    if (field === 'name' && layer === '') {
      genericEl.name = value;
    } else {
      properties[`${layer}`].fields.find(e => e.field === field).value = value;
    }
    genericEl.properties = properties;
    genericEl.changed = true;
    this.setState({ genericEl });
  }

  render() {
    const { genericEl } = this.state;
    return (
      <div className="search_criteria_mof">
        <div className="modal_body">
          {buildCriteriaMof({ genericEl, onChange: this.onChange })}
        </div>
        <div className="btn_footer">
          <Button bsStyle="primary" onClick={this.props.onSearch}>
            Search
          </Button>&nbsp;
          <Button bsStyle="warning" onClick={this.props.onHide}>
            Close
          </Button>
        </div>
      </div >
    );
  }
}

GenericElCriteriaMof.propTypes = {
  genericEl: PropTypes.instanceOf(GenericEl),
  onHide: PropTypes.func,
  onSearch: PropTypes.func,
};

GenericElCriteriaMof.defaultProps = {
  genericEl: null,
  onHide: () => { },
  onSearch: () => { }
};
