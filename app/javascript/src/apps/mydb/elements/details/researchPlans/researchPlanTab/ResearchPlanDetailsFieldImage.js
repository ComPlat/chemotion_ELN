/* eslint-disable react/sort-comp */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';
import {
  Form, InputGroup
} from 'react-bootstrap';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import ImageFileDropHandler from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ImageFileDropHandler';
import ImageAnnotationEditButton from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationEditButton';
import ImageAnnotationModalSVG from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationModalSVG';
import SaveEditedImageWarning from 'src/apps/mydb/elements/details/researchPlans/SaveEditedImageWarning';
import ElementStore from 'src/stores/alt/stores/ElementStore';

export default class ResearchPlanDetailsFieldImage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      imageEditModalShown: false,
      attachments: props.attachments,
      zoom: props.field.value.zoom || 100,
    };

    this.onElementStoreChange = this.onElementStoreChange.bind(this);
  }

  componentDidMount() {
    this.generateSrcOfImage(this.props.field.value.public_name);
    ElementStore.listen(this.onElementStoreChange);
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onElementStoreChange);
  }

  onElementStoreChange(state) {
    if (state.selecteds.length < 1) return;

    // multiple items can be selected, we filter to only keep research plans
    const researchPlans = state.selecteds.filter((element) => element
        && element?.type === 'research_plan');

    // we find the reasearch plan that has our image entry
    const researchPlanWithImageEntry = researchPlans.find((element) => !!element.getBodyElementById(this.props?.field?.id));

    // get the image Entry
    const imageEntry = researchPlanWithImageEntry?.getBodyElementById(this.props?.field?.id);
    if (!imageEntry) return;

    this.generateSrcOfImage(imageEntry.value.public_name);
  }

  handleDrop(files) {
    if (files.length === 0) {
      return;
    }
    const handler = new ImageFileDropHandler();
    const value = handler.handleDrop(
      files,
      this.props.field,
      this.state.attachments
    );
    this.generateSrcOfImage(value.public_name);
    this.props.onChange(value, this.props.field.id, this.state.attachments);
  }

  handleResizeChange(event) {
    const zoom = event.target.value;
    this.setState({ zoom });
    const { field, onChange } = this.props;
    field.value.zoom = zoom;
    onChange(field.value, field.id);
  }

  renderEdit() {
    const { field } = this.props;
    const currentAttachment = this.props.researchPlan.getAttachmentByIdentifier(field.value.public_name);
    const isAnnotationUpdated = currentAttachment != null && currentAttachment.updatedAnnotation;
    const { zoom } = this.state;
    let content;
    if (field.value.public_name) {
      const style = (zoom == null || typeof zoom === 'undefined'
        || field.value.width === '') ? { width: 'unset' } : { width: `${zoom}%` };
      content = (
        <div>
          <img style={style} src={this.state.imageSrc} alt={field.value.file_name}
            className="img-fluid"
          />
        </div>
      );
    } else {
      content = <p>Drop Files, or Click to Select.</p>;
    }
    return (
      <div>
        <Form.Group className="col col-sm-4">
          <InputGroup>
            <InputGroup.Text>Zoom</InputGroup.Text>
            <Form.Control
              type="number"
              max="100"
              min="1"
              placeholder="image zoom"
              defaultValue={zoom}
              onChange={(event) => this.handleResizeChange(event)}
            />
            <InputGroup.Text>%</InputGroup.Text>
            <ImageAnnotationEditButton
              attachment={currentAttachment}
              onClick={() => this.setState({
                imageEditModalShown: true,
                chosenAttachment: currentAttachment,
              })}
            />
          </InputGroup>
        </Form.Group>
        <Dropzone
          accept="image/*"
          multiple={false}
          onDrop={(files) => this.handleDrop(files)}
          className="dnd-zone text-center p-3 my-3"
        >
          {isAnnotationUpdated && <SaveEditedImageWarning visible />}
          {content}
        </Dropzone>
        {this.renderImageEditModal()}
      </div>
    );
  }

  isLegacyImage(publicName) {
    if (!publicName) {
      return true;
    }
    return publicName.includes('.');
  }

  generateSrcOfImage(publicName) {
    if (!publicName) { return; }
    let src;
    if (publicName.startsWith('blob')) {
      this.setState({ imageSrc: publicName });
    } else if (this.isLegacyImage(publicName)) {
      src = `/images/research_plans/${publicName}`;
      this.setState({ imageSrc: src });
    } else {
      AttachmentFetcher.fetchImageAttachmentByIdentifier({ identifier: publicName, annotated: true })
        .then((result) => {
          if (result.data != null) {
            this.setState({ imageSrc: result.data });
          }
        });
    }
  }

  renderStatic() {
    const { field } = this.props;
    const { zoom } = this.state;
    if (
      typeof field.value.public_name === 'undefined'
      || field.value.public_name === null
    ) {
      return <div />;
    }
    const style = (zoom == null || typeof zoom === 'undefined'
      || field.value.width === '') ? { width: 'unset' } : { width: `${zoom}%` };

    return (
      <div className="text-center mb-0 mw-100 border">
        <img style={style} src={this.state.imageSrc} alt={field.value.file_name} className="img-fluid" />
      </div>
    );
  }

  renderImageEditModal() {
    if (this.isLegacyImage(this.props.field.value.public_name)) {
      return null;
    }

    return (
      <ImageAnnotationModalSVG
        attachment={this.state.chosenAttachment}
        isShow={this.state.imageEditModalShown}
        handleSave={
          () => {
            const newAnnotation = document.getElementById('svgEditId').contentWindow.svgEditor.svgCanvas.getSvgString();
            this.state.chosenAttachment.updatedAnnotation = newAnnotation;
            this.setState({ imageEditModalShown: false });
            this.props.onChange(this.props.field.value, this.props.field.id, this.state.attachments);
          }
        }
        handleOnClose={() => { this.setState({ imageEditModalShown: false }); }}
      />
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
  attachments: PropTypes.array.isRequired
};
