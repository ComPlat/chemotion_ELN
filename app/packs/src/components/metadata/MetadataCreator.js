import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Col, Form, Row
} from 'react-bootstrap';

const MetadataCreator = ({
  creator, index, onAdd, onChange, onRemove
}) => (
  <div>
    <Row>
      <Form.Group className="mb-3" as={Col} xs={4}>
        <Form.Label>
          Given name
        </Form.Label>
        <Form.Control
          type="text"
          value={creator.givenName}
          onChange={(event) => onChange(event.target.value, 'creators', index, 'givenName')}
        />
      </Form.Group>
      <Form.Group className="mb-3" as={Col} xs={4}>
        <Form.Label>
          Family name
        </Form.Label>
        <Form.Control
          type="text"
          value={creator.familyName}
          onChange={(event) => onChange(event.target.value, 'creators', index, 'familyName')}
        />
      </Form.Group>
      <Form.Group className="mb-3" as={Col} xs={4}>
        <Form.Label>
          ORCID iD
        </Form.Label>
        <Form.Control
          type="text"
          value={creator.orcid}
          onChange={(event) => onChange(event.target.value, 'creators', index, 'orcid')}
        />
      </Form.Group>
    </Row>
    <Form.Group className="mb-3">
      <Form.Label>
        Affiliations
      </Form.Label>
      {creator.affiliations && creator.affiliations.map((affliation, affiliationIndex) => (
        <Row key={affiliationIndex} className="align-items-center metadata-affiliation">
          <Col xs={8}>
            <Form.Control
              type="text"
              value={affliation.affiliation}
              onChange={(event) => onChange(event.target.value, 'creators', index, 'affiliations', affiliationIndex, 'affiliation')}
            />
          </Col>
          <Col xs={4}>
            <Button
              variant="danger"
              onClick={() => onRemove('creators', index, 'affiliations', affiliationIndex)}
            >
              <i className="fa fa-trash-o" />
            </Button>
            {(affiliationIndex === creator.affiliations.length - 1) && (
              <Button
                className="metadata-add-affiliation"
                variant="success"
                onClick={() => onAdd('creators', index, 'affiliations')}
              >
                <i className="fa fa-plus" />
              </Button>
            )}
          </Col>
        </Row>
      ))}
    </Form.Group>
    <Button variant="danger" size="sm" onClick={() => onRemove('creators', index)}>
      Remove creator
    </Button>
    <hr />
  </div>
);

MetadataCreator.propTypes = {
  creator: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onAdd: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
};

export default MetadataCreator;
