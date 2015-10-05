import React, {Component} from 'react';
import {Input, Panel, ListGroup, ListGroupItem, ButtonToolbar, Button} from 'react-bootstrap';
import ElementCollectionLabels from './ElementCollectionLabels';
import ElementActions from './actions/ElementActions';
import UIStore from './stores/UIStore';
import Aviator from 'aviator';
import ScreenWellplates from './ScreenWellplates';

export default class ScreenDetails extends Component {
  constructor(props) {
    super(props);
    const {screen} = props;
    this.state = {
      ...screen
    };
  }

  componentWillReceiveProps(nextProps) {
    const {screen} = nextProps;
    this.state = {
      ...screen
    };
  }

  handleSubmit() {
    const {id} = this.state;
    if(id == '_new_') {
      this.createSample();
    } else {
      ElementActions.updateScreen(this.state);
    }
  }

  handleInputChange(type, event) {
    let newState = {};
    const value = event.target.value;
    switch (type) {
      case 'name':
        newState.name = value;
        break;
      case 'requirements':
        newState.requirements = value;
        break;
      case 'collaborator':
        newState.collaborator = value;
        break;
      case 'conditions':
        newState.conditions = value;
        break;
      case 'result':
        newState.result = value;
        break;
      case 'description':
        newState.description = value;
        break;
    }
    this.setState({
      ...newState
    });
  }

  closeDetails() {
    let uiState = UIStore.getState();
    Aviator.navigate(`/collection/${uiState.currentCollectionId}`);
  }

  dropWellplate(wellplate) {
    const {wellplates} = this.state;
    wellplates.push(wellplate);
    this.setState({wellplates});
  }

  deleteWellplate(wellplate){
    const {wellplates} = this.state;
    const wellplateIndex = wellplates.indexOf(wellplate);
    wellplates.splice(wellplateIndex, 1);
    this.setState({wellplates});
  }

  render() {
    const {screen} = this.props;
    const {id, wellplates, name, collaborator, result, conditions, requirements, description} = this.state;
    const submitLabel = (id == '_new_') ?"Save Screen" : "Update Screen";
    return (
      <div>
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
