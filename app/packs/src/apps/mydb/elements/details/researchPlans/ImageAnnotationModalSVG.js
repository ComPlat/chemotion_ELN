/* eslint-disable react/destructuring-assignment */
/* eslint-disable react/prefer-stateless-function */
import React, { Component } from 'react';
import { Modal, Button } from 'react-bootstrap';

export default class ImageAnnotationModalSVG extends Component {
  constructor(props) {
    super(props);
    this.state = {
      canSave: false
    };
  }

  render() {
    return (
      <Modal
        centered
        backdrop="static"
        // size="lg"
        show={this.props.isShow}
        fullscreen
        // dialogClassName="attachment-annotation-modal"
      >

        <Modal.Header>
          <Modal.Title>Image annotation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <iframe
            title="SVGEditor"
            src="/svgedit/index.html"
            id="svgEditId"
            ref={(iframe) => { this.iframe = iframe; }}
            style={{
              minHeight: '500px', height: '100%', width: '100%', visibility: 'hidden'
            }}
            onLoad={() => {
              // before we start: not that the iframe is visibility: hidden
              // it looks ugly that we lazy-load a lot of UI changes on slower connections
              // so we hide the iframe, make our changes and then show it again.

              const subWindow = document.getElementById('svgEditId').contentWindow;
              const subDocument = subWindow.document;
              const { svgEditor } = subWindow;
              svgEditor.setBackground('white');
              const { attachment } = this.props;

              // clear localStorage to prevent loading of previous SVGs
              localStorage.removeItem('svgedit-default');

              // Make lower toolbar a bit bigger
              const styleOverride = subDocument.querySelector('#styleoverrides');
              if (styleOverride) {
                styleOverride.innerHTML = '.svg_editor { grid-template-rows: auto 15px 1fr 60px !important; }'
                  + '.never {display: none !important; }';
              }

              // remove excess colors. we are good with 17 colors.
              const paletteShadowDOM = subDocument.querySelector('#palette').shadowRoot || undefined;
              if (paletteShadowDOM) {
                paletteShadowDOM.querySelectorAll('#js-se-palette > div:nth-child(n+19)')
                  .forEach((elem) => { elem.setAttribute('style', 'display: none'); });
                paletteShadowDOM.querySelector('#js-se-palette')?.setAttribute('style', 'width: auto');
                const paletteHolder = paletteShadowDOM.querySelector('#palette_holder');
                if (paletteHolder) {
                  paletteHolder.setAttribute(
                    'style',
                    'display: flex; width: auto; flex-direction: row; margin-right: 12px;'
                  );
                }
              }

              // hide some panels
              subDocument.querySelector('#sidepanels')?.setAttribute('style', 'display: none');
              subDocument.querySelector('#title_panel')?.setAttribute('style', 'display: none');
              subDocument.querySelector('#editor_panel')?.setAttribute('style', 'display: none');
              subDocument.querySelector('#history_panel')?.setAttribute('style', 'display: none');

              // make sure top is at least 40px to prevent view bobbing
              subDocument.querySelector('#tools_top')?.setAttribute('style', 'min-height: 40px');

              // hide some buttons from the main menu
              let buttonsToRemoveOnSight = [
                'tool_clear',
                'tool_open',
                'tool_save',
                'tool_save_as',
                'tool_import',
                'tool_editor_homepage',
              ];

              subDocument.querySelector('#main_button')?.setAttribute('style', 'display: none');

              // first, the ones that are always present
              buttonsToRemoveOnSight = buttonsToRemoveOnSight.map((id) => {
                // sometimes they are in the shadow DOM, sometimes not.... do not ask me why.
                const elem = (subDocument.querySelector(`#main_button #${id}`)
                            || subDocument.querySelector('#main_button')?.shadowRoot.querySelector(`#${id}`));
                if (elem) {
                  elem?.setAttribute('style', 'display: none');
                  elem?.remove();
                  return undefined;
                }
                return id;
              }).filter((id) => id !== undefined);

              // the "Document Property" button only seems to update the shortcut label when the
              // button attribute label when `label` property changes. so we do that:
              // remove sortcut, change label -> shortcut is gone.
              const DocumentPropertiesEntry = subDocument.querySelector('#main_button #tool_docprops')
                || subDocument.querySelector('#main_button')?.shadowRoot.querySelector('#tool_docprops');
              if (DocumentPropertiesEntry) {
                DocumentPropertiesEntry?.removeAttribute('shortcut');
                DocumentPropertiesEntry?.setAttribute('label', 'Document Properties');
              }

              // then the ones that are added later. we need to observe the DOM for changes.
              const targetNode = subDocument.querySelector('#main_button');
              const config = { attributes: false, childList: true, subtree: true };

              // Callback function to execute when mutations are observed
              const callback = (mutationList, observer) => {
                mutationList.forEach((mutation) => {
                  if (mutation.type === 'childList') {
                    const addedNodes = Array.from(mutation.addedNodes || []);
                    const toDelete = addedNodes.filter((node) => (
                      node.id
                      && buttonsToRemoveOnSight.indexOf(node.id) > -1
                    ));
                    toDelete.forEach((node) => {
                      buttonsToRemoveOnSight.splice(buttonsToRemoveOnSight.indexOf(node.id), 1);
                      node.remove();
                    });

                    if (buttonsToRemoveOnSight.length === 0) {
                      observer.disconnect();
                    }
                  }
                });
              };

              // Create an observer instance linked to the callback function and start observing
              const observer = new MutationObserver(callback);
              observer.observe(targetNode, config);

              // no need to show shortcuts in the right-click menu ...
              subDocument.querySelector('#se-cmenu_canvas')?.shadowRoot?.querySelectorAll('.shortcut')
                .forEach((elem) => { elem?.setAttribute('style', 'display: none'); });

              // ... since we disable all of them except the basics.
              subDocument.addEventListener('keydown', (e) => {
                const allowedKeys = ['Delete', 'CTRL+KeyC', 'CTRL+KeyV', 'CTRL+KeyX'];
                const currentKey = e.ctrlKey ? `CTRL+${e.code}` : e.code;
                if (allowedKeys.indexOf(currentKey) === -1 && e.target.nodeName === 'BODY') {
                  console.log('Preventing default keydown event', e, currentKey, allowedKeys);
                  e.preventDefault();
                  e.stopImmediatePropagation();
                  e.stopPropagation();
                }
              }, true);

              fetch(`/api/v1/attachments/${attachment.id}/annotation`).finally(() => {
                // make sure the iframe is visible after the fetch is done
                // no matter if it fails or not...
                const iframeStyle = this.iframe?.getAttribute('style');
                const visibleStyle = iframeStyle?.replace(
                  'visibility: hidden',
                  'visibility: visible'
                );
                const newStyle = visibleStyle;
                this.iframe?.setAttribute('style', newStyle);
              }).then((res) => res.text())
                .then((text) => {
                  if (attachment.updatedAnnotation) {
                    svgEditor.svgCanvas.setSvgString(
                      attachment.updatedAnnotation
                    );
                    this.setState({ canSave: true });
                  } else {
                    const safeParseJson = (str) => {
                      try {
                        const ret = JSON.parse(str);
                        this.setState({ canSave: true });
                        return ret;
                      } catch (e) {
                        console.log('Could not parse JSON when requesting attachment!', e);
                        this.setState({ canSave: false });
                        return '';
                      }
                    };
                    const errorSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="1920"'
                    + ' height="1080"><text fill="#000000" font-size="12" stroke="#FF0000" stroke-width="0"'
                    + ' text-anchor="middle" transform="matrix(7.15604 0 0 7.15604 -3493.72 -3162.82)"'
                    + ' x="622.37" xml:space="preserve" y="525.48">Loading error :(</text></svg>';
                    const svgString = decodeURIComponent(safeParseJson(text)) || errorSVG;
                    svgEditor.svgCanvas.setSvgString(svgString);
                  }
                  // Zoom fit-to-canvas
                  subDocument.querySelector('se-text[text="tools.fit_to_all"]')?.click();
                  svgEditor.updateCanvas(false, false);
                });
            }}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="warning"
            onClick={() => {
              this.setState({ canSave: false });
              const { handleOnClose } = this.props;
              return handleOnClose();
            }}
          >
            Discard changes and close
          </Button>
          <Button
            variant="primary"
            disabled={!this.state.canSave}
            onClick={() => {
              this.setState({ canSave: false });
              const { handleSave } = this.props;
              return handleSave();
            }}
          >
            Accept changes
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
}
