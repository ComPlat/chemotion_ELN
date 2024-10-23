/* eslint-disable react/require-default-props */
/* eslint-disable react/forbid-prop-types */
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

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
let images_to_be_updated = false;
let new_atoms = [];

const skip_template_name_hide = false;
const skip_image_layering = false;
const [standard_height_cirlce, standard_width_circle] = [1.0250000000000006, 1.0250000000000006];
const [standard_height_square, standard_width_square] = [0.9750000000000001, 1.5749999999999986];

const template_list = [
  null,
  {
    "type": "image",
    "format": "image/svg+xml",
    "boundingBox": {
      "width": standard_width_circle,
      "height": standard_height_cirlce
    },
    "data": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj4NCiAgPGRlZnM+DQogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJncmFkMSIgY3g9IjUwJSIgY3k9IjUwJSIgcj0iNTAlIiBmeD0iNTAlIiBmeT0iNTAlIj4NCiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigyNTUsMjU1LDI1NSk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigwLDAsMCk7c3RvcC1vcGFjaXR5OjEiIC8+DQogICAgPC9yYWRpYWxHcmFkaWVudD4NCiAgPC9kZWZzPg0KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0idXJsKCNncmFkMSkiIC8+DQo8L3N2Zz4NCg=="
  },
  {
    "type": "image",
    "format": "image/svg+xml",
    "boundingBox": {
      "width": standard_width_square,
      "height": standard_height_square
    },
    "data": "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMzAwIDMwMCI+CiAgPHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIxNTAiIHk9IjgwIiByeD0iMjAiIHJ5PSIyMCIKICBzdHJva2U9IiMwMDAiIHN0cm9rZS13aWR0aD0iMTAiIGZpbGw9Ijc1NzA3MCIKICAvPgo8L3N2Zz4="
  }
];

const three_parts_patten = /t_\d{1,3}_\d{1,3}/;
const two_parts_pattern = /^t_\d{2,3}$/;

const KetcherEditor = forwardRef((props, ref) => {
  const { editor, iH, iS, molfile } = props;
  const iframeRef = useRef();
  let initMol = molfile || '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';

  // helper function to check file kind coming as source; this handles indigo and ketcherrails molfile
  // const molfileType = async (molfile) => {
  //   const lines = molfile.trim().split('\n');
  //   console.log(lines[0], "1111111111111111111");
  //   if (lines[1].indexOf("Ketcher") != -1) return { type: "ketcher", polymers_list_required: true };
  //   return { type: "ketcher", polymers_list_required: false };
  // };

  // helper function to examine the file coming ketcherrails
  const hasKetcherData = async (molfile) => {
    const indigo_converted_ket = await editor._structureDef.editor.indigo.convert(molfile);
    if (!molfile.includes("<PolymersList>")) return { struct: indigo_converted_ket.struct, rails_polymers_list: null };
    // when ketcher mofile and polymers exists
    const lines = molfile.trim().split('\n');
    let rails_polymers_list = -1;
    for (let i = lines.length - 1; i > -1; i--) {
      if (lines[i].indexOf("> <PolymersList>") != -1) {
        rails_polymers_list = lines[i + 1].trim();
        break;
      }
    }
    if (rails_polymers_list == -1) {
      return { struct: indigo_converted_ket.struct, rails_polymers_list: null };
    } else {
      // polymers list exists
      return { struct: indigo_converted_ket.struct, rails_polymers_list };
    }
  };

  // Load the editor content and set up the molecule
  const loadContent = async (event) => {
    if (event.data.eventType === 'init') {
      window.editor = editor;
      // const meta = await molfileType(initMol);
      const { struct, rails_polymers_list } = await hasKetcherData(initMol);
      await editor.structureDef.editor.setMolecule(struct);
      await setKetcherData({ rails_polymers_list });
      editor._structureDef.editor.editor.subscribe('change', async (eventData) => {
        const result = await eventData;
        handleEventCapture(result);
      });
    };
  };

  // helper function to process ketcherrails files and adding image to ketcher2 canvas
  const adding_polymers_ketcher_format = (rails_polymers_list) => {
    const p_items = rails_polymers_list.split(" ");
    // p_items-example:  10, 11s, 12, 13s
    let visited_atoms = 0;
    let collected_images = [];

    for (let m = 0; m < mols.length; m++) {
      const mol = latestData[mols[m]];
      for (let a = 0; a < mol.atoms.length; a++) {
        // if (p_items.length - 1 == visited_atoms) break;
        const atom = mol.atoms[a];
        const p_value = p_items[visited_atoms];
        if (atom.type === "rg-label" || three_parts_patten.test(atom.label)) {
          const select_template_type = p_value.includes("s") ? "02" : "01";
          latestData[mols[m]].atoms[a] = {
            "label": "A",
            "alias": `t_${select_template_type}_${++image_used_counter}`,
            "location": atom.location
          };
          const bb = template_list[parseInt(select_template_type)];
          bb.boundingBox = { ...bb.boundingBox, x: atom.location[0], y: atom.location[1], z: 0 };
          collected_images.push(bb);
          visited_atoms += 1;
        }
      }
    }
    return collected_images;
  };

  // helper function to process ketcher2 indigo file to add images to ketcher2 canvas
  const adding_polymers_indigo_molfile = () => {
    let collected_images = [];
    for (let m = 0; m < mols.length; m++) {
      const mol = latestData[mols[m]];
      for (let a = 0; a < mol.atoms.length; a++) {
        const atom = mol.atoms[a];
        const splits = atom?.label?.split("    ");
        if (splits && three_parts_patten.test(splits[0])) {
          atom.label = "A";
          atom.alias = splits[0];
          const alias_splits = splits[0].split("_");
          const bb = template_list[parseInt(alias_splits[1])];
          bb.boundingBox = { ...bb.boundingBox, x: atom.location[0], y: atom.location[1], z: 0 };
          collected_images.push(bb);
        }
      }
    }
    return collected_images;
  };

  // helper function to calculate counters for the ketcher2 setup based on file source type
  const setKetcherData = async ({ rails_polymers_list }) => {
    await fuelKetcherData();
    let collected_images = [];
    if (rails_polymers_list) {
      console.log("ketcher");
      collected_images = adding_polymers_ketcher_format(rails_polymers_list);
    } else { //type == "Indigo"
      console.log("Indigo");
      collected_images = adding_polymers_indigo_molfile();
    }
    latestData.root.nodes.push(...collected_images);
    await editor.structureDef.editor.setMolecule(JSON.stringify(latestData));
    await fuelKetcherData();
    await moveTemplate();
  };

  // helper function to rebase with the ketcher canvas data
  const fuelKetcherData = async (data) => {
    all_atoms = [];
    latestData = data ? JSON.parse(await editor.structureDef.editor.getKet(data)) : JSON.parse(await editor.structureDef.editor.getKet());
    allNodes = [...latestData.root.nodes];
    imagesList = allNodes.length > mols.length ? allNodes.filter(
      item => item.type === 'image'
    ) : imagesList;
    mols = allNodes.slice(0, allNodes.length - imagesList.length).map(i => i.$ref);
    mols.forEach((item) => latestData[item]?.atoms.map(i => all_atoms.push(i)));
    // image_used_counter = imagesList.length > 0 ? imagesList.length - 1 : image_used_counter;
    // console.log("DATA FUELED", { image_used_counter, latestData, allNodes, imagesList, mols, decision: allNodes.length > mols.length });
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
        case "Set atom attribute":
        case "Add atom":
          if (two_parts_pattern.test(eventItem.to) || eventItem.label == "A") {
            new_atoms.push(eventItem);
          }
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
          if (eventItem.label == "A") atoms_to_be_deleted.push(atom);
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
      return; // FIXME: return added for testing
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
    if (images_to_be_updated && !skip_image_layering) {
      setTimeout(async () => {
        await updateImagesInTheCanvas();
      }, [250]);
    }
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
              // molecule.atoms[atom_idx].location = location; // enable this is you want to handle location based on images 
              molecule.atoms[atom_idx].alias = item.alias.trim();
              if (molecule?.stereoFlagPosition) {
                molecule.stereoFlagPosition = {
                  x: location[0],
                  y: location[1],
                  z: 0
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
    images_to_be_updated = true;
    imagesList.length && placeImageOnAtoms(mols, imagesList);
  };

  const checkAliasMatch = (aliasInput, aliasSet) => {
    // Get the last part of the input alias
    const inputLastPart = aliasInput.split('_').pop();

    for (let alias of aliasSet) {
      const aliasLastPart = alias.split('_').pop();  // Get the last part of each alias in the set
      if (aliasLastPart === inputLastPart) {
        return true;
      }
    }
    return false;
  };
  // helper function to handle new atoms added to the canvas
  const handleAddAtom = async () => {
    console.log("Atom moved!");
    await fuelKetcherData();

    let atom_id_counter = -1;
    let new_images = [];
    const all_three_alias_collection = new Set();

    for (let m = 0; m < mols.length; m++) {
      const mol = latestData[mols[m]];
      const is_h_id_list = [];
      for (let a = 0; a < mol.atoms.length; a++) {
        const atom = mol.atoms[a];
        atom_id_counter++;
        const splits = atom?.alias?.split("_");

        // label A with three part alias
        if (atom.label === "A" && three_parts_patten.test(atom.alias) && splits.length == 3) {
          // console.warn({ three: splits, all_three_alias_collection, all_three_alias_collection });
          if (checkAliasMatch(atom.alias, all_three_alias_collection)) {
            console.log("EXISTS");
            ++image_used_counter;
            atom.alias = `t_${splits[1]}_${image_used_counter}`;
            // console.log("THREE", { imagesList }, imagesList.length - 1, image_used_counter);
            if (imagesList.length - 1 < image_used_counter) {
              console.log("neu bild ist gebraucht.");
              const img = prepareImageFromTemplateList(parseInt(splits[1]), atom.location);
              new_images.push(img);
            }
          } else {
            if (image_used_counter === -1 && !imagesList.length) {
              const img = prepareImageFromTemplateList(parseInt(splits[1]), atom.location);
              new_images.push(img);
              image_used_counter++;
            }
          }
          all_three_alias_collection.add(atom.alias);
        }
        // label A with two part alias n
        else if (atom.label === "A" && two_parts_pattern.test(atom.alias) && splits.length == 2) {
          console.warn({ two: splits, atom, all_three_alias_collection });
          atom.alias += `_${++image_used_counter}`;
          console.log("TWO", { imagesList }, imagesList.length - 1, image_used_counter);
          if (imagesList.length - 1 < image_used_counter) {
            const img = prepareImageFromTemplateList(parseInt(splits[1]), atom.location);
            new_images.push(img);
          }
          all_three_alias_collection.add(atom.alias);
        }
        else if (atom.label === "H") is_h_id_list.push(atom);
        else {
          console.error("dead zone!!");
        }
      }
      if (is_h_id_list.length) {
        mol.atoms?.splice(mol.atoms.length - is_h_id_list.length, is_h_id_list.length);
        mol.bonds?.splice(mol.bonds.length - is_h_id_list.length, is_h_id_list.length);
      }
    }
    // };
    const d = { ...latestData };
    d.root.nodes = [...d.root.nodes, ...new_images];
    console.log({ data: d, all_three_alias_collection });
    new_atoms = [];
    await editor.structureDef.editor.setMolecule(JSON.stringify(latestData));
    moveTemplate();
  };

  // helper function to return a new image in imagesList with a location
  const prepareImageFromTemplateList = (idx, location) => {
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

  // helper function to update DOM images using layering technique 
  const updateImagesInTheCanvas = async () => {
    if (iframeRef.current) {
      const iframeDocument = iframeRef.current.contentWindow.document;
      const svg = iframeDocument.querySelector('svg'); // Get the main SVG tag
      if (svg) {
        const imageElements = iframeDocument.querySelectorAll('image'); // Select all text elements
        imageElements.forEach((img) => {
          svg.removeChild(img);
        });

        imageElements.forEach((img) => {
          svg.appendChild(img);
        });
      } else {
        console.error("SVG element not found in the iframe.");
      }
      images_to_be_updated = false;
    }
  };

  // helper funcation to update text > span > t_###_### fill transparent
  const updateTemplatesInTheCanvas = async () => {
    if (iframeRef.current) {
      const iframeDocument = iframeRef.current.contentWindow.document;
      const svg = iframeDocument.querySelector('svg'); // Get the main SVG tag
      if (svg) {
        const textElements = svg.querySelectorAll('text'); // Select all text elements
        textElements.forEach((textElem) => {
          const textContent = textElem.textContent; // Get the text content of the <text> element
          if (textContent === "A") { // Check if it matches the pattern
            textElem.setAttribute('fill', 'transparent'); // Set fill to transparent
          }
        });
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

    // Function to attach click listeners based on titles
    const attachListenerForTitle = (iframeDocument, selector) => {
      const button = iframeDocument.querySelector(selector);
      if (button && !button.hasClickListener) {
        button.addEventListener('click', buttonEvents[selector]);
        button.hasClickListener = true;
      }
    };

    // Main function to attach listeners and observers
    if (iframeRef.current) {
      const iframeDocument = iframeRef.current.contentWindow.document;

      // Attach MutationObserver to listen for relevant DOM mutations (e.g., new buttons added)
      const observer = new MutationObserver(async (mutationsList) => {
        for (const mutation of mutationsList) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            Object.keys(buttonEvents).forEach((selector) => {
              attachListenerForTitle(iframeDocument, selector);
            });
          }
        }

        if (!skip_template_name_hide) {
          await updateTemplatesInTheCanvas();
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
          attachListenerForTitle(iframeDocument, title);
        });
      }, 1000);

      // Cleanup function
      return () => {
        observer.disconnect();
        pathObserver.disconnect(); // Disconnect the path observer
        clearTimeout(debounceAttach);
        Object.keys(buttonEvents).forEach((title) => {
          const button = iframeDocument.querySelector(`[title="${title}"]`);
          if (button) {
            button.removeEventListener('click', buttonEvents[title]);
          }
        });
      };
    }
  };

  // funcation to reset all data containers
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

  // ref functions when a canvas is saved using main "SAVE" button
  useImperativeHandle(ref, () => ({
    getData: () => {
      return "hallo";
    },
    onSaveFileK2SC: async () => {
      await fuelKetcherData();

      // molfile disection
      const canvas_data_Mol = await editor.structureDef.editor.getMolfile();
      const lines = canvas_data_Mol.split('\n');
      const elements_info = lines[3];
      const header_starting_from = 4;

      let [atoms_count, bonds_count] = elements_info.trim().split(" ").filter(i => i != "");
      atoms_count = parseInt(atoms_count);
      bonds_count = parseInt(bonds_count);
      const extra_data_start = header_starting_from + atoms_count + bonds_count;
      const extra_data_end = lines.length - 2;

      for (let i = extra_data_start; i < extra_data_end; i++) {
        const alias = lines[i];
        if (three_parts_patten.test(alias)) {
          const splits = parseInt(alias.split("_")[2]);
          if (imagesList[splits]) { // image found
            const { boundingBox } = imagesList[splits];
            if (boundingBox) {
              const { width, height } = boundingBox;
              lines[i] += `    ${height}    ${width}`;
            }
          }
        }
      }

      const iframeDocument = iframeRef.current.contentWindow.document;
      const svg = iframeDocument.querySelector('svg'); // Get the main SVG tag
      const imageElements = iframeDocument.querySelectorAll('image');
      imageElements.forEach((img) => {
        svg.removeChild(img);
      });

      imageElements.forEach((img) => {
        const width = img.getAttribute('width');
        const height = img.getAttribute('height');
        const x = img.getAttribute('x');
        const y = img.getAttribute('y');
        const newImg = document.createElementNS('http://www.w3.org/2000/svg', 'image');

        newImg.setAttribute('x', x);
        newImg.setAttribute('y', y);
        newImg.setAttribute('width', width);
        newImg.setAttribute('height', height);
        newImg.setAttribute('href', img.getAttribute('href'));
        svg.appendChild(newImg);
      });

      const svgElement = new XMLSerializer().serializeToString(svg);
      return { ket2Molfile: reAttachPolymerList({ lines, atoms_count, extra_data_start, extra_data_end }), svgElement };
    }
  }));

  const reAttachPolymerList = ({ lines, atoms_count, extra_data_start, extra_data_end }) => {
    const ploy_identifier = "> <PolymersList>";
    let my_lines = [...lines];
    const atom_with_alias_list = [];
    let list_alias = my_lines.slice(extra_data_start, extra_data_end);
    const atom_starts = 4;
    for (let i = atom_starts; i < atoms_count + atom_starts; i++) {
      const atom_line = lines[i].split(" ");
      const idx = atom_line.indexOf("A");
      if (idx != -1) {
        atom_line[idx] = "R#";
        console.log(i);
        atom_with_alias_list.push(`${i - atom_starts}`);
      }
      my_lines[i] = atom_line.join(" ");
    }
    my_lines.splice(extra_data_start, extra_data_end - extra_data_start);
    let counter = 0;

    for (let i = 1; i < list_alias.length; i += 2) {
      const t_id = list_alias[i].split("    ")[0].split("_")[1];
      if (t_id) {
        atom_with_alias_list[counter] += t_id == '02' ? "s" : "";
        counter++;
      }
    }
    my_lines.splice(my_lines.length - 1, 0, ...[ploy_identifier, atom_with_alias_list.join(" "), "$$$$"]);
    return my_lines.join("\n");
  };

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
});

KetcherEditor.propTypes = {
  molfile: PropTypes.string,
  editor: PropTypes.object.isRequired,
  iH: PropTypes.string.isRequired,
  iS: PropTypes.object.isRequired,
};

export default KetcherEditor;

