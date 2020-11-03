import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Row, Col } from 'react-bootstrap';
import { sortBy, filter } from 'lodash';
import { GenProperties, GenPropertiesLayerSearchCriteria } from './GenericElCommon';
import GenericEl from './models/GenericEl';

const buildCriteria = (props) => {
  const { genericEl } = props;
  console.log(genericEl);
  if (!genericEl) return (<span />);
  const options = [];
  const defaultName = (
    <Row>
      <Col md={6}>
        <GenProperties label="name" value={genericEl.search_name || ''} type="text" onChange={event => props.onChange(event, 'search_name', '')} isEditable isRequired={false} />
      </Col>
      <Col md={6}>
        <GenProperties label="Short Label" value={genericEl.search_short_label || ''} type="text" onChange={event => props.onChange(event, 'search_short_label', '')} isEditable isRequired={false} />
      </Col>
    </Row>
  );

  options.push(defaultName);

  const filterLayers = filter(genericEl.properties_template.layers, l => l.condition == null || l.condition.trim().length === 0) || [];
  const sortedLayers = sortBy(filterLayers, l => l.position) || [];
  sortedLayers.forEach((layerProps) => {
    const ig = (
      <GenPropertiesLayerSearchCriteria
        layer={layerProps}
        onChange={props.onChange}
        selectOptions={genericEl.properties_template.select_options || {}}
      />
    );
    options.push(ig);
  });
  //const specific = genericEl.properties.type_layer && genericEl.properties.type_layer.fields.find(e => e.field === 'mof_method').value;

  const filterConLayers = filter(genericEl.properties_template.layers, l => l.condition && l.condition.trim().length > 0) || [];
  const sortedConLayers = sortBy(filterConLayers, l => l.position) || [];

  sortedConLayers.forEach((layerProps) => {
    const arr = layerProps.condition.split(',');
    if (arr.length >= 3) {
      const specific = genericEl.properties_template.layers[`${arr[0].trim()}`] && genericEl.properties_template.layers[`${arr[0].trim()}`].fields.find(e => e.field === `${arr[1].trim()}`).value;

      if (specific == arr[2] && arr[2].trim()) {
        const igs = (
          <GenPropertiesLayerSearchCriteria
            layer={layerProps}
            onChange={props.onChange}
            selectOptions={genericEl.properties_template.select_options || {}}
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

buildCriteria.propTypes = {
  genericEl: PropTypes.instanceOf(GenericEl),
  onChange: PropTypes.func,
};

buildCriteria.defaultProps = {
  genericEl: null,
  onChange: () => {}
};

export default class GenericElCriteria extends Component {
  constructor(props) {
    super(props);
    this.state = {
      genericEl: props.genericEl,
    };

    this.onChange = this.onChange.bind(this);
    this.onSearch = this.onSearch.bind(this);
  }

  onChange(event, field, layer, type = 'text') {
    const { genericEl } = this.state;
    const { properties_template } = genericEl;
    let value = '';
    if (type === 'select') {
      ({ value } = event);
    } else {
      ({ value } = event.target);
    }
    if (typeof value === 'string') value = value.trim();
    if (field === 'search_name' && layer === '') {
      genericEl.search_name = value;
    } else {
      properties_template.layers[`${layer}`].fields.find(e => e.field === field).value = value;
    }
    // eslint-disable-next-line camelcase
    genericEl.search_properties = properties_template;
    genericEl.changed = true;
    this.setState({ genericEl });
  }

  onSearch() {
    const { genericEl } = this.state;
    this.props.onSearch(genericEl);
  }
  render() {
    const { genericEl } = this.state;
    console.log(genericEl);
    return (
      <div className="search_criteria_mof">
        <div className="modal_body">
          {buildCriteria({ genericEl, onChange: this.onChange })}
        </div>
        <div className="btn_footer">
          <Button bsStyle="warning" onClick={this.props.onHide}>
            Close
          </Button>
          <Button bsStyle="primary" disabled onClick={this.onSearch}>
            Search
          </Button>&nbsp;
        </div>
      </div >
    );
  }
}

GenericElCriteria.propTypes = {
  genericEl: PropTypes.instanceOf(GenericEl),
  onHide: PropTypes.func,
  onSearch: PropTypes.func,
};

GenericElCriteria.defaultProps = {
  genericEl: null,
  onHide: () => { },
  onSearch: () => { }
};
