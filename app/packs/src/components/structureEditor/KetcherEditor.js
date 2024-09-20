/* eslint-disable react/require-default-props */
/* eslint-disable react/forbid-prop-types */
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';

function KetcherEditor(props) {
  const iframeRef = useRef();
  const [editorS] = useState(props.editor);
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
    const images = [];
    const mols = [];
    let ketFormat = await editorS.structureDef.editor.getKet();
    ketFormat = JSON.parse(ketFormat);
    let allNodes = [...ketFormat.root.nodes];

    allNodes.forEach((item, idx) => {
      if (item?.type === 'image') {
        images.push(allNodes[idx]);
      }
    });

    Object.keys(ketFormat)?.forEach((item) => {
      if (ketFormat[item]?.atoms?.length && ketFormat[item]?.atoms[0]?.alias) mols.push(item);
    });

    data.forEach(async (item) => {
      console.log(item);
      switch (item?.operation) {
        case "Upsert image":
          console.log("image Added");
          delete ketFormat[`mol${mols.length - 1}`].sgroups;
          delete ketFormat[`mol${mols.length - 1}`].bonds;
          ketFormat[`mol${mols.length - 1}`].atoms.splice(1, 1);
          editorS.structureDef.editor.setMolecule(JSON.stringify(ketFormat));
          break;
        case "Move image":
          console.log("image moved");
          const selected_image = editorS._structureDef.editor.editor._selection.images[0];
          const images_list = ketFormat.root.nodes.slice(allNodes.length - mols.length, allNodes.length);

          const item_image = images_list[selected_image];
          const location = {
            x: item_image.boundingBox.x + item_image.boundingBox.width / 2,
            y: item_image.boundingBox.y - item_image.boundingBox.height / 2,
            z: -1
          };

          if (ketFormat[mols[selected_image]].atoms[0].alias) {
            ketFormat[mols[selected_image]].atoms[0].location = [...Object.values(location)];
            if (ketFormat[mols[selected_image]].atoms[1]) {
              ketFormat[mols[selected_image]].atoms[1].location = Object.values(location);
            }
            ketFormat[mols[selected_image]].stereoFlagPosition = location;
          }
          editorS.structureDef.editor.setMolecule(JSON.stringify(ketFormat));
          break;
        case "Add atom":
          console.log("Atom added", data);

          // console.log("ADD ATOM: LAST CURSOR POSITION", editorS._structureDef.editor.editor.lastCursorPosition);
          // console.log("ADD ATOM:__SELCTION", editorS._structureDef.editor.editor._selection);
          break;
        default:
          break;
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
