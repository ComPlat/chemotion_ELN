import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { findIndex, cloneDeep } from 'lodash';
import { Panel, Button, ButtonToolbar, OverlayTrigger, Tooltip, Tab } from 'react-bootstrap';
import UserStore from '../stores/UserStore';
import { LayersLayout } from './GenericElCommon';
import Segment from '../models/Segment';
import MatrixCheck from '../common/MatrixCheck';
import { genUnits, toBool } from '../../admin/generic/Utils';

const addSegmentTabs = (element, onChange, contentMap) => {
  const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
  if (!MatrixCheck(currentUser.matrix, 'segment')) return [];
  let segmentKlasses = (UserStore.getState() && UserStore.getState().segmentKlasses) || [];
  segmentKlasses = segmentKlasses.filter(s => s.element_klass.name === element.type);
  segmentKlasses.forEach((klass) => {
    const ttl = (
      <Tooltip id="tooltip">
        {klass.desc}
      </Tooltip>
    );

    const idx = findIndex(element.segments, o => o.segment_klass_id === klass.id);
    let segment = {};
    if (idx > -1) {
      segment = element.segments[idx];
    } else {
      segment = Segment.buildEmpty(cloneDeep(klass));
    }
    const title = (<OverlayTrigger placement="bottom" delayShow={1000} overlay={ttl}><div>{klass.label}</div></OverlayTrigger>);
    contentMap[klass.label] = (
      <Tab eventKey={klass.label} key={`${element.type}_${element.id}_${klass.id}`} title={title} >
        <SegmentDetails
          segment={segment}
          klass={klass}
          onChange={e => onChange(e)}
        />
      </Tab>
    );
  });
};


const SegmentTabs = (element, onChange, init = 0) => {
  const result = [];
  const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
  if (!MatrixCheck(currentUser.matrix, 'segment')) return [];
  let segmentKlasses = (UserStore.getState() && UserStore.getState().segmentKlasses) || [];
  segmentKlasses = segmentKlasses.filter(s => s.element_klass.name === element.type);
  segmentKlasses.forEach((klass) => {
    console.log(klass);
    const ttl = (
      <Tooltip id="tooltip">
        {klass.desc}
      </Tooltip>
    );

    const idx = findIndex(element.segments, o => o.segment_klass_id === klass.id);
    let segment = {};
    if (idx > -1) {
      segment = element.segments[idx];
    } else {
      segment = Segment.buildEmpty(cloneDeep(klass));
    }
    const title = (<OverlayTrigger placement="bottom" delayShow={1000} overlay={ttl}><div>{klass.label}</div></OverlayTrigger>);
    result.push((() => (
      <Tab eventKey={init + klass.id} key={init + klass.id} title={title} >
        <SegmentDetails
          segment={segment}
          klass={klass}
          onChange={e => onChange(e)}
        />
      </Tab>
    )));
  });
  return result;
};

class SegmentDetails extends Component {
  constructor(props) {
    super(props);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleUnitClick = this.handleUnitClick.bind(this);
    this.handleReload = this.handleReload.bind(this);
  }

  handleInputChange(event, field, layer, type = 'text') {
    const { segment } = this.props;
    const { properties } = segment;
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
    segment.properties = properties;
    segment.changed = true;
    this.props.onChange(segment);
  }

  handleUnitClick(layer, obj) {
    const { segment } = this.props;
    const { properties } = segment;
    properties[`${layer}`].fields.find(e => e.field === obj.field).value_system = obj.value_system;
    segment.properties = properties;
    segment.changed = true;
    this.props.onChange(segment);
  }

  handleReload() {
    const { klass, segment } = this.props;
    const newProps = cloneDeep(klass.properties_template.layers);
    Object.keys(newProps).forEach((key) => {
      const newLayer = newProps[key] || {};
      const curFields = (segment.properties[key] && segment.properties[key].fields) || [];
      (newLayer.fields || []).forEach((f, idx) => {
        const curIdx = findIndex(curFields, o => o.field === f.field);
        if (curIdx >= 0) {
          const curVal = segment.properties[key].fields[curIdx].value;
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
              u.key === segment.properties[key].fields[curIdx].value_system);
            newProps[key].fields[idx].value_system = (vs && vs.key) || units[0].key;
          }
        }
      });
    });
    segment.properties = newProps;
    segment.changed = true;
    this.props.onChange(segment);
  }

  elementalPropertiesItem(segment, klass) {
    const layersLayout = LayersLayout(
      segment.properties,
      klass.properties_template.select_options || {},
      this.handleInputChange,
      this.handleUnitClick
    );
    return (<div style={{ margin: '5px' }}>{layersLayout}</div>);
  }

  render() {
    const { segment, klass } = this.props;
    return (
      <Panel className="panel-detail">
        <Panel.Body>
          {this.elementalPropertiesItem(segment, klass)}
          <ButtonToolbar className="pull-right">
            <OverlayTrigger placement="top" overlay={<Tooltip id="_tooltip_reload">click to reload the template</Tooltip>}>
              <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleReload()}>Reload</Button>
            </OverlayTrigger>
          </ButtonToolbar>
        </Panel.Body>
      </Panel>
    );
  }
}

SegmentDetails.propTypes = {
  segment: PropTypes.object,
  klass: PropTypes.object,
  onChange: PropTypes.func.isRequired,
};

SegmentDetails.defaultProps = {
  segment: {},
  klass: {}
};

export { SegmentDetails, SegmentTabs, addSegmentTabs };
