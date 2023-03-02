/* eslint-disable react/prefer-stateless-function */
import React, { Component } from "react";
import { Modal, Button } from "react-bootstrap";

export default class ImageAnnotationModalSVG extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Modal
        backdrop="static"
        bsSize="large"
        show={this.props.isShow}>

        <Modal.Header>
          <Modal.Title>Image annotation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <iframe
            title=""
            src="/svgedit/index.html"
            id="svgEditId"
            width="100%"
            height="800"
            onLoad={() => {
              const { svgEditor } =
                document.getElementById("svgEditId").contentWindow;
              svgEditor.setBackground("white");
              const { attachment } = this.props;

              fetch(`/api/v1/attachments/${attachment.id}/annotation`)
                .then((res) => res.text())
                .then((text) => {
                  if (attachment.updatedAnnotation) {
                    svgEditor.svgCanvas.setSvgString(
                      attachment.updatedAnnotation
                    );
                  } else {
                    const svgString = decodeURIComponent(JSON.parse(text));
                    svgEditor.svgCanvas.setSvgString(svgString);
                  }
                  svgEditor.updateCanvas(false, false)
                });
            }}
          />
        </Modal.Body>
        <Modal.Footer style={{ textAlign: "left" }}>
          <Button bsStyle="primary" onClick={() => this.props.handleOnClose()}>
            Close
          </Button>
          <Button bsStyle="warning" onClick={() => this.props.handleSave()}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
}
