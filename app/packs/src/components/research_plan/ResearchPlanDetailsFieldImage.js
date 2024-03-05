import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';
import { FormControl, FormGroup, InputGroup } from 'react-bootstrap';
import ResearchPlansFetcher from '../fetchers/ResearchPlansFetcher';

export default class ResearchPlanDetailsFieldImage extends Component {
  handleDrop(files) {
    const { field, onChange } = this.props;
    const imageFile = files[0];
    const replace = field.value.public_name;

    // upload new image
    ResearchPlansFetcher.updateImageFile(imageFile, replace).then((value) => {
      // update research plan
      onChange(value, field.id);
    });
  }

  handleResizeChange(event) {
    const { field, onChange } = this.props;
    field.value.zoom = event.target.value;
    onChange(field.value, field.id);
  }

  renderEdit() {
    const { field } = this.props;
    let content;
    if (field.value.public_name) {
      const src = `/images/research_plans/${field.value.public_name}`;
      const style = (field.value.zoom == null || typeof field.value.zoom === 'undefined'
      || field.value.width === '') ? { width: 'unset' } : { width: `${field.value.zoom}%` };
      content = (
        <div className="image-container">
          <img style={style} src={src} alt={field.value.file_name} />
        </div>
      );
    } else {
      content = <p>Drop Files, or Click to Select.</p>;
    }
    return (
      <div>
        <FormGroup style={{ width: '30%' }}>
          <InputGroup>
            <InputGroup.Addon>Zoom</InputGroup.Addon>
            <FormControl
              type="number"
              max="100"
              min="1"
              placeholder="image zoom"
              defaultValue={field.value.zoom}
              onChange={event => this.handleResizeChange(event)}
            />
            <InputGroup.Addon>%</InputGroup.Addon>
          </InputGroup>
        </FormGroup>
        <Dropzone
          accept="image/*"
          multiple={false}
          onDrop={files => this.handleDrop(files)}
          className="dropzone"
        >
          {content}
        </Dropzone>
      </div>
    );
  }

  renderStatic() {
    const { field } = this.props;
    if (typeof (field.value.public_name) === 'undefined'
    || field.value.public_name === null) {
      return (
        <div />
      );
    }
    const src = `/images/research_plans/${field.value.public_name}`;
    const style = (field.value.zoom == null || typeof field.value.zoom === 'undefined'
    || field.value.width === '') ? { width: 'unset' } : { width: `${field.value.zoom}%` };

    return (
      <div className="image-container">
        <img style={style} src={src} alt={field.value.file_name} />
      </div>
    );
  }

  render() {
    if (this.props.edit) {
      return this.renderEdit();
    }
    return this.renderStatic();
  }
}

ResearchPlanDetailsFieldImage.propTypes = {
  field: PropTypes.object,
  index: PropTypes.number,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  edit: PropTypes.bool,
};
