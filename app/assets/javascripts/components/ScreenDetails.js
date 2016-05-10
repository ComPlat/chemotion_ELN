import React, {Component} from 'react';
import {Input, Panel, ListGroup, ListGroupItem, ButtonToolbar, Button} from 'react-bootstrap';
import ElementCollectionLabels from './ElementCollectionLabels';
import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';
import Aviator from 'aviator';
import ScreenWellplates from './ScreenWellplates';
import ElementStore from './stores/ElementStore';
import ElementActions from './actions/ElementActions';
import StickyDiv from 'react-stickydiv'

export default class ScreenDetails extends Component {
  constructor(props) {
    super(props);
    const {screen} = props;
    this.state = { screen };
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

    let uiState = UIStore.getState();
    Aviator.navigate(`/collection/${uiState.currentCollection.id}`);
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

  render() {
    const {screen} = this.state;
    const {id, wellplates, name, collaborator, result, conditions, requirements, description} = screen;

    const submitLabel = screen.isNew ? "Create" : "Save";
    return (
      <StickyDiv zIndex={2}>
      <div key={screen.id}>
        <Panel header="Screen Details" bsStyle={screen.isEdited ? 'info' : 'primary'}>
          <Button bsStyle="danger" bsSize="xsmall" className="button-right" onClick={this.closeDetails.bind(this)}>
            <i className="fa fa-times"></i>
          </Button>
          <h3>{name}</h3>
          <ElementCollectionLabels element={screen}/>
          <ListGroup fill>
            <ListGroupItem>
              <table width="100%"><tbody>
                <tr>
                  <td width="50%" className="padding-right">
                    <Input
                      type="text"
                      label="Name"
                      value={name}
                      onChange={event => this.handleInputChange('name', event)}
                      disabled={screen.isMethodDisabled('name')}
                      />
                  </td>
                  <td width="50%">
                    <Input
                      type="text"
                      label="Collaborator"
                      value={collaborator}
                      onChange={event => this.handleInputChange('collaborator', event)}
                      disabled={screen.isMethodDisabled('collaborator')}
                      />
                  </td>
                </tr>
                <tr>
                  <td className="padding-right">
                    <Input
                      type="text"
                      label="Requirements"
                      value={requirements}
                      onChange={event => this.handleInputChange('requirements', event)}
                      disabled={screen.isMethodDisabled('requirements')}
                      />
                  </td>
                  <td >
                    <Input
                      type="text"
                      label="Conditions"
                      value={conditions}
                      onChange={event => this.handleInputChange('conditions', event)}
                      disabled={screen.isMethodDisabled('conditions')}
                      />
                  </td>
                </tr>
                <tr>
                  <td colSpan="2">
                    <Input
                      type="text"
                      label="Result"
                      value={result}
                      onChange={event => this.handleInputChange('result', event)}
                      disabled={screen.isMethodDisabled('result')}
                      />
                  </td>
                </tr>
                <tr>
                  <td colSpan="2">
                    <Input
                      type="textarea"
                      label="Description"
                      value={description}
                      onChange={event => this.handleInputChange('description', event)}
                      disabled={screen.isMethodDisabled('description')}
                      />
                  </td>
                </tr>
              </tbody></table>
            </ListGroupItem>
            <ListGroupItem header="Wellplates">
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
