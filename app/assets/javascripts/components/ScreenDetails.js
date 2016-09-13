import React, {Component} from 'react';
import {FormGroup, ControlLabel, FormControl, Panel, ListGroup, ListGroupItem, ButtonToolbar, Button} from 'react-bootstrap';
import ElementCollectionLabels from './ElementCollectionLabels';
import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';
import Aviator from 'aviator';
import ScreenWellplates from './ScreenWellplates';

import ElementActions from './actions/ElementActions';
import StickyDiv from 'react-stickydiv'

export default class ScreenDetails extends Component {
  constructor(props) {
    super(props);
    const {screen} = props;
    this.state = {
      screen,
      offsetTop: 70
    }

    this.handleResize = this.handleResize.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const {screen} = nextProps;
    this.setState({ screen });
  }

  handleResize(e = null) {
    let windowHeight = window.innerHeight || 1;
    if (windowHeight < 500) {
      this.setState({offsetTop:0} );
    } else {this.setState({offsetTop:70})}
  }

  handleSubmit() {
    const {screen} = this.state;

    if(screen.isNew) {
      ElementActions.createScreen(screen);
    } else {
      ElementActions.updateScreen(screen);
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

  closeDetails() {
    UIActions.deselectAllElements();

    const {currentCollection,isSync} = UIStore.getState();
    Aviator.navigate(isSync
      ? `/scollection/${currentCollection.id}`
      : `/collection/${currentCollection.id}`
    );
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
        <i className="icon-screen" /> &nbsp; {screen.name} &nbsp;
        <ElementCollectionLabels element={screen}/>
        <Button bsStyle="danger" bsSize="xsmall"
          className="button-right" onClick={() => this.closeDetails()}
          style={{float: 'right', margin:"0px 2px"}}>
          <i className="fa fa-times"></i>
        </Button>
        <Button bsStyle="warning" bsSize="xsmall" onClick={() => this.submitFunction()}
                style={{float: 'right', margin:"0px 2px",display: saveBtnDisplay}} >
          <i className="fa fa-floppy-o "></i>
        </Button>
      </div>
    )
  }

  render() {
    const {screen} = this.state;
    const {id, wellplates, name, collaborator, result, conditions, requirements, description} = screen;

    const submitLabel = screen.isNew ? "Create" : "Save";
    return (
      <StickyDiv zIndex={2} offsetTop={this.state.offsetTop}>
      <div key={id}>
        <Panel header={this.screenHeader(screen)}
               bsStyle={screen.isEdited ? 'info' : 'primary'}
               className="panel-fixed">
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
                        type="textarea"
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
            <Button bsStyle="primary" onClick={() => this.closeDetails()}>Close</Button>
            <Button bsStyle="warning" onClick={() => this.handleSubmit()}>{submitLabel}</Button>
          </ButtonToolbar>
        </Panel>
      </div>
      </StickyDiv>
    );
  }
}

ScreenDetails.propTypes = {
  screen: React.PropTypes.object,
}
