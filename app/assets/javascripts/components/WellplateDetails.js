import React, {PropTypes, Component} from 'react';
import {Well, Panel, Input, ListGroup, ListGroupItem, ButtonToolbar, Button, Tabs, Tab} from 'react-bootstrap';
import ElementCollectionLabels from './ElementCollectionLabels';
import ElementActions from './actions/ElementActions';
import CollectionActions from './actions/CollectionActions';
import Wellplate from './Wellplate';
import WellplateList from './WellplateList';
import WellplateProperties from './WellplateProperties';

import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';

import StickyDiv from 'react-stickydiv'

const cols = 12;

export default class WellplateDetails extends Component {

  constructor(props) {
    super(props);
    const {wellplate} = props;
    this.state = {
      wellplate,
      activeTab: 0,
      showWellplate: true,
      offsetTop: 70
    }

    this.handleResize = this.handleResize.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const {wellplate} = this.state;
    const nextWellplate = nextProps.wellplate;
    if (nextWellplate.id != wellplate.id || nextWellplate.updated_at != wellplate.updated_at) {
      this.setState({
        wellplate: nextWellplate
      });
    }
  }

  closeDetails() {
    UIActions.deselectAllElements();
    const {currentCollection,isSync} = UIStore.getState();
    Aviator.navigate(isSync
      ? `/scollection/${currentCollection.id}`
      : `/collection/${currentCollection.id}`
    );
  }

  handleResize(e = null) {
    let windowHeight = window.innerHeight || 1;
    if (windowHeight < 500) {
      this.setState({offsetTop:0} );
    } else {this.setState({offsetTop:70})}
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

  wellplateHeader(wellplate) {
    let saveBtnDisplay = wellplate.isEdited ? '' : 'none'
    return(
      <div>
      <i className="icon-wellplate" /> &nbsp; {wellplate.name} &nbsp;
      <ElementCollectionLabels element={wellplate}/>
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
    const {wellplate, activeTab, showWellplate} = this.state;
    const {wells, name, size, description} = wellplate;
    const submitLabel = wellplate.isNew ? "Create" : "Save";

    const properties = {
      name,
      size,
      description
    };

    return (
      <StickyDiv zIndex={2} offsetTop={this.state.offsetTop}>
        <div key={wellplate.id}>
          <Panel header={this.wellplateHeader(wellplate)}
                 bsStyle={wellplate.isEdited ? 'info' : 'primary'}
                 className="panel-detail">
            <ListGroup fill>
              <ListGroupItem>
                <Tabs activeKey={activeTab} onSelect={event => this.handleTabChange(event)}
                      id="wellplateDetailsTab">
                  <Tab eventKey={0} title={'Designer'}>
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
                  </Tab>
                  <Tab eventKey={1} title={'List'}>
                    <Well>
                      <WellplateList
                        wells={wells}
                        handleWellsChange={(wells) => this.handleWellsChange(wells)}
                        />
                    </Well>
                  </Tab>
                  <Tab eventKey={2} title={'Properties'}>
                    <WellplateProperties
                      {...properties}
                      changeProperties={(change) => this.handleChangeProperties(change)}
                      />
                  </Tab>
                </Tabs>
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
      </StickyDiv>
    );
  }


}

WellplateDetails.propTypes = {
  wellplate: PropTypes.object.isRequired
};
