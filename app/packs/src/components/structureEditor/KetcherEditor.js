/* eslint-disable react/require-default-props */
/* eslint-disable react/forbid-prop-types */
import { ImageList } from '@material-ui/core';
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useState } from 'react';

const FILOStack = [];
const uniqueEvents = new Set();
let latestData = null;
let imagesList = [];
let mols = [];
let allNodes = [];

function KetcherEditor({ editor, iH, iS, molfile }) {
  const iframeRef = useRef();
  // const [editor] = useState(editor);
  const initMol = molfile || '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';

  // Load the editor content and set up the molecule
  const loadContent = async (event) => {
    if (event.data.eventType === 'init') {
      window.editor = editor;
      editor.structureDef.editor.setMolecule(initMol);
      editor._structureDef.editor.editor.subscribe('change', async (eventData) => {
        const result = await eventData;
        handleEventCapture(result);
      });
    }
  };

  const handleEventCapture = async (data) => {
    for (const eventItem of data) {
      console.log(eventItem);
      switch (eventItem?.operation) {
        case "Load canvas":
          // await editor.structureDef.editor.layout();
          if (uniqueEvents.length > 1) {
            await fuelKetcherData();
            addEventToFILOStack("Load canvas");
          }

          break;
        case "Move image":
          addEventToFILOStack("Move image");
          break;

        case "Add atom":
          console.log("add atom");
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
    await editor.structureDef.editor.setMolecule(latestData);
    processFILOStack();
  };

  const addEventToFILOStack = (event) => {
    if (!uniqueEvents.has(event)) {
      FILOStack.push(event);
      uniqueEvents.add(event);
    }
  };

  const processFILOStack = async () => {
    await fuelKetcherData();
    const loadCanvasIndex = FILOStack.indexOf("Load canvas");
    if (loadCanvasIndex > -1) {
      FILOStack.splice(loadCanvasIndex, 1);
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
          console.log("Image moved!");
          moveTemplate(latestData, allNodes);
          break;
        case "Add atom":
          handleAddAtom(latestData);
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

  const placeImageOnAtoms = async (mols) => {
    await fuelKetcherData();
    mols.forEach((item) => {
      const atom = latestData[item]?.atoms[0];
      if (atom && atom.alias) {
        const splits_alias = atom.alias.split("_");
        let image_coordinates = imagesList[splits_alias[2]].boundingBox;
        image_coordinates = {
          ...image_coordinates,
          x: atom.location[0] - image_coordinates.width / 2,
          y: atom.location[1] + image_coordinates.height / 2,
          z: 0
        };
        imagesList[splits_alias[2]].boundingBox = image_coordinates;
      };
    });
    latestData.root.nodes.push(...imagesList);
    await editor.structureDef.editor.setMolecule(JSON.stringify(latestData));
  };

  // Helper function to move image and update molecule positions
  const moveTemplate = async (ketFormat) => {
    mols.forEach(async (item, idx) => {
      const molecule = ketFormat[item];

      // Check if molecule and atoms exist, and if the alias is formatted correctly
      if (molecule?.atoms[0]?.alias) {
        const alias = molecule.atoms[0].alias.split("_");

        // Check if alias has at least 3 parts
        if (alias.length >= 3) {
          const image = imagesList[alias[2]];

          if (image?.boundingBox) {
            const { x, y } = image.boundingBox; // Destructure x, y coordinates from boundingBox
            const location = [x, y, 0]; // Set location as an array of coordinates

            // Update molecule atom's location and alias
            molecule.atoms[0].location = location;
            molecule.atoms[0].alias = `${alias[0]}_${alias[1]}_${idx}`;
          }
        }
      }
    });
    ketFormat.root.nodes = ketFormat.root.nodes.slice(0, mols.length);
    await editor.structureDef.editor.setMolecule(JSON.stringify(ketFormat));
    placeImageOnAtoms(mols);
  };

  // Handle atom addition logic
  const handleAddAtom = async (ketFormat) => {
    const lastMoleculeKey = `mol${Object.keys(ketFormat).length - 2}`;
    const lastMolecule = ketFormat[lastMoleculeKey];

    if (lastMolecule?.atoms[1]?.label === "H") {
      delete lastMolecule.sgroups;
      delete lastMolecule.bonds;
      lastMolecule.atoms[0].alias += `_${imagesList.length - 1}`;
      lastMolecule.atoms.splice(1, 1);
    }
    await editor.structureDef.editor.setMolecule(JSON.stringify(ketFormat));
  };

  const fuelKetcherData = async () => {
    console.log("DATA FUELED!!!!!!!!!");
    latestData = JSON.parse(await editor.structureDef.editor.getKet());
    allNodes = [...latestData.root.nodes];

    imagesList = allNodes.length > mols.length ? allNodes.filter(
      item => item.type === 'image'
    ) : imagesList;
    mols = allNodes.slice(0, allNodes.length - imagesList.length).map(i => i.$ref);
    console.log({ imagesList, mols, allNodes, l: allNodes.length - imagesList.length });
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


// const selection = editor._structureDef.editor.editor._selection;
// if (selection?.images) {
//   moveTemplate(ketFormat, allNodes, mols);
// }