import React, {PropTypes, Component} from 'react';
import {Well, Panel, Input, ListGroup, ListGroupItem, ButtonToolbar, Button, TabbedArea, TabPane} from 'react-bootstrap';
import ElementCollectionLabels from './ElementCollectionLabels';
import ElementActions from './actions/ElementActions';
import CollectionActions from './actions/CollectionActions';
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
    this.state = {
      wellplate,
      activeTab: 0,
      showWellplate: true
    };
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

    if(wellplate.isNew) {
      ElementActions.createWellplate(wellplate.serialize());
    } else {
      ElementActions.updateWellplate(wellplate.serialize());
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

  handleTabChange(event) {
    let showWellplate = (event == 0) ? true : false;
    this.setState({activeTab: event, showWellplate});
  }

  render() {
    const {wellplate, activeTab, showWellplate} = this.state;
    const {wells, name, size, description} = wellplate;

    const submitLabel = wellplate.isNew ? "Create" : "Save";

    const properties = {
      name,
      size,
      description
    };

    return (
      <div key={wellplate.id}>
        <Panel header="Wellplate Details" bsStyle={wellplate.isEdited ? 'info' : 'primary'} >
          <h3>{name}</h3>
          <ElementCollectionLabels element={wellplate}/>
          <ListGroup fill>
            <ListGroupItem>
              <TabbedArea activeKey={activeTab} onSelect={event => this.handleTabChange(event)}>
                <TabPane eventKey={0} tab={'Designer'}>
                  <Well>
                    <Wellplate
                      show={showWellplate}
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

                <Button
                  bsStyle="default"
                  onClick={() => CollectionActions.downloadReportWellplate(wellplate.id)}
                  >
                  Export samples
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
