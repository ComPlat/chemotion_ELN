/* eslint-disable react/require-default-props */
/* eslint-disable react/forbid-prop-types */
import PropTypes from 'prop-types';
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  // data stores
  template_list_data,

  // patterns
  three_parts_pattern,
  two_parts_pattern,

  // flags
  skip_template_name_hide,
  skip_image_layering,
  images_to_be_updated,
  allowed_to_process,

  // methods
  hasKetcherData,
  adding_polymers_ketcher_format,
  prepareImageFromTemplateList,
  removeImageTemplateAtom,
  reAttachPolymerList,

  // DOM Methods
  attachListenerForTitle,
  updateImagesInTheCanvas,
  updateTemplatesInTheCanvas,
  makeTransparentByTitle,

  // setters
  images_to_be_updated_setter,
  allowed_to_process_setter,

  // tags
  inspired_label,
  molfile_header_line_number,
} from '../../utilities/Ketcher2SurfaceChemistryUtils';

export let FILOStack = []; // a stack to main a list of event triggered
export let uniqueEvents = new Set(); // list of unique event from the canvas
export let latestData = null; // latestData contains the updated ket2 format always
export let imagesList = []; // image list has all nodes matching type === image
export let mols = []; // mols has list of molecules present in ket2 format ['mol0', 'mol1']
export let allNodes = []; // contains a list of latestData.root.nodes list
export let all_atoms = []; // contains list of all atoms present in a ketche2 format
export let image_used_counter = -1; // counter of how many images are used/present in data.root.nodes
export let re_render_canvas = false; // flag to re-render canvas
export let _selection = null; // contains list of images, atoms, bonds selected in the canvas
export let deleted_atoms_list = []; // has a list of deleted atoms on delete "atom event"

// to reset all data containers
export const resetStore = () => {
  FILOStack = [];
  uniqueEvents = new Set();
  latestData = null;
  imagesList = [];
  mols = [];
  allNodes = [];
  image_used_counter = -1;
  re_render_canvas = false;
  deleted_atoms_list = [];
  FILOStack = [];
  uniqueEvents = new Set();
  all_atoms = [];
};

// prepare/load ket2 format data
export const fuelKetcherData = async (data) => {
  allNodes = [...data.root.nodes];
  imagesList = allNodes.filter(item => item.type === 'image');
  const sliceEnd = Math.max(0, allNodes.length - imagesList.length);
  mols = sliceEnd > 0 ? allNodes.slice(0, sliceEnd).map(i => i.$ref) : [];
  mols.forEach((item) => data[item]?.atoms.map(i => all_atoms.push(i)));
};

// latestData setter
export const latestdataSetter = async data => {
  latestData = data;
};

// selection setter it can have images, atoms, bonds or anything selected in the canvas
export const _selectionSetter = async data => {
  _selection = data;
};

// image counter is strictly related and synced with how many images are there in the canvas
export const imageUsedCounterSetter = async count => {
  image_used_counter = count;
};

// when one/more atoms are selected and deleted this holds array of deleted atoms
export const deleteAtomListSetter = async data => {
  deleted_atoms_list = data;
};

/* istanbul ignore next */
// helper function to rebase with the ketcher canvas data
const fetchKetcherData = async (editor) => {
  if (editor) {
    all_atoms = [];
    latestData = JSON.parse(await editor.structureDef.editor.getKet());
    await fuelKetcherData(latestData);
  }
};

// helper function to remove images from the ketfile on atom move or manual atom move
export const moveTemplate = async () => {
  try {
    if (!latestData) await fetchKetcherData(editor);
    latestData.root.nodes = latestData?.root?.nodes?.slice(0, mols.length);
  } catch (err) {
    console.error("moveTemplate", err.message);
  }
};

// helper function set image coordinates
const adjustImageCoordinatesAtomDependent = (image_coordinates, location, temp_id) => {
  return {
    ...image_coordinates,
    x: location[0] - image_coordinates?.width / 2,
    y: location[1] + image_coordinates?.height / 2,
    z: 0,
    height: template_list_data[temp_id].boundingBox.height,
    width: template_list_data[temp_id].boundingBox.width,
  };
};

// generates list of images with atom location based on alias present in ket2 format
export const placeImageOnAtoms = async (mols_, imagesList_) => {
  try {
    mols_.forEach(async (item) => {
      latestData[item]?.atoms.forEach((atom) => {
        if (atom && three_parts_pattern.test(atom?.alias)) {
          const splits_alias = atom.alias.split("_");
          let image_coordinates = imagesList_[parseInt(splits_alias[2])]?.boundingBox;
          if (!image_coordinates) throw new ("Invalid alias");
          imagesList_[splits_alias[2]].boundingBox = adjustImageCoordinatesAtomDependent(image_coordinates, atom.location, parseInt(splits_alias[1]));;
        };
      });
    });
    latestData.root.nodes = [...latestData.root.nodes.slice(0, mols_.length), ...imagesList_];
  } catch (err) {
    console.error("placeImageOnAtoms", err.message);
  }
};

// generating images for ket2 format from molfile polymers list
export const setKetcherData = async (rails_polymers_list, data) => {
  let collected_images = [];
  if (rails_polymers_list && rails_polymers_list.length) {
    const { c_images, molfileData, image_counter } = await adding_polymers_ketcher_format(rails_polymers_list, mols, data, image_used_counter);
    image_used_counter = image_counter;
    molfileData?.root?.nodes.push(...c_images);
    return { collected_images: c_images, molfileData };
  }
  return { collected_images, molfileData: data };
};

// helper function to test alias list consistency 0,1,2,3,4...
export const isAliasConsistent = () => {
  const index_list = [];
  const uniqueIndices = new Set();

  for (const mol of mols) {
    const molecule = latestData[mol];
    molecule?.atoms?.forEach((item) => {
      if (item.alias) {
        const splits = item.alias.split("_");
        const index = parseInt(splits[2]);

        // Check for duplicates
        if (uniqueIndices.has(index)) {
          return false;  // Duplicate found
        }
        uniqueIndices.add(index);
        index_list.push(index);
      }
    });
  }

  index_list.sort((a, b) => a - b);
  for (let i = 0; i < index_list.length; i++) {
    if (index_list[i] !== i) {
      return false;  // Missing or incorrect number sequence
    }
  }
  return true; // Passed all checks
};

// IMP: helper function to handle new atoms added to the canvas
export const handleAddAtom = async () => {
  let already_processed = [];
  image_used_counter = -1;
  const seenThirdParts = new Set();

  for (let m = 0; m < mols.length; m++) {
    const mol = latestData[mols[m]];
    for (let a = 0; a < mol?.atoms?.length; a++) {
      const atom = mol.atoms[a];
      if (atom?.alias && three_parts_pattern.test(atom?.alias)) {
        const splits = atom?.alias?.split("_");
        if (!seenThirdParts.has(splits[2])) {
          already_processed.push(`${m}_${a}_${splits[2]}`);
          seenThirdParts.add(splits[2]);
        }
      }
    }
  }
  return await addAtomAliasHelper(already_processed);
};

/* IMP: helper function when new atom is added or rebase for alias
-> Two parts => t_01 => will always be new template added from the template list
-> Three parts => t_templateid_used_image_counter
  ----- possible cases
-> two part with image -> is an event when a new template is added to canvas as new molecule
-> two parts with no image -> is an event when a new template is directly added to other molecule
-> three part with image -> can be a regular case when an atom with 3 three part aliases is pasted on canvas or can a saved template
-> three part without image -> in case there the canvas is not synced an image is there
  ----- notes
-> tbr -> flag means this atom has to removed from the list coming from the template
-> isAliasConsistent before returning -> is a function to make sure all aliases generated are in order 0,1,2,3,4,5,6...
*/
const addAtomAliasHelper = async (already_processed) => {
  try {
    let new_images = [...imagesList];
    image_used_counter = already_processed.length - 1;
    for (let m = 0; m < mols.length; m++) {
      const mol = latestData[mols[m]];
      const is_h_id_list = [];
      for (let a = 0; a < mol?.atoms?.length; a++) {
        const atom = mol.atoms[a];
        const splits = atom?.alias?.split("_");
        // label A with three part alias
        if (two_parts_pattern.test(atom.alias)) {
          image_used_counter += 1;
          if (!new_images[image_used_counter]) {
            const img = prepareImageFromTemplateList(parseInt(splits[1]), atom.location);
            new_images.push(img);
          }
          atom.alias += `_${image_used_counter}`;
          already_processed.push(`${m}_${a}_${image_used_counter}`);
        } else if (three_parts_pattern.test(atom.alias)) {
          if (already_processed.indexOf(`${m}_${a}_${splits[2]}`) != -1) {
            // add image if image doesnt exists
            if (!new_images[image_used_counter]) {
              const img = prepareImageFromTemplateList(parseInt(splits[1]), atom.location);
              new_images.push(img);
            }
          } else {
            image_used_counter += 1;
            atom.alias = `t_${splits[1]}_${image_used_counter}`;
            already_processed.push(`${m}_${a}_${image_used_counter}`);
          }
        }
        if (atom.label === "tbr") {
          is_h_id_list.push(atom);
        };
      }
      if (is_h_id_list.length) {
        mol.atoms?.splice(mol.atoms.length - is_h_id_list.length, is_h_id_list.length);
        mol.bonds?.splice(mol.bonds.length - is_h_id_list.length, is_h_id_list.length);
      }
    }
    const d = { ...latestData };
    const mols_list = d.root.nodes.slice(0, mols.length);
    d.root.nodes = [...mols_list, ...new_images];
    return { d, isConsistent: isAliasConsistent() };
  } catch (err) {
    console.error("addAtomAliasHelper", err.message);
  }
};

// helper function to remove template by image
export const handleOnDeleteImage = async () => {
  mols = mols.filter(item => item != null);
  if (_selection) {
    const { images } = _selection;
    if (images && images.length) {
      let { data, imageFoundIndexCount } = await removeImageTemplateAtom(new Set([...images]), mols, latestData);
      image_used_counter -= imageFoundIndexCount;
      return data;
    }
  }
  return latestData;
};

// helper function to remove template by atom with alias
export const handleOnDeleteAtom = async () => {
  try {
    const data = { ...latestData };
    deleted_atoms_list.forEach((item, _) => {
      if (three_parts_pattern.test(item.alias)) {
        const deleted_splits = parseInt(item.alias.split("_")[2]);

        for (let m = 0; m < mols.length; m++) {
          const mol = data[mols[m]];
          if (mol && mol?.atoms) {
            const atoms = mol?.atoms || [];
            for (let i = 0; i < atoms.length; i++) {
              const atom = atoms[i];
              if (three_parts_pattern.test(atom?.alias)) {
                const atom_splits = atom.alias.split("_");
                if (parseInt(atom_splits[2]) > deleted_splits) {
                  atom.alias = `t_${atom_splits[1]}_${parseInt(atom_splits[2]) - 1}`;
                }
              }
            }
            data[mols[m]].atoms = atoms;
          }
        }
      }
    });
    return data;
  } catch (err) {
    console.error("handleDelete!!", err.message);
  }
};

// function when a canvas is saved using main "SAVE" button
export const saveMolefile = async (svgElement, canvas_data_Mol) => {
  // molfile disection
  canvas_data_Mol = canvas_data_Mol.trim();
  const lines = ["", ...canvas_data_Mol.split('\n')];
  if (lines.length < 5) return { ket2Molfile: null, svgElement: null };

  const elements_info = lines[3];
  const header_starting_from = molfile_header_line_number;
  const all_templates_consumed = [];

  let [atoms_count, bonds_count] = elements_info.trim().split(" ").filter(i => i != "");
  atoms_count = parseInt(atoms_count);
  bonds_count = parseInt(bonds_count);
  const extra_data_start = header_starting_from + atoms_count + bonds_count;
  const extra_data_end = lines.length - 2;
  for (let i = extra_data_start; i < extra_data_end; i++) {
    const alias = lines[i];
    if (three_parts_pattern.test(alias)) {
      const splits = parseInt(alias.split("_")[2]);
      if (imagesList[splits]) { // image found
        all_templates_consumed.push(parseInt(alias.split("_")[1]));
      }
    }
  }

  const ket2Molfile = await reAttachPolymerList({ lines, atoms_count, extra_data_start, extra_data_end });
  return { ket2Molfile, svgElement };
};

/* istanbul ignore next */
// helper funcation for saving mofile => re-layering images from iframe
const reArrangeImagesOnCanvas = async (iframeRef) => {
  const iframeDocument = iframeRef.current.contentWindow.document;
  const svg = iframeDocument.querySelector('svg'); // Get the main SVG tag
  const imageElements = iframeDocument.querySelectorAll('image');

  imageElements.forEach((img) => {
    svg.removeChild(img);
  });

  imageElements.forEach((img) => {
    // const temp_num = all_templates_consumed[idx];
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
  return svgElement;
};

/* istanbul ignore next */
// container funcation for templatemove
const onTemplateMove = async (editor) => {
  if (editor && editor.structureDef) {
    // set atom stereo
    await moveTemplate();
    await saveMoveCanvas(null, true, false);
    // ----

    re_render_canvas = false; // no-rerender
    const mols_copy = mols;
    const imagelist_copy = imagesList;
    await fetchKetcherData(editor);
    if (imagelist_copy.length) {
      await placeImageOnAtoms(mols_copy, imagelist_copy, editor);
      await saveMoveCanvas(null, true, false);
    }
    images_to_be_updated_setter(true);
  }
};

/* istanbul ignore next */
// container function for onAddAtom
const onAddAtom = async (editor) => {
  if (editor && editor.structureDef) {
    await fetchKetcherData(editor);
    const { d, isConsistent } = await handleAddAtom();
    !isConsistent && console.error("Generated aliases are inconsistent. Please try reopening the canvas again.");
    isConsistent && await saveMoveCanvas(d, true, true);
    images_to_be_updated_setter(true);
  }
};

/* istanbul ignore next */
// container function for on image delete
const onDeleteImage = async (editor) => {
  if (editor && editor.structureDef && !deleted_atoms_list.length) {
    const data = await handleOnDeleteImage();
    await saveMoveCanvas(data, false, true);
  }
};

// remove a node from root.nodes by index num
const removeNodeByIndex = async (index) => {
  latestData.root.nodes.splice(index + mols.length, 1);
};

// helper to check is generated alias already exists in latestData
const aliasExists = (index) => {
  for (const molKey of mols) {
    const molecule = latestData[molKey];
    if (!molecule || !molecule.atoms) continue;
    const atoms = molecule.atoms;
    for (const atom of atoms) {
      if (three_parts_pattern.test(atom.alias)) {
        const atom_index = parseInt(atom.alias.split("_")[2]);
        if (index == atom_index) return true;
      }
    }
  }
  return false;
};

/* istanbul ignore next */
/* container function on atom delete
  removes an atom: atoms should always be consistent
    case1: when last(current count for image counter) image is deleted means aliases are consistent
    case1: when any image is deleted means aliases are in-consistent
*/
const onAtomDelete = async (editor) => {
  if (editor && editor.structureDef) {
    await fetchKetcherData(editor);
    if (three_parts_pattern.test(deleted_atoms_list[0]?.alias)) {
      const last_alias_index = parseInt(deleted_atoms_list[0]?.alias?.split("_")[2]);
      if (deleted_atoms_list.length == 1) { // deleted item is one
        // aliases are not consistent
        if (!isAliasConsistent()) {
          await removeNodeByIndex(last_alias_index);
        }
        // alias are consistent; which means last index is deleted
        else if (isAliasConsistent())
          if (image_used_counter == last_alias_index && !aliasExists(last_alias_index)) { // remove image required
            await removeNodeByIndex(last_alias_index);
          } else { // an atom is dropped on another atom so just save it as it is!
            await editor.structureDef.editor.setMolecule(JSON.stringify(data));
            deleted_atoms_list = [];
            return;
          }
      }
      const data = await handleOnDeleteAtom(); // rebase atom aliases
      image_used_counter -= deleted_atoms_list.length; // update image used counter
      await saveMoveCanvas(data, false, true);
      deleted_atoms_list = [];
    }
  }
};

/* istanbul ignore next */
// savemolfile with source, should_fetch, should_move
const saveMoveCanvas = async (data, should_fetch, should_move) => {
  data = data ? data : latestData;
  await editor.structureDef.editor.setMolecule(JSON.stringify(data));
  should_fetch && fetchKetcherData(editor);
  should_move && onTemplateMove(editor);
};

/* istanbul ignore next */
const KetcherEditor = forwardRef((props, ref) => {
  const { editor, iH, iS, molfile } = props;

  const iframeRef = useRef();
  let initMol = molfile || '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';

  // Handlers for each event operation, mapped by operation name;
  const eventOperationHandlers = {
    "Load canvas": async () => {
      await fetchKetcherData(editor);
      if (re_render_canvas) await onTemplateMove(editor);
    },
    "Move image": async (_) => {
      addEventToFILOStack("Move image");
    },
    "Add atom": async (_) => {
      addEventToFILOStack("Add atom");
    },
    "Upsert image": async (_) => {
      addEventToFILOStack("Upsert image");
    },
    "Move atom": async (eventItem) => {
      const { exists } = should_canvas_update_on_movement(eventItem);
      allowed_to_process_setter(exists);
      addEventToFILOStack("Move atom");
    },
    "Delete image": async (_) => {
      addEventToFILOStack("Delete image");
    },
    "Delete atom": async (eventItem) => {
      let atom_counter = -1;
      if (eventItem.label === inspired_label) {
        for (let m = 0; m < mols?.length; m++) {
          const mol = mols[m];
          const atoms = latestData[mol]?.atoms;
          for (let a = 0; a < atoms?.length; a++) {
            atom_counter++;
            if (atom_counter == eventItem.id) {
              deleted_atoms_list.push(atoms[a]);
            }
          }
        }
        addEventToFILOStack("Delete atom");
      }
    },
    "Update": async (_) => { },
  };

  // action based on event-name
  const eventHandlers = {
    'Move image': async () => await onTemplateMove(editor),
    'Move atom': async () => await onTemplateMove(editor),
    'Add atom': async () => await onAddAtom(editor),
    'Delete image': async () => await onDeleteImage(editor),
    'Delete atom': async () => await onAtomDelete(editor),
  };

  // DOM button events with scope
  const buttonEvents = {
    "[title='Clean Up \\(Ctrl\\+Shift\\+L\\)']": async () => {
      await fetchKetcherData(editor);
      re_render_canvas = true;
    },
    "[title='Layout \\(Ctrl\\+L\\)']": async () => {
      await fetchKetcherData(editor);
      re_render_canvas = true;
    },
    "[title='Clear Canvas \\(Ctrl\\+Del\\)']": async () => {
      image_used_counter = -1;
      resetStore();
    },
    "[title='Undo \\(Ctrl\\+Z\\)']": () => {
      try {
        const list = [...editor._structureDef.editor.editor.historyStack];
        const historyPtr = editor._structureDef.editor.editor.historyPtr;
        let opp_idx = 0;
        for (let i = historyPtr - 1; i >= 0; i--) {
          if (list[i]?.operations[0]?.type !== 'Load canvas') {
            break;
          } else {
            opp_idx++;
          }
        }
        for (let j = 0; j < opp_idx; j++) {
          editor._structureDef.editor.editor.undo();
        }
      } catch (error) {
        console.error({ undo: error });
      }
    },
    "[title='Redo \\(Ctrl\\+Shift\\+Z\\)']": () => {
      try {
        const list = [...editor._structureDef.editor.editor.historyStack];
        const historyPtr = editor._structureDef.editor.editor.historyPtr;
        let opp_idx = 1;

        for (let i = historyPtr; i < list.length; i++) {
          if (list[i]?.operations[0]?.type !== 'Load canvas') {
            break;
          } else {
            opp_idx++;
          }
        }
        for (let j = 0; j < opp_idx; j++) {
          editor._structureDef.editor.editor.redo();
        }
      } catch (error) {
        console.error({ redo: error });
      }
    },
    'Erase \\(Del\\)': async () => {
      // on click event is can be access is funcation eraseStateAlert
    },
    "[title='Add/Remove explicit hydrogens']": async () => {
      // TODO:pattern identify
      await fetchKetcherData(editor);
      re_render_canvas = true;
    },
  };

  useEffect(() => {
    resetStore();
    if (editor && editor.structureDef) {
      const iframe = iframeRef.current;
      if (iframe) {
        iframe.addEventListener('load', attachClickListeners); // DOM change listener
      }
      window.addEventListener('message', loadContent); // molfile intializer

      return () => {
        if (iframe) {
          iframe.removeEventListener('load', attachClickListeners);
        }
        window.removeEventListener('message', loadContent);
      };
    }
  }, [editor]);

  // enable editor change listener
  const onEditorContentChange = (editor) => {
    editor._structureDef.editor.editor.subscribe('change', async (eventData) => {
      const result = await eventData;
      handleEventCapture(result);
    });
    editor._structureDef.editor.editor.subscribe('click', async (_) => {
      _selection = editor._structureDef.editor.editor._selection;
    });
  };

  // Load the editor content and set up the molecule
  const loadContent = async (event) => {
    if (event.data.eventType === 'init') {
      window.editor = editor;
      if (editor && editor.structureDef) {
        onEditorContentChange(editor);
        const rails_polymers_list = await hasKetcherData(initMol);
        const ketfile = await editor._structureDef.editor.indigo.convert(initMol).catch((err) => {
          alert("invalid molfile. Please try again");
          console.error(err);
        });
        const file_content = JSON.parse(ketfile.struct);

        // process polymers
        const { molfileData } = await setKetcherData(rails_polymers_list, file_content);
        saveMoveCanvas(molfileData, true, true);
      }
    };
  };

  // main function to capture all events from editor
  const handleEventCapture = async (data) => {
    const selection = editor._structureDef.editor.editor._selection;
    allowed_to_process_setter(true);
    if (selection?.images) {
      await editor.structureDef.editor.setMolecule(JSON.stringify(latestData));
      await fetchKetcherData(editor);
      images_to_be_updated_setter(true);
      return;
    }

    for (const eventItem of data) {
      const operationHandler = eventOperationHandlers[eventItem?.operation];
      if (operationHandler) {
        await operationHandler(eventItem);
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

  // all logic implementation if move atom has an alias which passed three part regex
  const should_canvas_update_on_movement = (eventItem) => {
    const { id } = eventItem;
    const target_atom = all_atoms[id];
    if (target_atom) {
      return { exists: three_parts_pattern.test(target_atom.alias), atom: target_atom };
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

  // helper function to ececute a stack: first in last out
  const processFILOStack = async () => {
    await fetchKetcherData(editor);
    const loadCanvasIndex = FILOStack.indexOf("Load canvas");
    if (loadCanvasIndex > -1) {
      FILOStack.splice(loadCanvasIndex, 1);
      uniqueEvents.delete("Load canvas");
    }
    while (FILOStack.length > 0) {
      const event = FILOStack.pop();
      uniqueEvents.delete(event);
      if (eventHandlers[event]) {
        await eventHandlers[event]();
      }
    }
    await runImageLayering(); // pused all the image at the end of the canvas
  };

  // pused all the image at the end of the canvas
  const runImageLayering = async () => {
    if (images_to_be_updated && !skip_image_layering) {
      setTimeout(async () => {
        await updateImagesInTheCanvas(iframeRef);
      }, [500]);
    }
  };

  // helper function to add mutation oberservers to DOM elements
  const attachClickListeners = () => {
    // Main function to attach listeners and observers
    if (iframeRef.current) {
      const iframeDocument = iframeRef.current.contentWindow.document;

      // Attach MutationObserver to listen for relevant DOM mutations (e.g., new buttons added)
      const observer = new MutationObserver(async (mutationsList) => {
        for (const mutation of mutationsList) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            Object.keys(buttonEvents).forEach((selector) => {
              attachListenerForTitle(iframeDocument, selector, buttonEvents);
              attachListenerForTitle(iframeDocument, selector, buttonEvents);
              makeTransparentByTitle(iframeDocument);
              // attachEraseButtonListener();
            });
          }
        }

        if (!skip_template_name_hide) {
          await updateTemplatesInTheCanvas(iframeRef);
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

  // ref functions when a canvas is saved using main "SAVE" button
  useImperativeHandle(ref, () => ({
    onSaveFileK2SC: async () => {
      await fetchKetcherData(editor);
      const canvasDataMol = await editor.structureDef.editor.getMolfile();
      const svgElement = await reArrangeImagesOnCanvas(iframeRef);
      const result = await saveMolefile(svgElement, canvasDataMol);
      resetStore();
      return result;
    }
  }));

  return (
    <div>
      <iframe
        ref={iframeRef}
        id={editor?.id}
        src={editor?.extSrc}
        title={editor?.label}
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