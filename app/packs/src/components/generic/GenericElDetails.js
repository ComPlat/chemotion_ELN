/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Panel, Button, ButtonToolbar, ListGroupItem, Tabs, Tab, ListGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { findIndex } from 'lodash';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import ConfirmClose from 'src/components/common/ConfirmClose';
import GenericElDetailsContainers from 'src/components/generic/GenericElDetailsContainers';
import { GenProperties, LayersLayout, UploadInputChange } from 'src/components/generic/GenericElCommon';
import GenericEl from 'src/models/GenericEl';
import Attachment from 'src/models/Attachment';
import CopyElementModal from 'src/components/common/CopyElementModal';
import { notification, genUnits, toBool, toNum, unitConversion } from 'src/apps/admin/generic/Utils';
import { organizeSubValues } from 'src/apps/admin/generic/collate';
import GenericAttachments from 'src/components/generic/GenericAttachments';
import { SegmentTabs } from 'src/components/generic/SegmentDetails';
import PreviewModal from 'src/components/generic/PreviewModal';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import OpenCalendarButton from 'src/components/calendar/OpenCalendarButton';
import { formatTimeStampsOfElement } from 'src/utilities/timezoneHelper';

export default class GenericElDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      genericEl: props.genericEl, activeTab: 0
    };
    this.onChangeUI = this.onChangeUI.bind(this);
    this.onChangeElement = this.onChangeElement.bind(this);
    this.handleReload = this.handleReload.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubChange = this.handleSubChange.bind(this);
    this.handleUnitClick = this.handleUnitClick.bind(this);
    this.handleAttachmentDrop = this.handleAttachmentDrop.bind(this);
    this.handleAttachmentDelete = this.handleAttachmentDelete.bind(this);
    this.handleAttachmentEdit = this.handleAttachmentEdit.bind(this);
    this.handleSegmentsChange = this.handleSegmentsChange.bind(this);
    this.handleRetriveRevision = this.handleRetriveRevision.bind(this);
    this.handleDelRevision = this.handleDelRevision.bind(this);
  }

  componentDidMount() {
    UIStore.listen(this.onChangeUI);
    ElementStore.listen(this.onChangeElement);
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onChangeUI);
    ElementStore.unlisten(this.onChangeElement);
  }

  onChangeElement(state) {
    if (state.currentElement) {
      if (state.currentElement !== this.state.genericEl && (state.currentElement.klassType === 'GenericEl' && state.currentElement.type != null)) {
        this.setState({ genericEl: state.currentElement });
      }
    }
  }

  onChangeUI(state) {
    if (state[this.state.genericEl.type]) {
      if (state[this.state.genericEl.type].activeTab !== this.state.activeTab) {
        this.setState({ activeTab: state[this.state.genericEl.type].activeTab });
      }
    }
  }

  handleGenericElChanged(el) {
    const genericEl = el;
    genericEl.changed = true;
    this.setState({ genericEl });
  }

  handleSelect(eventKey, type) {
    UIActions.selectTab({ tabKey: eventKey, type });
    this.setState({ activeTab: eventKey });
  }

  handleRetriveRevision(revision, cb) {
    const { genericEl } = this.state;
    genericEl.properties = revision;
    genericEl.changed = true;
    this.setState({ genericEl, showHistory: false }, cb);
  }

  handleDelRevision(params, cb) {
    const { genericEl } = this.state;
    GenericElsFetcher.deleteRevisions({ id: params.id, element_id: genericEl.id, klass: 'Element' })
      .then((response) => {
        if (response.error) {
          notification({ title: 'Delete Revision', lvl: 'error', msg: response.error });
        } else {
          cb();
        }
      });
  }

  handleReload() {
    const { genericEl } = this.state;
    const newProps = genericEl.element_klass.properties_release;
    newProps.klass_uuid = genericEl.element_klass.uuid;
    Object.keys(newProps.layers).forEach((key) => {
      const newLayer = newProps.layers[key] || {};
      const curFields = (genericEl.properties.layers[key] && genericEl.properties.layers[key].fields) || [];
      (newLayer.fields || []).forEach((f, idx) => {
        const curIdx = findIndex(curFields, o => o.field === f.field);
        if (curIdx >= 0) {
          const curVal = genericEl.properties.layers[key].fields[curIdx].value;
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
          if ((newProps.layers[key].fields[idx].type === 'drag_sample' && genericEl.properties.layers[key].fields[curIdx].type === 'drag_sample')
            || (newProps.layers[key].fields[idx].type === 'drag_molecule' && genericEl.properties.layers[key].fields[curIdx].type === 'drag_molecule')) {
            if (typeof curVal !== 'undefined') newProps.layers[key].fields[idx].value = curVal;
          }
          if (newProps.layers[key].fields[idx].type === 'system-defined') {
            const units = genUnits(newProps.layers[key].fields[idx].option_layers);
            const vs = units.find(u =>
              u.key === genericEl.properties.layers[key].fields[curIdx].value_system);
            newProps.layers[key].fields[idx].value_system = (vs && vs.key) || units[0].key;
            newProps.layers[key].fields[idx].value = toNum(curVal);
          }
          if (newProps.layers[key].fields[idx].type === 'input-group') {
            if (genericEl.properties.layers[key].fields[curIdx].type !== newProps.layers[key].fields[idx].type) {
              newProps.layers[key].fields[idx].value = undefined;
            } else {
              const nSubs = newProps.layers[key].fields[idx].sub_fields || [];
              const cSubs = genericEl.properties.layers[key].fields[curIdx].sub_fields || [];
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
            if (genericEl.properties.layers[key].fields[curIdx].type === newProps.layers[key].fields[idx].type) {
              newProps.layers[key].fields[idx].value = genericEl.properties.layers[key].fields[curIdx].value;
            } else {
              newProps.layers[key].fields[idx].value = {};
            }
          }
          if (newProps.layers[key].fields[idx].type === 'table') {
            if (genericEl.properties.layers[key].fields[curIdx].type !== newProps.layers[key].fields[idx].type) {
              newProps.layers[key].fields[idx].sub_values = [];
            } else {
              newProps.layers[key].fields[idx].sub_values = organizeSubValues(newProps.layers[key].fields[idx], genericEl.properties.layers[key].fields[curIdx]);
            }
          }
        }
      });
    });
    genericEl.changed = true;
    genericEl.properties = newProps;
    this.setState({ genericEl });
  }

  handleSubmit(closeView = false) {
    const { genericEl } = this.state;
    const el = new GenericEl(genericEl);
    if (!el.isValidated()) {
      notification({
        title: 'Save failed!', lvl: 'error', msg: 'Please fill out all required fields!', uid: 'save_mof_notification'
      });
      return false;
    }
    LoadingActions.start();
    genericEl.name = genericEl.name.trim();
    (Object.keys(genericEl.properties.layers) || {}).forEach((key) => {
      genericEl.properties.layers[key].fields = (genericEl.properties.layers[key].fields || []).map((f) => {
        const field = f;
        if (field.type === 'text' && typeof field.value !== 'undefined' && field.value != null) {
          field.value = field.value.trim();
        }
        return (field);
      });
    });

    if (genericEl && genericEl.isNew) {
      ElementActions.createGenericEl(genericEl);
    } else {
      ElementActions.updateGenericEl(genericEl, closeView);
    }
    if (genericEl.is_new || closeView) {
      DetailActions.close(genericEl, true);
    }
    return true;
  }

  handleSubChange(layer, obj, valueOnly = false) {
    const { genericEl } = this.state;
    const { properties } = genericEl;
    if (!valueOnly) {
      const subFields = properties.layers[`${layer}`].fields.find(m => m.field === obj.f.field).sub_fields || [];
      const idxSub = subFields.findIndex(m => m.id === obj.sub.id);
      subFields.splice(idxSub, 1, obj.sub);
      properties.layers[`${layer}`].fields.find(e => e.field === obj.f.field).sub_fields = subFields;
    }
    properties.layers[`${layer}`].fields.find(e => e.field === obj.f.field).sub_values = obj.f.sub_values || [];
    genericEl.properties = properties;
    this.handleGenericElChanged(genericEl);
  }

  handleInputChange(event, field, layer, type = 'text') {
    const { genericEl } = this.state;
    const { properties } = genericEl;
    let value = '';
    if (type === 'select') {
      value = event ? event.value : null;
    } else if (type.startsWith('drag')) {
      value = event;
    } else if (type === 'checkbox') {
      value = event.target.checked;
    } else if (type === 'upload') {
      const vals = UploadInputChange(properties, event, field, layer);
      value = vals[0];
      if (vals[1].length > 0) genericEl.files = (genericEl.files || []).concat(vals[1]);
      if (vals.length > 2) {
        const fileIdx = findIndex((genericEl.files || []), o => o.uid === event.uid);
        if (fileIdx >= 0 && genericEl.files && genericEl.files.length > 0) genericEl.files.splice(fileIdx, 1);
      }
    } else if (type === 'formula-field') {
      if (event.target) {
        ({ value } = event.target);
      } else {
        value = event;
      }
    } else {
      ({ value } = event.target);
    }
    if (field === 'name' && layer === '') {
      genericEl.name = value;
    } else {
      properties.layers[`${layer}`].fields.find(e => e.field === field).value = value;
      if (type === 'system-defined' && (!properties.layers[`${layer}`].fields.find(e => e.field === field).value_system || properties.layers[`${layer}`].fields.find(e => e.field === field).value_system === '')) {
        const opt = properties.layers[`${layer}`].fields.find(e => e.field === field).option_layers;
        properties.layers[`${layer}`].fields.find(e => e.field === field).value_system = genUnits(opt)[0].key;
      }
    }
    genericEl.properties = properties;
    this.handleGenericElChanged(genericEl);
  }

  handleUnitClick(layer, obj) {
    const { genericEl } = this.state;
    const { properties } = genericEl;
    const newVal = unitConversion(obj.option_layers, obj.value_system, obj.value);
    properties.layers[`${layer}`].fields.find(e => e.field === obj.field).value_system = obj.value_system;
    properties.layers[`${layer}`].fields.find(e => e.field === obj.field).value = newVal;
    genericEl.properties = properties;
    this.handleGenericElChanged(genericEl);
  }

  handleAttachmentDrop(files) {
    const { genericEl } = this.state;
    files.map(file => genericEl.attachments.push(Attachment.fromFile(file)));
    this.handleGenericElChanged(genericEl);
  }

  handleAttachmentDelete(attachment, isDelete = true) {
    const { genericEl } = this.state;
    const index = genericEl.attachments.indexOf(attachment);
    genericEl.attachments[index].is_deleted = isDelete;
    this.handleGenericElChanged(genericEl);
  }

  handleAttachmentEdit(attachment) {
    const { genericEl } = this.state;
    genericEl.attachments.map((currentAttachment) => {
      if (currentAttachment.id === attachment.id) return attachment;
    });
    this.handleGenericElChanged(genericEl);
  }

  handleSegmentsChange(se) {
    const { genericEl } = this.state;
    const { segments } = genericEl;
    const idx = findIndex(segments, o => o.segment_klass_id === se.segment_klass_id);
    if (idx >= 0) { segments.splice(idx, 1, se); } else { segments.push(se); }
    genericEl.segments = segments;
    genericEl.changed = true;
    this.setState({ genericEl });
  }

  elementalPropertiesItem(genericEl) {
    const options = [];
    const defaultName = <GenProperties key={`${genericEl.id}_elementalPropertiesItem`} label="" description={genericEl.description || ''} value={genericEl.name || ''} type="text" onChange={event => this.handleInputChange(event, 'name', '')} isEditable readOnly={false} isRequired />;
    options.push(defaultName);
    const layersLayout = LayersLayout(
      genericEl.properties.layers,
      genericEl.properties.select_options || {},
      this.handleInputChange,
      this.handleSubChange,
      this.handleUnitClick,
      options,
      genericEl.id || 0
    );
    const hisBtn = genericEl.is_new ? null : (
      <OverlayTrigger placement="top" overlay={<Tooltip id="_tooltip_history">click to view the history</Tooltip>}>
        <Button bsSize="xsmall" className="generic_btn_default" onClick={() => this.setState({ showHistory: true })}><i className="fa fa-book" aria-hidden="true" />&nbsp;History</Button>
      </OverlayTrigger>
    );
    const reloadBtn = (genericEl && (typeof genericEl.klass_uuid === 'undefined' || genericEl.klass_uuid === genericEl.element_klass.uuid || genericEl.is_new)) ? null : (
      <OverlayTrigger placement="top" overlay={<Tooltip id="_tooltip_reload">click to reload the template</Tooltip>}>
        <Button bsSize="xsmall" bsStyle="primary" onClick={() => this.handleReload()}><i className="fa fa-refresh" aria-hidden="true" />&nbsp;Reload</Button>
      </OverlayTrigger>
    );
    return (
      <div>
        <div>
          <ButtonToolbar style={{ margin: '5px 0px' }}>
            {reloadBtn}
            {hisBtn}
          </ButtonToolbar>
        </div>
        {layersLayout}
      </div>
    );
  }

  propertiesTab(ind) {
    const genericEl = this.state.genericEl || {};
    return (
      <Tab eventKey={ind} title="Properties" key={`Props_${genericEl.id}`}>
        {this.elementalPropertiesItem(genericEl)}
        <PreviewModal
          showModal={this.state.showHistory || false}
          fnClose={() => this.setState({ showHistory: false })}
          fnRetrive={this.handleRetriveRevision}
          fnDelete={this.handleDelRevision}
          element={genericEl}
          fetcher={GenericElsFetcher}
          fetcherFn="fetchElementRevisions"
        />
      </Tab>
    );
  }

  containersTab(ind) {
    const { genericEl } = this.state;
    return (
      <Tab eventKey={ind} title="Analyses" key={`Container_${genericEl.id}`}>
        <ListGroupItem style={{ paddingBottom: 20 }}>
          <GenericElDetailsContainers
            genericEl={genericEl}
            parent={this}
            readOnly={false}
          />
        </ListGroupItem>
      </Tab>
    );
  }

  attachmentsTab(ind) {
    const { genericEl } = this.state;
    return (
      <Tab eventKey={ind} title="Attachments" key={`Attachment_${genericEl.id}`}>
        <ListGroupItem style={{ paddingBottom: 20 }}>
          <GenericAttachments
            attachments={genericEl.attachments}
            onDrop={this.handleAttachmentDrop}
            onDelete={this.handleAttachmentDelete}
            onEdit={this.handleAttachmentEdit}
            readOnly={false}
          />
        </ListGroupItem>
      </Tab>
    );
  }

  header(genericEl) {
    const iconClass = (genericEl.element_klass && genericEl.element_klass.icon_name) || '';
    const { currentCollection } = UIStore.getState();


    const copyBtn = (genericEl.can_copy && !genericEl.isNew) ? (
      <CopyElementModal element={genericEl} defCol={currentCollection?.defCol()} />
    ) : null;
    const saveBtnDisplay = genericEl.changed ? '' : 'none';
    const datetp = formatTimeStampsOfElement(genericEl || {});
    return (
      <div>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="genericElDatesx">{datetp}</Tooltip>}>
          <span><i className={iconClass} />&nbsp;<span>{genericEl.short_label}</span> &nbsp;</span>
        </OverlayTrigger>
        <ConfirmClose el={genericEl} />
        {copyBtn}
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="tip_fullscreen_btn">FullScreen</Tooltip>}>
          <Button bsStyle="info" bsSize="xsmall" className="button-right" onClick={() => this.props.toggleFullScreen()}>
            <i className="fa fa-expand" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip id="saveScreen">Save</Tooltip>}
        >
          <Button
            bsStyle="warning"
            bsSize="xsmall"
            className="button-right"
            onClick={() => this.handleSubmit()}
            style={{ display: saveBtnDisplay }}
          >
            <i className="fa fa-floppy-o " />
          </Button>
        </OverlayTrigger>
        {genericEl.isNew
          ? null
          : <OpenCalendarButton isPanelHeader eventableId={genericEl.id} eventableType="Element" />}
      </div>
    );
  }

  render() {
    const { genericEl } = this.state;
    const submitLabel = (genericEl && genericEl.isNew) ? 'Create' : 'Save';
    const saveBtnDisplay = ((genericEl && genericEl.isNew) || (genericEl && genericEl.changed) || false) ? { display: '' } : { display: 'none' };

    let tabContents = [
      i => this.propertiesTab(i),
      i => this.containersTab(i),
      i => this.attachmentsTab(i),
    ];

    const tablen = tabContents.length;
    const segTabs = SegmentTabs(genericEl, this.handleSegmentsChange, tablen);
    tabContents = tabContents.concat(segTabs);

    return (
      <Panel
        className="panel-detail"
        bsStyle={genericEl.isPendingToSave ? 'info' : 'primary'}
      >
        <Panel.Heading>
          {this.header(genericEl)}
        </Panel.Heading>
        <Panel.Body>
          <ListGroup>
            <Tabs activeKey={this.state.activeTab} onSelect={key => this.handleSelect(key, genericEl.type)} id="GenericElementDetailsXTab">
              {tabContents.map((e, i) => e(i))}
            </Tabs>
          </ListGroup>
          <hr />
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={() => DetailActions.close(genericEl, true)}>
              Close
            </Button>
            <Button bsStyle="warning" onClick={() => this.handleSubmit()} style={saveBtnDisplay}>
              {submitLabel}
            </Button>
          </ButtonToolbar>
        </Panel.Body>
      </Panel>
    );
  }
}

GenericElDetails.propTypes = {
  genericEl: PropTypes.object,
  toggleFullScreen: PropTypes.func.isRequired
};

GenericElDetails.defaultProps = {
  genericEl: {},
};
