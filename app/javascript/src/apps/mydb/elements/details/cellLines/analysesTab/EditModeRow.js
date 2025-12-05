import React from 'react';
import Header from 'src/apps/mydb/elements/details/cellLines/analysesTab/Header';
import ContainerComponent from 'src/components/container/ContainerComponent';
import PropTypes from 'prop-types';
import { Accordion, Card } from 'react-bootstrap';
import AccordionHeaderWithButtons from 'src/components/common/AccordionHeaderWithButtons';

const EditModeRow = ({ container, handleChange, element, readOnly, index, rootContainer }) => (
  <Card eventKey={container.id} className="border-0 rounded-0">
    <Card.Header className="rounded-0 p-0 border-bottom-0">
      <AccordionHeaderWithButtons as="div">
        <Header
          isEditHeader
          element={element}
          container={container}
          handleChange={handleChange}
          readOnly={readOnly}
        />
      </AccordionHeaderWithButtons>
    </Card.Header>
    <Accordion.Collapse>
      <Card.Body>
        <ContainerComponent
          analysisMethodTitle="Type (BioAssay Ontology)"
          ontologyName="bao"
          element={element}
          templateType="researchPlan"
          readOnly={readOnly}
          disabled={false}
          container={container}
          onChange={() => handleChange(container)}
          rootContainer={rootContainer}
          index={index}
        />
      </Card.Body>
    </Accordion.Collapse>
  </Card>
);

EditModeRow.propTypes = {
  container: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  }).isRequired,
  handleChange: PropTypes.func.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  element: PropTypes.object.isRequired,
  readOnly: PropTypes.bool.isRequired
};

export default EditModeRow;
