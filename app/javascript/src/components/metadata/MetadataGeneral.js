import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Form, Row, Col
} from 'react-bootstrap';
import { Select } from 'src/components/common/Select';

import { subjectAreas } from 'src/components/staticDropdownOptions/radar/subjectAreas';

const MetadataGeneral = ({
  metadata, onAdd, onChange, onRemove
}) => (
  <div>
    <h4>General</h4>
    {metadata.datasetUrl && (
      <Form.Group className="mb-3">
        <Form.Label>
          RADAR Dataset URL
        </Form.Label>
        <p>
          <a href={metadata.datasetUrl} target="_blank" rel="noreferrer">{metadata.datasetUrl}</a>
        </p>
      </Form.Group>
    )}
    {metadata.fileUrl && (
      <Form.Group className="mb-3">
        <Form.Label>
          RADAR File URL
        </Form.Label>
        <p>
          <a href={metadata.fileUrl} target="_blank" rel="noreferrer">{metadata.fileUrl}</a>
        </p>
      </Form.Group>
    )}
    <Form.Group className="mb-3">
      <Form.Label>
        Title
      </Form.Label>
      <Form.Control
        type="text"
        value={metadata.title}
        onChange={(event) => onChange(event.target.value, 'title')}
      />
    </Form.Group>
    <Form.Group className="mb-3">
      <Form.Label>
        Description
      </Form.Label>
      <Form.Control
        as="textarea"
        rows={8}
        value={metadata.description}
        onChange={(event) => onChange(event.target.value, 'description')}
      />
    </Form.Group>

    <h4>Subject areas</h4>
    {metadata.subjectAreas && metadata.subjectAreas.map((subjectArea, index) => {
      const value = subjectAreas.find((el) => el.value === subjectArea.controlledSubjectAreaName);
      return (
        <Row key={index}>
          <Form.Group as={Col} xs={11} className="mb-3">
            <Select
              name="subject"
              options={subjectAreas}
              onChange={(option) => onChange(option.value, 'subjectAreas', index, 'controlledSubjectAreaName')}
              value={value}
            />
          </Form.Group>
          <Col xs={1}>
            <Button variant="danger" onClick={() => onRemove('subjectAreas', index)}>
              <i className="fa fa-trash-o" />
            </Button>
          </Col>
        </Row>
      );
    })}
    <Button className="mb-4" variant="success" size="sm" onClick={() => onAdd('subjectAreas')}>
      Add new subject area
    </Button>

    <h4>Keywords</h4>
    {metadata.keywords && metadata.keywords.map((keyword, index) => (
      <Row key={index}>
        <Form.Group as={Col} xs={11} className="mb-3">
          <Form.Control
            type="text"
            value={keyword}
            onChange={(event) => onChange(event.target.value, 'keywords', index)}
          />
        </Form.Group>
        <Col xs={1}>
          <Button variant="danger" onClick={() => onRemove('keywords', index)}>
            <i className="fa fa-trash-o" />
          </Button>
        </Col>
      </Row>
    ))}
    <Button variant="success" size="sm" onClick={() => onAdd('keywords')}>
      Add new keyword
    </Button>
  </div>
);

MetadataGeneral.propTypes = {
  metadata: PropTypes.object.isRequired,
  onAdd: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
};

export default MetadataGeneral;
