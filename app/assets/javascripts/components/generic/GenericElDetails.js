/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Panel, Button, ButtonToolbar, ListGroupItem, Tabs, Tab, ListGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { findIndex } from 'lodash';
import DetailActions from '../actions/DetailActions';
import LoadingActions from '../actions/LoadingActions';
import ElementActions from '../actions/ElementActions';
import UIActions from '../actions/UIActions';
import UIStore from '../stores/UIStore';
import ConfirmClose from '../common/ConfirmClose';
import GenericElDetailsContainers from './GenericElDetailsContainers';
import { GenProperties, LayersLayout } from './GenericElCommon';
import GenericEl from '../models/GenericEl';
import CopyElementModal from '../common/CopyElementModal';
import { notification, genUnits, toBool, unitConversion } from '../../admin/generic/Utils';

export default class GenericElDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      genericEl: props.genericEl,
    };
    this.onChangeUI = this.onChangeUI.bind(this);
    this.handleReload = this.handleReload.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleUnitClick = this.handleUnitClick.bind(this);
  }

  componentDidMount() {
    UIStore.listen(this.onChangeUI);
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onChangeUI);
  }

  onChangeUI(state) {
    if (state[this.state.genericEl.type]) {
      if (state[this.state.genericEl.type].activeTab !== this.state.activeTab) {
        this.setState({ activeTab: state[this.state.genericEl.type].activeTab });
      }
    }
  }

  handleGenericElChanged(genericEl) {
    this.setState({ genericEl });
  }

  handleSelect(eventKey, type) {
    UIActions.selectTab({ tabKey: eventKey, type });
    this.setState({
      activeTab: eventKey
    });
  }

  handleReload() {
    const { genericEl } = this.state;
    const newProps = genericEl.element_klass.properties_template.layers;
    Object.keys(newProps).forEach((key) => {
      const newLayer = newProps[key] || {};
      const curFields = (genericEl.properties[key] && genericEl.properties[key].fields) || [];
      (newLayer.fields || []).forEach((f, idx) => {
        const curIdx = findIndex(curFields, o => o.field === f.field);
        if (curIdx >= 0) {
          const curVal = genericEl.properties[key].fields[curIdx].value;
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
              u.key === genericEl.properties[key].fields[curIdx].value_system);
            newProps[key].fields[idx].value_system = (vs && vs.key) || units[0].key;
          }
        }
      });
    });
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
    (Object.keys(genericEl.properties) || {}).forEach((key) => {
      genericEl.properties[key].fields = (genericEl.properties[key].fields || []).map((f) => {
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
    } else {
      ({ value } = event.target);
    }
    if (field === 'name' && layer === '') {
      genericEl.name = value;
    } else {
      properties[`${layer}`].fields.find(e => e.field === field).value = value;
      if (type === 'system-defined' && (!properties[`${layer}`].fields.find(e => e.field === field).value_system || properties[`${layer}`].fields.find(e => e.field === field).value_system === '')) {
        const opt = properties[`${layer}`].fields.find(e => e.field === field).option_layers;
        properties[`${layer}`].fields.find(e => e.field === field).value_system = genUnits(opt)[0].key;
      }
    }
    genericEl.properties = properties;
    genericEl.changed = true;
    this.handleGenericElChanged(genericEl);
  }

  handleUnitClick(layer, obj) {
    const { genericEl } = this.state;
    const { properties } = genericEl;
    const newVal = unitConversion(obj.option_layers, obj.value_system, obj.value);
    properties[`${layer}`].fields.find(e => e.field === obj.field).value_system = obj.value_system;
    properties[`${layer}`].fields.find(e => e.field === obj.field).value = newVal;
    genericEl.properties = properties;
    genericEl.changed = true;
    this.handleGenericElChanged(genericEl);
  }

  elementalPropertiesItem(genericEl) {
    const options = [];
    const selectOptions = (genericEl && genericEl.element_klass &&
      genericEl.element_klass.properties_template &&
      genericEl.element_klass.properties_template.select_options) || {};
    const defaultName = <GenProperties key={`GenProp_${genericEl.name}`} label="" description={genericEl.description || ''} value={genericEl.name || ''} type="text" onChange={event => this.handleInputChange(event, 'name', '')} isEditable readOnly={false} isRequired />;
    options.push(defaultName);

    const layersLayout = LayersLayout(
      genericEl.properties,
      selectOptions || {},
      this.handleInputChange,
      this.handleUnitClick,
      options
    );
    return (<div style={{ marginTop: '5px' }}>{layersLayout}</div>);
  }

  propertiesTab(ind) {
    const genericEl = this.state.genericEl || {};
    return (
      <Tab eventKey={ind} title="Properties" key={`Props_${genericEl.id}`}>
        {this.elementalPropertiesItem(genericEl)}
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

  header(genericEl) {
    const iconClass = (genericEl.element_klass && genericEl.element_klass.icon_name) || '';
    const { currentCollection } = UIStore.getState();
    const defCol = currentCollection && currentCollection.is_shared === false &&
    currentCollection.is_locked === false && currentCollection.label !== 'All' ? currentCollection.id : null;
    const copyBtn = (genericEl.can_copy && !genericEl.isNew) ? (
      <CopyElementModal element={genericEl} defCol={defCol} />
    ) : null;
    const saveBtnDisplay = genericEl.changed ? '' : 'none';
    const datetp = `Created at: ${genericEl.created_at} \n Updated at: ${genericEl.updated_at}`;
    return (
      <div>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="genericElDatesx">{datetp}</Tooltip>}>
          <span><i className={iconClass} />&nbsp;<span>{genericEl.short_label}</span> &nbsp;</span>
        </OverlayTrigger>
        <ConfirmClose el={genericEl} />
        {copyBtn}
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
      </div>
    );
  }

  render() {
    const { genericEl } = this.state;
    const submitLabel = (genericEl && genericEl.isNew) ? 'Create' : 'Save';
    const tabContents = [
      i => this.propertiesTab(i),
      i => this.containersTab(i),
    ];

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
            <Button bsStyle="danger" onClick={() => this.handleReload()}>
              Reload
            </Button>
            <Button bsStyle="primary" onClick={() => DetailActions.close(genericEl, true)}>
              Close
            </Button>
            <Button bsStyle="warning" onClick={() => this.handleSubmit()}>
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
};

GenericElDetails.defaultProps = {
  genericEl: {},
};
