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
        show={this.props.isShow}
        dialogClassName="attachment-dataset-modal">

        <Modal.Header>
          <Modal.Title>Image annotation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <iframe
            title=""
            src="/svgedit/index.html"
            id="svgEditId"
            style={{ minHeight: "800px", height: "100%", width: "100%" }}
            onLoad={() => {
              const subWindow = document.getElementById("svgEditId").contentWindow;
              const subDocument = subWindow.document;
              const svgEditor = subWindow.svgEditor;
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
                  subDocument.querySelector('se-text[text="tools.fit_to_all"]')?.click()   // Zoom fit-to-canvas
                  subDocument.querySelector('#styleoverrides')?.setHTML('#tools_bottom { zoom: 120%; }' +
                  ' .svg_editor { grid-template-rows: auto 15px 1fr 60px !important; }') // Make lower toolbar a bit bigger

                  // remove excess colors. we are good with 17 colors.
                  const paletteShadowDOM = subDocument.querySelector("#palette").shadowRoot || undefined
                  if (paletteShadowDOM) {
                    paletteShadowDOM.querySelectorAll("#js-se-palette > div:nth-child(n+19)").forEach(elem => elem.style = "display: none")
                    paletteShadowDOM.querySelector("#js-se-palette")?.setAttribute("style", "width: auto")
                    paletteShadowDOM.querySelector("#palette_holder")?.setAttribute("style", "display: flex; width: auto; flex-direction: row; margin-right: 12px;")
                  }

                  
                  svgEditor.updateCanvas(false, false)
                });
            }}
          />
        </Modal.Body>
        <Modal.Footer style={{ textAlign: "left" }}>
          <Button bsStyle="primary" onClick={() => this.props.handleOnClose()}>
            Close without saving
          </Button>
          <Button bsStyle="warning" onClick={() => this.props.handleSave()}>
            Accept changes
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
}
