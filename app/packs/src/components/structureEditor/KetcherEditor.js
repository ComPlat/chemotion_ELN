/* eslint-disable react/require-default-props */
/* eslint-disable react/forbid-prop-types */
import PropTypes from 'prop-types';
import React, { useEffect, useRef } from 'react';

const FILOStack = [];
const uniqueEvents = new Set();
let latestData = null;
let imagesList = [];
let mols = [];
let allNodes = [];



function KetcherEditor({ editor, iH, iS, molfile }) {
  const iframeRef = useRef();
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
    const selection = editor._structureDef.editor.editor._selection;
    if (selection?.images) {
      console.log("Image selected!");
      addEventToFILOStack("Move image");
    }

    for (const eventItem of data) {
      switch (eventItem?.operation) {
        case "Load canvas":
          if (uniqueEvents.length > 1) {
            await fuelKetcherData();
            addEventToFILOStack("Load canvas");
          }
          break;
        case "Move image":
          addEventToFILOStack("Move image");
          break;
        case "Add atom":
          addEventToFILOStack("Add atom");
          break;
        case "Upsert image":
          addEventToFILOStack("Upsert image");
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
        case "Move atom":
          moveTemplate();
          break;
        case "Add atom":
          handleAddAtom();
          break;
        case "Move atom":
        case "Upsert image":
          // nothing will happen
          break;
        default:
          console.warn("Unhandled event:", event);
          break;
      }
    }
    // Run the function to modify matching text elements
    // modifyMatchingTextElements();
  };

  const placeImageOnAtoms = async (mols_) => {
    await fuelKetcherData();
    mols_.forEach((item) => {
      latestData[item]?.atoms.forEach((atom) => {
        if (atom && atom.alias) {
          const splits_alias = atom.alias.split("_");
          let image_coordinates = imagesList[splits_alias[2]]?.boundingBox;
          image_coordinates = {
            ...image_coordinates,
            x: atom.location[0] - image_coordinates.width / 2,
            y: atom.location[1] + image_coordinates.height / 2,
            z: 0
          };
          imagesList[splits_alias[2]].boundingBox = image_coordinates;
        };
      });
    });
    latestData.root.nodes.push(...imagesList);
    await editor.structureDef.editor.setMolecule(JSON.stringify(latestData));
  };

  // Helper function to move image and update molecule positions
  const moveTemplate = async () => {
    let image_counter_alias = -1;
    mols.forEach(async (mol) => {
      const molecule = latestData[mol];
      // Check if molecule and atoms exist, and if the alias is formatted correctly
      molecule?.atoms?.forEach((item, atom_idx) => {
        if (item.alias) {
          const alias = item.alias.split("_");
          image_counter_alias++;
          // Check if alias has at least 3 parts
          if (alias.length >= 3) {
            const image = imagesList[alias[2]];
            if (image?.boundingBox) {
              const { x, y } = image?.boundingBox; // Destructure x, y coordinates from boundingBox
              const location = [x, y, 0]; // Set location as an array of coordinates
              // Update molecule atom's location and alias
              molecule.atoms[atom_idx].location = location;
              molecule.atoms[atom_idx].alias = `${alias[0]}_${alias[1]}_${image_counter_alias}`;
            }
          }
        }
      });
    });
    latestData.root.nodes = latestData.root.nodes.slice(0, mols.length);
    await editor.structureDef.editor.setMolecule(JSON.stringify(latestData));
    placeImageOnAtoms(mols);
  };

  // Handle atom addition logic
  const handleAddAtom = async () => {
    console.log("Atom moved!");
    const lastMoleculeKey = `mol${Object.keys(latestData).length - 2}`;
    const lastMolecule = latestData[lastMoleculeKey];

    if (lastMolecule?.atoms[1]?.label === "H") {
      delete lastMolecule.sgroups;
      delete lastMolecule.bonds;
      lastMolecule.atoms[0].alias += `_${imagesList.length - 1}`;
      lastMolecule.atoms.splice(1, 1);
    }
    await editor.structureDef.editor.setMolecule(JSON.stringify(latestData));
    addEventToFILOStack("Move image");
  };

  const fuelKetcherData = async () => {
    latestData = JSON.parse(await editor.structureDef.editor.getKet());
    allNodes = [...latestData.root.nodes];
    imagesList = allNodes.length > mols.length ? allNodes.filter(
      item => item.type === 'image'
    ) : imagesList;
    mols = allNodes.slice(0, allNodes.length - imagesList.length).map(i => i.$ref);
    // console.log("DATA FUELED", { latestData, allNodes, imagesList, mols, decision: allNodes.length > mols.length });
  };

  const modifyMatchingTextElements = () => {
    const regex = /t_\d+_\d+/; // Regex to match t_02_0, etc.

    // Selecting all <tspan> elements inside the SVG
    const svgElement = document.querySelector('svg[data-testid="ketcher-canvas"]'); // Adjusted to ensure correct SVG element is selected

    if (svgElement) {
      const tspans = svgElement.querySelectorAll('tspan'); // Selecting all <tspan> within this specific SVG

      tspans.forEach((tspan) => {
        const trimmedContent = tspan.textContent.trim();

        // Check if the content matches the pattern
        if (regex.test(trimmedContent)) {
          console.count("matches!!!");

          // Find the closest <text> element containing the <tspan>
          const parentText = tspan.closest('text');

          if (parentText) {
            // Modify the parent <text> element's attributes and styles
            parentText.setAttribute('fill', 'transparent');
            parentText.style.fill = 'transparent';

            console.log("Modified element with content: ", trimmedContent);
          }
        }
      });
    } else {
      console.error("SVG element not found or not loaded.");
    }
  };


  useEffect(() => {
    window.addEventListener('message', loadContent);

    // Function to search for any <tspan> elements containing the text that matches the regex t_01_0
    // Function to search for any <tspan> elements containing the text that matches the pattern t_{integer}_{integer}


    // Call the function to modify the matching elements

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

