/* eslint-disable react/require-default-props */
/* eslint-disable react/forbid-prop-types */
import PropTypes from 'prop-types';
import React, {
  useEffect, useRef, useImperativeHandle, forwardRef
} from 'react';
import {
  // patterns
  threePartsPattern,
  twoPartsPattern,

  // flags
  skipTemplateNameHide,
  skipImageLayering,
  ImagesToBeUpdated,
  allowProcessing,

  // methods
  hasKetcherData,
  addingPolymersToKetcher,
  prepareImageFromTemplateList,
  removeImageTemplateAtom,
  reAttachPolymerList,
  removeImagesFromData,

  // DOM Methods
  attachListenerForTitle,
  updateImagesInTheCanvas,
  updateTemplatesInTheCanvas,
  makeTransparentByTitle,

  // setters
  ImagesToBeUpdatedSetter,
  allowProcessingSetter,

  // tags
  inspiredLabel,
  molfileHeaderLinenumber,
} from 'src/utilities/Ketcher2SurfaceChemistryUtils';

export const FILOStack = []; // a stack to main a list of event triggered
export const uniqueEvents = new Set(); // list of unique event from the canvas
export let latestData = null; // latestData contains the updated ket2 format always
export let imagesList = []; // image list has all nodes matching type === image
export let mols = []; // mols has list of molecules present in ket2 format ['mol0', 'mol1']
export let allNodes = []; // contains a list of latestData.root.nodes list
export const allAtoms = []; // contains list of all atoms present in a ketche2 format
export let imageNodeCounter = -1; // counter of how many images are used/present in data.root.nodes
export let reloadCanvas = false; // flag to re-render canvas
export let canvaSelection = null; // contains list of images, atoms, bonds selected in the canvas
export let deletedAtoms = []; // has a list of deleted atoms on delete "atom event"

// to reset all data containers
export const resetStore = () => {
  FILOStack.length = 0;
  uniqueEvents.clear();
  latestData = null;
  imagesList = [];
  mols = [];
  allNodes = [];
  imageNodeCounter = -1;
  reloadCanvas = false;
  deletedAtoms = [];
  FILOStack.length = 0;
  allAtoms.length = 0;
};

// prepare/load ket2 format data
export const fuelKetcherData = async (data) => {
  allAtoms.length = 0;
  allNodes = [...data.root.nodes];
  imagesList = allNodes.filter((item) => item.type === 'image');
  const sliceEnd = Math.max(0, allNodes.length - imagesList.length);
  mols = sliceEnd > 0 ? allNodes.slice(0, sliceEnd).map((i) => i.$ref) : [];
  mols.forEach((item) => data[item]?.atoms.map((i) => allAtoms.push(i)));
};

// latestData setter
export const latestdataSetter = async (data) => {
  latestData = data;
};

// selection setter it can have images, atoms, bonds or anything selected in the canvas
export const canvaSelectionSetter = async (data) => {
  canvaSelection = data;
};

// image counter is strictly related and synced with how many images are there in the canvas
export const imageUsedCounterSetter = async (count) => {
  imageNodeCounter = count;
};

// when one/more atoms are selected and deleted this holds array of deleted atoms
export const deleteAtomListSetter = async (data) => {
  deletedAtoms = data;
};

/* istanbul ignore next */
// helper function to rebase with the ketcher canvas data
const fetchKetcherData = async (editor) => {
  try {
    if (!editor) throw new 'Editor instance is invalid'();
    latestData = JSON.parse(await editor.structureDef.editor.getKet());
    await fuelKetcherData(latestData);
  } catch (err) {
    console.error('fetchKetcherData', err.message);
  }
};

// helper function to remove images from the ketfile on atom move or manual atom move
export const moveTemplate = async () => {
  try {
    if (!latestData) await fetchKetcherData(editor);
    latestData.root.nodes = removeImagesFromData(latestData);
  } catch (err) {
    console.error('moveTemplate', err.message);
  }
};

// helper function set image coordinates
const adjustImageCoordinatesAtomDependent = (imageCoordinates, location, tempId) => ({
  ...imageCoordinates,
  x: location[0] - imageCoordinates.width / 2,
  y: location[1] + imageCoordinates.height / 2,
  z: 0,
  // x: location[0] - templateListData[tempId].boundingBox.width / 2,
  // y: location[1] + templateListData[tempId].boundingBox.height / 2,
  // height: templateListData[temp_id].boundingBox.height,
  // width: templateListData[temp_id].boundingBox.width,
});

// generates list of images with atom location based on alias present in ket2 format
export const placeImageOnAtoms = async (mols_, imagesList_) => {
  try {
    const imageListParam = imagesList_;
    mols_.forEach(async (item) => {
      latestData[item]?.atoms.forEach((atom) => {
        if (atom && threePartsPattern.test(atom?.alias)) {
          const aliasSplits = atom.alias.split('_');
          const imageCoordinates = imageListParam[aliasSplits[2]]?.boundingBox;
          if (!imageCoordinates) {
            throw new ('Invalid alias')();
          }
          const boundingBox = adjustImageCoordinatesAtomDependent(imageCoordinates, atom.location, aliasSplits[1]);
          imageListParam[aliasSplits[2]].boundingBox = boundingBox;
        }
      });
    });
    latestData.root.nodes = [...removeImagesFromData(latestData), ...imageListParam];
  } catch (err) {
    console.error('placeImageOnAtoms', err.message);
  }
};

// generating images for ket2 format from molfile polymers list
export const setKetcherData = async (polymerTag, data) => {
  const collectedImages = [];
  if (polymerTag && polymerTag.length) {
    const processedResponse = await addingPolymersToKetcher(polymerTag, mols, data, imageNodeCounter);
    imageNodeCounter = processedResponse.image_counter;
    processedResponse.molfileData?.root?.nodes.push(...processedResponse.c_images);
    return {
      collected_images: processedResponse.c_images,
      molfileData: processedResponse.molfileData
    };
  }
  return { collectedImages, molfileData: data };
};

// helper function to test alias list consistency 0,1,2,3,4...
export const isAliasConsistent = () => {
  const indicesList = [];
  const uniqueIndices = new Set();

  mols.forEach((mol) => {
    const molecule = latestData[mol];
    const atoms = molecule?.atoms;

    atoms?.forEach((item) => {
      if (item.alias) {
        const splits = item.alias.split('_');
        const index = parseInt(splits[2], 10);

        // Check for duplicates
        if (!uniqueIndices.has(index)) {
          uniqueIndices.add(index);
          indicesList.push(index);
        }
      }
    });
  });

  // for (const mol of mols) {
  //   const molecule = latestData[mol];
  //   const atoms = molecule?.atoms
  //     atoms.forEach((item) => {
  //       if (item.alias) {
  //         const splits = item.alias.split('_');
  //         const index = parseInt(splits[2]);

  //         // Check for duplicates
  //         if (uniqueIndices.has(index)) {
  //           return false; // Duplicate found
  //         }
  //         uniqueIndices.add(index);
  //         indicesList.push(index);
  //       }
  //     });
  // }

  indicesList.sort((a, b) => a - b);
  for (let i = 0; i < indicesList.length; i++) {
    if (indicesList[i] !== i) {
      return false; // Missing or incorrect number sequence
    }
  }
  return true; // Passed all checks
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
const addAtomAliasHelper = async (processedAtoms) => {
  try {
    const newImageNodes = [...imagesList];
    imageNodeCounter = processedAtoms.length - 1;
    for (let m = 0; m < mols.length; m++) {
      const mol = latestData[mols[m]];
      const removeableIndices = [];
      for (let a = 0; a < mol?.atoms?.length; a++) {
        const atom = mol.atoms[a];
        const splits = atom?.alias?.split('_');
        // label A with three part alias
        if (twoPartsPattern.test(atom.alias)) {
          imageNodeCounter += 1;
          if (!newImageNodes[imageNodeCounter]) {
            const img = prepareImageFromTemplateList(parseInt(splits[1]), atom.location);
            newImageNodes.push(img);
          }
          atom.alias += `_${imageNodeCounter}`;
          processedAtoms.push(`${m}_${a}_${imageNodeCounter}`);
        } else if (threePartsPattern.test(atom.alias)) {
          if (processedAtoms.indexOf(`${m}_${a}_${splits[2]}`) != -1) {
            // add image if image doesnt exists
            if (!newImageNodes[imageNodeCounter]) {
              const img = prepareImageFromTemplateList(parseInt(splits[1]), atom.location);
              newImageNodes.push(img);
            }
          } else {
            imageNodeCounter += 1;
            atom.alias = `t_${splits[1]}_${imageNodeCounter}`;
            processedAtoms.push(`${m}_${a}_${imageNodeCounter}`);
          }
        }
        if (atom.label === 'tbr') {
          removeableIndices.push(atom);
        }
      }
      if (removeableIndices.length) {
        mol.atoms?.splice(mol.atoms.length - removeableIndices.length, removeableIndices.length);
        mol.bonds?.splice(mol.bonds.length - removeableIndices.length, removeableIndices.length);
      }
    }
    const d = { ...latestData };
    const mols_list = removeImagesFromData(d);
    d.root.nodes = [...mols_list, ...newImageNodes];
    return { d, isConsistent: isAliasConsistent() };
  } catch (err) {
    console.error('addAtomAliasHelper', err.message);
  }
};

// IMP: helper function to handle new atoms added to the canvas
export const handleAddAtom = async () => {
  const processedAtoms = [];
  imageNodeCounter = -1;
  const seenThirdParts = new Set();

  for (let m = 0; m < mols.length; m++) {
    const mol = latestData[mols[m]];
    for (let a = 0; a < mol?.atoms?.length; a++) {
      const atom = mol.atoms[a];
      if (atom?.alias && threePartsPattern.test(atom?.alias)) {
        const splits = atom?.alias?.split('_');
        if (!seenThirdParts.has(splits[2])) {
          processedAtoms.push(`${m}_${a}_${splits[2]}`);
          seenThirdParts.add(splits[2]);
        }
      }
    }
  }
  return addAtomAliasHelper(processedAtoms);
};

// helper function to remove template by image
export const handleOnDeleteImage = async () => {
  mols = mols.filter((item) => item != null);
  if (canvaSelection) {
    const { images } = canvaSelection;
    if (images && images.length) {
      const { data, imageFoundIndexCount } = await removeImageTemplateAtom(new Set([...images]), mols, latestData);
      imageNodeCounter -= imageFoundIndexCount;
      return data;
    }
  }
  return latestData;
};

// helper function to remove template by atom with alias
export const handleOnDeleteAtom = async () => {
  try {
    const data = { ...latestData };
    deletedAtoms.forEach((item, _) => {
      if (threePartsPattern.test(item.alias)) {
        const deleted_splits = parseInt(item.alias.split('_')[2]);

        for (let m = 0; m < mols.length; m++) {
          const mol = data[mols[m]];
          if (mol && mol?.atoms) {
            const atoms = mol?.atoms || [];
            for (let i = 0; i < atoms.length; i++) {
              const atom = atoms[i];
              if (threePartsPattern.test(atom?.alias)) {
                const atom_splits = atom.alias.split('_');
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
    console.error('handleDelete!!', err.message);
  }
};

// function when a canvas is saved using main "SAVE" button
export const saveMolefile = async (svgElement, canvas_data_Mol) => {
  // molfile disection
  canvas_data_Mol = canvas_data_Mol.trim();
  const lines = ['', ...canvas_data_Mol.split('\n')];
  if (lines.length < 5) return { ket2Molfile: null, svgElement: null };
  const elements_info = lines[3];
  const all_templates_consumed = [];

  let [atoms_count, bonds_count] = elements_info.trim().split(' ').filter((i) => i != '');
  atoms_count = parseInt(atoms_count);
  bonds_count = parseInt(bonds_count);

  const extra_data_start = molfileHeaderLinenumber + atoms_count + bonds_count;

  const extra_data_end = lines.length - 1;

  for (let i = extra_data_start; i <= extra_data_end; i++) {
    const alias = lines[i];
    if (threePartsPattern.test(alias)) {
      const splits = parseInt(alias.split('_')[2]);
      if (imagesList[splits]) { // image found
        all_templates_consumed.push(parseInt(alias.split('_')[1]));
      }
    }
  }
  const ket2Molfile = await reAttachPolymerList({
    lines, atoms_count, extra_data_start, extra_data_end
  });
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
    // await moveTemplate();
    await saveMoveCanvas(null, true, false);
    // ----

    reloadCanvas = false; // no-rerender
    const mols_copy = mols;
    const imagelist_copy = imagesList;
    await fetchKetcherData(editor);
    // if (imagelist_copy.length) {
    await placeImageOnAtoms(mols_copy, imagelist_copy, editor);
    await saveMoveCanvas(null, true, false);
    // }
    ImagesToBeUpdatedSetter(true);
  }
};

/* istanbul ignore next */
// container function for onAddAtom
const onAddAtom = async (editor) => {
  if (editor && editor.structureDef) {
    await fetchKetcherData(editor);
    const { d, isConsistent } = await handleAddAtom();
    !isConsistent && console.error('Generated aliases are inconsistent. Please try reopening the canvas again.');
    isConsistent && await saveMoveCanvas(d, true, true);
    ImagesToBeUpdatedSetter(true);
  }
};

/* istanbul ignore next */
// container function for on image delete
const onDeleteImage = async (editor) => {
  if (editor && editor.structureDef && !deletedAtoms.length) {
    const data = await handleOnDeleteImage();
    await saveMoveCanvas(data, false, true);
  }
};

// remove a node from root.nodes by index num
const removeNodeByIndex = async (index) => {
  latestData.root.nodes.splice(index + mols.length, 1);
};

/* istanbul ignore next */
/* container function on atom delete
  removes an atom: atoms should always be consistent
    case1: when last(current count for image counter) image is deleted means aliases are consistent
    case1: when any image is deleted means aliases are in-consistent
*/
const onAtomDelete = async (editor) => {
  if (editor && editor.structureDef) {
    const mols_copy = mols;
    const imgList_copy = imagesList;
    if (threePartsPattern.test(deletedAtoms[0]?.alias)) {
      const last_alias_index = parseInt(deletedAtoms[0]?.alias?.split('_')[2]);
      await fetchKetcherData(editor);

      // when mol is deleted
      if (mols_copy.length > mols.length && imagesList.length == imgList_copy.length) { // when atom is dragged to another atom
        await fetchKetcherData(editor);
        await editor.structureDef.editor.setMolecule(JSON.stringify(latestData));
        deletedAtoms = [];
        canvaSelection = null;
        return;
      }

      // when mols and images are changed
      if (mols_copy.length > mols.length && imagesList.length > imgList_copy.length) {
        const data = await handleOnDeleteAtom(); // rebase atom aliases
        imageNodeCounter -= deletedAtoms.length; // update image used counter
        await saveMoveCanvas(data, false, true);
        deletedAtoms = [];
        canvaSelection = null;
        return;
      }

      // when one template is deleted
      if (mols_copy.length == mols.length && imagesList.length == imgList_copy.length) { // deleted item is one
        await removeNodeByIndex(last_alias_index);
      }

      // save and go
      const data = await handleOnDeleteAtom(); // rebase atom aliases
      imageNodeCounter -= deletedAtoms.length; // update image used counter
      await saveMoveCanvas(data, false, true);
      deletedAtoms = [];
      canvaSelection = null;
    }
  }
};

/* istanbul ignore next */
// savemolfile with source, should_fetch, should_move
const saveMoveCanvas = async (data, should_fetch, should_move) => {
  data = data || latestData;
  await editor.structureDef.editor.setMolecule(JSON.stringify(data));
  should_fetch && fetchKetcherData(editor);
  should_move && onTemplateMove(editor);
};

/* istanbul ignore next */
const KetcherEditor = forwardRef((props, ref) => {
  const {
    editor, iH, iS, molfile
  } = props;

  const iframeRef = useRef();
  const initMol = molfile || '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';

  // Handlers for each event operation, mapped by operation name;
  const eventOperationHandlers = {
    'Load canvas': async () => {
      await fetchKetcherData(editor);
      if (reloadCanvas) await onTemplateMove(editor);
    },
    'Move image': async (eventItem) => {
      console.log('move image', eventItem);
      addEventToFILOStack('Move image');
    },
    'Add atom': async (eventItem) => {
      console.log('Add atom', eventItem);
      addEventToFILOStack('Add atom');
    },
    'Upsert image': async (eventItem) => {
      console.log('Upsert image', eventItem);
      addEventToFILOStack('Upsert image');
    },
    'Move atom': async (eventItem) => {
      console.log('move atom', eventItem);
      const { exists } = should_canvas_update_on_movement(eventItem);
      allowProcessingSetter(exists);
      addEventToFILOStack('Move atom');
    },
    'Delete image': async (eventItem) => {
      console.log('Delete image', eventItem);
      addEventToFILOStack('Delete image');
    },
    'Delete atom': async (eventItem) => {
      console.log('Delete atom', eventItem);
      let atom_counter = -1;
      if (eventItem.label === inspiredLabel) {
        for (let m = 0; m < mols?.length; m++) {
          const mol = mols[m];
          const atoms = latestData[mol]?.atoms;
          for (let a = 0; a < atoms?.length; a++) {
            atom_counter++;
            if (atom_counter == eventItem.id) {
              deletedAtoms.push(atoms[a]);
            }
          }
        }
        addEventToFILOStack('Delete atom');
      }
    },
    Update: async (eventItem) => {
      console.log(eventItem, 'update');
    },
    'Move bond': async (eventItem) => {
      console.log(eventItem, 'bond');
    },
    'Move loop': async (eventItem) => {
      console.log(eventItem, 'loop');
    },
  };

  // action based on event-name
  const eventHandlers = {
    // await fetchKetcherData(editor);
    'Move image': async () => await onTemplateMove(editor),
    'Move atom': async () => {
      await fetchKetcherData(editor);
      await onTemplateMove(editor);
    },
    'Add atom': async () => await onAddAtom(editor),
    'Delete image': async () => {
      await fetchKetcherData(editor);
      await onDeleteImage(editor);
    },
    'Delete atom': async () => await onAtomDelete(editor),
  };

  // DOM button events with scope
  const buttonEvents = {
    "[title='Clean Up \\(Ctrl\\+Shift\\+L\\)']": async () => {
      await fetchKetcherData(editor);
      reloadCanvas = true;
    },
    "[title='Layout \\(Ctrl\\+L\\)']": async () => {
      await fetchKetcherData(editor);
      // await addEventToFILOStack("Move image");
      reloadCanvas = true;
      // addEventToFILOStack("Load canvas");
    },
    "[title='Calculate CIP  \\(Ctrl\\+P\\)']": async () => {
      await fetchKetcherData(editor);
      reloadCanvas = true;
    },
    "[title='Clear Canvas \\(Ctrl\\+Del\\)']": async () => {
      imageNodeCounter = -1;
      resetStore();
    },
    "[title='Undo \\(Ctrl\\+Z\\)']": async () => {
      try {
        const list = [...editor._structureDef.editor.editor.historyStack];
        const { historyPtr } = editor._structureDef.editor.editor;
        let opp_idx = 0;
        for (let i = historyPtr - 1; i >= 0; i--) {
          if (list[i]?.operations[0]?.type !== 'Load canvas') {
            break;
          } else {
            opp_idx++;
          }
        }
        for (let j = 0; j < opp_idx; j++) {
          await editor._structureDef.editor.editor.undo();
        }
        // await onTemplateMove(editor);
        // setTimeout(async () => {
        // await fetchKetcherData(editor);
        //   const data = await handleOnDeleteAtom(); // rebase atom aliases
        //   imageNodeCounter -= deletedAtoms.length; // update image used counter
        //   await saveMoveCanvas(data, false, true);
        // }, [500]);
      } catch (error) {
        console.error({ undo: error });
      }
    },
    "[title='Redo \\(Ctrl\\+Shift\\+Z\\)']": () => {
      try {
        const list = [...editor._structureDef.editor.editor.historyStack];
        const { historyPtr } = editor._structureDef.editor.editor;
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
        setTimeout(async () => {
          await fetchKetcherData(editor);
          const data = await handleAddAtom(); // rebase atom aliases
          await saveMoveCanvas(data, false, true);
        }, [500]);
      } catch (error) {
        console.error({ redo: error });
      }
      console.log('REDO', isAliasConsistent());
    },
    'Erase \\(Del\\)': async () => {
      // on click event is can be access is funcation eraseStateAlert
    },
    "[title='Add/Remove explicit hydrogens']": async () => {
      // TODO:pattern identify
      await fetchKetcherData(editor);
      reloadCanvas = true;
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
    editor._structureDef.editor.editor.subscribe('click', async () => {
      canvaSelection = editor._structureDef.editor.editor._selection;
    });
  };

  // Load the editor content and set up the molecule
  const loadContent = async (event) => {
    if (event.data.eventType === 'init') {
      window.editor = editor;
      if (editor && editor.structureDef) {
        onEditorContentChange(editor);
        const polymerTag = await hasKetcherData(initMol);
        const ketfile = await editor._structureDef.editor.indigo.convert(initMol).catch((err) => {
          console.error('invalid molfile. Please try again', err.message);
        });
        const fileContent = JSON.parse(ketfile.struct);

        // process polymers
        const { molfileData } = await setKetcherData(polymerTag, fileContent);
        saveMoveCanvas(molfileData, true, true);
      }
    }
  };

  // main function to capture all events from editor
  const handleEventCapture = async (data) => {
    const selection = editor._structureDef.editor.editor._selection;
    allowProcessingSetter(true);
    if (selection?.images) {
      await editor.structureDef.editor.setMolecule(JSON.stringify(latestData));
      await fetchKetcherData(editor);
      ImagesToBeUpdatedSetter(true);
      return;
    }

    for (const eventItem of data) {
      console.log(eventItem);
      const operationHandler = eventOperationHandlers[eventItem?.operation];
      if (operationHandler) {
        await operationHandler(eventItem);
      }
    }
    if (allowProcessing) {
      processFILOStack();
    } else {
      FILOStack.length = 0;
      uniqueEvents.clear();
    }
  };

  // all logic implementation if move atom has an alias which passed three part regex
  const should_canvas_update_on_movement = (eventItem) => {
    const { id } = eventItem;
    const target_atom = allAtoms[id];
    if (target_atom) {
      return { exists: threePartsPattern.test(target_atom.alias), atom: target_atom };
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
    const loadCanvasIndex = FILOStack.indexOf('Load canvas');
    if (loadCanvasIndex > -1) {
      FILOStack.splice(loadCanvasIndex, 1);
      uniqueEvents.delete('Load canvas');
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
    if (ImagesToBeUpdated && !skipImageLayering) {
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

        if (!skipTemplateNameHide) {
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

KetcherEditor.displayName = 'KetcherEditor';

export default KetcherEditor;
