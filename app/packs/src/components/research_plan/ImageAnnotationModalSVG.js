/* eslint-disable react/prefer-stateless-function */
import React, { Component } from 'react';
import { Modal,Button } from 'react-bootstrap';

export default class ImageAnnotationModalSVG extends Component {
    constructor(props){    
      super(props);          
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
                 
                   let restOfAnno=this.props.dataSrc.split(".")[0]+"_annotation_v1.svg";     
                                      
                   fetch(restOfAnno)
                   .then(res =>{
                    if(res.status==200){
                      return res.text().then(text => {
                        let svgEditor = document.getElementById("svgEditId").contentWindow.svgEditor;   
                        console.log(text);
                        svgEditor.svgCanvas.setSvgString(text);                 
                       })
                    }else{
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
                    }                    
                  })
                                                     

                }}
            />
            </Modal.Body>
            <Modal.Footer style={{ textAlign: 'left' }}>
                <Button bsStyle="primary" onClick={() => this.props.handleOnClose()}>Close</Button>
                <Button bsStyle="warning" onClick={() => this.saveAnnotation()}>Save</Button>
            </Modal.Footer>
          </Modal>
        );
      }   

      saveAnnotation(){               
        let svgEditor = document.getElementById("svgEditId").contentWindow.svgEditor;   
        let svgString=svgEditor.svgCanvas.getSvgString();
        let imageId=this.props.imageName;       
        var data = new FormData();
        data.append('annotation', svgString);
        data.append('imageId', imageId);
        data.append('version', 1);
 
         fetch('/api/v1/annotation', {
          credentials: 'same-origin',
          method: 'post',
          body: data
        }).then((response) => {
          this.props.handleSave();
        }).catch((errorMessage) => {
          console.log(errorMessage);
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