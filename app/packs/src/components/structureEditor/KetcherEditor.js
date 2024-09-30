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
const three_parts_patten = /t_\d{1,3}_\d{1,3}/;
const two_parts_pattern = /^t_\d{2,3}$/;
let image_used_counter = -1;
function KetcherEditor({ editor, iH, iS, molfile }) {

  const iframeRef = useRef();
  const initMol = molfile || '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';

  // Load the editor content and set up the molecule
  const loadContent = async (event) => {
    if (event.data.eventType === 'init') {
      window.editor = editor;
      await editor.structureDef.editor.setMolecule(initMol);
      editor._structureDef.editor.editor.subscribe('change', async (eventData) => {
        const result = await eventData;
        handleEventCapture(result);
      });
    }
  };

  // helper function to rebase with the ketcher canvas data
  const fuelKetcherData = async () => {
    latestData = JSON.parse(await editor.structureDef.editor.getKet());
    allNodes = [...latestData.root.nodes];
    imagesList = allNodes.length > mols.length ? allNodes.filter(
      item => item.type === 'image'
    ) : imagesList;
    mols = allNodes.slice(0, allNodes.length - imagesList.length).map(i => i.$ref);
    // console.log("DATA FUELED", { latestData, allNodes, imagesList, mols, decision: allNodes.length > mols.length });
  };

  // main funcation to capture all events from editor
  const handleEventCapture = async (data) => {
    const selection = editor._structureDef.editor.editor._selection;
    if (selection?.images) {
      addEventToFILOStack("Move image");
    }

    for (const eventItem of data) {
      // console.log(eventItem);
      switch (eventItem?.operation) {
        case "Load canvas":
          await fuelKetcherData();
          break;
        case "Move image":
          addEventToFILOStack("Move image");
          break;
        case "Add atom":
          // if (imagesList.length)
          addEventToFILOStack("Add atom");
          break;
        case "Upsert image":
          addEventToFILOStack("Upsert image");
          break;
        case "Move atom":
          // if (imagesList.length)
          addEventToFILOStack("Move atom");
          break;
        default:
          // console.warn("Unhandled operation:", eventItem.operation);
          break;
      }
    }
    processFILOStack();
  };

  // helper function to add event to stack
  const addEventToFILOStack = (event) => {
    if (!uniqueEvents.has(event)) {
      FILOStack.push(event);
      uniqueEvents.add(event);
    }
  };

  // helper function to ececute a stack: first in last out
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
        case "Load canvas":
          // nothing happens
          break;
        case "Move image":
        case "Move atom":
          moveTemplate();
          break;
        case "Add atom":
          handleAddAtom();
          break;
        case "Upsert image":
          // postAtomAddImageInsertion();
          break;
        default:
          // console.warn("Unhandled event:", event);
          break;
      }
    }
    // Run the function to modify matching text elements
    // modifyMatchingTextElements();
  };

  // helper function to place image on atom location coordinates
  const placeImageOnAtoms = async (mols_, imagesList_) => {
    await fuelKetcherData();
    mols_.forEach((item) => {
      latestData[item]?.atoms.forEach((atom) => {
        if (atom && three_parts_patten.test(atom?.alias)) {
          const splits_alias = atom.alias.split("_");
          let image_coordinates = imagesList_[parseInt(splits_alias[2])]?.boundingBox;
          image_coordinates = {
            ...image_coordinates,
            x: atom.location[0] - image_coordinates.width / 2,
            y: atom.location[1] + image_coordinates.height / 2,
            z: 0
          };
          imagesList_[splits_alias[2]].boundingBox = image_coordinates;
        };
      });
    });
    latestData.root.nodes = [...latestData.root.nodes.slice(0, mols_.length), ...imagesList_];
    await editor.structureDef.editor.setMolecule(JSON.stringify(latestData));
  };

  // Helper function to move image and update molecule positions
  const moveTemplate = async () => {
    console.log("move template!!");
    mols.forEach(async (mol) => {
      const molecule = latestData[mol];

      // Check if molecule and atoms exist, and if the alias is formatted correctly
      molecule?.atoms?.forEach((item, atom_idx) => {
        if (item.alias) {
          const alias = item.alias.split("_");
          if (three_parts_patten.test(item.alias)) {
            const image = imagesList[alias[2]];
            if (image?.boundingBox) {
              const { x, y } = image?.boundingBox; // Destructure x, y coordinates from boundingBox
              const location = [x, y, 0]; // Set location as an array of coordinates
              // molecule.atoms[atom_idx].location = location;
              molecule.atoms[atom_idx].alias = item.alias.trim();
              if (molecule?.stereoFlagPosition) {
                molecule.stereoFlagPosition = {
                  x: location[0],
                  y: location[1],
                  z: location[2]
                };
              }
            }
          }
        }
      });
      latestData[mol] = molecule;
    });
    latestData.root.nodes = latestData.root.nodes.slice(0, mols.length);
    await editor.structureDef.editor.setMolecule(JSON.stringify(latestData));
    placeImageOnAtoms(mols, imagesList);
  };

  // helper function to handle new atoms added to the canvas
  const handleAddAtom = async () => {
    console.log("Atom moved!");
    mols.forEach((mol) => {
      let is_h_id = -1;
      const molecule = latestData[mol];
      molecule.atoms.map((item, idx) => {
        if (item?.label === "H") is_h_id = idx;
        if (two_parts_pattern.test(item?.alias)) {
          const part_three = ++image_used_counter;
          item.alias += `_${part_three}`;
          const alias_splits = item.alias.split("_");
          if (!imagesList[part_three]) { // specifically for direction attachments
            latestData.root.nodes.push(prepareImageFromTemplateList(parseInt(alias_splits[1]), item.location));
          }
        }
      });
      // TODO: understand with example issue of indexs implement this part
      if (is_h_id != -1) {
        if (molecule?.bonds?.length <= 1) {
          molecule.atoms.splice(is_h_id, 1);
          molecule.bonds = [];
        }
        //   else if (molecule?.bonds) {
        //     molecule.bonds.splice(is_h_id, 1);
        //     molecule.atoms.splice(is_h_id, 1);
        //   }
      }
      latestData[mol] = molecule;
    });
    await editor.structureDef.editor.setMolecule(JSON.stringify(latestData));
  };

  // helper function to return a new image in imagesList with a location
  const prepareImageFromTemplateList = (idx, location) => {
    const template_list = [
      null,
      {
        "type": "image",
        "format": "image/svg+xml",
        "boundingBox": {
          "width": 1.8750000000000018,
          "height": 0.7999999999999936
        },
        "data": "PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNTAiIGZpbGw9IiNmZmYiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIzIiAgc3Ryb2tlLWRhc2hhcnJheT0iNSw1Ii8+Cjwvc3ZnPg=="
      },
      {
        "type": "image",
        "format": "image/svg+xml",
        "boundingBox": {
          "width": 1.1749999999999998,
          "height": 1.0999999999999943
        },
        "data": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciICB2aWV3Qm94PSIwIDAgMTYwIDE2MCI+CiAgPGNpcmNsZSByPSI3NSIgY3g9IjgwIiBjeT0iODAiIHN0cm9rZT0iI2FjNWIyMyIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSIjZWQ3ZDMxIiAvPgo8L3N2Zz4="
      }
    ];
    template_list[idx].boundingBox.x = location[0];
    template_list[idx].boundingBox.y = location[1];
    template_list[idx].boundingBox.z = location[2];
    return template_list[idx];
  };

  // helper function to make all t_int_int dom element transparent so they are not visible on the canvase
  // TODO: not working right now
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
};

KetcherEditor.propTypes = {
  molfile: PropTypes.string,
  editor: PropTypes.object.isRequired,
  iH: PropTypes.string.isRequired,
  iS: PropTypes.object.isRequired,
};

export default KetcherEditor;
;;;;;;;;;;;;;;;;;;;
