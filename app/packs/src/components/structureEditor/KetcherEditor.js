/* eslint-disable react/require-default-props */
/* eslint-disable react/forbid-prop-types */
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';

const FILOStack = [];
const uniqueEvents = new Set();
let latestData = null;

function KetcherEditor({ editor, iH, iS, molfile }) {
  const iframeRef = useRef();
  const [editorS] = useState(editor);
  const initMol = molfile || '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';

  const addEventToFILOStack = (event) => {
    if (!uniqueEvents.has(event)) {
      FILOStack.push(event);
      uniqueEvents.add(event);
    }
  };

  // Load the editor content and set up the molecule
  const loadContent = async (event) => {
    if (event.data.eventType === 'init') {
      window.editor = editorS;
      editorS.structureDef.editor.setMolecule(initMol);
      editorS._structureDef.editor.editor.subscribe('change', async (eventData) => {
        const result = await eventData;
        handleEventCapture(result);
      });
    }
  };

  const handleEventCapture = async (data) => {

    for (const eventItem of data) {
      switch (eventItem?.operation) {
        case "Load canvas":
          latestData = JSON.parse(await editorS.structureDef.editor.getKet());
          addEventToFILOStack("Load canvas");
          break;
        case "Move image":
          addEventToFILOStack("Move image");
          break;

        case "Add atom":
          addEventToFILOStack("Add atom");
          break;

        case "Move atom":
          addEventToFILOStack("Move atom");
          break;

        default:
          console.warn("Unhandled operation:", eventItem.operation);
          break;
      }
    }
    await editorS.structureDef.editor.setMolecule(latestData);
    latestData = null;
    processFILOStack();
  };

  const processFILOStack = async () => {
    latestData = JSON.parse(await editorS.structureDef.editor.getKet());
    const loadCanvasIndex = FILOStack.indexOf("Load canvas");
    if (loadCanvasIndex > -1) {
      console.log(JSON.parse(await editorS.structureDef.editor.getKet()));
      FILOStack.splice(loadCanvasIndex, 1); // Remove "Load canvas" from the stack
      uniqueEvents.delete("Load canvas");
    }
    if (!latestData) {
      alert("data not present!!");
      return;
    }
    while (FILOStack.length > 0) {
      const event = FILOStack.pop();
      uniqueEvents.delete(event);

      switch (event) {
        case "Move image":
          moveTemplate();
          console.log("Image moved!");
          break;
        case "Add atom":
          handleAddAtom();
          break;
        case "Move atom":
          console.log("Atom moved!");
          break;
        default:
          console.warn("Unhandled event:", event);
          break;
      }
    }
  };

  // Helper function to move image and update molecule positions
  const moveTemplate = async () => {
    const ketFormat = latestData;
    const allNodes = [...ketFormat.root.nodes];
    const mols = Object.keys(ketFormat).filter(
      item => ketFormat[item]?.atoms?.[0]?.alias
    );

    // const selection = editorS._structureDef.editor.editor._selection;
    // if (selection?.images) {
    //   moveTemplate(ketFormat, allNodes, mols);
    // }

    const imagesList = ketFormat.root.nodes.slice(allNodes.length - mols.length);
    imagesList.forEach((item, idx) => {
      const location = {
        x: item.boundingBox.x,
        y: item.boundingBox.y,
        z: 0,
      };
      const molecule = ketFormat[mols[idx]];
      molecule.atoms[0].location = [...Object.values(location)];
      if (molecule?.atoms[0]?.alias && molecule?.bonds?.length) {
        const closest = findClosestAtom([...Object.values(location)], molecule.atoms);
        item = closest;
      } else {
        molecule.atoms[0].location = [...Object.values(location)];
      }
      molecule.stereoFlagPosition = location;
    });
    await editorS.structureDef.editor.setMolecule(JSON.stringify(ketFormat));
  };

  // Handle atom addition logic
  const handleAddAtom = async () => {
    const ketFormat = latestData;
    console.log({ handleAddAtom: latestData });
    const lastMoleculeKey = `mol${Object.keys(ketFormat).length - 2}`;
    const lastMolecule = ketFormat[lastMoleculeKey];

    if (lastMolecule?.atoms[1]?.label === "H") {
      delete lastMolecule.sgroups;
      delete lastMolecule.bonds;
      lastMolecule.atoms.splice(1, 1);
    }
    await editorS.structureDef.editor.setMolecule(JSON.stringify(ketFormat));
  };

  function calculateDistance(atom1, atom2) {
    const dx = atom2[0] - atom1[0];
    const dy = atom2[1] - atom1[1];
    const dz = atom2[2] - atom1[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function findClosestAtom(cursorLocation, atoms) {
    let closestAtom = null;
    let minDistance = Infinity;
    atoms.forEach(atom => {
      const distance = calculateDistance(cursorLocation, atom.location);
      if (distance < minDistance) {

        minDistance = distance;
        console.log({ minDistance });
        closestAtom = atom;
      }
    });
    return closestAtom;
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
}

KetcherEditor.propTypes = {
  molfile: PropTypes.string,
  editor: PropTypes.object.isRequired,
  iH: PropTypes.string.isRequired,
  iS: PropTypes.object.isRequired,
};

export default KetcherEditor;
