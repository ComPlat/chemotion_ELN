import React from 'react'
import PropTypes from 'prop-types'
import { Button, FormControl, FormGroup, Row, Col } from 'react-bootstrap'
import Select from 'react-select3'
import ControlLabel from 'src/components/legacyBootstrap/ControlLabel'

import { subjectAreas } from 'src/components/staticDropdownOptions/radar/subjectAreas'

const MetadataGeneral = ({ metadata, onAdd, onChange, onRemove }) => (
  <div>
    <h4>General</h4>
    {metadata.datasetUrl && <FormGroup>
      <ControlLabel>
        RADAR Dataset URL
      </ControlLabel>
      <p>
        <a href={metadata.datasetUrl} target="_blank">{metadata.datasetUrl}</a>
      </p>
    </FormGroup>}
    {metadata.fileUrl && <FormGroup>
      <ControlLabel>
        RADAR File URL
      </ControlLabel>
      <p>
        <a href={metadata.fileUrl} target="_blank">{metadata.fileUrl}</a>
      </p>
    </FormGroup>}
    <FormGroup>
      <ControlLabel>
        Title
      </ControlLabel>
      <FormControl
        type="text"
        value={metadata.title}
        onChange={event => onChange(event.target.value, 'title')}
      />
    </FormGroup>
    <FormGroup>
      <ControlLabel>
        Description
      </ControlLabel>
      <FormControl
        componentClass="textarea"
        rows={8}
        value={metadata.description}
        onChange={event => onChange(event.target.value, 'description')}
      />
    </FormGroup>
    <h4>Subject areas</h4>
    {
      metadata.subjectAreas && metadata.subjectAreas.map((subjectArea, index) => {
        const value = subjectAreas.find(el => el.value == subjectArea.controlledSubjectAreaName)
        return (
          <Row key={index}>
            <Col sm={11}>
              <FormGroup>
                <Select
                  name="subject"
                  options={subjectAreas}
                  onChange={option => onChange(option.value, 'subjectAreas', index, 'controlledSubjectAreaName')}
                  value={value}
                  menuPortalTarget={document.body}
                  styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                />
              </FormGroup>
            </Col>
            <Col sm={1}>
              <Button bsStyle="danger" onClick={() => onRemove('subjectAreas', index)}>
                <i className="fa fa-trash-o" />
              </Button>
            </Col>
          </Row>
        )
      })
    }
    <Button bsStyle="success" bsSize="small" onClick={event => onAdd('subjectAreas')}>
      Add new subject area
    </Button>
    <h4>Keywords</h4>
    {
      metadata.keywords && metadata.keywords.map((keyword, index) => (
        <Row key={index}>
          <Col sm={11}>
            <FormGroup>
              <FormControl
                type="text"
                value={keyword}
                onChange={event => onChange(event.target.value, 'keywords', index)}
              />
            </FormGroup>
          </Col>
          <Col sm={1}>
            <Button bsStyle="danger" onClick={() => onRemove('keywords', index)}>
              <i className="fa fa-trash-o" />
            </Button>
          </Col>
        </Row>
      ))
    }
    <Button bsStyle="success" bsSize="small" onClick={event => onAdd('keywords')}>
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
