import React, {PropTypes, Component} from 'react';
import {Well, Panel, Input, ListGroup, ListGroupItem, ButtonToolbar, Button, TabbedArea, TabPane} from 'react-bootstrap';
import ElementCollectionLabels from './ElementCollectionLabels';
import UIStore from './stores/UIStore';
import ElementActions from './actions/ElementActions';
import Wellplate from './Wellplate';
import WellplateList from './WellplateList';

import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';
import ElementStore from './stores/ElementStore';

const cols = 12;

export default class WellplateDetails extends Component {
  constructor(props) {
    super(props);
    const {id, name, wells, size, description} = props.wellplate;
    this.state = {
      id,
      name,
      size,
      description,
      wells: this.initWells(wells, size)
    };
    console.log(wells);
  }

  componentDidMount() {
    console.log('Mount WellplateDetails')
    ElementStore.listen(this.onChange.bind(this));
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange.bind(this));
    console.log('Unmount WellplateDetails')
  }

  onChange(state) {
    console.log(state)
    if(!state.currentElement || state.currentElement.type == 'wellplate') {
      this.setState({
        wellplate: state.currentElement
      });
    }
  }

  componentWillReceiveProps(nextProps) {
    const {id, name, wells, size, description} = nextProps.wellplate;
    this.setState({
      id,
      name,
      size,
      description,
      wells: this.initWells(wells, size)
    });
  }

  closeDetails() {
    UIActions.deselectAllElements();

    let uiState = UIStore.getState();
    Aviator.navigate(`/collection/${uiState.currentCollectionId}`);
  }

  initWells(wells, size) {
    const neededPlaceholders = size - wells.length;
    const placeholders = Array(neededPlaceholders).fill({});
    wells = wells.concat(placeholders);
    return wells.map((well, key) => this.initWell(well, key));
  }

  initWell(well, key) {
    return {
      ...well,
      position: this.calculatePositionOfWell(key),
      readout: ""
    }
  }

  calculatePositionOfWell(key) {
    let remainder = (key + 1) % cols;
    return {
      x: (remainder == 0) ? cols : remainder,
      y: Math.floor(key / cols) + 1
    };
  }

  handleSubmit() {
    const {id} = this.props.wellplate;
    const {currentCollectionId} = UIStore.getState();
    const {state} = this;
    if(id == '_new_') {
      ElementActions.createWellplate({
        ...state,
        collection_id: currentCollectionId
      });
    } else {
      ElementActions.updateWellplate(this.state);
    }
  }

  handleWellsChange(wells) {
    this.setState({wells});
    //console.log(wells);
  }

  handleInputChange(type, event) {
    let newState = {};
    const value = event.target.value;
    switch (type) {
      case 'name':
        newState.name = value;
        break;
      case 'size':
        newState.size = value;
        break;
      case 'description':
        newState.description = value;
        break;
    }
    this.setState({
      ...newState
    });
  }

  render() {
    const {wellplate} = this.props;
    const {wells, name, size, description} = this.state;
    const submitLabel = (wellplate.id == '_new_') ? "Save Wellplate" : "Update Wellplate";
    return (
      <div key={wellplate.id}>
        <Panel header="Wellplate Details" bsStyle='primary'>
          <h3>{name}</h3>
          <ElementCollectionLabels element={wellplate}/>
          <ListGroup fill>
            <ListGroupItem>
              <table width="100%">
                <tr>
                  <td width="70%" className="padding-right">
                    <Input
                      type="text"
                      label="Name"
                      value={name}
                      onChange={event => this.handleInputChange('name', event)}
                      />
                  </td>
                  <td width="30%">
                    <Input
                      type="text"
                      label="Size"
                      value={size}
                      onChange={event => this.handleInputChange('size', event)}
                      disabled
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
            <ListGroupItem>
              <TabbedArea>
                <TabPane eventKey={1} tab={'Designer'}>
                  <Well>
                    <Wellplate
                      size={size}
                      wells={wells}
                      handleWellsChange={(wells) => this.handleWellsChange(wells)}
                      cols={cols}
                      width={60}
                      />
                  </Well>
                </TabPane>
                <TabPane eventKey={2} tab={'List'}>
                  <Well>
                    <WellplateList
                      wells={wells}
                      handleWellsChange={(wells) => this.handleWellsChange(wells)}
                      />
                  </Well>
                </TabPane>
              </TabbedArea>
            </ListGroupItem>
            <ListGroupItem>
              <ButtonToolbar>
                <Button
                  bsStyle="primary"
                  onClick={() => this.closeDetails()}
                  >
                  Back
                </Button>
                <Button
                  bsStyle="warning"
                  onClick={() => this.handleSubmit()}
                  >
                  {submitLabel}
                </Button>
              </ButtonToolbar>
            </ListGroupItem>
          </ListGroup>
        </Panel>
      </div>
    );
  }
}

WellplateDetails.propTypes = {
  wellplate: PropTypes.object.isRequired
};
