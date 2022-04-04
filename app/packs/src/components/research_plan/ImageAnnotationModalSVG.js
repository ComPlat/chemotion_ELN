/* eslint-disable react/prefer-stateless-function */
import React, { Component } from 'react';
import { Modal,Button } from 'react-bootstrap';

export default class ImageAnnotationModalSVG extends Component {
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
            <iframe src="/svgedit/editor/index.html"
                id="svgEditId"
                width="100%"
                height="800"
                onLoad={()=>{                 
                   let restOfAnno=this.props.dataSrc.split(".")[0]+"_annotation_v"+ this.props.versionOfAnnotation+".svg";                                          
                   fetch(restOfAnno)
                   .then(res =>{                    
                      return res.text().then(text => {
                        let svgEditor = document.getElementById("svgEditId").contentWindow.svgEditor;   
                        console.log(text);
                        svgEditor.svgCanvas.setSvgString(text);                 
                       })               
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
        data.append('version', this.props.versionOfAnnotation);
 
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
      
}