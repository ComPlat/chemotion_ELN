import React from 'react';
import { Panel, Table, FormGroup, Popover, FormControl, Button, Row, Col, Badge, Tooltip, OverlayTrigger, InputGroup, Tabs, Tab } from 'react-bootstrap';
import uuid from 'uuid';
import Clipboard from 'clipboard';
import { findIndex, filter, sortBy, orderBy } from 'lodash';
import LoadingModal from '../components/common/LoadingModal';
import AdminFetcher from '../components/fetchers/AdminFetcher';
import { ElementField } from '../components/elements/ElementField';
import LoadingActions from '../components/actions/LoadingActions';
import AttrNewModal from './generic/AttrNewModal';
import AttrEditModal from './generic/AttrEditModal';
import AttrCopyModal from './generic/AttrCopyModal';
import FieldCondEditModal from './generic/FieldCondEditModal';
import TemplateJsonModal from './generic/TemplateJsonModal';
import LayerAttrEditModal from './generic/LayerAttrEditModal';
import LayerAttrNewModal from './generic/LayerAttrNewModal';
import SelectAttrNewModal from './generic/SelectAttrNewModal';
import UploadModal from './generic/UploadModal';
import { ButtonTooltip, validateLayerInput, validateSelectList, notification, reUnit, GenericDummy } from '../admin/generic/Utils';
import Preview from './generic/Preview';

const validateField = field => (/^[a-zA-Z0-9_]*$/g.test(field));
const validateInput = (element) => {
  if (element.klass_element === '') {
    notification({ title: 'Create Segment Error', lvl: 'error', msg: 'Please select Element.' });
    return false;
  }
  if (element.label === '') {
    notification({ title: 'Create Segment Error', lvl: 'error', msg: 'Please input Segment Label.' });
    return false;
  }
  return true;
};

export default class SegmentElementAdmin extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      elements: [],
      element: {},
      newFieldKey: '',
      newOptionKey: '',
      layerKey: '',
      selectOptions: [],
      unitsSystem: {},
      showPropModal: false,
      showNewLayer: false,
      showEditLayer: false,
      showAddSelect: false,
      showNewKlass: false,
      showEditKlass: false,
      showCopyKlass: false,
      showFieldCond: false,
      showUpload: false,
      showJson: false,
      propTabKey: 1
    };

    this.clipboard = new Clipboard('.clipboardBtn');
    this.fetchElements = this.fetchElements.bind(this);
    this.handlePropShow = this.handlePropShow.bind(this);
    this.handlePropClose = this.handlePropClose.bind(this);
    this.onInputNewField = this.onInputNewField.bind(this);
    this.onInputNewOption = this.onInputNewOption.bind(this);
    this.addLayer = this.addLayer.bind(this);
    this.addSelection = this.addSelection.bind(this);
    this.editLayer = this.editLayer.bind(this);
    this.newKlass = this.newKlass.bind(this);
    this.editKlass = this.editKlass.bind(this);
    this.copyKlass = this.copyKlass.bind(this);
    this.newField = this.newField.bind(this);
    this.newOption = this.newOption.bind(this);
    this.handleSelectClose = this.handleSelectClose.bind(this);
    this.handleNewLayerClose = this.handleNewLayerClose.bind(this);
    this.handleLayerClose = this.handleLayerClose.bind(this);
    this.handleNewKlassClose = this.handleNewKlassClose.bind(this);
    this.handleKlassClose = this.handleKlassClose.bind(this);
    this.handleCopyKlassClose = this.handleCopyKlassClose.bind(this);
    this.handleCreateLayer = this.handleCreateLayer.bind(this);
    this.handleUpdateLayer = this.handleUpdateLayer.bind(this);
    this.handleCreateKlass = this.handleCreateKlass.bind(this);
    this.handleUpdateKlass = this.handleUpdateKlass.bind(this);
    this.handleActivateKlass = this.handleActivateKlass.bind(this);
    this.handleDeleteKlass = this.handleDeleteKlass.bind(this);
    this.handleAddSelect = this.handleAddSelect.bind(this);
    this.onDummyAdd = this.onDummyAdd.bind(this);
    this.onFieldDrop = this.onFieldDrop.bind(this);
    this.onFieldMove = this.onFieldMove.bind(this);
    this.onShowFieldCond = this.onShowFieldCond.bind(this);
    this.handleFieldCondClose = this.handleFieldCondClose.bind(this);
    this.onFieldInputChange = this.onFieldInputChange.bind(this);
    this.onOptionInputChange = this.onOptionInputChange.bind(this);
    this.showJsonModal = this.showJsonModal.bind(this);
    this.hideJsonModal = this.hideJsonModal.bind(this);
    this.handleUpdateJson = this.handleUpdateJson.bind(this);
    this.fetchConfigs = this.fetchConfigs.bind(this);
    this.handleCond = this.handleCond.bind(this);
    this.onFieldSubFieldChange = this.onFieldSubFieldChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.propTabSelect = this.propTabSelect.bind(this);
    this.retriveRevision = this.retriveRevision.bind(this);
    this.delRevision = this.delRevision.bind(this);
    this.fetchRevisions = this.fetchRevisions.bind(this);
    this.handleUploadShow = this.handleUploadShow.bind(this);
    this.handleUploadClose = this.handleUploadClose.bind(this);
    this.handleUploadTemplate = this.handleUploadTemplate.bind(this);
  }

  componentDidMount() {
    this.fetchElements();
    this.fetchConfigs();
  }

  componentWillUnmount() {
    this.clipboard.destroy();
  }

  onOptionInputChange(event, selectKey, optionKey) {
    const { element } = this.state;
    const options = (element &&
      element.properties_template && element.properties_template.select_options[selectKey]
      && element.properties_template.select_options[selectKey].options) || [];
    const idx = findIndex(options, o => o.key === optionKey);
    const op = {};
    op.key = optionKey;
    op.label = event.target.value;
    options.splice(idx, 1, op);
    this.setState({ element });
  }

  onDummyAdd(e) {
    const { element } = this.state;
    const layer = (element && element.properties_template
      && element.properties_template.layers[e.l]);
    let { fields } = layer || {};
    fields = fields || [];
    let idx = fields.findIndex(o => o.field === e.f);
    if (idx === -1 && fields.length > 0) idx = fields.length - 1;
    fields.splice(idx + 1, 0, new GenericDummy());
    element.properties_template.layers[e.l].fields = fields;
    this.setState({ element });
  }

  onShowFieldCond(field, lk) {
    this.setState({ showFieldCond: true, fieldObj: field, layerKey: lk });
  }

  onFieldDrop(e) {
    const { element } = this.state;
    const sourceKey = e.sourceTag.layerKey;
    const targetKey = e.targetTag.layerKey;
    const sourceLayer = element.properties_template.layers[sourceKey];
    const targetLayer = element.properties_template.layers[targetKey];

    if (sourceLayer && targetLayer) {
      e.sourceTag.field.position = e.targetTag.field.position - 1;
      const { fields } = element.properties_template.layers[sourceKey];
      const idx = findIndex(fields, o => o.field === e.sourceTag.field.field);
      fields.splice(idx, 1, e.sourceTag.field);
      element.properties_template.layers[sourceKey].fields = fields;
      this.setState({ element });
    }
  }

  onFieldMove(l, f, isUp) {
    const { element } = this.state;
    const layer = (element && element.properties_template && element.properties_template.layers[l]);
    const { fields } = layer;
    const idx = findIndex(fields, o => o.field === f);
    if (idx >= 0 && isUp) {
      const curObj = fields[idx];
      curObj.position -= 1;
      const preObj = fields[idx - 1];
      preObj.position += 1;
      fields[idx] = preObj;
      fields[idx - 1] = curObj;
    } else if (idx < (fields.length - 1) && !isUp) {
      const curObj = fields[idx];
      curObj.position += 1;
      const nexObj = fields[idx + 1];
      nexObj.position -= 1;
      fields[idx] = nexObj;
      fields[idx + 1] = curObj;
    }
    element.properties_template.layers[l].fields = fields;
    this.setState({ element });
  }

  onFieldSubFieldChange(lk, f, cb) {
    const { element } = this.state;
    const layer = (element && element.properties_template
      && element.properties_template.layers[lk]);
    const { fields } = layer;
    if (layer != null) {
      const fobj = (fields || []).find(o => o.field === f.field);
      if (Object.keys(fobj).length > 0) {
        const idx = (fields || []).findIndex(o => o.field === f.field);
        fields.splice(idx, 1, f);
        element.properties_template.layers[lk].fields = fields;
        this.setState({ element }, cb);
      }
    }
  }

  onFieldInputChange(event, orig, fe, lk, fc, tp) {
    const { element } = this.state;

    let value = '';
    if (tp === 'select' || tp === 'system-defined') {
      ({ value } = event);
    } else if (tp && tp.startsWith('drag')) {
      value = event;
    } else {
      ({ value } = event.target);
    }
    const layer = (element && element.properties_template
      && element.properties_template.layers[lk]);

    if (typeof layer === 'undefined' || layer == null) return;

    const { fields } = layer;

    if (fields == null || fields.length === 0) return;

    const fobj = fields.find(e => e.field === fe);
    if (Object.keys(fobj).length === 0) return;

    switch (fc) {
      case 'required':
        fobj.required = !orig;
        break;
      default:
        fobj[`${fc}`] = value;
        break;
    }

    const idx = findIndex(fields, o => o.field === fe);
    fields.splice(idx, 1, fobj);
    element.properties_template.layers[lk].fields = fields;
    this.setState({ element });
  }

  onInputNewField(e) {
    this.setState({ newFieldKey: e.target.value });
  }

  onInputNewOption(e) {
    this.setState({ newOptionKey: e.target.value });
  }

  retriveRevision(revision, cb) {
    const { element } = this.state;
    element.properties_template = revision;
    this.setState({ element, propTabKey: 1 }, cb);
  }

  fetchRevisions() {
    const { element } = this.state;
    if (element && element.id) {
      AdminFetcher.fetchKlassRevisions(element.id, 'SegmentKlass')
        .then((result) => {
          let curr = Object.assign({}, { ...element.properties_template });
          curr = Object.assign({}, { properties_release: curr }, { uuid: 'current' });
          const revisions = [].concat(curr, result.revisions);
          this.setState({ revisions });
        });
    }
  }

  delRevision(params) {
    const { element } = this.state;
    AdminFetcher.deleteKlassRevision({ id: params.id, klass_id: element.id, klass: 'SegmentKlass' })
      .then((response) => {
        if (response.error) {
          notification({ title: 'Delete Revision', lvl: 'error', msg: response.error });
        } else {
          this.fetchRevisions();
        }
      });
  }

  propTabSelect(key) {
    if (key !== 1) {
      this.fetchRevisions();
    }
    this.setState({ propTabKey: key });
  }

  handlePropClose() {
    this.setState({ showPropModal: false });
  }

  handleFieldCondClose() {
    this.setState({ showFieldCond: false });
  }

  handleCond(lk) {
    this.onShowFieldCond(null, lk);
  }


  addLayer() {
    this.setState({ showNewLayer: true });
  }

  addSelection() {
    this.setState({ showAddSelect: true });
  }

  showJsonModal(element) {
    this.setState({ element, showJson: true });
  }

  hideJsonModal() {
    this.setState({ showJson: false });
  }

  editLayer(e) {
    this.setState({ showEditLayer: true, layerKey: e.layerKey });
  }

  newKlass() {
    this.setState({ showNewKlass: true });
  }

  editKlass(element) {
    this.setState({ showEditKlass: true, element });
  }

  copyKlass(element) {
    this.setState({ showCopyKlass: true, element });
  }

  handleUploadShow() {
    this.setState({ showUpload: true });
  }

  handleUploadClose() {
    this.setState({ showUpload: false });
  }

  newField(e) {
    const { element, newFieldKey } = this.state;
    if (newFieldKey === null || newFieldKey.trim().length === 0) {
      notification({ title: 'Add new field', lvl: 'error', msg: 'please input field name first!' });
      return;
    }
    if (!validateField(newFieldKey)) {
      notification({ title: 'Add new field', lvl: 'error', msg: 'only can be alphanumeric (a-z, A-Z, 0-9 and underscores).' });
      return;
    }
    const { layerKey } = e;
    const layer = element && element.properties_template
      && element.properties_template.layers[layerKey];
    const fields = layer.fields || [];
    const dupfields = filter(fields, o => o.field === newFieldKey);
    if (dupfields && dupfields.length > 0) {
      notification({ title: 'Add new field', lvl: 'error', msg: 'this field is used already, please change a field name' });
      return;
    }
    const newField = {
      type: 'text', field: newFieldKey, position: 100, label: newFieldKey, default: ''
    };
    fields.push(newField);
    element.properties_template.layers[layerKey].fields = fields;
    this.setState({ layerKey, element });
  }

  newOption(key) {
    const { element, newOptionKey } = this.state;

    if (newOptionKey == null || newOptionKey.trim().length === 0) {
      notification({ title: 'Add new option', lvl: 'error', msg: 'please input option name first!' });
      return;
    }
    const selectObj = (element && element.properties_template
      && element.properties_template.select_options[key]
      && element.properties_template.select_options[key].options) || [];
    const dupops = filter(selectObj, o => o.key === newOptionKey);
    if (dupops && dupops.length > 0) {
      notification({ title: 'Add new option', lvl: 'error', msg: 'this option key is used already, please change another option key' });
      return;
    }
    const newOption = { key: newOptionKey, label: newOptionKey };
    selectObj.push(newOption);
    element.properties_template.select_options[key].options = selectObj;
    this.setState({ element });
  }

  handleNewLayerClose() {
    this.setState({ showNewLayer: false });
  }

  handleLayerClose() {
    this.setState({ showEditLayer: false });
  }

  handleNewKlassClose() {
    this.setState({ showNewKlass: false });
  }

  handleKlassClose() {
    this.setState({ showEditKlass: false });
  }

  handleCopyKlassClose() {
    this.setState({ showCopyKlass: false });
  }

  handleSelectClose() {
    this.setState({ showAddSelect: false });
  }

  handleAddSelect(selectName) {
    const { element } = this.state;
    if (validateSelectList(selectName, element)) {
      const sos = element.properties_template.select_options;
      sos[selectName] = {};
      const selectOptions = Object.keys(sos).map(key => ({ value: key, name: key, label: key }));
      this.setState({ element, showAddSelect: false, selectOptions });
    }
    return false;
  }

  handleCreateLayer(layer) {
    if (!validateLayerInput(layer)) return;
    const { element } = this.state;
    if (element && element.properties_template && element.properties_template.layers[`${layer.key}`]) {
      notification({ title: `Layer [${layer.key}]`, lvl: 'error', msg: 'This Layer is already taken. Please choose another one.' });
      return;
    }
    element.properties_template.layers[`${layer.key}`] = layer;
    notification({ title: `Layer [${layer.key}]`, lvl: 'info', msg: 'This new layer is kept in the Template workspace temporarily. Please remember to press Save when you finish the editing.' });
    this.setState({ showNewLayer: false, element, layerKey: layer.key });
  }

  handleUpdateLayer(layerKey, updates) {
    if (!validateLayerInput(updates)) return;
    const { element } = this.state;
    let layer = element && element.properties_template
    && element.properties_template.layers[layerKey];
    layer = { ...layer, ...updates };
    element.properties_template.layers[`${layer.key}`] = layer;
    notification({ title: `Layer [${layer.key}]`, lvl: 'info', msg: 'This updates of this layer is kept in the Template workspace temporarily. Please remember to press Save when you finish the editing.' });
    this.setState({ showEditLayer: false, element });
  }

  handleCreateKlass(element) {
    if (!validateInput(element)) return;
    AdminFetcher.createSegmentKlass(element)
      .then((result) => {
        if (result.error) {
          notification({ title: 'Create Segment fail', lvl: 'error', msg: result.error });
        } else {
          notification({ title: 'Create Segment successfully', lvl: 'info', msg: 'Created successfully' });
          this.handleNewKlassClose();
          this.handleCopyKlassClose();
          this.fetchElements();
        }
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  handleUpdateKlass(element, updates) {
    const inputs = { ...element, ...updates };
    if (!validateInput(inputs)) return;
    AdminFetcher.updateSegmentKlass(inputs)
      .then((result) => {
        if (result.error) {
          notification({ title: 'Update Segment fail', lvl: 'error', msg: result.error });
        } else {
          notification({ title: 'Update Segment successfully', lvl: 'info', msg: 'Updated successfully' });
          this.handleKlassClose();
          this.fetchElements();
        }
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  handleActivateKlass(id, isActive) {
    AdminFetcher.deActiveSegmentKlass({ id, is_active: !isActive })
      .then((result) => {
        if (result.error) {
          notification({ title: 'Update Segment fail', lvl: 'error', msg: result.error });
        } else {
          notification({ title: 'Update Segment successfully', lvl: 'info', msg: `Segment is ${result.is_active ? 'active' : 'deactive'} now` });
          this.handleKlassClose();
          this.fetchElements();
        }
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  handleDeleteKlass(element) {
    AdminFetcher.deleteSegmentKlass(element.id)
      .then((result) => {
        if (result.error) {
          notification({ title: 'Delete Segment fail', lvl: 'error', msg: result.error });
        } else {
          notification({ title: `Segment [${element.name}]`, lvl: 'info', msg: 'Deleted successfully' });
          this.handleKlassClose();
          this.fetchElements();
        }
      });
  }

  handleUpdateJson(propertiesTemplate) {
    const { element } = this.state;
    element.properties_template = propertiesTemplate;
    this.setState({
      element,
      showJson: false
    });
    this.handleSubmit(false);
  }


  handlePropShow(element) {
    if (element) {
      const selectOptions = Object.keys(element.properties_template.select_options)
        .map(key => ({ value: key, name: key, label: key }));
      this.setState({
        element, selectOptions, showPropModal: true, propTabKey: 1
      });
    }
  }

  handleUploadTemplate(properties, message, valid) {
    const { element } = this.state;
    if (valid === false) {
      this.setState({ showUpload: false });
      notification({ title: `Upload Template for Segment [${element.label}] Failed`, autoDismiss: 30, lvl: 'error', msg: message });
    } else {
      element.properties_template = properties;
      this.setState({ element, showUpload: false });
      notification({ title: `Upload template to Segment [${element.label}]`, lvl: 'info', msg: 'The templates has been uploaded, please save it.' });
    }
  }

  fetchConfigs() {
    AdminFetcher.fetchUnitsSystem().then((result) => { this.setState({ unitsSystem: result }); });
  }

  fetchElements() {
    AdminFetcher.listSegmentKlass().then((result) => {
      this.setState({ elements: result.klass });
    });
  }

  handleSubmit(isRelease = false) {
    LoadingActions.start();
    const { element, unitsSystem } = this.state;
    Object.keys(element.properties_template.layers).forEach((key) => {
      const layer = element.properties_template.layers[key];
      let sortedFields = (layer && layer.fields) || [];
      (sortedFields || []).forEach((f, idx) => {
        const fd = f;
        fd.position = (idx + 1);
        if (fd.type === 'system-defined') { fd.option_layers = reUnit(unitsSystem, fd.option_layers); }
        fd.required = false;
        fd.sub_fields = ['input-group', 'table'].includes(fd.type) ? fd.sub_fields : [];
        if (fd.type !== 'text-formula') { fd.text_sub_fields = []; }
        return fd;
      });
      sortedFields = sortBy(sortedFields, l => l.position);
      element.properties_template.layers[key].fields = sortedFields;
    });

    element.is_release = isRelease;

    AdminFetcher.updateSegmentTemplate(element)
      .then((result) => {
        if (result.error) {
          notification({ title: 'Update Segment template fail', lvl: 'error', msg: result.error });
        } else {
          if (isRelease === true) {
            notification({ title: 'Update Segment template', lvl: 'info', msg: 'Saved adn Released successfully' });
          } else {
            notification({ title: 'Update Segment template', lvl: 'info', msg: 'Saved successfully' });
          }
          this.fetchElements();
          this.setState({ element: result });
        }
        LoadingActions.stop();
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  confirmDelete(delStr, delKey, delRoot) {
    const { element } = this.state;
    if (delStr === 'Select') {
      delete element.properties_template.select_options[delKey];
      const sos = element.properties_template.select_options;
      const selectOptions = Object.keys(sos).map(key => ({ value: key, name: key, label: key }));
      this.setState({ selectOptions });
    } else if (delStr === 'Option') {
      const options = element.properties_template.select_options[delRoot];
      const idx = findIndex(options, o => o.key === delKey);
      options.splice(idx, 1);
    } else if (delStr === 'Layer') {
      delete element.properties_template.layers[delKey];
    } else if (delStr === 'Field') {
      const { fields } = element.properties_template.layers[delRoot];
      const idx = findIndex(fields, o => o.field === delKey);
      fields.splice(idx, 1);
    } else {
      //
    }
    this.setState({ element });
  }

  renderDeleteButton(delStr, delKey, delRoot) {
    let msg = 'remove?';
    if (delStr === 'Select') {
      msg = `remove this select option: [${delKey}] ?`;
    } else if (delStr === 'Option') {
      msg = `remove this option: [${delKey}] from select [${delRoot}] ?`;
    } else if (delStr === 'Layer') {
      msg = `remove this layer: [${delKey}] ?`;
    } else if (delStr === 'Field') {
      msg = `remove this field: [${delKey}] from layer [${delRoot}] ?`;
    } else {
      msg = `remove ???: ${delStr}`;
    }

    const popover = (
      <Popover id="popover-positioned-scrolling-left">
        {msg} <br />
        <div className="btn-toolbar">
          <Button bsSize="xsmall" bsStyle="danger" aria-hidden="true" onClick={() => this.confirmDelete(delStr, delKey, delRoot)}>
            Yes
          </Button><span>&nbsp;&nbsp;</span>
          <Button bsSize="xsmall" bsStyle="warning">No</Button>
        </div>
      </Popover>
    );

    return (
      <OverlayTrigger animation placement="top" root trigger="focus" overlay={popover}>
        <Button bsSize="sm" >
          <i className="fa fa-trash-o" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    );
  }

  renderSelectOptions() {
    const { element } = this.state;
    const selects = [];

    Object.keys(element.properties_template.select_options).forEach((key) => {
      const soptions = (element.properties_template.select_options[key]
        && element.properties_template.select_options[key].options) || [];
      const options = (soptions || []).map(f => (
        <div key={`${f.key}_${key}`} style={{ marginTop: '10px' }}>
          <FormGroup bsSize="sm" controlId={`frmCtrlSelectOption_${f.key}_${key}`}>
            <InputGroup>
              <InputGroup.Addon>{f.key}</InputGroup.Addon>
              <FormControl
                type="text"
                name="lf_label"
                defaultValue={f.label}
                onChange={event => this.onOptionInputChange(event, key, f.key)}
              />
              <InputGroup.Button>
                {this.renderDeleteButton('Option', f.key, key)}
              </InputGroup.Button>
            </InputGroup>
          </FormGroup>
        </div>
      ));

      const snode = (
        <Panel className="panel_generic_properties" defaultExpanded key={`select_options_${key}`} >
          <Panel.Heading className="template_panel_heading">
            <Panel.Title toggle>{key}</Panel.Title>
            <div>
              <FormGroup bsSize="sm" style={{ marginBottom: 'unset', display: 'inline-table' }}>
                <InputGroup>
                  <InputGroup.Button>
                    {this.renderDeleteButton('Select', key, null)}
                  </InputGroup.Button>
                  <FormControl
                    type="text"
                    name="input_newOption"
                    onChange={e => this.onInputNewOption(e)}
                    placeholder="Input new option"
                    bsSize="sm"
                  />
                  <InputGroup.Button>
                    <OverlayTrigger placement="top" overlay={<Tooltip id={uuid.v4()}>Add new option</Tooltip>}>
                      <Button bsSize="sm" onClick={() => this.newOption(key)}><i className="fa fa-plus" aria-hidden="true" /></Button>
                    </OverlayTrigger>
                  </InputGroup.Button>
                </InputGroup>
              </FormGroup>
            </div>
          </Panel.Heading>
          <Panel.Collapse>
            <Panel.Body>
              {options}
            </Panel.Body>
          </Panel.Collapse>
        </Panel>
      );
      selects.push(snode);
    });

    return (
      <div>
        <Panel>
          <Panel.Heading>
            <Panel.Title>
              Select Lists
              <OverlayTrigger placement="top" overlay={<Tooltip id={uuid.v4()}>Add new select list</Tooltip>}>
                <Button className="button-right" bsSize="xs" onClick={() => this.addSelection()}>Add new select list&nbsp;<i className="fa fa-plus" aria-hidden="true" /></Button>
              </OverlayTrigger>
            </Panel.Title>
          </Panel.Heading>
          <Panel.Body>
            <div>
              { selects }
            </div>
          </Panel.Body>
        </Panel>
      </div>
    );
  }

  renderProperties() {
    const { element, selectOptions, unitsSystem } = this.state;
    const layers = [];
    const sortedLayers = sortBy(element.properties_template.layers, l => l.position);

    (sortedLayers || []).forEach((layer) => {
      const layerKey = `${layer.key}`;
      const fields = ((layer && layer.fields) || []).map((f, idx) => (
        <ElementField
          genericType="Segment"
          key={`${layerKey}${f.field}`}
          layerKey={layerKey}
          position={idx + 1}
          field={f}
          select_options={selectOptions}
          onDrop={e => this.onFieldDrop(e)}
          onMove={(l, fe, isUp) => this.onFieldMove(l, fe, isUp)}
          onDelete={(delStr, delKey, delRoot) => this.confirmDelete(delStr, delKey, delRoot)}
          onChange={(e, orig, fe, lk, fc, tp) => this.onFieldInputChange(e, orig, fe, lk, fc, tp)}
          unitsSystem={unitsSystem}
          onFieldSubFieldChange={this.onFieldSubFieldChange}
          onDummyAdd={this.onDummyAdd}
          onShowFieldCond={(field, lk) => this.onShowFieldCond(field, lk)}
          allLayers={sortedLayers}
        />
      )) || [];

      const hasCond = (layer && layer.cond_fields && layer.cond_fields.length > 0) || false;
      const btnCond = hasCond ?
        (<ButtonTooltip tip="Restriction Setting" fnClick={() => this.handleCond(layerKey)} bs="warning" element={{ l: layerKey, f: null }} fa="fa fa-cogs" place="top" size="sm" />) :
        (<ButtonTooltip tip="Restriction Setting" fnClick={() => this.handleCond(layerKey)} element={{ l: layerKey, f: null }} fa="fa fa-cogs" place="top" size="sm" />);

      const node = (
        <Panel className="panel_generic_properties" defaultExpanded key={`idxLayer_${layerKey}`}>
          <Panel.Heading className="template_panel_heading">
            <Panel.Title toggle>
              {layer.label}&nbsp;<Badge>{layer.key}</Badge>&nbsp;<Badge>{`Columns per Row: ${layer.cols}`}</Badge>&nbsp;<Badge className="bg-bs-primary">{`Fields: ${(layer.fields && layer.fields.length) || 0}`}</Badge>
            </Panel.Title>
            <div>
              <FormGroup bsSize="sm" style={{ marginBottom: 'unset', display: 'inline-table' }}>
                <InputGroup>
                  <InputGroup.Button>
                    {btnCond}
                    <ButtonTooltip tip={`Edit Layer: ${layer.label}`} fnClick={this.editLayer} element={{ layerKey }} fa="fa-pencil" place="top" size="sm" />
                    {this.renderDeleteButton('Layer', layerKey, null)}
                  </InputGroup.Button>
                  <FormControl
                    type="text"
                    name="nf_newfield"
                    onChange={e => this.onInputNewField(e)}
                    placeholder="Input new field name"
                    bsSize="sm"
                  />
                  <InputGroup.Button>
                    <ButtonTooltip tip="Add new field" fnClick={this.newField} element={{ layerKey }} fa="fa fa-plus" place="top" size="sm" />
                    <ButtonTooltip tip="Add Dummy field" fnClick={this.onDummyAdd} element={{ l: layerKey, f: null }} fa="fa fa-plus-circle" place="top" size="sm" />
                  </InputGroup.Button>
                </InputGroup>
              </FormGroup>
            </div>
          </Panel.Heading>
          <Panel.Collapse>
            <Panel.Body style={{ padding: '15px 0px 15px 0px' }}>
              {fields}
            </Panel.Body>
          </Panel.Collapse>
        </Panel>
      );
      layers.push(node);
    });

    return (
      <div>
        <Panel>
          <Panel.Heading>
            <Panel.Title>
              Layers
              <OverlayTrigger placement="top" overlay={<Tooltip id={uuid.v4()}>Add new layer</Tooltip>}>
                <Button className="button-right" bsSize="xs" onClick={() => this.addLayer()}>Add new layer&nbsp;<i className="fa fa-plus" aria-hidden="true" /></Button>
              </OverlayTrigger>
            </Panel.Title>
          </Panel.Heading>
          <Panel.Body><div>{ layers }</div></Panel.Body>
        </Panel>
      </div>
    );
  }

  renderPropPanel() {
    const {
      element, showPropModal, revisions, propTabKey
    } = this.state;
    if (showPropModal) {
      return (
        <Tabs activeKey={propTabKey} id="segment-prop-tabs" onSelect={this.propTabSelect}>
          <Tab eventKey={1} title="Template">
            <Panel show={showPropModal.toString()}>
              <Panel.Heading>
                <b>{`Template of Segment [${element.label}]: ${element.desc}`}</b>&nbsp;
                <span className="generic_version">{`ver.: ${element.uuid}`}</span>
                <span className="generic_version_draft">{element.uuid === element.properties_template.uuid ? '' : `draft: ${element.properties_template.uuid}`}</span>
                <span className="button-right" >
                  <ButtonTooltip tip="Upload Segment template in JSON format" fnClick={this.handleUploadShow} element={element} place="top" fa="fa-upload" />&nbsp;
                  <ButtonTooltip txt="Save and Release" tip="Save and Release template" fnClick={() => this.handleSubmit(true)} fa="fa-floppy-o" place="top" bs="primary" />&nbsp;
                  <ButtonTooltip txt="Save as draft" tip="Save template as draft" fnClick={() => this.handleSubmit(false)} fa="fa-floppy-o" place="top" bs="primary" />
                </span>
                <div className="clearfix" />
              </Panel.Heading>
              <Panel.Body>
                <Row style={{ maxWidth: '2000px', margin: 'auto' }}>
                  <Col sm={8}>{this.renderProperties()}</Col>
                  <Col sm={4}>{this.renderSelectOptions()}</Col>
                </Row>
              </Panel.Body>
            </Panel>
          </Tab>
          <Tab eventKey={3} title="Preview">
            <Preview revisions={revisions} element={element} fnRetrive={this.retriveRevision} fnDelete={this.delRevision} canDL />
          </Tab>
        </Tabs>
      );
    }
    return (<div />);
  }

  renderList() {
    const { elements, element } = this.state;
    const els = orderBy(elements, ['is_active', 'label'], ['desc', 'asc']);
    const tbody = els && els.map((e, idx) => (
      <tbody key={`tbody_${e.id}`}>
        <tr key={`row_${e.id}`} id={`row_${e.id}`} style={e.id === element.id ? { fontWeight: 'bold', borderWidth: 'medium', backgroundColor: 'white', borderStyle: 'groove' } : { fontWeight: 'unset' }}>
          <td>{idx + 1}</td>
          <td>
            <ButtonTooltip tip="copy to ..." fa="fa fa-clone" element={e} fnClick={this.copyKlass} />
            &nbsp;
            <ButtonTooltip tip="Edit Segment attributes" fnClick={this.editKlass} element={e} />
            &nbsp;
          </td>
          <td>{e.label}</td>
          <td>{e.desc}</td>
          <td>
            {
              e.is_active ? <i className="fa fa-check" aria-hidden="true" style={{ color: 'green' }} /> : <i className="fa fa-ban" aria-hidden="true" style={{ color: 'red' }} />
            }
          </td>
          <td>
            <ButtonTooltip tip="Edit Segment template" fnClick={this.handlePropShow} element={e} fa="fa-file-text" />&nbsp;
            <ButtonTooltip tip="Edit Segment template in JSON format" fnClick={this.showJsonModal} element={e} fa="fa-file-code-o" />
          </td>
          <td>{e.element_klass && e.element_klass.label}&nbsp;<i className={e.element_klass && e.element_klass.icon_name} /></td>
          <td>{e.released_at} (UTC)</td>
        </tr>
      </tbody>
    ));
    return (
      <Panel>
        <Panel.Heading>
          <Table responsive condensed hover>
            <thead>
              <tr style={{ backgroundColor: '#ddd' }}>
                <th width="4%">#</th>
                <th width="8%">Actions</th>
                <th width="12%">Segment Label</th>
                <th width="20%">Description</th>
                <th width="8%">Active</th>
                <th width="12%">Template</th>
                <th width="16%">Belongs to</th>
                <th width="18%">Released at</th>
              </tr>
            </thead>
            { tbody }
          </Table>
        </Panel.Heading>
      </Panel>
    );
  }

  render() {
    const { element, layerKey } = this.state;
    const layer = (element && element.properties_template
      && element.properties_template.layers[layerKey]) || {};

    const sortedLayers = (element && element.properties_template && element.properties_template.layers && sortBy(element.properties_template.layers, l => l.position)) || [];

    return (
      <div>
        <Button bsStyle="primary" bsSize="small" onClick={() => this.newKlass()}>
          New Segment&nbsp;<i className="fa fa-plus" aria-hidden="true" />
        </Button>
        &nbsp;
        <br />
        <div className="list-container-bottom">
          { this.renderList() }
          { this.renderPropPanel() }
          <SelectAttrNewModal
            showModal={this.state.showAddSelect}
            fnClose={this.handleSelectClose}
            fnCreate={this.handleAddSelect}
          />
          <LayerAttrNewModal
            showModal={this.state.showNewLayer}
            fnClose={this.handleNewLayerClose}
            fnCreate={this.handleCreateLayer}
          />
          <LayerAttrEditModal
            showModal={this.state.showEditLayer}
            layer={layer}
            fnClose={this.handleLayerClose}
            fnUpdate={this.handleUpdateLayer}
          />
          <TemplateJsonModal
            showModal={this.state.showJson}
            fnClose={this.hideJsonModal}
            fnUpdate={this.handleUpdateJson}
            element={this.state.element}
          />
          <AttrNewModal
            content="Segment"
            showModal={this.state.showNewKlass}
            fnClose={this.handleNewKlassClose}
            fnCreate={this.handleCreateKlass}
          />
          <AttrEditModal
            content="Segment"
            showModal={this.state.showEditKlass}
            element={this.state.element}
            fnClose={this.handleKlassClose}
            fnDelete={this.handleDeleteKlass}
            fnActivate={this.handleActivateKlass}
            fnUpdate={this.handleUpdateKlass}
          />
          <FieldCondEditModal
            showModal={this.state.showFieldCond}
            layer={layer}
            allLayers={sortedLayers}
            layerKey={this.state.layerKey}
            updSub={this.updSubField}
            updLayer={this.updLayerSubField}
            field={this.state.fieldObj}
            element={this.state.element}
            fnClose={this.handleFieldCondClose}
          />
          <AttrCopyModal
            content="Segment"
            showModal={this.state.showCopyKlass}
            element={this.state.element}
            fnClose={this.handleCopyKlassClose}
            fnCopy={this.handleCreateKlass}
          />
          <UploadModal
            content="Generic Segments"
            klass="SegmentKlass"
            showModal={this.state.showUpload}
            fnClose={this.handleUploadClose}
            fnUpload={this.handleUploadTemplate}
          />
        </div>
        <LoadingModal />
      </div>
    );
  }
}
