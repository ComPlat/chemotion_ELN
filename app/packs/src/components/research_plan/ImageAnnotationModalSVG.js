/* eslint-disable react/prefer-stateless-function */
import React, { Component } from 'react';
import { Modal, Button } from 'react-bootstrap';

export default class ImageAnnotationModalSVG extends Component {
  constructor(props) {
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
            onLoad={() => {
              let attachment = this.props.attachment;
              fetch('/api/v1/attachments/' + attachment.id + "/annotation")
                .then(res => {
                  return res.text().then(text => {
                    let svgEditor = document.getElementById("svgEditId").contentWindow.svgEditor;
                    svgEditor.setBackground('white');
                    let svgString = decodeURIComponent(JSON.parse(text));
                    svgEditor.svgCanvas.setSvgString(svgString);
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
}