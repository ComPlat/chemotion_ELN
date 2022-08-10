/* eslint-disable camelcase */
/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Badge, Col } from 'react-bootstrap';
import { cloneDeep } from 'lodash';
import { GenProperties, LayersLayout } from 'src/components/generic/GenericElCommon';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import { ButtonTooltip, ButtonConfirm, unitConversion, inputEventVal, genUnits } from 'src/apps/admin/generic/Utils';
import Utils from 'src/utilities/Functions';

export default class Preview extends Component {
  constructor(props) {
    super(props);
    this.state = { revisions: [], compareUUID: 'current', fullScreen: false };
    this.compare = this.compare.bind(this);
    this.setRevision = this.setRevision.bind(this);
    this.delRevision = this.delRevision.bind(this);
    this.retriveRevision = this.retriveRevision.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubChange = this.handleSubChange.bind(this);
    this.handleUnitClick = this.handleUnitClick.bind(this);
    this.dlRevision = this.dlRevision.bind(this);
    this.setScreen = this.setScreen.bind(this);
  }

  componentDidMount() {
    if (this.props.revisions) {
      this.setRevision(cloneDeep(this.props.revisions));
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.revisions !== prevProps.revisions) {
      this.setRevision(cloneDeep(this.props.revisions));
    }
  }

  setRevision(revisions) {
    this.setState({ revisions });
  }

  setScreen(fullScreen) {
    this.setState({ fullScreen });
  }

  compare(params) {
    LoadingActions.start();
    this.setState(
      { revisions: cloneDeep(this.props.revisions), compareUUID: params.uuid },
      LoadingActions.stop()
    );
  }

  delRevision(params) {
    this.props.fnDelete(params);
  }

  retriveRevision(params) {
    const { fnRetrive, src } = this.props;
    LoadingActions.start();
    const deep = cloneDeep(this.props.revisions.find(r => r.id === params.id));
    fnRetrive(deep[src], LoadingActions.stop());
  }


  dlRevision(params) {
    const { element, revisions } = this.props;
    LoadingActions.start();
    const revision = revisions.find(r => r.id === params.id);
    const props = revision.properties_release;
    props.klass = revision.properties_release.klass;
    props.released_at = revision.released_at || '';
    const href = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(revision.properties_release))}`;
    Utils.downloadFile({ contents: href, name: `${props.klass}_${element.label}_${revision.uuid}.json` });
    LoadingActions.stop();
  }

  handleInputChange(event, field, layer, type = 'text') {
    const { compareUUID, revisions } = this.state;
    const { src } = this.props;
    const selected = (revisions || []).find(r => r.uuid === compareUUID);
    if (selected && selected[src]) {
      const properties_release = selected[src];
      const value = inputEventVal(event, type);
      if (!((field === 'name' && layer === ''))) {
        properties_release.layers[`${layer}`].fields.find(e => e.field === field).value = value;
        if (type === 'system-defined' && (!properties_release.layers[`${layer}`].fields.find(e => e.field === field).value_system || properties_release.layers[`${layer}`].fields.find(e => e.field === field).value_system === '')) {
          const opt = properties_release.layers[`${layer}`].fields
            .find(e => e.field === field).option_layers;
          properties_release.layers[`${layer}`].fields
            .find(e => e.field === field).value_system = genUnits(opt)[0].key;
        }
        this.setRevision(revisions);
      }
    }
  }

  handleSubChange(layer, obj, valueOnly = false) {
    const { compareUUID, revisions } = this.state;
    const { src } = this.props;
    const selected = (revisions || []).find(r => r.uuid === compareUUID);
    if (selected && selected[src]) {
      const properties_release = selected[src];
      if (!valueOnly) {
        const subFields = properties_release.layers[`${layer}`].fields
          .find(m => m.field === obj.f.field).sub_fields || [];
        const idxSub = subFields.findIndex(m => m.id === obj.sub.id);
        subFields.splice(idxSub, 1, obj.sub);
        properties_release.layers[`${layer}`].fields
          .find(e => e.field === obj.f.field).sub_fields = subFields;
      }
      properties_release.layers[`${layer}`].fields
        .find(e => e.field === obj.f.field).sub_values = obj.f.sub_values || [];
      this.setRevision(revisions);
    }
  }

  handleUnitClick(layer, obj) {
    const { compareUUID, revisions } = this.state;
    const { src } = this.props;
    const selected = (revisions || []).find(r => r.uuid === compareUUID);
    const newVal = unitConversion(obj.option_layers, obj.value_system, obj.value);
    if (selected && selected[src]) {
      selected[src].layers[`${layer}`].fields
        .find(e => e.field === obj.field).value_system = obj.value_system;
      selected[src].layers[`${layer}`].fields
        .find(e => e.field === obj.field).value = newVal;
      this.setRevision(revisions);
    }
  }

  render() {
    const { compareUUID, revisions, fullScreen } = this.state;
    const { src, canDL } = this.props;
    const t = (v, idx) => {
      const s = v.uuid === compareUUID ? 'generic_block_select' : '';
      const ver = v.released_at ? `version: ${v.uuid}` : 'version:';
      let at = v.released_at ? `released at: ${v.released_at} (UTC)` : '(Work In Progress)';
      if (src === 'properties') {
        at = `saved at: ${v.released_at} (UTC)`;
      }

      const del = v.released_at ? <ButtonConfirm msg="Delete this version permanently?" fnClick={this.delRevision} fnParams={{ id: v.id }} bs="default" place="top" /> : null;
      const ret = v.released_at ? <ButtonConfirm msg="Retrieve this version?" fnClick={this.retriveRevision} fnParams={{ id: v.id }} fa="fa-reply" bs="default" place="top" /> : null;
      const dl = canDL ? <ButtonTooltip tip="Download this version" fnClick={this.dlRevision} element={{ id: v.id }} fa="fa-download" place="top" bs="default" /> : null;
      return (
        <div className={`generic_version_block ${s}`} key={v.uuid}>
          <div><div style={{ width: '100%' }}>{ver}</div><div style={{ fontSize: '0.8rem' }}>#{(idx + 1)}</div></div>
          <div>
            <div style={{ width: '100%' }}>{at}</div>
            {del}
            {dl}
            {ret}
            <ButtonTooltip tip="Preview this version" fnClick={this.compare} element={{ uuid: v.uuid }} fa="fa-clock-o" place="top" bs="default" />
          </div>
        </div>
      );
    };

    const options = [];
    const selected = (revisions || []).find(r => r.uuid === compareUUID) || {};
    const selectOptions = (selected && selected[src] &&
      selected[src].select_options) || {};

    if (selected.name) {
      const defaultName = <GenProperties label="" description={selected.description || ''} value={selected.name || ''} type="text" isEditable isRequired onChange={() => {}} />;
      options.push(defaultName);
    }

    const layersLayout = LayersLayout(
      (selected[src] || {}).layers || {},
      selectOptions || {},
      this.handleInputChange,
      this.handleSubChange,
      this.handleUnitClick,
      options,
      selected.uuid || 0
    );

    const his = fullScreen ? null : (<Col md={4}>{revisions.map((r, idx) => (t(r, idx)))}</Col>);
    const contentCol = fullScreen ? 12 : 8;
    const screenFa = fullScreen ? 'compress' : 'expand';
    return (
      <div>
        {his}
        <Col md={contentCol}>
          <div style={{ margin: '10px 0px' }}>
            <div style={{ float: 'right' }}><ButtonTooltip tip={screenFa} fnClick={this.setScreen} element={!this.state.fullScreen} fa={`fa-${screenFa}`} place="left" bs="default" /></div>
            <Badge style={{ backgroundColor: '#ffc107', color: 'black' }}><i className="fa fa-exclamation-circle" aria-hidden="true" />&nbsp;Sketch Map, the data input here will not be saved.</Badge>
          </div>
          <div style={{ width: '100%', minHeight: '50vh' }}>{layersLayout}</div>
        </Col>
      </div>
    );
  }
}

Preview.propTypes = {
  revisions: PropTypes.array,
  fnRetrive: PropTypes.func,
  fnDelete: PropTypes.func,
  canDL: PropTypes.bool,
  src: PropTypes.oneOf(['properties_release', 'properties'])
};

Preview.defaultProps = {
  revisions: [], fnRetrive: () => {}, fnDelete: () => {}, src: 'properties_release', canDL: false
};
