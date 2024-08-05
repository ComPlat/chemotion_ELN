import React, { Component } from 'react';
import EditModeHeader from 'src/apps/mydb/elements/details/cellLines/analysesTab/EditModeHeader';
import ContainerComponent from 'src/components/container/ContainerComponent';
import PropTypes from 'prop-types';
import Panel from 'src/components/legacyBootstrap/Panel'

// eslint-disable-next-line react/prefer-stateless-function
export default class EditModeRow extends Component {
  
  render() {
    const { container, parent, element,readOnly } = this.props;
    return (
      <Panel
        eventKey={container.id}
        key={container.id}
      >
        <Panel.Heading
          onClick={() => parent.handleClickOnPanelHeader(container.id)}
        >
          <EditModeHeader 
            element={element} 
            container={container}
            parent={parent} 
            readOnly={readOnly}/>
        </Panel.Heading>
        <Panel.Body collapsible>
          <ContainerComponent
            analysisMethodTitle="Type (BioAssay Ontology)"
            ontologyName="bao"
            templateType="researchPlan"
            readOnly={readOnly}
            disabled={false}
            container={container}
            onChange={() => parent.handleChange(container)}
          />
        </Panel.Body>
      </Panel>
    );
  }
}

EditModeRow.propTypes = {
  container: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  }).isRequired,
  parent: PropTypes.shape({
    handleClickOnPanelHeader: PropTypes.func.isRequired,
    handleChange: PropTypes.func.isRequired
  }).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  element: PropTypes.object.isRequired,
  readOnly: PropTypes.bool.isRequired
};
