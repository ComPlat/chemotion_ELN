import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Col, Form, Row
} from 'react-bootstrap';
import { Select } from 'src/components/common/Select';

import { contributorTypes } from 'src/components/staticDropdownOptions/radar/contributorTypes';

const MetadataContributor = ({
  contributor, index, onAdd, onChange, onRemove
}) => {
  const contributorType = contributorTypes.find((el) => el.value == contributor.contributorType);

  return (
    <div>
      <Row className="mb-3">
        <Form.Group as={Col} xs={4}>
          <Form.Label>
            Given name
          </Form.Label>
          <Form.Control
            type="text"
            value={contributor.givenName}
            onChange={(event) => onChange(event.target.value, 'contributors', index, 'givenName')}
          />
        </Form.Group>
        <Form.Group as={Col} xs={4}>
          <Form.Label>
            Family name
          </Form.Label>
          <Form.Control
            type="text"
            value={contributor.familyName}
            onChange={(event) => onChange(event.target.value, 'contributors', index, 'familyName')}
          />
        </Form.Group>
        <Form.Group as={Col} xs={4}>
          <Form.Label>
            ORCID iD
          </Form.Label>
          <Form.Control
            type="text"
            value={contributor.orcid}
            onChange={(event) => onChange(event.target.value, 'contributors', index, 'orcid')}
          />
        </Form.Group>
      </Row>
      <Row className="mb-3">
        <Form.Group as={Col} xs={8}>
          <Form.Label>
            Contributor type
          </Form.Label>
          <Select
            name="contributorType"
            options={contributorTypes}
            onChange={(option) => onChange(option.value, 'contributors', index, 'contributorType')}
            value={contributorType}
          />
        </Form.Group>
      </Row>
      <Form.Group className="mb-3">
        <Form.Label>
          Affiliations
        </Form.Label>
        {contributor.affiliations && contributor.affiliations.map((affliation, affiliationIndex) => (
          <Row key={affiliationIndex} className="align-items-center metadata-affiliation">
            <Col xs={8}>
              <Form.Control
                type="text"
                value={affliation.affiliation}
                onChange={(event) => onChange(event.target.value, 'contributors', index, 'affiliations', affiliationIndex, 'affiliation')}
              />
            </Col>
            <Col xs={4}>
              <Button
                className="metadata-remove-affiliation"
                variant="danger"
                onClick={() => onRemove('contributors', index, 'affiliations', affiliationIndex)}
              >
                <i className="fa fa-trash-o" />
              </Button>
              {(affiliationIndex === contributor.affiliations.length - 1) && (
                <Button
                  className="metadata-add-affiliation"
                  variant="success"
                  onClick={() => onAdd('contributors', index, 'affiliations')}
                >
                  <i className="fa fa-plus" />
                </Button>
              )}
            </Col>
          </Row>
        ))}
      </Form.Group>
      <Button variant="danger" size="sm" onClick={() => onRemove('contributors', index)}>
        Remove contributor
      </Button>
      <hr />
    </div>
  );
};

MetadataContributor.propTypes = {
  contributor: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onAdd: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
};

export default MetadataContributor;
