/* eslint-disable react/require-default-props */
/* eslint-disable react/forbid-prop-types */
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';

function KetcherEditor({ editor, iH, iS, molfile }) {
  const iframeRef = useRef();
  const [editorS] = useState(editor);

  const initMol = molfile || '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';

  // Load the editor content and set up the molecule
  const loadContent = async (event) => {
    if (event.data.eventType === 'init') {
      window.editor = editorS;
      editorS.structureDef.editor.setMolecule(initMol);
      editorS._structureDef.editor.editor.subscribe('change', async (eventData) => {
        const result = await eventData;
        handleEditorChangeEvent(result);
      });
    }
  };

  // Helper function to move image and update molecule positions
  const moveTemplate = (ketFormat, allNodes, mols) => {
    const imagesList = ketFormat.root.nodes.slice(allNodes.length - mols.length);
    imagesList.forEach((item, idx) => {
      const location = {
        x: item.boundingBox.x + item.boundingBox.width / 2,
        y: item.boundingBox.y - item.boundingBox.height / 2,
        z: 0,
      };
      const molecule = ketFormat[mols[idx]];
      if (molecule?.atoms[0]?.alias) {

        molecule.atoms[0].location = [...Object.values(location)];
        molecule.stereoFlagPosition = location;
      }
    });
    editorS.structureDef.editor.setMolecule(JSON.stringify(ketFormat));
  };

  // Handle atom addition logic
  const handleAddAtom = (ketFormat) => {
    const lastMoleculeKey = `mol${Object.keys(ketFormat).length - 2}`;
    const lastMolecule = ketFormat[lastMoleculeKey];
    if (lastMolecule?.atoms[1]?.label === "H") {
      delete lastMolecule.sgroups;
      delete lastMolecule.bonds;
      lastMolecule.atoms.splice(1, 1); // Remove hydrogen atom
      editorS.structureDef.editor.setMolecule(JSON.stringify(ketFormat));
    }
  };

  // Main function to handle different editor change events
  const handleEditorChangeEvent = async (data) => {
    let ketFormat = await editorS.structureDef.editor.getKet();
    ketFormat = JSON.parse(ketFormat);

    const allNodes = [...ketFormat.root.nodes];
    const images = allNodes?.filter(item => item?.type === 'image');
    const mols = Object.keys(ketFormat).filter(
      item => ketFormat[item]?.atoms?.[0]?.alias
    );

    const selection = editorS._structureDef.editor.editor._selection;
    console.log("Current selection:", selection);

    if (selection?.images) {
      moveTemplate(ketFormat, allNodes, mols);
    }
    // Process each event
    for (const eventItem of data) {
      switch (eventItem?.operation) {
        case "Move image":
          console.log("Image moved!");
          moveTemplate(ketFormat, allNodes, mols);
          break;
        case "Add atom":
          console.log("Atom added!");
          handleAddAtom(ketFormat);
          break;
        case "Upsert image!":
          console.log("Image added!");
          break;
        case "Move atom":
          console.log("Atom moved!");
          break;
        default:
          console.warn("Unhandled operation:", eventItem.operation);
          break;
      }
    }
  };

  // Effect to set up event listener for loading editor content
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
}

KetcherEditor.propTypes = {
  molfile: PropTypes.string,
  editor: PropTypes.object.isRequired,
  iH: PropTypes.string.isRequired,
  iS: PropTypes.object.isRequired,
};

export default KetcherEditor;
