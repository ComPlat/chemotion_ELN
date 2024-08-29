/* eslint-disable react/require-default-props */
/* eslint-disable react/forbid-prop-types */
import PropTypes from 'prop-types';
import React, { useEffect, useRef } from 'react';


function KetcherEditor(props) {
  const iframeRef = useRef();
  const {
    editor, iH, iS, molfile
  } = props;

  const initMol = molfile
    || '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';

  const loadContent = (event) => {
    if (event.data.eventType === 'init') {
      editor.structureDef.editor.setMolecule(initMol);
      // editor._structureDef.editor.editor.subscribe("change", (r) => console.log(r));
      const list = [
        "message", "elementEdit", "bondEdit", "zoomIn", "zoomOut", "rgroupEdit",
        "sgroupEdit", "sdataEdit", "quickEdit", "attachEdit", "removeFG", "change",
        "selectionChange", "aromatizeStruct", "dearomatizeStruct", "enhancedStereoEdit",
        "confirm", "cursor", "showInfo", "apiSettings", "updateFloatingTools",
        "click"
        // , "dblclick", "mousedown", "mousemove", "mouseup", "mouseleave", "mouseover"
      ];

      // Function to handle each event
      function handleEvent(eventName, data) {
        console.log(`${eventName} event triggered with data:`, data);
      }

      // Subscribe to each event in the list
      list.forEach(eventName => {
        editor._structureDef.editor.editor.subscribe(eventName, async (eventData) => {
          const result = await eventData;
          handleEvent(eventName, result);
        });
      });

      console.log(editor._structureDef.editor.editor);
    }
  };

  useEffect(() => {
    window.addEventListener('message', loadContent);
    return () => {
      window.removeEventListener('message', loadContent);
    };
  }, []);

  return (
    <div>
      <iframe
        ref={iframeRef}
        id={editor.id}
        src={editor.extSrc}
        title={editor.label}
        height={iH}
        width="100%"
        style={iS}
      />
    </div>
  );
}

KetcherEditor.propTypes = {
  molfile: PropTypes.string,
  editor: PropTypes.object.isRequired,
  iH: PropTypes.string.isRequired,
  iS: PropTypes.object.isRequired,
};

export default KetcherEditor;
