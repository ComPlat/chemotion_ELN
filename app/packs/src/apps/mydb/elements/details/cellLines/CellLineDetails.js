import React from 'react';

import {
    Well, Panel, ListGroup, ListGroupItem, ButtonToolbar, Button,
    Tabs, Tab, Tooltip, OverlayTrigger
  } from 'react-bootstrap';

export default class CellLineDetails extends React.Component {
    constructor(props) {
        super(props);
        this.state={activeTab:"tab1"};
        this.onTabPositionChanged = this.onTabPositionChanged.bind(this);
        this.handleSegmentsChange = this.handleSegmentsChange.bind(this);
    }
    render(){
        
        return(
            <Panel >
            <Panel.Heading>Placeholder for the header</Panel.Heading>
            <Panel.Body>
             
              <Tabs activeKey={ this.state.activeTab} onSelect={event => this.handleTabChange(event)} id="wellplateDetailsTab">
                <Tab eventKey="tab1" title="tab1" key={"tab1"}>Platzhalter für Tab1</Tab>
                <Tab eventKey="tab2" title="tab2" key={"tab2"}>Platzhalter für Tab2</Tab>
                <Tab eventKey="tab3" title="tab3" key={"tab3"}>Platzhalter für Tab3</Tab>
              </Tabs>
              <ButtonToolbar>
                <Button bsStyle="primary">
                 Save
                </Button>
                <Button bsStyle="warning">
                Close
                </Button>                              
              </ButtonToolbar>
            </Panel.Body>
          </Panel>
        );
    }

    onTabPositionChanged(visible) {
        this.setState({ visible });
    }
    handleSegmentsChange(se) {
        
    }

    handleTabChange(eventKey) {
        this.setState({activeTab:eventKey})
    }
}