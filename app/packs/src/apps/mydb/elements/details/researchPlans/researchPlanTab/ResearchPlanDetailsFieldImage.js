import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';
import { FormControl, FormGroup, InputGroup } from 'react-bootstrap';
import Attachment from 'src/models/Attachment';
import ResearchPlansFetcher from 'src/fetchers/ResearchPlansFetcher';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import ImageFileDropHandler from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ImageFileDropHandler';

export default class ResearchPlanDetailsFieldImage extends Component {
  constructor(props) {
    super(props);
    this.state = { attachments: props.attachments };
  }

  componentDidMount() {
    this.generateSrcOfImage(this.props.field.value.public_name);
  }

  handleDrop(files) {
    if (files.length === 0) { return; }
    const handler = new ImageFileDropHandler();
    const value = handler.handleDrop(files, this.props.field, this.state.attachments);
    this.generateSrcOfImage(value.public_name);
    this.props.onChange(value, this.props.field.id, this.state.attachments);
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
      const style = (field.value.zoom == null || typeof field.value.zoom === 'undefined'
        || field.value.width === '') ? { width: 'unset' } : { width: `${field.value.zoom}%` };
      content = (
        <div className="image-container">
          <img style={style} src={this.state.imageSrc} alt={field.value.file_name} />
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
              onChange={(event) => this.handleResizeChange(event)}
            />
            <InputGroup.Addon>%</InputGroup.Addon>
          </InputGroup>
        </FormGroup>
        <Dropzone
          accept="image/*"
          multiple={false}
          onDrop={(files) => this.handleDrop(files)}
          className="dropzone"
        >
          {content}
        </Dropzone>
      </div>
    );
  }

  generateSrcOfImage(publicName) {
    if (!publicName) { return; }
    let src;
    if (publicName.startsWith('blob')) {
      this.setState({ imageSrc: publicName });
    } else if (publicName.includes('.')) {
      src = `/images/research_plans/${publicName}`;
      this.setState({ imageSrc: src });
    } else {
      AttachmentFetcher.fetchImageAttachmentByIdentifier({ identifier: publicName })
        .then((result) => {
          if (result.data != null) {
            this.setState({ imageSrc: result.data });
          }
        });
    }
  }

  renderStatic() {
    const { field } = this.props;
    if (typeof (field.value.public_name) === 'undefined'
      || field.value.public_name === null) {
      return (
        <div />
      );
    }
    const style = (field.value.zoom == null || typeof field.value.zoom === 'undefined'
      || field.value.width === '') ? { width: 'unset' } : { width: `${field.value.zoom}%` };

    return (
      <div className="image-container">
        <img style={style} src={this.state.imageSrc} alt={field.value.file_name} />
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
  attachments: PropTypes.array
};
