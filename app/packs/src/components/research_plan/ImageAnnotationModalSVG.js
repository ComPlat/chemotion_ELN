/* eslint-disable react/prefer-stateless-function */
import React, { Component } from 'react';
import { Modal,Button } from 'react-bootstrap';

export default class ImageAnnotationModalSVG extends Component {
    constructor(props){    
        super(props);    
        const img = document.getElementById('researchPlanImageID')
        fetch("/images/research_plans/"+this.props.imageName)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'dot.png', blob);
          this.setState({"file":file})           
        })           
    }

    render() {
        const imageName=this.props.imageName;       
        const src="/images/research_plans/"+this.props.imageName;
        const svgString=
        "<svg "+
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
        "      xlink:href=\""+src+"\"/>"+
        "    </g>"+
        "</svg>";
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
                    let image =document.getElementById("researchPlanImageID");
                    let width=image.naturalWidth;
                    let height=image.naturalHeight;
                    let innerSvgString=svgString;
                    
                    innerSvgString=innerSvgString.replaceAll("#WIDTH#",width);
                    innerSvgString=innerSvgString.replaceAll("#HEIGTH#",height);
                    let svgEditor = document.getElementById("svgEditId").contentWindow.svgEditor;   

                    svgEditor.svgCanvas.setSvgString(innerSvgString);  
                    svgEditor.svgCanvas.createLayer("Annotation");                                    

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
    
    
      
}