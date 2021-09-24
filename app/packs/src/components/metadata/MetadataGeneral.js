import React from 'react'
import PropTypes from 'prop-types'
import { Button, ControlLabel, FormControl, FormGroup } from 'react-bootstrap'
import Select from 'react-select3'

const subjectAreas = [
  'Agriculture',
  'Architecture',
  'Arts and Media',
  'Astrophysics and Astronomy',
  'Biochemistry',
  'Biology',
  'Behavioural Sciences',
  'Chemistry',
  'Computer Science',
  'Economics',
  'Engineering',
  'Environmental Science and Ecology',
  'Ethnology',
  'Geological Science',
  'Geography',
  'History',
  'Horticulture',
  'Information Technology',
  'Life Science',
  'Linguistics',
  'Materials Science',
  'Mathematics',
  'Medicine',
  'Philosophy',
  'Physics',
  'Psychology',
  'Social Sciences',
  'Software Technology',
  'Sports',
  'Theology',
  'Veterinary Medicine',
  'Other'
].map(value => ({ label: value, value }))

const MetadataGeneral = ({ metadata, onAdd, onChange, onDelete }) => (
  <div>
    <h4>General</h4>
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
      metadata.subjects && metadata.subjects.map((subject, index) => {
        const value = subjectAreas.find(el => el.value == subject)
        return (
          <FormGroup key={index}>
            <Select
              name="subject"
              classNamePrefix="react-select"
              options={subjectAreas}
              onChange={option => onChange(option.value, 'subjects', index)}
              value={value}
            />
          </FormGroup>
        )
      })
    }
    <Button bsStyle="success" bsSize="small" onClick={event => onAdd('subjects')}>
      Add new subject area
    </Button>
    <h4>Keywords</h4>
    {
      metadata.keywords && metadata.keywords.map((keyword, index) => (
      <FormGroup key={index}>
        <FormControl
          type="text"
          value={keyword}
          onChange={event => onChange(event.target.value, 'keywords', index)}
        />
      </FormGroup>
      ))
    }
    <Button bsStyle="success" bsSize="small" onClick={event => onAdd('keywords')}>
      Add new keyword
    </Button>
  </div>
);

MetadataGeneral.propTypes = {
  metadata: PropTypes.object.isRequired
};

export default MetadataGeneral;
