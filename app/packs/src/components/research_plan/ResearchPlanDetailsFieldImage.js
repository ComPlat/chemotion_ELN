import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';
import { Button, FormControl, FormGroup, InputGroup } from 'react-bootstrap';
import ResearchPlansFetcher from '../fetchers/ResearchPlansFetcher';
import ImageEditModal from './ImageEditModal';
import logger from 'redux-logger';

export default class ResearchPlanDetailsFieldImage extends Component {

  constructor(props){
    super(props);
    this.state={imageEditModalShown:false}
 

  }

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
          <img id="researchPlanImageID" style={style} src={src} alt={field.value.file_name} />
        </div>
      );
    } else {
      content = <p>Drop Files, or Click to Select.</p>;
    }
    return (
      <div>
       <ImageEditModal
          imageName={field.value.public_name}
          isShow={this.state.imageEditModalShown}
          handleSave={(f)=>{this.handleDrop(f);this.setState({imageEditModalShown:false})}}
          handleOnClose={()=>{this.setState({imageEditModalShown:false})}}
       />
     
       
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
            <Button
            onClick={()=>{this.setState({imageEditModalShown:true})}}>Edit</Button>
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
