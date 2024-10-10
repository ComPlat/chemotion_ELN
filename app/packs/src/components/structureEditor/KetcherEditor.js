/* eslint-disable react/require-default-props */
/* eslint-disable react/forbid-prop-types */
import { VolumeDownSharp } from '@material-ui/icons';
import PropTypes from 'prop-types';
import React, { useEffect, useRef } from 'react';

let FILOStack = [];
let uniqueEvents = new Set();
let latestData = null;
let imagesList = [];
let mols = [];
let allNodes = [];
let all_atoms = [];
let image_used_counter = -1;
let re_render_canvas = false;
let atoms_to_be_deleted = [];
const three_parts_patten = /t_\d{1,3}_\d{1,3}/;
const two_parts_pattern = /^t_\d{2,3}$/;

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
    };
  };

  // helper function to rebase with the ketcher canvas data
  const fuelKetcherData = async () => {
    all_atoms = [];
    latestData = JSON.parse(await editor.structureDef.editor.getKet());
    allNodes = [...latestData.root.nodes];
    imagesList = allNodes.length > mols.length ? allNodes.filter(
      item => item.type === 'image'
    ) : imagesList;
    mols = allNodes.slice(0, allNodes.length - imagesList.length).map(i => i.$ref);
    mols.forEach((item) => latestData[item]?.atoms.map(i => all_atoms.push(i)));
    // console.log("DATA FUELED", { latestData, allNodes, imagesList, mols, decision: allNodes.length > mols.length });
  };

  // all logic implementation if move atom has an alias which passed three part regex
  const should_canvas_update_on_movement = (eventItem) => {
    const { id } = eventItem;
    const target_atom = all_atoms[id];
    if (target_atom) {
      return { exists: three_parts_patten.test(target_atom.alias), atom: target_atom };
    }
    return { exists: true, atom: target_atom };
  };

  // helper function to add event to stack
  const addEventToFILOStack = (event) => {
    if (!uniqueEvents.has(event)) {
      FILOStack.push(event);
      uniqueEvents.add(event);
    }
  };

  // main funcation to capture all events from editor
  const handleEventCapture = async (data) => {
    let allowed_to_process = true;
    const selection = editor._structureDef.editor.editor._selection;
    if (selection?.images) {
      addEventToFILOStack("Move image");
    }

    for (const eventItem of data) {
      switch (eventItem?.operation) {
        case "Load canvas":
          await fuelKetcherData();
          if (re_render_canvas)
            await moveTemplate();
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
          const { exists } = should_canvas_update_on_movement(eventItem);
          allowed_to_process = exists;
          addEventToFILOStack("Move atom");
          break;
        case "Delete image":
          console.log("delete image");
          // await editor._structureDef.editor.editor.undo();
          break;
        case 'Delete atom': {
          console.log("DELETE ATOM!!");
          const { atom } = should_canvas_update_on_movement(eventItem);
          if (eventItem.label == "Br") atoms_to_be_deleted.push(atom);
        } break;
        case 'Update': {
          // console.log({ Update: eventItem });
        } break;
        default:
          // console.warn("Unhandled operation:", eventItem.operation);
          break;
      }
    }

    if (allowed_to_process) {
      processFILOStack();
    } else {
      FILOStack = [];
      uniqueEvents = new Set();
      return;
    }
  };

  // helper function to ececute a stack: first in last out
  const processFILOStack = async () => {
    await fuelKetcherData();

    if (!latestData) {
      alert("data not present!!");
      return;
    }

    if (atoms_to_be_deleted.length) { // reduce template indentifier based on the deleted templates
      for (let i = 0; i < atoms_to_be_deleted.length; i++) {
        const item = atoms_to_be_deleted[i];
        await onEventDeleteAtom(item);
      }
      await editor.structureDef.editor.setMolecule(JSON.stringify(latestData));
      image_used_counter = image_used_counter - atoms_to_be_deleted.length;
      atoms_to_be_deleted = [];
    }

    const loadCanvasIndex = FILOStack.indexOf("Load canvas");
    if (loadCanvasIndex > -1) {
      FILOStack.splice(loadCanvasIndex, 1);
      uniqueEvents.delete("Load canvas");
    }

    while (FILOStack.length > 0) {
      const event = FILOStack.pop();
      uniqueEvents.delete(event);
      switch (event) {
        case "Load canvas":
          // nothing happens because it can lead to infinite canvas render
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
        case "Delete image":
          break;
        default:
          console.log("I'm default");
          // console.warn("Unhandled event:", event);
          break;
      }
    }
    // setTimeout(async () => {
    // await updateImagesInTheCanvas();
    // }, [250]);
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

  // helper function to move image and update molecule positions
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
                  z: 10000
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
    re_render_canvas = false;
    imagesList.length && placeImageOnAtoms(mols, imagesList);
  };

  // helper function to handle new atoms added to the canvas
  const handleAddAtom = async () => {
    console.log("Atom moved!");
    mols.forEach((mol) => {
      let is_h_id_list = [];
      const molecule = latestData[mol];
      molecule?.atoms.map((item, idx) => {
        if (item?.label === "H") is_h_id_list.push(idx);
        if (two_parts_pattern.test(item?.alias)) {
          const part_three = ++image_used_counter;
          item.alias += `_${part_three}`;
          const alias_splits = item.alias.split("_");
          if (!imagesList[part_three]) { // specifically for direction attachments
            latestData.root.nodes.push(prepareImageFromTemplateList(parseInt(alias_splits[1]), item.location));
          }
        }
      });
      if (is_h_id_list.length) {
        molecule.atoms?.splice(molecule.atoms.length - is_h_id_list.length, is_h_id_list.length);
        molecule.bonds?.splice(molecule.bonds.length - is_h_id_list.length, is_h_id_list.length);
      }
      latestData[mol] = molecule;
    });
    await editor.structureDef.editor.setMolecule(JSON.stringify(latestData));
    moveTemplate();
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

  // helper function to delete a template and reset the counter, assign new alias to all atoms
  const onEventDeleteAtom = async (atom) => {
    try {
      if (!mols.length) await fuelKetcherData();
      for (let m = 0; m < mols?.length; m++) {
        const mol = mols[m];
        const atoms = latestData[mol]?.atoms;
        for (let a = 0; a < atoms?.length; a++) {
          const item = atoms[a];
          if (three_parts_patten.test(item.alias)) {
            const atom_splits = atom?.alias?.split("_");
            const item_splits = item?.alias?.split("_");
            console.log(parseInt(atom_splits[2]), parseInt(item_splits[2]), parseInt(atom_splits[2]) <= parseInt(item_splits[2]));
            if (parseInt(atom_splits[2]) <= parseInt(item_splits[2])) {
              console.log("should be updated", item);
              const step_back = parseInt(item_splits[2]) - 1;
              const new_alias = `${item_splits[0]}_${item_splits[1]}_${step_back}`;
              atoms[a].alias = new_alias;
            }
          }
        }
      };
    } catch (err) {
      console.log({ err });
    };
  };

  const updateImagesInTheCanvas = async () => {
    if (iframeRef.current) {
      const iframeDocument = iframeRef.current.contentWindow.document;
      const svg = iframeDocument.querySelector('svg'); // Get the main SVG tag
      if (svg) {
        const images = svg.querySelectorAll('image'); // Select all image tags in SVG
        console.log({ images });
        images.forEach((img) => {
          svg.removeChild(img);
        });

        images.forEach((img) => {
          svg.appendChild(img);
        });
      } else {
        console.error("SVG element not found in the iframe.");
      }
    }
  };

  // helper function to add mutation oberservers to DOM elements
  const attachClickListeners = () => {
    const buttonEvents = {
      "[title='Clean Up \\(Ctrl\\+Shift\\+L\\)']": async () => {
        await fuelKetcherData();
        re_render_canvas = true;
      },
      "[title='Layout \\(Ctrl\\+L\\)']": async () => {
        alert("Layout");
        await fuelKetcherData();
        re_render_canvas = true;
      },
      "[title='Clear Canvas \\(Ctrl\\+Del\\)']": async () => {
        image_used_counter = -1;
      },
      "[title='Undo \\(Ctrl\\+Z\\)']": async () => {
        // await editor._structureDef.editor.editor.undo();
      },
      "[title='Redo \\(Ctrl\\+Shift\\+Z\\)']": async () => {
        // await editor._structureDef.editor.editor.redo();
      }
    };


    // update observers; nothing to be changed here!!
    if (iframeRef.current) {
      const iframeDocument = iframeRef.current.contentWindow.document;

      // Function to attach click listeners based on titles
      const attachListenerForTitle = (selector) => {
        const button = iframeDocument.querySelector(selector);
        if (button && !button.hasClickListener) {
          button.addEventListener('click', buttonEvents[selector]);
          button.hasClickListener = true;
        }
      };

      // Attach listeners only for relevant mutations (e.g., when a new button is added)
      const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            Object.keys(buttonEvents).forEach((selector) => {
              attachListenerForTitle(selector);
            });
          }
        }
      });

      // Start observing the iframe's document for changes
      observer.observe(iframeDocument, {
        childList: true,
        subtree: true,
      });

      // Fallback: Try to manually find buttons after some time, debounce the function
      const debounceAttach = setTimeout(() => {
        Object.keys(buttonEvents).forEach((title) => {
          attachListenerForTitle(title);
        });
      }, 1000);

      // Cleanup function
      return () => {
        observer.disconnect();
        clearTimeout(debounceAttach);
        Object.keys(buttonEvents).forEach((title) => {
          const button = iframeDocument.querySelector(`[title="${title}"]`);
          if (button) {
            button.removeEventListener('click', buttonEvents[title]);
          }
        });
      };
    };
  };

  const resetStore = () => {
    FILOStack = [];
    uniqueEvents = new Set();
    latestData = null;
    imagesList = [];
    mols = [];
    allNodes = [];
    image_used_counter = -1;
    re_render_canvas = false;
  };

  useEffect(() => {
    resetStore();
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener('load', attachClickListeners);
    }
    window.addEventListener('message', loadContent);
    return () => {
      if (iframe) {
        iframe.removeEventListener('load', attachClickListeners);
      }
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