/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { findIndex, cloneDeep } from 'lodash';
import { Panel, Button, ButtonToolbar, OverlayTrigger, Tooltip } from 'react-bootstrap';
import UserStore from 'src/stores/alt/stores/UserStore';
import { LayersLayout } from 'src/components/generic/GenericElCommon';
import MatrixCheck from 'src/components/common/MatrixCheck';
import { genUnits, toBool, toNum, unitConversion, absOlsTermLabel } from 'src/apps/admin/generic/Utils';

class GenericDSDetails extends Component {
  constructor(props) {
    super(props);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleUnitClick = this.handleUnitClick.bind(this);
    this.handleReload = this.handleReload.bind(this);
  }

  handleInputChange(event, field, layer, type = 'text') {
    const { genericDS } = this.props;
    const { properties } = genericDS;
    let value = '';
    switch (type) {
      case 'checkbox':
        value = event.target.checked;
        break;
      case 'select':
        value = event ? event.value : null;
        break;
      case 'formula-field':
        if (event.target) {
          ({ value } = event.target);
        } else {
          value = event;
        }
        break;
      case 'integer':
        ({ value } = event.target);
        value = Math.trunc(value);
        break;
      default:
        ({ value } = event.target);
    }
    properties.layers[`${layer}`].fields.find(e => e.field === field).value = value;
    if (type === 'system-defined' && (!properties.layers[`${layer}`].fields.find(e => e.field === field).value_system || properties.layers[`${layer}`].fields.find(e => e.field === field).value_system === '')) {
      const opt = properties.layers[`${layer}`].fields.find(e => e.field === field).option_layers;
      properties.layers[`${layer}`].fields.find(e => e.field === field).value_system = genUnits(opt)[0].key;
    }
    genericDS.properties = properties;
    genericDS.changed = true;
    this.props.onChange('dataset', { target: { value: genericDS } });
  }

  handleUnitClick(layer, obj) {
    const { genericDS } = this.props;
    const { properties } = genericDS;
    const newVal = unitConversion(obj.option_layers, obj.value_system, obj.value);
    properties.layers[`${layer}`].fields.find(e => e.field === obj.field).value_system = obj.value_system;
    properties.layers[`${layer}`].fields.find(e => e.field === obj.field).value = newVal;
    genericDS.properties = properties;
    genericDS.changed = true;
    this.props.onChange('dataset', { target: { value: genericDS } });
  }

  handleReload() {
    const { klass, genericDS } = this.props;
    if (klass.properties_release) {
      const newProps = cloneDeep(klass.properties_release);
      newProps.klass_uuid = klass.uuid;
      Object.keys(newProps.layers).forEach((key) => {
        const newLayer = newProps.layers[key] || {};
        const curFields = (genericDS.properties.layers[key] && genericDS.properties.layers[key].fields) || [];
        (newLayer.fields || []).forEach((f, idx) => {
          const curIdx = findIndex(curFields, o => o.field === f.field);
          if (curIdx >= 0) {
            const curVal = genericDS.properties.layers[key].fields[curIdx].value;
            const curType = typeof curVal;
            if (['select', 'text', 'textarea', 'formula-field'].includes(newProps.layers[key].fields[idx].type)) {
              newProps.layers[key].fields[idx].value = curType !== 'undefined' ? curVal.toString() : '';
            }
            if (newProps.layers[key].fields[idx].type === 'integer') {
              newProps.layers[key].fields[idx].value = (curType === 'undefined' || curType === 'boolean' || isNaN(curVal)) ? 0 : parseInt(curVal, 10);
            }
            if (newProps.layers[key].fields[idx].type === 'checkbox') {
              newProps.layers[key].fields[idx].value = curType !== 'undefined' ? toBool(curVal) : false;
            }
            if (newProps.layers[key].fields[idx].type === 'system-defined') {
              const units = genUnits(newProps.layers[key].fields[idx].option_layers);
              const vs = units.find(u =>
                u.key === genericDS.properties.layers[key].fields[curIdx].value_system);
              newProps.layers[key].fields[idx].value_system = (vs && vs.key) || units[0].key;
              newProps.layers[key].fields[idx].value = toNum(curVal);
            }
          }
        });
      });
      genericDS.properties = newProps;
      genericDS.dataset_klass_id = klass.id;
      genericDS.klass_ols = klass.ols_term_id;
      genericDS.klass_label = klass.label;
      genericDS.changed = true;
      this.props.onChange('dataset', { target: { value: genericDS } });
    } else {
      this.props.onChange('dataset', { target: { value: undefined } });
    }
  }

  elementalPropertiesItem(genericDS, klass) {
    const layersLayout = LayersLayout(
      genericDS.properties.layers,
      (klass.properties_release && klass.properties_release.select_options) || {},
      this.handleInputChange,
      this.handleUnitClick
    );
    return (<div style={{ margin: '5px' }}>{layersLayout}</div>);
  }

  render() {
    const { genericDS, klass, kind } = this.props;
    const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
    if (MatrixCheck(currentUser.matrix, 'genericDataset') && Object.keys(genericDS || {}).length !== 0) {
      return (
        <Panel className="panel-detail">
          <Panel.Body style={{ position: 'relative', minHeight: 260, overflowY: 'unset' }}>
            {this.elementalPropertiesItem(genericDS, klass)}
            <span className="g-ds-note label">
              <span className="g-ds-title">Note</span><br />
              Selected analysis type: {absOlsTermLabel(kind)}<br />
              Content is designed for: {genericDS.klass_label}
            </span>
            <ButtonToolbar className="pull-right">
              <OverlayTrigger placement="top" overlay={<Tooltip id="_tooltip_reload">click to reload the content template</Tooltip>}>
                <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleReload()}>Reload</Button>
              </OverlayTrigger>
            </ButtonToolbar>
          </Panel.Body>
        </Panel>
      );
    }
    return null;
  }
}

GenericDSDetails.propTypes = {
  kind: PropTypes.string.isRequired,
  genericDS: PropTypes.object,
  klass: PropTypes.object,
  onChange: PropTypes.func.isRequired
};
GenericDSDetails.defaultProps = { genericDS: {}, klass: {} };

export default GenericDSDetails;
