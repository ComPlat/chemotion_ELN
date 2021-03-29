/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { findIndex, cloneDeep } from 'lodash';
import { Panel, Button, ButtonToolbar, OverlayTrigger, Tooltip } from 'react-bootstrap';
import UserStore from '../stores/UserStore';
import { LayersLayout } from './GenericElCommon';
import MatrixCheck from '../common/MatrixCheck';
import { genUnits, toBool, unitConversion, absOlsTermLabel } from '../../admin/generic/Utils';

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
      case 'integer':
        ({ value } = event.target);
        value = Math.trunc(value);
        break;
      default:
        ({ value } = event.target);
    }
    properties[`${layer}`].fields.find(e => e.field === field).value = value;
    if (type === 'system-defined' && (!properties[`${layer}`].fields.find(e => e.field === field).value_system || properties[`${layer}`].fields.find(e => e.field === field).value_system === '')) {
      const opt = properties[`${layer}`].fields.find(e => e.field === field).option_layers;
      properties[`${layer}`].fields.find(e => e.field === field).value_system = genUnits(opt)[0].key;
    }
    genericDS.properties = properties;
    genericDS.changed = true;
    this.props.onChange('dataset', { target: { value: genericDS } });
  }

  handleUnitClick(layer, obj) {
    const { genericDS } = this.props;
    const { properties } = genericDS;
    const newVal = unitConversion(obj.option_layers, obj.value_system, obj.value);
    properties[`${layer}`].fields.find(e => e.field === obj.field).value_system = obj.value_system;
    properties[`${layer}`].fields.find(e => e.field === obj.field).value = newVal;
    genericDS.properties = properties;
    genericDS.changed = true;
    this.props.onChange('dataset', { target: { value: genericDS } });
  }

  handleReload() {
    const { klass, genericDS } = this.props;
    if (klass.properties_template) {
      const newProps = cloneDeep(klass.properties_template.layers);
      Object.keys(newProps).forEach((key) => {
        const newLayer = newProps[key] || {};
        const curFields = (genericDS.properties[key] && genericDS.properties[key].fields) || [];
        (newLayer.fields || []).forEach((f, idx) => {
          const curIdx = findIndex(curFields, o => o.field === f.field);
          if (curIdx >= 0) {
            const curVal = genericDS.properties[key].fields[curIdx].value;
            const curType = typeof curVal;
            if (newProps[key].fields[idx].type === 'text') {
              newProps[key].fields[idx].value = curType !== 'undefined' ? curVal.toString() : '';
            }
            if (newProps[key].fields[idx].type === 'integer') {
              newProps[key].fields[idx].value = (curType === 'undefined' || curType === 'boolean' || isNaN(curVal)) ? 0 : parseInt(curVal, 10);
            }
            if (newProps[key].fields[idx].type === 'checkbox') {
              newProps[key].fields[idx].value = curType !== 'undefined' ? toBool(curVal) : false;
            }
            if (newProps[key].fields[idx].type === 'system-defined') {
              const units = genUnits(newProps[key].fields[idx].option_layers);
              const vs = units.find(u =>
                u.key === genericDS.properties[key].fields[curIdx].value_system);
              newProps[key].fields[idx].value_system = (vs && vs.key) || units[0].key;
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
      genericDS.properties,
      (klass.properties_template && klass.properties_template.select_options) || {},
      this.handleInputChange,
      this.handleUnitClick
    );
    return (<div style={{ margin: '5px' }}>{layersLayout}</div>);
  }

  render() {
    const { genericDS, klass, kind } = this.props;
    const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
    if (MatrixCheck(currentUser.matrix, 'genericDataset') && Object.keys(genericDS).length !== 0) {
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
