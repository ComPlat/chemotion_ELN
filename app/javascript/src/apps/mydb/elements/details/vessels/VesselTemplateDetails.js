import React from 'react';
import PropTypes from 'prop-types';
import { Card, Button, Form, Row, Col } from 'react-bootstrap';
import DetailActions from 'src/stores/alt/actions/DetailActions';

function VesselTemplateDetails({ template, vesselInstances, toggleFullScreen }) {
  const vesselTemplate = template.vessel_template;

  const renderEnlargenButton = () => (
    <Button
      variant="info"
      size="xxsm"
      onClick={toggleFullScreen}
    >
      <i className="fa fa-expand" />
    </Button>
  );

  const renderCloseHeaderButton = () => (
    <Button
      variant="danger"
      size="xxsm"
      onClick={() => { DetailActions.close(template, true); }}
    >
      <i className="fa fa-times" />
    </Button>
  );

  const renderHeaderContent = () => (
    <div className="d-flex align-items-center justify-content-between">
      <div className="d-flex gap-2">
        <span>
          <i className="icon-vessel me-1" />
          {vesselTemplate.name}
        </span>
      </div>
      <div className="d-flex gap-1">
        {renderEnlargenButton()}
        {renderCloseHeaderButton()}
      </div>
    </div>
  );

  return (
    <Card className="detail-card">
      <Card.Header>
        {renderHeaderContent()}
      </Card.Header>
      <Card.Body className="bg-gray-100">
        <h5 className="my-2">Vessel template details:</h5>
        <Form>
          <Form.Group as={Row} className="mb-2">
            <Form.Label column sm={2}><strong>Name:</strong></Form.Label>
            <Col sm={4}>
              <Form.Control
                type="text"
                readOnly
                value={vesselTemplate.name}
              />
            </Col>
          </Form.Group>
          <Form.Group as={Row} className="mb-2">
            <Form.Label column sm={2}><strong>Details:</strong></Form.Label>
            <Col sm={4}>
              <Form.Control
                type="text"
                readOnly
                value={vesselTemplate.details || ''}
              />
            </Col>
          </Form.Group>
          <Form.Group as={Row} className="mb-2">
            <Form.Label column sm={2}><strong>Type:</strong></Form.Label>
            <Col sm={4}>
              <Form.Control
                type="text"
                readOnly
                value={vesselTemplate.vessel_type || ''}
              />
            </Col>
          </Form.Group>
          <Form.Group as={Row} className="mb-2">
            <Form.Label column sm={2}><strong>Material:</strong></Form.Label>
            <Col sm={4}>
              <Form.Control
                type="text"
                readOnly
                value={vesselTemplate.material_type || ''}
              />
            </Col>
          </Form.Group>
          <Form.Group as={Row} className="mb-2">
            <Form.Label column sm={2}><strong>Volume:</strong></Form.Label>
            <Col sm={4}>
              <Form.Control
                type="text"
                readOnly
                value={`${vesselTemplate.volume_amount || ''} ${vesselTemplate.volume_unit || ''}`}
              />
            </Col>
          </Form.Group>
        </Form>
        <h5 className="mb-4">Vessel instances:</h5>
        <Form>
          {vesselInstances.map((item) => (
            <Form.Group as={Row} className="mb-2" key={item.id}>
              <Form.Label column sm={2} />
              <Col sm={4}>
                <Form.Control type="text" readOnly value={item.name || 'Unnamed instance'} />
              </Col>
            </Form.Group>
          ))}
        </Form>
      </Card.Body>
    </Card>
  );
}

VesselTemplateDetails.propTypes = {
  toggleFullScreen: PropTypes.func.isRequired,
  template: PropTypes.shape({
    name: PropTypes.string.isRequired,
    details: PropTypes.string,
    vessel_type: PropTypes.string,
    material_type: PropTypes.string,
    volume_amount: PropTypes.number,
    volume_unit: PropTypes.string,
  }).isRequired,
  vesselInstances: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      vesselInstanceName: PropTypes.string,
    })
  ).isRequired,
};

export default VesselTemplateDetails;
