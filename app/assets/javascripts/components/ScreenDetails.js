import React, {Component} from 'react';
import {FormGroup, ControlLabel, FormControl, Panel, ListGroup, ListGroupItem,
  ButtonToolbar, Button, Tooltip, OverlayTrigger} from 'react-bootstrap';
import ElementCollectionLabels from './ElementCollectionLabels';
import ScreenWellplates from './ScreenWellplates';

import ElementActions from './actions/ElementActions';
import StickyDiv from 'react-stickydiv'

export default class ScreenDetails extends Component {
  constructor(props) {
    super(props);
    const {screen} = props;
    this.state = {
      screen,
    }
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
      this.props.closeDetails(screen, force);
    }
  }

  handleInputChange(type, event) {
    let {screen} = this.state;
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
    const {screen} = this.state;

    screen.wellplates.push(wellplate);
    this.setState({ screen });
  }

  deleteWellplate(wellplate){
    const {screen} = this.state;
    const wellplateIndex = screen.wellplates.indexOf(wellplate);
    screen.wellplates.splice(wellplateIndex, 1);

    this.setState({ screen });
  }

  screenHeader(screen) {
    let saveBtnDisplay = screen.isEdited ? '' : 'none'

    return (
      <div>
        <i className="icon-screen" />
        &nbsp; <span>{screen.name}</span> &nbsp;
        <ElementCollectionLabels element={screen} placement="right"/>
        <OverlayTrigger placement="bottom"
            overlay={<Tooltip id="closeScreen">Close Screen</Tooltip>}>
          <Button bsStyle="danger" bsSize="xsmall" className="button-right"
            onClick={() => this.props.closeDetails(screen)} >
            <i className="fa fa-times"></i>
          </Button>
        </OverlayTrigger>
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
      </div>
    )
  }

  render() {
    const {screen} = this.state;
    const {wellplates, name, collaborator, result, conditions, requirements, description} = screen;

    const submitLabel = screen.isNew ? "Create" : "Save";

    return (
      <Panel header={this.screenHeader(screen)}
             bsStyle={screen.isPendingToSave ? 'info' : 'primary'}
             className="panel-detail">
        <ListGroup fill>
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
                    <FormControl
                      componentClass="textarea"
                      value={description || ''}
                      onChange={event => this.handleInputChange('description', event)}
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
        <ButtonToolbar>
          <Button bsStyle="primary" onClick={() => this.props.closeDetails(screen)}>Close</Button>
          <Button bsStyle="warning" onClick={() => this.handleSubmit()}>{submitLabel}</Button>
        </ButtonToolbar>
      </Panel>
    );
  }
}

ScreenDetails.propTypes = {
  screen: React.PropTypes.object,
  closeDetails: React.PropTypes.func,
  toggleFullScreen: React.PropTypes.func,
}
