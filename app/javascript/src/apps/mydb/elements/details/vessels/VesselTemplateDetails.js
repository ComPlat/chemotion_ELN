import React, { useState, useContext } from 'react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import PropTypes from 'prop-types';
import { Card, Button, Form, Row, Col, Table } from 'react-bootstrap';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import VesselsFetcher from 'src/fetchers/VesselsFetcher';

function VesselTemplateDetails({ template, vesselInstances, toggleFullScreen }) {

  const { vesselDetailsStore } = useContext(StoreContext);
  const vesselId = template.id;
  const vesselItem = vesselDetailsStore.getVessel(vesselId) || template.vessel_template;
  const [vesselTemplate, setVesselTemplate] = useState(template.vessel_template);
  const [instances, setInstances] = useState(vesselInstances);
  const [isTemplateUpdated, setIsTemplateUpdated] = useState(false);

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

  const formatLabel = (field) => field.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

  const handleTemplateChange = (field, value) => {
    setVesselTemplate((prev) => ({ ...prev, [field]: value }));
    setIsTemplateUpdated(true);
  };

  const updateTemplate = () => {
    VesselsFetcher.updateVesselTemplate(vesselTemplate.id, vesselTemplate);
    setIsTemplateUpdated(false);
  };

  const handleInstanceChange = (index, field, value) => {
    setInstances((prevInstances) => {
      const updatedInstances = [...prevInstances];
      updatedInstances[index] = { ...updatedInstances[index], [field]: value };
      return updatedInstances;
    });
  };

  const updateInstance = (index) => {
    VesselsFetcher.updateVesselInstance(instances[index].id, instances[index]);
  };

  return (
    <>
      <Card className="detail-card shadow-sm">
        <Card.Header>
          {renderHeaderContent()}
        </Card.Header>
        <Card.Body className="bg-light">
          <Card.Title className="mb-3">Vessel template details</Card.Title>
          <Form>
            {['name', 'details', 'vessel_type', 'material_type', 'material_details', 'volume_amount', 'volume_unit']
              .map((field) => (
                <Form.Group as={Row} key={field} className="mb-2 align-items-center">
                  <Form.Label column sm={3}>
                    {formatLabel(field)}
                    :
                  </Form.Label>
                  <Col sm={5}>
                    <Form.Control
                      type="text"
                      value={vesselTemplate[field] || ''}
                      onChange={(e) => handleTemplateChange(field, e.target.value)}
                    />
                  </Col>
                </Form.Group>
              ))}
            <div>
              <Button variant="primary" size="sm" className="mt-2" onClick={updateTemplate} disabled={!isTemplateUpdated}>
                Update Template
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
      <Card className="detail-card shadow-sm">
        <Card.Body>
          <Card.Title classNME="mb-3">Vessel Instances</Card.Title>
          <Table bordered hover responsive className="table-sm border-rounded">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Barcode</th>
                <th>QR Code</th>
                <th>Weight amount</th>
                <th>Weight unit</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {instances.map((instance, index) => (
                <tr key={instance.id}>
                  {['name', 'description', 'bar_code', 'qr_code', 'weight_amount', 'weight_unit']
                    .map((field) => (
                      <td key={field} className="p-1">
                        <Form.Control
                          type="text"
                          className="border-0 bg-transparent"
                          value={instance[field] || ''}
                          onChange={(e) => handleInstanceChange(index, field, e.target.value)}
                        />
                      </td>
                    ))}
                  <td>
                    <Button variant="primary" size="xsm" onClick={() => updateInstance(index)}>Update</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </>
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
