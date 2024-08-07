import React from 'react';
import Header from 'src/apps/mydb/elements/details/cellLines/analysesTab/Header';
import ContainerComponent from 'src/components/container/ContainerComponent';
import PropTypes from 'prop-types';
import { Accordion } from 'react-bootstrap';

const EditModeRow = ({ container, parent, element, readOnly }) => (
  <Accordion.Item eventKey={container.id}>
    <Accordion.Header>
      <Header
        isEditHeader
        element={element}
        container={container}
        parent={parent}
        readOnly={readOnly}
      />
    </Accordion.Header>
    <Accordion.Body>
      <ContainerComponent
        analysisMethodTitle="Type (BioAssay Ontology)"
        ontologyName="bao"
        templateType="researchPlan"
        readOnly={readOnly}
        disabled={false}
        container={container}
        onChange={() => parent.handleChange(container)}
      />
    </Accordion.Body>
  </Accordion.Item>
);

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

export default EditModeRow;
