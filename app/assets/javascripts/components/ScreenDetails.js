import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, ControlLabel, FormControl, Panel, ListGroup, ListGroupItem,
  ButtonToolbar, Button, Tooltip, OverlayTrigger, Tabs, Tab
} from 'react-bootstrap';
import StickyDiv from 'react-stickydiv';
import { unionBy } from 'lodash';

import ElementCollectionLabels from './ElementCollectionLabels';
import ScreenWellplates from './ScreenWellplates';
import QuillEditor from './QuillEditor'
import ScreenDetailsContainers from './ScreenDetailsContainers';
import ElementActions from './actions/ElementActions';
import DetailActions from './actions/DetailActions';
import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';
import PrintCodeButton from './common/PrintCodeButton';
import ConfirmClose from './common/ConfirmClose'
import Immutable from 'immutable';
import ElementDetailSortTab from './ElementDetailSortTab';

export default class ScreenDetails extends Component {
  constructor(props) {
    super(props);
    const {screen} = props;
    this.state = {
      screen,
      activeTab: UIStore.getState().screen.activeTab,
      visible: Immutable.List(),
      hidden: Immutable.List(),
    }
    this.onUIStoreChange = this.onUIStoreChange.bind(this);
    this.onTabPositionChanged = this.onTabPositionChanged.bind(this)
  }

  onUIStoreChange(state) {
    if (state.screen.activeTab != this.state.activeTab){
      this.setState({
        activeTab: state.screen.activeTab
      })
    }
  }

  componentDidMount() {
    UIStore.listen(this.onUIStoreChange)
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUIStoreChange)
  }
  componentWillReceiveProps(nextProps) {
    const {screen} = nextProps;
    this.setState({ screen });
  }

  handleSubmit() {
    const {screen} = this.state;

    if(screen.isNew) {
      ElementActions.createScreen(screen);
    } else {
      ElementActions.updateScreen(screen);
    }
    if(screen.is_new) {
      const force = true;
      DetailActions.close(screen, force);
    }
  }

  handleInputChange(type, event) {
    const { screen } = this.state;
    const value = event.target.value;
    switch (type) {
      case 'name':
        screen.name = value;
        break;
      case 'requirements':
        screen.requirements = value;
        break;
      case 'collaborator':
        screen.collaborator = value;
        break;
      case 'conditions':
        screen.conditions = value;
        break;
      case 'result':
        screen.result = value;
        break;
      case 'description':
        screen.description = value;
        break;
    }
    this.setState({
      screen: screen
    });
  }

  dropWellplate(wellplate) {
    const { screen } = this.state;
    screen.wellplates = unionBy(screen.wellplates, [wellplate], 'id');
    this.forceUpdate();
  }

  handleScreenChanged(screen) {
    this.setState({ screen });
  }

  deleteWellplate(wellplate){
    const {screen} = this.state;
    const wellplateIndex = screen.wellplates.indexOf(wellplate);
    screen.wellplates.splice(wellplateIndex, 1);

    this.setState({ screen });
  }

  screenHeader(screen) {
    let saveBtnDisplay = screen.isEdited ? '' : 'none';
    const datetp = `Created at: ${screen.created_at} \n Updated at: ${screen.updated_at}`;

    return (
      <div>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="screenDatesx">{datetp}</Tooltip>}>
          <span>
            <i className="icon-screen" />
            &nbsp;<span>{screen.name}</span> &nbsp;
          </span>
        </OverlayTrigger>
        <ElementCollectionLabels element={screen} placement="right"/>
        <ConfirmClose el={screen} />
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="saveScreen">Save Screen</Tooltip>}>
          <Button bsStyle="warning" bsSize="xsmall" className="button-right"
                  onClick={() => this.handleSubmit()}
                  style={{display: saveBtnDisplay}} >
            <i className="fa fa-floppy-o "></i>
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="fullSample">FullScreen</Tooltip>}>
        <Button bsStyle="info" bsSize="xsmall" className="button-right"
          onClick={() => this.props.toggleFullScreen()}>
          <i className="fa fa-expand"></i>
        </Button>
        </OverlayTrigger>
        <PrintCodeButton element={screen}/>
      </div>
    );
  }

  propertiesFields(screen){
    const {wellplates, name, collaborator, result, conditions, requirements, description} = screen;

    return(
      <ListGroup fill="true">
        <ListGroupItem>
          <table width="100%"><tbody>
            <tr>
              <td width="50%" className="padding-right">
                <FormGroup>
                  <ControlLabel>Name</ControlLabel>
                  <FormControl
                    type="text"
                    value={name || ''}
                    onChange={event => this.handleInputChange('name', event)}
                    disabled={screen.isMethodDisabled('name')}
                  />
                </FormGroup>
              </td>
              <td width="50%">
                <FormGroup>
                  <ControlLabel>Collaborator</ControlLabel>
                  <FormControl
                    type="text"
                    value={collaborator || ''}
                    onChange={event => this.handleInputChange('collaborator', event)}
                    disabled={screen.isMethodDisabled('collaborator')}
                  />
                </FormGroup>
              </td>
            </tr>
            <tr>
              <td className="padding-right">
                <FormGroup>
                  <ControlLabel>Requirements</ControlLabel>
                  <FormControl
                    type="text"
                    value={requirements || ''}
                    onChange={event => this.handleInputChange('requirements', event)}
                    disabled={screen.isMethodDisabled('requirements')}
                  />
                </FormGroup>
              </td>
              <td >
                <FormGroup>
                  <ControlLabel>Conditions</ControlLabel>
                  <FormControl
                    type="text"
                    value={conditions || ''}
                    onChange={event => this.handleInputChange('conditions', event)}
                    disabled={screen.isMethodDisabled('conditions')}
                  />
                </FormGroup>
              </td>
            </tr>
            <tr>
              <td colSpan="2">
                <FormGroup>
                  <ControlLabel>Result</ControlLabel>
                  <FormControl
                    type="text"
                    value={result || ''}
                    onChange={event => this.handleInputChange('result', event)}
                    disabled={screen.isMethodDisabled('result')}
                  />
                </FormGroup>
              </td>
            </tr>
            <tr>
              <td colSpan="2">
                <FormGroup>
                  <ControlLabel>Description</ControlLabel>
                  <QuillEditor value={description}
                    onChange={event => this.handleInputChange('description', {target: {value: event}})}
                    disabled={screen.isMethodDisabled('description')}
                  />
                </FormGroup>
              </td>
            </tr>
          </tbody></table>
        </ListGroupItem>
        <ListGroupItem>
          <h4 className="list-group-item-heading">Wellplates</h4>
          <ScreenWellplates
            wellplates={wellplates}
            dropWellplate={wellplate => this.dropWellplate(wellplate)}
            deleteWellplate={wellplate => this.deleteWellplate(wellplate)}
            />
        </ListGroupItem>
      </ListGroup>
    );
  }

  handleSelect(eventKey) {
    UIActions.selectTab({tabKey: eventKey, type: 'screen'});
    this.setState({
      activeTab: eventKey
    })
  }

  renderTabContents(screen) {
    let {
      visible, hidden
    } = this.state
    

    const tabContents = []
    for (let i = 0; i < visible.size; i++) {
      let value = visible.get(i)
      if (value === 'properties') {
        const tabContent = (
          <Tab eventKey={i} title={'Properties'}>
              {this.propertiesFields(screen)}
            </Tab>
        )
        tabContents.push(tabContent)
      }
      else {
        const tabContent = (
          <Tab eventKey={i} title={'Analyses'}>
              <ScreenDetailsContainers
                screen={screen}
                parent={this}
              />
          </Tab>
        )
        tabContents.push(tabContent)
      }
    }
    return tabContents
  }

  onTabPositionChanged(visible, hidden) {
    this.setState({visible, hidden})
  }

  render() {
    const {screen} = this.state;

    const submitLabel = screen.isNew ? "Create" : "Save";

    return (
      <Panel bsStyle={screen.isPendingToSave ? 'info' : 'primary'}
        className="eln-panel-detail">
        <Panel.Heading>{this.screenHeader(screen)}</Panel.Heading>
        <Panel.Body>
          <ElementDetailSortTab type={'screen'} onTabPositionChanged={this.onTabPositionChanged}/>
          <Tabs activeKey={this.state.activeTab} onSelect={key => this.handleSelect(key)}
             id="screen-detail-tab">
            {this.renderTabContents(screen)}
          </Tabs>

          <ButtonToolbar>
            <Button bsStyle="primary" onClick={() => DetailActions.close(screen)}>Close</Button>
            <Button bsStyle="warning" onClick={() => this.handleSubmit()}>{submitLabel}</Button>
          </ButtonToolbar>
        </Panel.Body>
      </Panel>
    );
  }
}

ScreenDetails.propTypes = {
  screen: PropTypes.object,
  toggleFullScreen: PropTypes.func,
}
