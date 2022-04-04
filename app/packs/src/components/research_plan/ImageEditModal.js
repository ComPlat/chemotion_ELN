/* eslint-disable react/prefer-stateless-function */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal,Button } from 'react-bootstrap';
import ResearchPlansFetcher from '../fetchers/ResearchPlansFetcher';

export default class ImageEditModal extends Component {

    constructor(props){    
    super(props);     
  }

  render() {
    return (
      <Modal      
        bsSize='large'
        show={this.props.isShow}
        onHide={this.props.handleOnClose}
      >
        <Modal.Header closeButton >
           
                  
          <Modal.Title>Image annotation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
      
        <iframe src="/miniPaint/index.html"
            id="miniPaintId"
            width="100%"
            height="800"
            onLoad={()=>{
                let miniPaint = document.getElementById("miniPaintId").contentWindow;
                let miniPaintFileOpen = miniPaint.FileOpen;
                this.open_image();
            }}
        />
        </Modal.Body>
        <Modal.Footer style={{ textAlign: 'left' }}>
            <Button bsStyle="primary" onClick={() => this.props.handleOnClose()}>Close</Button>
            <Button bsStyle="warning" onClick={() => this.props.handleSave([this.save_image()])}>Save</Button>
        </Modal.Footer>
      </Modal>
     

    );
  }   

   dataURLtoFile(dataUrl, fileName){
        var arr = dataUrl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], fileName, {type:mime});
    }
    
    open_image(){	
       
        var image = document.getElementById(this.props.imageElementId);
       
        var Layers = document.getElementById('miniPaintId').contentWindow.Layers;
        var name = image.src.replace(/^.*[\\\/]/, '');
        var new_layer = {
            name: name,
            type: 'image',
            data: image,
            width: image.naturalWidth || image.width,
            height: image.naturalHeight || image.height,
            width_original: image.naturalWidth || image.width,
            height_original: image.naturalHeight || image.height,
        };
        Layers.insert(new_layer);
    }
    save_image(){
        var target = document.getElementById('researchPlanImageID');
        if(target==null){
          target=document.createElement('researchPlanImageID');
        }
        var Layers = document.getElementById('miniPaintId').contentWindow.Layers;
        var tempCanvas = document.createElement("canvas");
        var tempCtx = tempCanvas.getContext("2d");
        var dim = Layers.get_dimensions();
        tempCanvas.width = dim.width;
        tempCanvas.height = dim.height;
        Layers.convert_layers_to_canvas(tempCtx);
        
        target.width = dim.width;
        target.height = dim.height;
        target.src = tempCanvas.toDataURL();
    
        var file =this.dataURLtoFile(tempCanvas.toDataURL(),this.props.imageName);
    
        return file;
            
        
    }

   
}










ImageEditModal.propTypes = {
  imageUrl: PropTypes.string,  
  isShow:PropTypes.bool,
  imageName:PropTypes.string
};