import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';
import { FormControl, FormGroup, InputGroup } from 'react-bootstrap';
import Attachment from 'src/models/Attachment';
import ResearchPlansFetcher from 'src/fetchers/ResearchPlansFetcher';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import ImageFileDropHandler from 'src/apps/mydb/elements/details/researchPlans/researchPlanTab/ImageFileDropHandler';
import ImageAnnotationEditButton from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationEditButton';
import ImageAnnotationModalSVG from 'src/apps/mydb/elements/details/researchPlans/ImageAnnotationModalSVG';
import ElementStore from '../../../../../../stores/alt/stores/ElementStore';
import {Alert} from 'react-bootstrap';


export default class ResearchPlanDetailsFieldImage extends Component {
  constructor(props) {
    super(props);
    this.state = {imageEditModalShown: false,attachments: props.attachments};

    this.onElementStoreChange = this.onElementStoreChange.bind(this);
  }

  componentDidMount() {
    this.generateSrcOfImage(this.props.field.value.public_name);
    ElementStore.listen(this.onElementStoreChange);
    
  }

  componentWillUnmount(){
    ElementStore.unlisten(this.onElementStoreChange);
  } 

  onElementStoreChange(state){
    if(!state.selecteds[0]){return} 
     const currentEntry=state.selecteds[0].body.filter(entry => entry.id==this.props.field.id)[0] ;
     
     this.generateSrcOfImage(currentEntry.value.public_name)
   
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
            <div className="image-annotation-button-researchplan">
              <ImageAnnotationEditButton                          
                parent={this}
                attachment={this.props.researchPlan.getAttachmentByIdentifier(field.value.public_name)}
              />
            </div>
          </InputGroup>
          
        </FormGroup>      
         {this.renderImageEditedWarning(this.props.researchPlan.getAttachmentByIdentifier(field.value.public_name))} 
        <Dropzone
          accept="image/*"
          multiple={false}
          onDrop={(files) => this.handleDrop(files)}
          className="dropzone"
        >
          {content}
        </Dropzone>        
        {this.renderImageEditModal()}
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
      AttachmentFetcher.fetchImageAttachmentByIdentifier({ identifier: publicName,annotated: true })
        .then((result) => {         
          if (result.data != null) {
            this.setState({ imageSrc: result.data });
          }
        });
    }
  }

  renderStatic() {
    const { field } = this.props;
    if (
      typeof field.value.public_name === 'undefined'
      || field.value.public_name === null
    ) {
      return <div />;
    }
    const style = (field.value.zoom == null || typeof field.value.zoom === 'undefined'
      || field.value.width === '') ? { width: 'unset' } : { width: `${field.value.zoom}%` };

    return (
      <div className="image-container">
        <img style={style} src={this.state.imageSrc} alt={field.value.file_name} />
      </div>
    );
  }

  renderImageEditedWarning(attachment){
    if(!attachment.updatedAnnotation){return null;} 
    
    return (
      <div className='imageEditedWarning'>
        <Alert>Image was edited. Please save Researchplan to apply changes</Alert>
      </div>
    );

  } 

  renderImageEditModal() {   
    return (
      <ImageAnnotationModalSVG
        attachment={this.state.choosenAttachment}
        isShow={this.state.imageEditModalShown}
        handleSave={
          () => {
            const newAnnotation = document.getElementById('svgEditId').contentWindow.svgEditor.svgCanvas.getSvgString();
            this.state.choosenAttachment.updatedAnnotation = newAnnotation;
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
