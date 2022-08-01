import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { findIndex, cloneDeep } from 'lodash';
import { Panel, Button, ButtonToolbar, OverlayTrigger, Tooltip, Tab } from 'react-bootstrap';
import UserStore from 'src/stores/alt/stores/UserStore';
import { LayersLayout, UploadInputChange } from 'src/components/generic/GenericElCommon';
import Segment from 'src/models/Segment';
import MatrixCheck from 'src/components/common/MatrixCheck';
import { notification, genUnits, toBool, toNum, unitConversion } from 'src/apps/admin/generic/Utils';
import { organizeSubValues } from 'src/apps/admin/generic/collate';
import PreviewModal from 'src/components/generic/PreviewModal';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';

const addSegmentTabs = (element, onChange, contentMap) => {
  const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
  if (!MatrixCheck(currentUser.matrix, 'segment')) return;
  let segmentKlasses = (UserStore.getState() && UserStore.getState().segmentKlasses) || [];
  segmentKlasses = segmentKlasses.filter(s => s.element_klass && s.element_klass.name === element.type);
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
  segmentKlasses = segmentKlasses.filter(s => s.element_klass && s.element_klass.name === element.type);
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
    this.state = { showHistory: false, showReload: false };
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubChange = this.handleSubChange.bind(this);
    this.handleUnitClick = this.handleUnitClick.bind(this);
    this.handleReload = this.handleReload.bind(this);
    this.handleRetriveRevision = this.handleRetriveRevision.bind(this);
    this.handleDelRevision = this.handleDelRevision.bind(this);
  }

  handleSubChange(layer, obj, valueOnly = false) {
    const { segment } = this.props;
    const { properties } = segment;
    if (!valueOnly) {
      const subFields = properties.layers[`${layer}`].fields.find(m => m.field === obj.f.field).sub_fields || [];
      const idxSub = subFields.findIndex(m => m.id === obj.sub.id);
      subFields.splice(idxSub, 1, obj.sub);
      properties.layers[`${layer}`].fields.find(e => e.field === obj.f.field).sub_fields = subFields;
    }
    properties.layers[`${layer}`].fields.find(e => e.field === obj.f.field).sub_values = obj.f.sub_values || [];
    segment.properties = properties;
    segment.changed = true;
    this.props.onChange(segment);
  }

  handleInputChange(event, field, layer, type = 'text') {
    const { segment } = this.props;
    const { properties } = segment;
    let value = '';
    switch (type) {
      case 'checkbox':
        value = event.target.checked;
        break;
      case 'formula-field':
        if (event.target) {
          ({ value } = event.target);
        } else {
          value = event;
        }
        break;
      case 'upload': {
        const vals = UploadInputChange(properties, event, field, layer);
        value = vals[0];
        if (vals[1].length > 0) segment.files = (segment.files || []).concat(vals[1]);
        if (vals.length > 2) {
          const fileIdx = findIndex((segment.files || []), o => o.uid === event.uid);
          if (fileIdx >= 0 && segment.files && segment.files.length > 0) segment.files.splice(fileIdx, 1);
        }
        break;
      }
      case 'select':
        value = event ? event.value : null;
        break;
      case 'drag_molecule':
        value = event;
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
    segment.properties = properties;
    segment.changed = true;
    this.props.onChange(segment);
  }

  handleUnitClick(layer, obj) {
    const { segment } = this.props;
    const { properties } = segment;
    const newVal = unitConversion(obj.option_layers, obj.value_system, obj.value);
    properties.layers[`${layer}`].fields.find(e => e.field === obj.field).value_system = obj.value_system;
    properties.layers[`${layer}`].fields.find(e => e.field === obj.field).value = newVal;
    segment.properties = properties;
    segment.changed = true;
    this.props.onChange(segment);
  }

  handleReload() {
    const { klass, segment } = this.props;
    const newProps = cloneDeep(klass.properties_release);
    newProps.klass_uuid = klass.uuid;
    Object.keys(newProps.layers).forEach((key) => {
      const newLayer = newProps.layers[key] || {};
      const curFields = (segment.properties.layers[key] && segment.properties.layers[key].fields) || [];
      (newLayer.fields || []).forEach((f, idx) => {
        const curIdx = findIndex(curFields, o => o.field === f.field);
        if (curIdx >= 0) {
          const curVal = segment.properties.layers[key].fields[curIdx].value;
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
              u.key === segment.properties.layers[key].fields[curIdx].value_system);
            newProps.layers[key].fields[idx].value_system = (vs && vs.key) || units[0].key;
            newProps.layers[key].fields[idx].value = toNum(curVal);
          }
          if (newProps.layers[key].fields[idx].type === 'input-group') {
            if (segment.properties.layers[key].fields[curIdx].type !== newProps.layers[key].fields[idx].type) {
              newProps.layers[key].fields[idx].value = undefined;
            } else {
              const nSubs = newProps.layers[key].fields[idx].sub_fields || [];
              const cSubs = segment.properties.layers[key].fields[curIdx].sub_fields || [];
              const exSubs = [];
              if (nSubs.length < 1) {
                newProps.layers[key].fields[idx].value = undefined;
              } else {
                nSubs.forEach((nSub) => {
                  const hitSub = cSubs.find(c => c.id === nSub.id) || {};
                  if (nSub.type === 'label') { exSubs.push(nSub); }
                  if (nSub.type === 'text') {
                    if (hitSub.type === 'label') {
                      exSubs.push(nSub);
                    } else { exSubs.push({ ...nSub, value: (hitSub.value || '').toString() }); }
                  }

                  if (['number', 'system-defined'].includes(nSub.type)) {
                    const nvl = (typeof hitSub.value === 'undefined' || hitSub.value == null || hitSub.value.length === 0) ? '' : toNum(hitSub.value);
                    if (nSub.option_layers === hitSub.option_layers) {
                      exSubs.push({ ...nSub, value: nvl, value_system: hitSub.value_system });
                    } else {
                      exSubs.push({ ...nSub, value: nvl });
                    }
                  }
                });
              }
              newProps.layers[key].fields[idx].sub_fields = exSubs;
            }
          }
          if (newProps.layers[key].fields[idx].type === 'upload') {
            if (segment.properties.layers[key].fields[curIdx].type === newProps.layers[key].fields[idx].type) {
              newProps.layers[key].fields[idx].value = segment.properties.layers[key].fields[curIdx].value;
            } else {
              newProps.layers[key].fields[idx].value = {};
            }
          }
          if (newProps.layers[key].fields[idx].type === 'table') {
            if (segment.properties.layers[key].fields[curIdx].type !== newProps.layers[key].fields[idx].type) {
              newProps.layers[key].fields[idx].sub_values = [];
            } else {
              newProps.layers[key].fields[idx].sub_values = organizeSubValues(newProps.layers[key].fields[idx], segment.properties.layers[key].fields[curIdx]);
            }
          }
        }
      });
    });
    segment.properties = newProps;
    segment.changed = true;
    this.props.onChange(segment);
  }

  handleRetriveRevision(revision, cb) {
    const { segment } = this.props;
    segment.properties = revision;
    segment.changed = true;
    this.setState({ showHistory: false }, this.props.onChange(segment));
  }

  handleDelRevision(params, cb) {
    const { segment } = this.props;
    GenericElsFetcher.deleteRevisions({ id: params.id, element_id: segment.id, klass: 'Segment' })
      .then((response) => {
        if (response.error) {
          notification({ title: 'Delete Revision', lvl: 'error', msg: response.error });
        } else {
          cb();
        }
      });
  }

  elementalPropertiesItem(segment) {
    const layersLayout = LayersLayout(
      segment.properties.layers,
      segment.properties.select_options || {},
      this.handleInputChange,
      this.handleSubChange,
      this.handleUnitClick
    );
    return (<div style={{ margin: '5px' }}>{layersLayout}</div>);
  }

  render() {
    const { segment, klass } = this.props;
    const hisBtn = segment.is_new ? null : (
      <OverlayTrigger placement="top" overlay={<Tooltip id="_tooltip_history">click to view the history</Tooltip>}>
        <Button bsSize="xsmall" className="generic_btn_default" onClick={() => this.setState({ showHistory: true })}><i className="fa fa-book" aria-hidden="true" />&nbsp;History</Button>
      </OverlayTrigger>
    );
    const reloadBtn = (segment && (typeof segment.klass_uuid === 'undefined' || segment.klass_uuid === klass.uuid || segment.is_new)) ? null : (
      <OverlayTrigger placement="top" overlay={<Tooltip id="_tooltip_reload">click to reload the template</Tooltip>}>
        <Button bsSize="xsmall" bsStyle="primary" onClick={() => this.handleReload()}><i className="fa fa-refresh" aria-hidden="true" />&nbsp;Reload</Button>
      </OverlayTrigger>
    );

    const hisModal = segment.is_new ? null : (
      <PreviewModal
        showModal={this.state.showHistory || false}
        fnClose={() => this.setState({ showHistory: false })}
        fnRetrive={this.handleRetriveRevision}
        fnDelete={this.handleDelRevision}
        element={segment}
        fetcher={GenericElsFetcher}
        fetcherFn="fetchSegmentRevisions"
      />
    );
    return (
      <div>
        <ButtonToolbar style={{ margin: '5px 0px' }}>
          {reloadBtn}
          {hisBtn}
        </ButtonToolbar>
        <Panel>
          <Panel.Body style={{ position: 'relative', minHeight: 260, overflowY: 'unset' }}>
            {this.elementalPropertiesItem(segment)}
          </Panel.Body>
        </Panel>
        {hisModal}
      </div>
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
