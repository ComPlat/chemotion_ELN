/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Row, Col } from 'react-bootstrap';
import { sortBy } from 'lodash';
import { GenProperties, GenPropertiesLayerSearchCriteria } from 'src/components/generic/GenericElCommon';
import GenericEl from 'src/models/GenericEl';

const buildCriteria = (props) => {
  const { genericEl } = props;
  if (!genericEl) return (<span />);
  const layout = [];
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

  layout.push(defaultName);

  const { layers } = genericEl.properties_template;
  const sortedLayers = sortBy(genericEl.properties_template.layers, l => l.position) || [];

  sortedLayers.forEach((layer) => {
    if (layer.condition == null || layer.condition.trim().length === 0) {
      const ig = (
        <GenPropertiesLayerSearchCriteria
          layer={layer}
          onSubChange={props.onSubChange}
          onChange={props.onChange}
          selectOptions={genericEl.properties_template.select_options || {}}
          layers={sortedLayers}
        />
      );
      layout.push(ig);
    } else if (layer.condition && layer.condition.trim().length > 0) {
      const conditions = layer.condition.split(';');
      let showLayer = false;

      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < conditions.length; i++) {
        const arr = conditions[i].split(',');
        if (arr.length >= 3) {
          const specificObj = layers[`${arr[0].trim()}`] && layers[`${arr[0].trim()}`].fields.find(e => e.field === `${arr[1].trim()}`) && layers[`${arr[0].trim()}`].fields.find(e => e.field === `${arr[1].trim()}`);
          const specific = specificObj && specificObj.value;
          if ((specific && specific.toString()) === (arr[2] && arr[2].toString().trim())) {
            showLayer = true;
            break;
          }
        }
      }

      if (showLayer === true) {
        const igs = (
          <GenPropertiesLayerSearchCriteria
            layer={layer}
            onSubChange={props.onSubChange}
            onChange={props.onChange}
            selectOptions={genericEl.properties_template.select_options || {}}
            layers={sortedLayers}
          />
        );
        layout.push(igs);
      }
    }
  });

  return (
    <div style={{ margin: '15px' }}>{layout}</div>
  );
};

buildCriteria.propTypes = {
  genericEl: PropTypes.instanceOf(GenericEl), onChange: PropTypes.func, onSubChange: PropTypes.func
};

buildCriteria.defaultProps = {
  genericEl: null, onChange: () => {}, onSubChange: () => {}
};

export default class GenericElCriteria extends Component {
  constructor(props) {
    super(props);
    this.state = {
      genericEl: props.genericEl,
    };
    this.onSubChange = this.onSubChange.bind(this);
    this.onChange = this.onChange.bind(this);
    this.onSearch = this.onSearch.bind(this);
  }

  onSubChange(layer, obj) {
    const { genericEl } = this.state;
    const { properties_template } = genericEl;
    const subFields = properties_template.layers[`${layer}`].fields.find(m => m.field === obj.f.field).sub_fields || [];
    const idxSub = subFields.findIndex(m => m.id === obj.sub.id);
    subFields.splice(idxSub, 1, obj.sub);
    properties_template.layers[`${layer}`].fields.find(e => e.field === obj.f.field).sub_fields = subFields;
    genericEl.search_properties = properties_template;
    genericEl.changed = true;
    this.setState({ genericEl });
  }

  onChange(event, field, layer, type = 'text') {
    const { genericEl } = this.state;
    const { properties_template } = genericEl;
    let value = '';
    if (type === 'select') {
      value = event ? event.value : null;
    } else if (type === 'checkbox') {
      value = event.target.checked;
    } else {
      ({ value } = event.target);
    }
    if (typeof value === 'string') value = value.trim();
    if (field === 'search_name' && layer === '') {
      genericEl.search_name = value;
    } else if (field === 'search_short_label' && layer === '') {
      genericEl.search_short_label = value;
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
    return (
      <div className="search_criteria_mof">
        <div className="modal_body">
          {buildCriteria({ genericEl, onChange: this.onChange, onSubChange: this.onSubChange })}
        </div>
        <div className="btn_footer">
          <Button bsStyle="warning" onClick={this.props.onHide}>
            Close
          </Button>
          &nbsp;
          <Button bsStyle="primary" onClick={this.onSearch}>
            Search
          </Button>&nbsp;
        </div>
      </div >
    );
  }
}

GenericElCriteria.propTypes = {
  genericEl: PropTypes.object,
  onHide: PropTypes.func,
  onSearch: PropTypes.func,
};

GenericElCriteria.defaultProps = {
  genericEl: null,
  onHide: () => {},
  onSearch: () => {}
};
