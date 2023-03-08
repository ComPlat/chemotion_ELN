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
            style={{ minHeight: "500px", height: "100%", width: "100%" }}
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

                  // hide some panels
                  subDocument.querySelector("#sidepanels")?.setAttribute("style", "display: none")
                  subDocument.querySelector("#title_panel")?.setAttribute("style", "display: none")
                  subDocument.querySelector("#editor_panel")?.setAttribute("style", "display: none")
                  subDocument.querySelector("#history_panel")?.setAttribute("style", "display: none")

                  // make sure top is at least 45px to prevent view bobbing
                  subDocument.querySelector("#tools_top")?.setAttribute("style", "min-height: 40px")

                  // hide some buttons from the main menu
                  subDocument.querySelector("#main_button > #tool_clear")?.setAttribute("style", "display: none")
                  subDocument.querySelector("#main_button > #tool_open")?.setAttribute("style", "display: none")
                  subDocument.querySelector("#main_button > #tool_save")?.setAttribute("style", "display: none")
                  subDocument.querySelector("#main_button > #tool_save_as")?.setAttribute("style", "display: none")
                  subDocument.querySelector("#main_button > #tool_import")?.setAttribute("style", "display: none")
                  subDocument.querySelector("#main_button > #tool_editor_homepage")?.setAttribute("style", "display: none")

                  // no need to show shortcuts in the right-click menu ...
                  subDocument.querySelector("#se-cmenu_canvas")?.shadowRoot?.querySelectorAll(".shortcut").forEach(elem => elem.style = "display: none")

                  // ... since we disable all of them except the basics.
                  subDocument.addEventListener("keydown", (e) => {
                    const allowedKeys = ["Delete", "CTRL+KeyC", "CTRL+KeyV", "CTRL+KeyX"]
                    const currentKey = e.ctrlKey ? `CTRL+${e.code}` : e.code
                    if (allowedKeys.indexOf(currentKey) == -1 && e.target.nodeName === 'BODY') {
                      console.log("Preventing default keydown event", e, currentKey, allowedKeys)
                      e.preventDefault()
                      e.stopImmediatePropagation()
                      e.stopPropagation()
                    }
                  }, true )
                  

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
