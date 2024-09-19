/* eslint-disable react/require-default-props */
/* eslint-disable react/forbid-prop-types */
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';

let connectionDS = {};
function generateRandomNumber() {
  console.log("called?");
  return parseInt(Math.floor(Math.random() * 10000)); // 0 to 9999
}

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
        // console.log(`${eventName} event triggered with data:`, data);
        let ketFormat = await editorS.structureDef.editor.getKet();
        ketFormat = JSON.parse(ketFormat);
        let allNodes = [...ketFormat.root.nodes];

        const mols = [];
        const images = [];
        allNodes.forEach((item, idx) => {
          if (item?.type === 'image') {
            images.push(allNodes[idx]);
          } else {
            mols.push(allNodes[idx]);
          }
        });

        data.forEach(async (item) => {
          switch (item?.operation) {
            case "Upsert image":
              connectionDS = {
                [`mol_${mols.at(-1).$ref}`]: `img_${images.length - 1}`
              };
              break;
            case "Move image":
              Object.keys(connectionDS).forEach((_) => {
                const images_list = ketFormat.root.nodes.slice(mols.length, allNodes.length);
                images_list.forEach((item, idx) => {
                  const location = {
                    x: item.boundingBox.x,
                    y: item.boundingBox.y,
                    z: -1
                  };
                  ketFormat[`mol${idx}`].atoms[0].location = Object.values(location);
                  ketFormat[`mol${idx}`].atoms[1].location = Object.values(location);
                  ketFormat[`mol${idx}`].stereoFlagPosition = location;
                });
                editorS.structureDef.editor.setMolecule(JSON.stringify(ketFormat));
              });
              break;
            case "Move image!":
              const moleculePattern = /^mol\d+/;
              let moleculeKeys = Object.keys(ketFormat);
              moleculeKeys = moleculeKeys?.filter(str => moleculePattern.test(str));
              const imageWithPositions = {};
              let imageNodes = [...ketFormat.root.nodes];
              imageNodes.forEach((item, idx) => {
                imageWithPositions[`temp_0${idx}`] = item?.type === 'image' ? imageNodes[idx] : "not_an_image";
              });

              console.log(imageWithPositions);
              if (Object.keys(imageWithPositions).length) {
                moleculeKeys.forEach((item, _) => {
                  const molecule = ketFormat[item];
                  const molecule_alias = molecule.atoms[0].alias;
                  console.log(molecule_alias);
                  if (imageWithPositions[molecule_alias]) {
                    const location = {
                      x: imageWithPositions[molecule_alias].boundingBox.x,
                      y: imageWithPositions[molecule_alias].boundingBox.y,
                      z: -1
                    };
                    molecule.atoms[0].location = Object.values(location);
                    molecule.atoms[1].location = Object.values(location);
                    molecule.stereoFlagPosition = location;
                    ketFormat[item] = molecule;
                  }
                });
                // for later use
                // window.surface_chem = {
                //   "alias_00111": "love is the new alias"
                // };
                editorS.structureDef.editor.setMolecule(JSON.stringify(ketFormat));
              }

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
              break;
            // console.log("ELEMENT DETAILS:__NEW", item);

          }
          // editorS.structureDef.editor.setMolecule(JSON.stringify(ketFormat));

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
