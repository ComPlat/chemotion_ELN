/* eslint-disable react/prefer-stateless-function */
import React, { Component } from 'react';
import { Modal,Button } from 'react-bootstrap';

export default class ImageAnnotationModalSVG extends Component {
    constructor(props){    
      super(props);    
      this.loadImageFileFromServer();           
    }

    render() {       
        const svgString=this.createSvgStringTemplate();
       
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
            <iframe src="/svgedit/editor/index.html"
                id="svgEditId"
                width="100%"
                height="800"
                onLoad={()=>{
                    let hasAnnotation=this.state.file.annotation;
                    if(hasAnnotation===undefined){
                      let image =document.getElementById(this.props.imageElementId);
                      let width=image.naturalWidth;
                      let height=image.naturalHeight;
                      let innerSvgString=svgString;
                      
                      innerSvgString=innerSvgString.replaceAll("#WIDTH#",width);
                      innerSvgString=innerSvgString.replaceAll("#HEIGTH#",height);
                      let svgEditor = document.getElementById("svgEditId").contentWindow.svgEditor;   
                      svgEditor.setBackground("white");
                      svgEditor.svgCanvas.setSvgString(innerSvgString);  
                      svgEditor.svgCanvas.createLayer("Annotation");                                    
                    }else{
                      //Load the data with annotation

                    }

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

      save_image(){               
        let svgEditor = document.getElementById("svgEditId").contentWindow.svgEditor;   
        let f=this.state.file;
        f.annotation=svgEditor.svgCanvas.getSvgString();
        return f;           
      }

      loadImageFileFromServer(){
        fetch(this.props.dataSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'dot.png', blob);
          this.setState({"file":file})           
        });     
      }

      createSvgStringTemplate(){
        return "<svg "+
        "  width=\"#WIDTH#\" "+
        "  height=\"#HEIGTH#\" "+
        "  xmlns=\"http://www.w3.org/2000/svg\" "+
        "  xmlns:svg=\"http://www.w3.org/2000/svg\" "+
        "  xmlns:xlink=\"http://www.w3.org/1999/xlink\"> "+
        "    <g class=\"layer\">"+
        "      <title>Image</title>"+
        "      <image height=\"#HEIGTH#\" "+
        "      id=\"svg_2\" "+
        "      width=\"#WIDTH#\" "+
        "      xlink:href=\""+this.props.dataSrc+"\"/>"+
        "    </g>"+
        "</svg>";
      }
    
    
      
}