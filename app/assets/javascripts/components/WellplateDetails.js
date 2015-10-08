import React, {PropTypes, Component} from 'react';
import {Well, Panel, Input, ListGroup, ListGroupItem, ButtonToolbar, Button, TabbedArea, TabPane} from 'react-bootstrap';
import ElementCollectionLabels from './ElementCollectionLabels';
import ElementActions from './actions/ElementActions';
import Wellplate from './Wellplate';
import WellplateList from './WellplateList';
import WellplateProperties from './WellplateProperties';

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
    let uiState = UIStore.getState();
    UIActions.deselectAllElements();
    Aviator.navigate(`/collection/${uiState.currentCollectionId}`);
  }

  initWells(wells, size) {
    // TODO needs to be done in backend!
    const neededPlaceholders = size - wells.length;
    const placeholders = Array(neededPlaceholders).fill({});
    wells = wells.concat(placeholders);
    // TODO END

    return wells.map((well, key) => this.initWell(well, key));
  }

  initWell(well, key) {
    return {
      ...well,
      position: this.calculatePositionOfWell(key)
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
    //console.log(this.state.wells);
  }

  handleChangeProperties(properties) {
    this.setState({
        ...properties
    });
  }

  render() {
    const {wellplate} = this.props;
    const {wells, name, size, description} = this.state;
    const submitLabel = (wellplate.id == '_new_') ? "Create" : "Save";
    const properties = {
      name,
      size,
      description
    };
    return (
      <div key={wellplate.id}>
        <Panel header="Wellplate Details" bsStyle='primary'>
          <h3>{name}</h3>
          <ElementCollectionLabels element={wellplate}/>
          <ListGroup fill>
            <ListGroupItem>
              <TabbedArea defaultActiveKey={1}>
                <TabPane eventKey={0} tab={'Properties'}>
                  <WellplateProperties
                    {...properties}
                    changeProperties={properties => this.handleChangeProperties(properties)}
                    />
                </TabPane>
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
                  Close
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
