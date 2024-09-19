/* eslint-disable react/require-default-props */
/* eslint-disable react/forbid-prop-types */
import PropTypes, { node } from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';

function KetcherEditor(props) {
  const iframeRef = useRef();
  const [editorS, setEditor] = useState(props.editor);
  let {
    iH, iS, molfile
  } = props;

  const initMol = molfile
    || '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';



  const loadContent = async (event) => {
    if (event.data.eventType === 'init') {
      editorS.structureDef.editor.setMolecule(initMol);
      const list = [
        "change",
      ];

      // Function to handle each event
      async function handleEvent(eventName, data) {
        console.log(`${eventName} event triggered with data:`, data);
        data.forEach(async (item) => {
          switch (item?.operation) {
            case "Move image":
              const moleculePattern = /^mol\d+/;
              let ketFormat = await editorS.structureDef.editor.getKet();
              ketFormat = JSON.parse(ketFormat);
              let moleculeKeys = Object.keys(ketFormat);
              moleculeKeys = moleculeKeys?.filter(str => moleculePattern.test(str));
              const imageWithPositions = {};
              let imageNodes = [...ketFormat.root.nodes];
              // imageNodes = moleculeKeys.slice(moleculeKeys.length);
              imageNodes.forEach((item, idx) => {
                if (item?.type === 'image') {
                  imageWithPositions[`my_alias`] = imageNodes[idx];
                }
              });

              console.log({ imageWithPositions });
              moleculeKeys.forEach((item, _) => {
                const molecule = ketFormat[item];
                const molecule_alias = molecule.atoms[0].alias;
                const location = {
                  x: imageWithPositions[molecule_alias].boundingBox.x,
                  y: imageWithPositions[molecule_alias].boundingBox.y,
                  z: -1
                };
                molecule.atoms[0].location = Object.values(location);
                molecule.atoms[1].location = Object.values(location);
                molecule.stereoFlagPosition = location;
                ketFormat[item] = molecule;
              });
              editorS.structureDef.editor.setMolecule(JSON.stringify(ketFormat));
              // const R_temp = R_elements_template({ x: "-1.2990", y: "-1.2500" });
              // const updatedContent = modifyMolString(molfile, "elementEdit", R_temp);
              // editorS._structureDef.editor.setMolecule(updatedContent);
              // setEditor(editorS);
              break;
            case "Upsert image":
              console.log("upsert");
              break;
            case "Calculate implicit hydrogen":
              // console.log("R: LAST CURSOR POSITION", editorS._structureDef.editor.editor.lastCursorPosition);
              // console.log("R:__SELCTION", editorS._structureDef.editor.editor._selection);
              break;
            case "Add atom":
              // console.log("ADD ATOM: LAST CURSOR POSITION", editorS._structureDef.editor.editor.lastCursorPosition);
              // console.log("ADD ATOM:__SELCTION", editorS._structureDef.editor.editor._selection);
              break;
            default:
            // console.log("ELEMENT DETAILS:__NEW", item);
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
    };
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
