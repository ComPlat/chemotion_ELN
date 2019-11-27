import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Panel, Button, ButtonToolbar, ListGroupItem, Tabs, Tab, ListGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { findIndex, sortBy, filter } from 'lodash';
import DetailActions from './actions/DetailActions';
import LoadingActions from './actions/LoadingActions';
import ElementActions from './actions/ElementActions';
import UIActions from './actions/UIActions';
import UIStore from './stores/UIStore';
import UserStore from './stores/UserStore';
import ElementStore from './stores/ElementStore';
import GenericElsFetcher from './fetchers/GenericElsFetcher';
import ConfirmClose from './common/ConfirmClose';
import GenericElDetailsContainers from './GenericElDetailsContainers';
import { GenProperties, GenPropertiesLayer } from './GenericElCommon';
import GenericEl from './models/GenericEl';
import NotificationActions from '../components/actions/NotificationActions';

export default class GenericElDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      genericEl: props.genericEl,
    };
    this.onChange = this.onChange.bind(this);
    this.onChangeUI = this.onChangeUI.bind(this);
    this.onClose = this.onClose.bind(this);
    this.handleReload = this.handleReload.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
  }

  componentDidMount() {
    //const { select_options } = this.props;
    // ElementStore.listen(this.onChange);
    UIStore.listen(this.onChangeUI);
    // this.onChangeUI(UIStore.getState());
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onChangeUI);
    // ElementStore.unlisten(this.onChange);
  }

  onClose() {
    console.log('onClose');
  }

  onChangeUI(state) {
    if (state[this.state.genericEl.type]) {
      if (state[this.state.genericEl.type].activeTab !== this.state.activeTab) {
        this.setState({
          activeTab: state[this.state.genericEl.type].activeTab
        });
      }
    }
  }

  onChange(state) {
    console.log('onChange');
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
    //console.log(genericEl);
    const newProps = genericEl.element_klass.properties_template.layers;
    Object.keys(newProps).forEach((key) => {
      const newLayer = newProps[key] || {};
      const curFields = (genericEl.properties[key] && genericEl.properties[key].fields) || [];
      (newLayer.fields || []).forEach((f, idx) => {
        //console.log(f);
        //console.log(curFields);
        const curIdx = findIndex(curFields, o => o.field == f.field);
        //console.log(curIdx);
        if (curIdx >= 0) {
          newProps[key].fields[idx].value = genericEl.properties[key].fields[curIdx].value;
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
      NotificationActions.add({
        title: 'Save failed!',
        level: 'error',
        position: 'tc',
        message: 'Please fill out all required fields!',
        autoDismiss: 5,
        uid: 'save_mof_notification',
      });
      return false;
    }
    LoadingActions.start();

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
    //console.log(properties);
    let value = '';
    if (type === 'select') {
      ({ value } = event);
    } else if (type.startsWith('drag')) {
      value = event;
    } else {
      ({ value } = event.target);
    }
    if (typeof value === 'string') value = value.trim();
    if (field === 'name' && layer === '') {
      genericEl.name = value;
    } else {
      properties[`${layer}`].fields.find(e => e.field === field).value = value;
    }
    genericEl.properties = properties;
    genericEl.changed = true;
    this.handleGenericElChanged(genericEl);
  }

  elementalPropertiesItem(genericEl) {
    const options = [];
    const selectOptions = (genericEl && genericEl.element_klass && genericEl.element_klass.properties_template && genericEl.element_klass.properties_template && genericEl.element_klass.properties_template.select_options) || {};
    const defaultName = <GenProperties label="name" value={genericEl.name || ''} type="text" onChange={event => this.handleInputChange(event, 'name', '')} isEditable readOnly={false} isRequired />;
    options.push(defaultName);

    const filterLayers = filter(genericEl.properties, l => l.condition == null || l.condition.trim().length === 0) || [];
    const sortedLayers = sortBy(filterLayers, l => l.position) || [];

    sortedLayers.forEach((layerProps) => {
      //const layerProps = genericEl.properties[k];
      const ig = (
        <GenPropertiesLayer
          layer={layerProps}
          onChange={this.handleInputChange}
          selectOptions={selectOptions}
        />
      );
      options.push(ig);
    });

    //const specific = genericEl.properties['type_layer'] && genericEl.properties['type_layer'].fields.find(e => e.field === 'mof_method').value;

    const filterConLayers = filter(genericEl.properties, l => l.condition && l.condition.trim().length > 0) || [];
    const sortedConLayers = sortBy(filterConLayers, l => l.position) || [];

    sortedConLayers.forEach((layerProps) => {
      const arr = layerProps.condition.split(',');
      if (arr.length >= 3) {
        const specific = genericEl.properties[`${arr[0].trim()}`] && genericEl.properties[`${arr[0].trim()}`].fields.find(e => e.field === `${arr[1].trim()}`) && genericEl.properties[`${arr[0].trim()}`].fields.find(e => e.field === `${arr[1].trim()}`).value;

        if (specific == arr[2] && arr[2].trim()) {
          const igs = (
            <GenPropertiesLayer
              layer={layerProps}
              onChange={this.handleInputChange}
              selectOptions={selectOptions}
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
  }

  propertiesTab(ind) {
    const genericEl = this.state.genericEl || {};

    return (
      <Tab
        eventKey={ind}
        title="Properties"
        key={`Props_${genericEl.id}`}
      >
        {this.elementalPropertiesItem(genericEl)}
      </Tab>
    );
  }

  containersTab(ind) {
    const { genericEl } = this.state;

    return (
      <Tab
        eventKey={ind}
        title="Analyses"
        key={`Container_${genericEl.id}`}
      >
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

    const saveBtnDisplay = genericEl.changed ? '' : 'none';
    const datetp = `Created at: ${genericEl.created_at} \n Updated at: ${genericEl.updated_at}`;
    return (
      <div>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="genericElDatesx">{datetp}</Tooltip>}>
          <span>
            <i className={iconClass} />
            &nbsp;<span>{genericEl.name}</span> &nbsp;
          </span>
        </OverlayTrigger>
        <ConfirmClose el={genericEl} />
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
