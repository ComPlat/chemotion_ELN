import React from 'react';
import PropTypes from 'prop-types';
import { Button, Col, FormControl, FormGroup, Row } from 'react-bootstrap';
import Select from 'react-select3';
import ControlLabel from 'src/components/legacyBootstrap/ControlLabel'

import { contributorTypes } from 'src/components/staticDropdownOptions/radar/contributorTypes'

const MetadataContributor = ({ contributor, index, onAdd, onChange, onRemove }) => {
  const contributorType = contributorTypes.find(el => el.value == contributor.contributorType)

  return (
    <div>
      <Row>
        <Col sm={4}>
          <FormGroup>
            <ControlLabel>
              Given name
            </ControlLabel>
            <FormControl
              type="text"
              value={contributor.givenName}
              onChange={event => onChange(event.target.value, 'contributors', index, 'givenName')}
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
              value={contributor.familyName}
              onChange={event => onChange(event.target.value, 'contributors', index, 'familyName')}
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
              value={contributor.orcid}
              onChange={event => onChange(event.target.value, 'contributors', index, 'orcid')}
            />
          </FormGroup>
        </Col>
      </Row>
      <Row>
        <Col sm={8}>
          <FormGroup>
            <ControlLabel>
              Contributor type
            </ControlLabel>
            <Select
              name="contributorType"
              options={contributorTypes}
              onChange={option => onChange(option.value, 'contributors', index, 'contributorType')}
              value={contributorType}
              menuPortalTarget={document.body}
              styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
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
              contributor.affiliations && contributor.affiliations.map((affliation, affiliationIndex) => (
                <Row key={affiliationIndex} className="align-items-center metadata-affiliation">
                  <Col xs={8}>
                    <FormControl
                      type="text"
                      value={affliation.affiliation}
                      onChange={event => onChange(event.target.value, 'contributors', index, 'affiliations', affiliationIndex, 'affiliation')}
                    />
                  </Col>
                  <Col xs={4}>
                    <Button
                      className="metadata-remove-affiliation" bsStyle="danger"
                      onClick={() => onRemove('contributors', index, 'affiliations', affiliationIndex)}>
                      <i className="fa fa-trash-o" />
                    </Button>
                    {
                      (affiliationIndex === contributor.affiliations.length - 1) &&
                      <Button
                        className="metadata-add-affiliation" bsStyle="success"
                        onClick={() => onAdd('contributors', index, 'affiliations')}>
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
          <Button bsStyle="danger" bsSize="small" onClick={() => onRemove('contributors', index)}>
            Remove contributor
          </Button>
        </Col>
      </Row>
      <hr />
    </div>
  )
}

MetadataContributor.propTypes = {
  contributor: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onAdd: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
};

export default MetadataContributor;
