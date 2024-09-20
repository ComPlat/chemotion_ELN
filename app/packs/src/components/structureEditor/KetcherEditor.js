/* eslint-disable react/require-default-props */
/* eslint-disable react/forbid-prop-types */
import PropTypes from 'prop-types';
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
      editorS._structureDef.editor.editor.subscribe('change', async (eventData) => {
        const result = await eventData;
        handleEditorChangeEvent(result);
      });
    };
  };

  async function handleEditorChangeEvent(data) {
    let ketFormat = await editorS.structureDef.editor.getKet();
    ketFormat = JSON.parse(ketFormat);
    let allNodes = [...ketFormat.root.nodes];

    const images = [];
    allNodes.forEach((item, idx) => {
      if (item?.type === 'image') {
        images.push(allNodes[idx]);
      }
    });


    const mols = [];
    Object.keys(ketFormat)?.forEach((item) => {
      if (ketFormat[item]?.atoms?.length && ketFormat[item]?.atoms[0]?.alias) mols.push(item);
    });

    data.forEach(async (item) => {
      switch (item?.operation) {
        case "Upsert image":
          console.log("upsert image!!!");
          break;
        case "Move image":
          const images_list = ketFormat.root.nodes.slice(allNodes.length - mols.length, allNodes.length);
          console.log(mols.length - allNodes.length, allNodes.length);
          images_list.forEach((item, idx) => {
            const location = {
              x: item.boundingBox.x + item.boundingBox.width / 2,
              y: item.boundingBox.y - item.boundingBox.height / 2,
              z: -1
            };
            if (ketFormat[mols[idx]].atoms[0].alias) {
              ketFormat[mols[idx]].atoms[0].location = Object.values(location);
              ketFormat[mols[idx]].atoms[1].location = Object.values(location);
              ketFormat[mols[idx]].stereoFlagPosition = location;
            }
          });
          editorS.structureDef.editor.setMolecule(JSON.stringify(ketFormat));
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
