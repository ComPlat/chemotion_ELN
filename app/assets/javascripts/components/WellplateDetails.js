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
    const {wellplate} = props;
    this.state = { wellplate };
  }

  componentWillReceiveProps(nextProps) {
    const {wellplate} = nextProps;
    this.setState({ wellplate });
  }

  closeDetails() {
    let uiState = UIStore.getState();
    UIActions.deselectAllElements();
    Aviator.navigate(`/collection/${uiState.currentCollectionId}`);
  }

  handleSubmit() {
    const {currentCollection} = UIStore.getState();
    const {wellplate} = this.state;

    if(wellplate.id == '_new_') {
      let params = wellplate;
      params.collection_id = currentCollection.id;
      ElementActions.createWellplate(params);
    } else {
      ElementActions.updateWellplate(wellplate);
    }
  }

  handleWellsChange(wells) {
    let {wellplate} = this.state;
    wellplate.wells = wells;
    this.setState({ wellplate });
  }

  handleChangeProperties(change) {
    let {wellplate} = this.state;
    let {type, value} = change;

    switch (type) {
      case 'name':
        wellplate.name = value;
        break;
      case 'description':
        wellplate.description = value;
        break;
    }

    this.setState({ wellplate });
  }


  render() {
    const {wellplate} = this.state;
    const {wells, name, size, description} = wellplate;

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
              <TabbedArea defaultActiveKey={0}>
                <TabPane eventKey={0} tab={'Designer'}>
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
                <TabPane eventKey={1} tab={'List'}>
                  <Well>
                    <WellplateList
                      wells={wells}
                      handleWellsChange={(wells) => this.handleWellsChange(wells)}
                      />
                  </Well>
                </TabPane>
                <TabPane eventKey={2} tab={'Properties'}>
                  <WellplateProperties
                    {...properties}
                    changeProperties={(change) => this.handleChangeProperties(change)}
                    />
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
