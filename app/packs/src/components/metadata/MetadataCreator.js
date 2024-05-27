import React from 'react';
import PropTypes from 'prop-types';
import { Button, Col, FormControl, FormGroup, Row } from 'react-bootstrap';
import ControlLabel from 'src/components/legacyBootstrap/ControlLabel'

const MetadataCreator = ({ creator, index, onAdd, onChange, onRemove }) => (
  <div>
    <Row>
      <Col sm={4}>
        <FormGroup>
          <ControlLabel>
            Given name
          </ControlLabel>
          <FormControl
            type="text"
            value={creator.givenName}
            onChange={event => onChange(event.target.value, 'creators', index, 'givenName')}
          />
        </FormGroup>
      </Col>
      <Col sm={4}>
        <FormGroup>
          <ControlLabel>
            Family name
          </ControlLabel>
          <FormControl
            type="text"
            value={creator.familyName}
            onChange={event => onChange(event.target.value, 'creators', index, 'familyName')}
          />
        </FormGroup>
      </Col>
      <Col sm={4}>
        <FormGroup>
          <ControlLabel>
            ORCID iD
          </ControlLabel>
          <FormControl
            type="text"
            value={creator.orcid}
            onChange={event => onChange(event.target.value, 'creators', index, 'orcid')}
          />
        </FormGroup>
      </Col>
    </Row>
    <Row>
      <Col sm={12}>
        <FormGroup>
          <ControlLabel>
            Affiliations
          </ControlLabel>
          {
            creator.affiliations && creator.affiliations.map((affliation, affiliationIndex) => (
              <Row key={affiliationIndex} className="align-items-center metadata-affiliation">
                <Col xs={8}>
                  <FormControl
                    type="text"
                    value={affliation.affiliation}
                    onChange={event => onChange(event.target.value, 'creators', index, 'affiliations', affiliationIndex, 'affiliation')}
                  />
                </Col>
                <Col xs={4}>
                  <Button variant="danger" onClick={() => onRemove('creators', index, 'affiliations', affiliationIndex)}>
                    <i className="fa fa-trash-o" />
                  </Button>
                  {
                    (affiliationIndex === creator.affiliations.length - 1) &&
                    <Button
                      className="metadata-add-affiliation" variant="success"
                      onClick={() => onAdd('creators', index, 'affiliations')}>
                      <i className="fa fa-plus" />
                    </Button>
                  }
                </Col>
              </Row>
            ))
          }
        </FormGroup>
      </Col>
      <Col sm={12}>
        <Button variant="danger" size="sm" onClick={() => onRemove('creators', index)}>
          Remove creator
        </Button>
      </Col>
    </Row>
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
