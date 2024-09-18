/* eslint-disable react/require-default-props */
/* eslint-disable react/forbid-prop-types */
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';




function addElementAtIndex(array, index, newElement) {
  // Check if the index is within bounds
  if (index >= 0 && index <= array.length) {
    // Use splice to insert the new element at the specified index
    array.splice(index, 0, newElement);
  } else {
    console.error("Index out of bounds");
  }

  return array;
}

function modifyMolString(molfile, type, newElement) {
  // list of lines in molfile
  const line = molfile.split("\n");
  const atomStart = 3;
  // console.log(line);
  // file header type i.e INDIGO
  const fileType = line[1];

  // file atoms & bonds info
  const fileInfo = line[3].trim().split(" ");

  // number of atoms in a file
  const numberOfAtoms = parseInt(fileInfo[0].trim());
  const positionToAddNewAtom = 3 + numberOfAtoms + 1;
  // number of bonds in a file
  const numberOfBonds = parseInt(fileInfo[1].trim());

  // adding numberOfAtoms, numberOfBonds you get a line number to place extra content
  const rowNumToStartAdding = numberOfAtoms + numberOfBonds + 1;
  let newLines = [];
  if (type === 'elementEdit') {
    // temp
    newLines = addElementAtIndex(line, positionToAddNewAtom, newElement);
    if (newLines[line.length - 2].indexOf("RGP") !== -1) newLines[line.length - 2] += `1  ${numberOfAtoms}  1`;
    else {
      newLines = addElementAtIndex(line, line.length - 2, `M  RGP  1  ${numberOfAtoms}  1`);
    }
    // increment atoms numbers
    fileInfo[0] = numberOfAtoms + 1;
    line[3] = " " + fileInfo.join(" ");

    // add alias
    newLines = addElementAtIndex(line, numberOfAtoms + numberOfBonds + atomStart + 2, `A   ${numberOfAtoms + 1}`);
    newLines = addElementAtIndex(line, numberOfAtoms + numberOfBonds + atomStart + 2 + 1, `My alias`);
  }
  console.log({ newLines });

  return newLines.join("\n");
}

// const R_elements_template = ({ x, y }) => "    " + x + "   " + y + "   0.0000 R#  0  0  0  0  0  0  0  0  0  0  0  0";
const R_elements_template = ({ }) => "    4.4750   -4.4750    0.0000 R#  0  0  0  0  0  0  0  0  0  0  0  0";

function KetcherEditor(props) {
  const iframeRef = useRef();
  const [editorS, setEditor] = useState(props.editor);
  let {
    iH, iS, molfile
  } = props;

  const initMol = molfile
    || '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';



  const loadContent = (event) => {
    if (event.data.eventType === 'init') {
      window.editor = editorS;
      editorS.structureDef.editor.setMolecule(initMol);

      // editor.structureDef.editor.editor.renderAndRecoordinateStruct();
      // editor.structureDef.editor.setMolecule(initMol);
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
        "quickEdit",
        // "click"
        // "dblclick",
        // "mousedown",
        // "mousemove",
        // "mouseup",
        // "mouseleave",
        // "mouseover",
        // "showInfo",
        // "message",
      ];

      // Function to handle each event
      async function handleEvent(eventName, data) {
        // console.log(`${eventName} event triggered with data:`, data, molfile);
        console.log(await editor.structureDef.editor.getKet(), "editor?");
        return;
        data.forEach(async (item) => {
          switch (item?.operation) {
            case "Move image":
            case "Upsert image":
              const R_temp = R_elements_template({ x: "-1.2990", y: "-1.2500" });
              const updatedContent = modifyMolString(molfile, "elementEdit", R_temp);
              // console.log(await editor.structureDef.editor.getMolfile(), "editor?");
              editorS._structureDef.editor.setMolecule(updatedContent);
              // setEditor(editorS);
              break;
            case "Calculate implicit hydrogen":
              console.log("R: LAST CURSOR POSITION", editorS._structureDef.editor.editor.lastCursorPosition);
              console.log("R:__SELCTION", editorS._structureDef.editor.editor._selection);
              break;
            case "Add atom":
              console.log("ADD ATOM: LAST CURSOR POSITION", editorS._structureDef.editor.editor.lastCursorPosition);
              console.log("ADD ATOM:__SELCTION", editorS._structureDef.editor.editor._selection);
              break;
            default:
              console.log("ELEMENT DETAILS:__NEW", item);
          }
        });
      }


      // Subscribe to each event in the list
      list.forEach(eventName => {
        editorS._structureDef.editor.editor.subscribe(eventName, async (eventData) => {
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
        id={editorS.id}
        src={editorS.extSrc}
        title={editorS.label}
        height={iH}
        width="100%"
        style={iS}
      />
    </div>
  );
};

KetcherEditor.propTypes = {
  molfile: PropTypes.string,
  editor: PropTypes.object.isRequired,
  iH: PropTypes.string.isRequired,
  iS: PropTypes.object.isRequired,
};

export default KetcherEditor;
