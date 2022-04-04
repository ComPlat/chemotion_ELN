import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';
import { Button, FormControl, FormGroup, InputGroup } from 'react-bootstrap';
import ResearchPlansFetcher from '../fetchers/ResearchPlansFetcher';
import ImageEditModal from './ImageEditModal';
import logger from 'redux-logger';
import { Left } from 'react-bootstrap/lib/Media';
import ImageAnnotationModalSVG from './ImageAnnotationModalSVG';
import SVG from 'react-inlinesvg';

export default class ResearchPlanDetailsFieldImage extends Component {

  constructor(props){   
    super(props);
    const { field, onChange } = this.props;
    this.state={imageEditModalShown:false};
    this.state={annotation:{version:0}};
    
  }

  componentDidMount(){
    this.actualizeAnnotationVersion();
  }

  actualizeAnnotationVersion(){
    const { field, onChange } = this.props;
    if(field.value.public_name){
      let restOfAnno=field.value.public_name.split(".")[0]+"_annotation.svg";  
      const imageId=field.value.public_name.split(".")[0];
      const src = `/images/research_plans/${restOfAnno}`;
      const encodedValue = encodeURIComponent(imageId);
      
      fetch('/api/v1/annotation?imageId='+encodedValue, {
        credentials: 'same-origin',
        method: 'get',
      })
      .then(res =>{
      if(res.status==200){
        return res.json().then(json => {        
            this.setState({'annotation':json});            
          })

      }else{
        console.log("An error occured");
      }});   
    }          
  }

  handleDrop(files) {
    const { field, onChange } = this.props;
    const imageFile = files[0];
    const replace = field.value.public_name;

    const img = document.createElement('img');
    const blob = URL.createObjectURL(imageFile);
    img.src = blob;
    img.onload = function() {    
      imageFile.dimension=[img.width,img.height];
      ResearchPlansFetcher.updateImageFile(imageFile, replace).then((value) => {
        // update research plan
        onChange(value, field.id);
      });


    }
    // upload new image
   
  }

  handleResizeChange(event) {
    const { field, onChange } = this.props;
    field.value.zoom = event.target.value;
    onChange(field.value, field.id);
  }

  calculateZoomStyle(field){
    const zoomNotSet=field.value.zoom == null || typeof field.value.zoom === 'undefined';
    const noWidthSet=field.value.width === ''
    return (zoomNotSet||noWidthSet) ? { width: 'unset' } : { width: `${field.value.zoom}%` };
  }

  renderEdit() {
    const { field } = this.props;
    let content;
    let versionOfAnno;
    if (field.value.public_name) {     
      versionOfAnno=this.state.annotation.version;
      let restOfAnno=field.value.public_name.split(".")[0]+"_annotation_v"+versionOfAnno+".svg";  
      const src = `/images/research_plans/${restOfAnno}`;
      //const src = `/images/research_plans/${field.value.public_name}`;      
      const zoomStyle=this.calculateZoomStyle(field);
       
      
      content = (
        <div className="image-container">
           <SVG style={zoomStyle} src={src} cacheRequests={false} />
        
        </div>
      );
    } else {
      content = <p>Drop Files, or Click to Select.</p>;
    }
    return (
      <div>
       <ImageAnnotationModalSVG
          imageElementId={"researchPlanImageID"+field.value.public_name}
          imageName={field.value.public_name}
          file={field}     
          versionOfAnnotation={versionOfAnno}    
          dataSrc={"/images/research_plans/"+field.value.public_name}
          isShow={this.state.imageEditModalShown}
          handleSave={()=>{
            this.setState({imageEditModalShown:false});
            this.actualizeAnnotationVersion()}}
          handleOnClose={()=>{this.setState({imageEditModalShown:false})}}
       />       
     
       <div style={ 
         {display: 'flex',
         direction:'row'}}
        >

       
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
        {this.renderAnnotateButton()}
        </div>
      
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

  renderAnnotateButton(){
    var imageSet=this.props.field.value.file_name;
    if(!imageSet){
      return null;
    }
    return(
      <Button
        style={{marginLeft:'3px'}}
        onClick={()=>{this.setState({imageEditModalShown:true})}}>Annotate
      </Button>
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
    let versionOfAnno=this.state.annotation.version;
    let restOfAnno=field.value.public_name.split(".")[0]+"_annotation_v"+versionOfAnno+".svg";  
    const src = `/images/research_plans/${restOfAnno}`;
    const style = (field.value.zoom == null || typeof field.value.zoom === 'undefined'
    || field.value.width === '') ? { width: 'unset' } : { width: `${field.value.zoom}%` };

    return (
      <div className="image-container">
        <SVG src={src} cacheRequests={false} alt={field.value.file_name}/>
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
