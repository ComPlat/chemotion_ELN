import React, {Component} from 'react';
import {Input, Panel, ListGroup, ListGroupItem, ButtonToolbar, Button} from 'react-bootstrap';
import ElementCollectionLabels from './ElementCollectionLabels';
import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';
import Aviator from 'aviator';
import ScreenWellplates from './ScreenWellplates';
import ElementStore from './stores/ElementStore';
import ElementActions from './actions/ElementActions';

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
    const {currentCollection} = UIStore.getState();
    const {screen} = this.state;

    if(screen.id == '_new_') {
      let params = screen;
      params.collection_id = currentCollection.id;
      ElementActions.createScreen(params);
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

    const submitLabel = (id == '_new_') ?"Save Screen" : "Update Screen";
    return (
      <div key={screen.id}>
        <Panel header="Screen Details" bsStyle='primary'>
          <h3>{name}</h3>
          <ElementCollectionLabels element={screen}/>
          <ListGroup fill>
            <ListGroupItem>
              <table width="100%">
                <tr>
                  <td width="50%" className="padding-right">
                    <Input
                      type="text"
                      label="Name"
                      value={name}
                      onChange={event => this.handleInputChange('name', event)}
                      />
                  </td>
                  <td width="50%">
                    <Input
                      type="text"
                      label="Collaborator"
                      value={collaborator}
                      onChange={event => this.handleInputChange('collaborator', event)}
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
                      />
                  </td>
                  <td >
                    <Input
                      type="text"
                      label="Conditions"
                      value={conditions}
                      onChange={event => this.handleInputChange('conditions', event)}
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
                      />
                  </td>
                </tr>
              </table>
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
            <Button bsStyle="primary" onClick={() => this.closeDetails()}>Back</Button>
            <Button bsStyle="warning" onClick={() => this.handleSubmit()}>{submitLabel}</Button>
          </ButtonToolbar>
        </Panel>
      </div>
    );
  }
}
