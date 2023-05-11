
import React, { Component } from 'react';
import CellLineAnalysisHeader from 'src/apps/mydb/elements/details/cellLines/CellLineAnalysisHeader';
import { Panel } from 'react-bootstrap';
import ContainerComponent from 'src/components/container/ContainerComponent';

export default class CellLineAnalysisEditRow extends Component {

    constructor(props) {
        super();
        
      }
    render(){
        return (
            <Panel
            eventKey={this.props.container.id}
            key={this.props.container.id}
          >
            <Panel.Heading
              onClick={(e) => this.props.parent.handleClickOnPanelHeader(this.props.container.id)}
            >
              <CellLineAnalysisHeader element={this.props.element} container={this.props.container} parent={this.props.parent} />
            </Panel.Heading>
            <Panel.Body collapsible>
              <ContainerComponent
                templateType="researchPlan"
                readOnly={false}
                disabled={false}
                container={this.props.container}
                onChange={() => this.props.parent.handleChange(this.props.container)}
              />
            </Panel.Body>
          </Panel>
        );
    }
}