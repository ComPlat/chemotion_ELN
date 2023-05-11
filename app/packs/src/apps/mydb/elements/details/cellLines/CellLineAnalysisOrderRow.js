
import React, { Component } from 'react';
import { PanelGroup, Panel, Button } from 'react-bootstrap';
import CellLineAnalysisOrderHeader from 'src/apps/mydb/elements/details/cellLines/CellLineAnalysisOrderHeader';

export default class CellLineAnalysisOrderRow extends Component {

    constructor(props) {
        super();
        
      }
    render(){
        return (
        <Panel>
        <Panel.Heading>
          <CellLineAnalysisOrderHeader container={this.props.container}/>
        </Panel.Heading>
        <Panel.Body collapsible>
        </Panel.Body>
      </Panel>
        );
    }
}