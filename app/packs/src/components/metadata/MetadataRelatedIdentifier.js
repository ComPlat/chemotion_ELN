import React from 'react';
import PropTypes from 'prop-types';
import { Button, Col, ControlLabel, FormControl, FormGroup, Row } from 'react-bootstrap';
import Select from 'react-select3';

const identifierTypes = [
  'ARK',
  'arXiv',
  'bibcode',
  'DOI',
  'EAN13',
  'EISSN',
  'Handle',
  'IGSN',
  'ISBN',
  'ISSN',
  'ISTC',
  'LISSN',
  'LSID',
  'PMID',
  'PURL',
  'UPC',
  'URL',
  'URN',
  'w3id'
].map(value => ({ label: value, value }))

const relationTypes = [
  'IsCitedBy',
  'Cites',
  'IsSupplementTo',
  'IsSupplementedBy',
  'IsContinuedBy',
  'Continues',
  'IsDescribedBy',
  'Describes',
  'HasMetadata',
  'IsMetadataFor',
  'HasVersion',
  'IsVersionOf',
  'IsNewVersionOf',
  'IsPreviousVersionOf',
  'IsPartOf',
  'HasPart',
  'IsPublishedIn',
  'IsReferencedBy',
  'References',
  'IsDocumentedBy',
  'Documents',
  'IsCompiledBy',
  'Compiles',
  'IsVariantFormOf',
  'IsOriginalFormOf',
  'IsIdenticalTo',
  'IsReviewedBy',
  'Reviews',
  'IsDerivedFrom',
  'IsSourceOf',
  'IsRequiredBy',
  'Requires',
  'IsObsoletedBy',
  'Obsoletes'
].map(value => ({ label: value, value }))

const MetadataRelatedIdentifier = ({ relatedIdentifier, index, onChange, onRemove }) => {
  const relatedIdentifierType = identifierTypes.find(el => el.value == relatedIdentifier.relatedIdentifierType)
  const relationType = relationTypes.find(el => el.value == relatedIdentifier.relationType)

  return (
    <div>
      <Row>
        <Col sm={5}>
          <FormGroup>
            <ControlLabel>
              Identifier
            </ControlLabel>
            <FormControl
              type="text"
              value={relatedIdentifier.relatedIdentifier}
              onChange={event => onChange(event.target.value, 'relatedIdentifiers', index, 'relatedIdentifier')}
            />
          </FormGroup>
        </Col>
        <Col sm={3}>
          <FormGroup>
            <ControlLabel>
              Identifier type
            </ControlLabel>
            <Select
              name="relatedIdentifierType"
              classNamePrefix="react-select"
              options={identifierTypes}
              onChange={option => onChange(option.value, 'relatedIdentifiers', index, 'relatedIdentifierType')}
              value={relatedIdentifierType}
            />
          </FormGroup>
        </Col>
        <Col sm={3}>
          <FormGroup>
            <ControlLabel>
              Relation type
            </ControlLabel>
            <Select
              name="relationType"
              classNamePrefix="react-select"
              options={relationTypes}
              onChange={option => onChange(option.value, 'relatedIdentifiers', index, 'relationType')}
              value={relationType}
            />
          </FormGroup>
        </Col>
        <Col sm={1}>
          <ControlLabel>
            &nbsp;
          </ControlLabel>
          <Button bsStyle="danger" onClick={() => onRemove('relatedIdentifiers', index)}>
            <i className="fa fa-trash-o" />
          </Button>
        </Col>
      </Row>
    </div>
  )
};

MetadataRelatedIdentifier.propTypes = {
  relatedIdentifier: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
};

export default MetadataRelatedIdentifier;
