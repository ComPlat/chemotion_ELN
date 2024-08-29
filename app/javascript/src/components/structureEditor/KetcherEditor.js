/* eslint-disable react/require-default-props */
/* eslint-disable react/forbid-prop-types */
import PropTypes from 'prop-types';
import React, { useEffect, useRef } from 'react';

function modifyMolString(molString) {
  // Split the string into an array of lines
  let lines = molString.split('\n');

  // Find the index of "M  END"
  let endIndex = lines.findIndex(line => line.trim() === 'M  END');

  if (endIndex === -1) {
    console.error('M  END not found in the string');
    return molString; // Return the original string if "M  END" is not found
  }

  // Key-value pairs to insert
  const keyValuePairs = [
    '1 2',
    '2 1',
    '3 1'
  ];

  // Insert the key-value pairs before the "M  END" line
  lines.splice(endIndex, 0, ...keyValuePairs);

  // Join the lines back into a single string
  let modifiedMolString = lines.join('\n');

  return modifiedMolString;
}

function KetcherEditor(props) {
  const iframeRef = useRef();
  let {
    editor, iH, iS, molfile
  } = props;

  const initMol = modifyMolString(molfile)
    || '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';

  const loadContent = (event) => {
    if (event.data.eventType === 'init') {
      editor.structureDef.editor.setMolecule(initMol);
      // console.log("__", editor._structureDef);
      // setTimeout(() => {
      // editor.structureDef.editor.editor.renderAndRecoordinateStruct();
      // editor.structureDef.editor.setMolecule(initMol);
      // }, 5000);
      // console.log(editor.structureDef.editor.editor.findItem(list, "images"), "ds");
      const list = [
        "elementEdit",
        "bondEdit",
        "rgroupEdit",
        "sgroupEdit",
        "sdataEdit",
        "quickEdit",
        "attachEdit",
        "removeFG",
        "change",
        // "selectionChange",
        "aromatizeStruct",
        "dearomatizeStruct",
        "enhancedStereoEdit",
        "confirm",
        "cursor",
        "apiSettings",
        // "updateFloatingTools",
        "quickEdit",
        // "click"
        // "dblclick",
        // "mousedown",
        // "mousemove",
        // "mouseup",
        // "mouseleave",
        // "mouseover",
        // "showInfo",
        "message",
      ];

      // Function to handle each event
      function handleEvent(eventName, data) {
        // console.log(`${eventName} event triggered with data:`, data);
        if (data[0]?.operation === "Move image") {
          console.log("__LAST CURSOR POSITION", editor._structureDef.editor.editor.lastCursorPosition);
          console.log("__SELCTION", editor._structureDef.editor.editor._selection);
        }
      }

      // Subscribe to each event in the list
      list.forEach(eventName => {
        editor._structureDef.editor.editor.subscribe(eventName, async (eventData) => {
          const result = await eventData;
          handleEvent(eventName, result);
        });
      });
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
