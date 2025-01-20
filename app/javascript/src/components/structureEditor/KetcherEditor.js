/* eslint-disable no-underscore-dangle */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
/* eslint-disable radix */
/* eslint-disable no-use-before-define */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
/* eslint-disable import/no-mutable-exports */
import PropTypes from 'prop-types';
import React, {
  useEffect, useRef, useImperativeHandle, forwardRef
} from 'react';
import {
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

  // constants
  ALIAS_PATTERNS,
  LAYERING_FLAGS,
  KET_TAGS,

  // flags
  ImagesToBeUpdated,
  allowProcessing,
} from 'src/utilities/Ketcher2SurfaceChemistryUtils';

export const FILOStack = []; // a stack to main a list of event triggered
export const uniqueEvents = new Set(); // list of unique event from the canvas
export let latestData = null; // latestData contains the updated ket2 format always
export let imagesList = []; // image list has all nodes matching type === image
export let mols = []; // mols has list of molecules present in ket2 format ['mol0', 'mol1']
export let allNodes = []; // contains a list of latestData.root.nodes list
export const allAtoms = []; // contains list of all atoms present in a ketcher2 format
export let imageNodeCounter = -1; // counter of how many images are used/present in data.root.nodes
export let reloadCanvas = false; // flag to re-render canvas
export let canvasSelection = null; // contains list of images, atoms, bonds selected in the canvas
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
export const loadKetcherData = async (data) => {
  allAtoms.length = 0;
  allNodes = [...data.root.nodes];
  imagesList = allNodes.filter((item) => item.type === 'image');
  const sliceEnd = Math.max(0, allNodes.length - imagesList.length);
  mols = sliceEnd > 0 ? allNodes.slice(0, sliceEnd).map((i) => i.$ref) : [];
  mols.forEach((item) => data[item]?.atoms.map((i) => allAtoms.push(i)));
};

// latestData setter
export const latestDataSetter = async (data) => {
  latestData = data;
};

// selection setter it can have images, atoms, bonds or anything selected in the canvas
export const canvasSelectionSetter = async (data) => {
  canvasSelection = data;
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
    await loadKetcherData(latestData);
  } catch (err) {
    console.error('fetchKetcherData', err.message);
  }
};

// helper function to remove images from the ket file on atom move or manual atom move
export const moveTemplate = async () => {
  try {
    // if (!latestData) await fetchKetcherData(editor);
    latestData.root.nodes = removeImagesFromData(latestData);
  } catch (err) {
    console.error('moveTemplate', err.message);
  }
};

// helper function set image coordinates
const adjustImageCoordinatesAtomDependent = (imageCoordinates, location) => ({
  ...imageCoordinates,
  x: location[0] - imageCoordinates.width / 2,
  y: location[1] + imageCoordinates.height / 2,
  z: 0,
});

// generates list of images with atom location based on alias present in ket2 format
export const placeImageOnAtoms = async (mols_, imagesList_) => {
  try {
    const imageListParam = imagesList_;
    mols_.forEach(async (item) => {
      latestData[item]?.atoms.forEach((atom) => {
        if (atom && ALIAS_PATTERNS.threeParts.test(atom?.alias)) {
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
    const processedResponse = await addingPolymersToKetcher(polymerTag, data, imageNodeCounter);
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

  mols.forEach((mol) => {
    const molecule = latestData[mol];
    const atoms = molecule?.atoms;

    atoms?.forEach((item) => {
      if (item.alias) {
        const splits = item.alias.split('_');
        const index = parseInt(splits[2], 10);

        // Check for duplicates
        if (indicesList.indexOf(index) === -1) {
          indicesList.push(index);
        }
      }
    });
  });

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
      const removableIndices = [];
      for (let a = 0; a < mol?.atoms?.length; a++) {
        const atom = mol.atoms[a];
        const splits = atom?.alias?.split('_');
        // label A with three part alias
        if (ALIAS_PATTERNS.twoParts.test(atom.alias)) {
          imageNodeCounter += 1;
          if (!newImageNodes[imageNodeCounter]) {
            // eslint-disable-next-line no-await-in-loop
            const img = await prepareImageFromTemplateList(parseInt(splits[1]), atom.location);
            newImageNodes.push(img);
          }
          atom.alias += `_${imageNodeCounter}`;
          processedAtoms.push(`${m}_${a}_${imageNodeCounter}`);
        } else if (ALIAS_PATTERNS.threeParts.test(atom.alias)) {
          if (processedAtoms.indexOf(`${m}_${a}_${splits[2]}`) !== -1) {
            // add image if image doesn't exists
            if (!newImageNodes[imageNodeCounter]) {
              // eslint-disable-next-line no-await-in-loop
              const img = await prepareImageFromTemplateList(parseInt(splits[1]), atom.location);
              newImageNodes.push(img);
            }
          } else {
            imageNodeCounter += 1;
            atom.alias = `t_${splits[1]}_${imageNodeCounter}`;
            processedAtoms.push(`${m}_${a}_${imageNodeCounter}`);
          }
        }
        if (atom.label === 'tbr') {
          removableIndices.push(atom);
        }
      }
      if (removableIndices.length) {
        mol.atoms?.splice(mol.atoms.length - removableIndices.length, removableIndices.length);
        mol.bonds?.splice(mol.bonds.length - removableIndices.length, removableIndices.length);
      }
    }
    const d = { ...latestData };
    const molsList = removeImagesFromData(d);
    d.root.nodes = [...molsList, ...newImageNodes];
    return { d, isConsistent: isAliasConsistent() };
  } catch (err) {
    console.error('addAtomAliasHelper', err.message);
    return null;
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
      if (atom?.alias && ALIAS_PATTERNS.threeParts.test(atom?.alias)) {
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
  if (canvasSelection) {
    const { images } = canvasSelection;
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
    deletedAtoms.forEach((item) => {
      if (ALIAS_PATTERNS.threeParts.test(item.alias)) {
        const deletedSplits = parseInt(item.alias.split('_')[2]);

        for (let m = 0; m < mols.length; m++) {
          const mol = data[mols[m]];
          if (mol && mol?.atoms) {
            const atoms = mol?.atoms || [];
            for (let i = 0; i < atoms.length; i++) {
              const atom = atoms[i];
              if (ALIAS_PATTERNS.threeParts.test(atom?.alias)) {
                const atomSplits = atom.alias.split('_');
                if (parseInt(atomSplits[2]) > deletedSplits) {
                  atom.alias = `t_${atomSplits[1]}_${parseInt(atomSplits[2]) - 1}`;
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
    return null;
  }
};

// function when a canvas is saved using main "SAVE" button
export const saveMolfile = async (svgElement, canvasData) => {
  const editorData = canvasData.trim();
  const lines = ['', ...editorData.split('\n')];
  if (lines.length < 5) return { ket2Molfile: null, svgElement: null };
  const elementsInfo = lines[3];
  const templatesConsumed = [];

  const headers = elementsInfo.trim().split(' ').filter((i) => i !== '');
  const atomsCount = parseInt(headers[0]);
  const bondsCount = parseInt(headers[1]);

  const additionalDataStart = KET_TAGS.molfileHeaderLinenumber + atomsCount + bondsCount;

  const additionalDataEnd = lines.length - 1;

  for (let i = additionalDataStart; i <= additionalDataEnd; i++) {
    const alias = lines[i];
    if (ALIAS_PATTERNS.threeParts.test(alias)) {
      const splits = parseInt(alias.split('_')[2]);
      if (imagesList[splits]) { // image found
        templatesConsumed.push(parseInt(alias.split('_')[1]));
      }
    }
  }
  const ket2Molfile = await reAttachPolymerList({
    lines, atomsCount, additionalDataStart, additionalDataEnd
  });
  return { ket2Molfile, svgElement };
};

/* istanbul ignore next */
// helper function for saving molfile => re-layering images from iframe
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
// save molfile with source, should_fetch, should_move
const saveMoveCanvas = async (editor, data, isFetchRequired, isMoveRequired) => {
  const dataCopy = data || latestData;
  if (editor) {
    await editor.structureDef.editor.setMolecule(JSON.stringify(dataCopy));
    if (isFetchRequired) {
      fetchKetcherData(editor);
    }

    if (isMoveRequired) {
      onTemplateMove(editor);
    }
  } else {
    console.error('Editor is undefined');
  }
};

/* istanbul ignore next */
// container function for template move
const onTemplateMove = async (editor) => {
  if (editor && editor.structureDef) {
    await saveMoveCanvas(editor, null, true, false);
    const molCopy = mols;
    const imageListCopy = imagesList;
    await fetchKetcherData(editor);
    await placeImageOnAtoms(molCopy, imageListCopy, editor);
    await saveMoveCanvas(editor, null, true, false);
    ImagesToBeUpdatedSetter(true);
  }
};

/* istanbul ignore next */
// container function for onAddAtom
const onAddAtom = async (editor) => {
  if (editor && editor.structureDef) {
    await fetchKetcherData(editor);
    const { d, isConsistent } = await handleAddAtom();
    if (!isConsistent) {
      console.error('Generated aliases are inconsistent. Please try reopening the canvas again.');
      return null;
    }
    await saveMoveCanvas(editor, d, true, true);
    ImagesToBeUpdatedSetter(true);
  }
  return null;
};

/* istanbul ignore next */
// container function for on image delete
const onDeleteImage = async (editor) => {
  if (editor && editor.structureDef && !deletedAtoms.length) {
    const data = await handleOnDeleteImage();
    await saveMoveCanvas(editor, data, false, true);
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
    const molCopy = mols;
    const imageListCopy = imagesList;
    if (ALIAS_PATTERNS.threeParts.test(deletedAtoms[0]?.alias)) {
      const lastAliasInd = parseInt(deletedAtoms[0]?.alias?.split('_')[2]);
      await fetchKetcherData(editor);

      // when mol is deleted
      if (molCopy.length > mols.length && imagesList.length === imageListCopy.length) { // when atom is dragged to another atom
        // await editor.structureDef.editor.setMolecule(JSON.stringify(latestData));
        deletedAtoms = [];
        canvasSelection = null;
        return;
      }

      // when mols and images are changed
      if (molCopy.length > mols.length && imagesList.length > imageListCopy.length) {
        const data = await handleOnDeleteAtom(); // rebase atom aliases
        imageNodeCounter -= deletedAtoms.length; // update image used counter
        await saveMoveCanvas(editor, data, false, true);
        deletedAtoms = [];
        canvasSelection = null;
        return;
      }

      // when one template is deleted
      if (molCopy.length === mols.length && imagesList.length === imageListCopy.length) { // deleted item is one
        await removeNodeByIndex(lastAliasInd);
      }

      // save and go
      const data = await handleOnDeleteAtom(); // rebase atom aliases
      imageNodeCounter -= deletedAtoms.length; // update image used counter
      await saveMoveCanvas(editor, data, false, true);
      deletedAtoms = [];
      canvasSelection = null;
    }
  }
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
    'Move image': async () => {
      console.log('Move image');
      addEventToFILOStack('Move image');
    },
    'Add atom': async () => {
      console.log('atom added?');
      addEventToFILOStack('Add atom');
    },
    'Upsert image': async () => {
      console.log('Upsert image');
      addEventToFILOStack('Upsert image');
    },
    'Move atom': async (eventItem) => {
      console.log('Move atom');
      const { exists } = isCanvasUpdateRequiredOnMove(eventItem);
      allowProcessingSetter(exists);
      addEventToFILOStack('Move atom');
    },
    'Delete image': async () => {
      console.log('Delete image');
      addEventToFILOStack('Delete image');
    },
    'Delete atom': async (eventItem) => {
      console.log('Delete atom');
      let atomCount = -1;
      if (eventItem.label === KET_TAGS.inspiredLabel) {
        for (let m = 0; m < mols?.length; m++) {
          const mol = mols[m];
          const atoms = latestData[mol]?.atoms;
          for (let a = 0; a < atoms?.length; a++) {
            atomCount++;
            if (atomCount === eventItem.id) {
              deletedAtoms.push(atoms[a]);
            }
          }
        }
        addEventToFILOStack('Delete atom');
      }
    },
    Update: async () => {
      console.log('update');
    },
    'Move bond': async () => {
    },
    'Move loop': async () => {
    },
  };

  // action based on event-name
  const eventHandlers = {
    'Move image': async () => onTemplateMove(editor),
    'Move atom': async () => {
      await fetchKetcherData(editor);
      await onTemplateMove(editor);
    },
    'Add atom': async () => onAddAtom(editor),
    'Delete image': async () => {
      await fetchKetcherData(editor);
      await onDeleteImage(editor);
    },
    'Delete atom': async () => onAtomDelete(editor),
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
        let operationIdx = 0;
        for (let i = historyPtr - 1; i >= 0; i--) {
          if (list[i]?.operations[0]?.type !== 'Load canvas') {
            break;
          } else {
            operationIdx++;
          }
        }
        for (let j = 0; j < operationIdx; j++) {
          editor._structureDef.editor.editor.undo();
        }
      } catch (error) {
        console.error({ undo: error });
      }
    },
    "[title='Redo \\(Ctrl\\+Shift\\+Z\\)']": () => {
      try {
        const list = [...editor._structureDef.editor.editor.historyStack];
        const { historyPtr } = editor._structureDef.editor.editor;
        let operationIdx = 1;

        for (let i = historyPtr; i < list.length; i++) {
          if (list[i]?.operations[0]?.type !== 'Load canvas') {
            break;
          } else {
            operationIdx++;
          }
        }
        for (let j = 0; j < operationIdx; j++) {
          editor._structureDef.editor.editor.redo();
        }
        setTimeout(async () => {
          await fetchKetcherData(editor);
          const data = await handleAddAtom(); // rebase atom aliases
          await saveMoveCanvas(editor, data, false, true);
        }, [500]);
      } catch (error) {
        console.error({ redo: error });
      }
    },
    'Erase \\(Del\\)': async () => {
      // on click event is can be access is function eraseStateAlert
    },
    "[title='Add/Remove explicit hydrogens']": async () => {
      // TODO:pattern identify
      await fetchKetcherData(editor);
      reloadCanvas = true;
    },
  };

  useEffect(() => {
    resetStore();
    let iframe = null;
    if (editor && editor.structureDef) {
      iframe = iframeRef.current;
      if (iframe) {
        iframe.addEventListener('load', attachClickListeners); // DOM change listener
      }
      window.addEventListener('message', loadContent); // molfile initializer
    }
    return () => {
      if (iframe) {
        iframe.removeEventListener('load', attachClickListeners);
      }
      window.removeEventListener('message', loadContent);
    };
  }, [editor]);

  // enable editor change listener
  const onEditorContentChange = () => {
    editor._structureDef.editor.editor.subscribe('change', async (eventData) => {
      const result = await eventData;
      handleEventCapture(result);
    });
    editor._structureDef.editor.editor.subscribe('click', async () => {
      canvasSelection = editor._structureDef.editor.editor._selection;
    });
  };

  // Load the editor content and set up the molecule
  const loadContent = async (event) => {
    if (event.data.eventType === 'init') {
      window.editor = editor;
      if (editor && editor.structureDef) {
        onEditorContentChange(editor);
        const polymerTag = await hasKetcherData(initMol);
        const ketFile = await editor._structureDef.editor.indigo.convert(initMol).catch((err) => {
          console.error('invalid molfile. Please try again', err.message);
        });
        const fileContent = JSON.parse(ketFile.struct);

        // process polymers
        const { molfileData } = await setKetcherData(polymerTag, fileContent);
        saveMoveCanvas(editor, molfileData, true, true);
      }
    }
  };

  // helper function to execute a stack: first in last out
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
        // eslint-disable-next-line no-await-in-loop
        await eventHandlers[event]();
      }
    }
    await runImageLayering(); // add all the images at the end of the canvas
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
    // eslint-disable-next-line no-restricted-syntax
    for (const eventItem of data) {
      const operationHandler = eventOperationHandlers[eventItem?.operation];
      if (operationHandler) {
        // eslint-disable-next-line no-await-in-loop
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
  const isCanvasUpdateRequiredOnMove = (eventItem) => {
    const { id } = eventItem;
    const targetAtom = allAtoms[id];
    if (targetAtom) {
      return { exists: ALIAS_PATTERNS.threeParts.test(targetAtom.alias), atom: targetAtom };
    }
    return { exists: true, atom: targetAtom };
  };

  // add all the images at the end of the canvas
  const runImageLayering = async () => {
    if (ImagesToBeUpdated && !LAYERING_FLAGS.skipImageLayering) {
      setTimeout(async () => {
        await updateImagesInTheCanvas(iframeRef);
      }, [500]);
    }
  };

  // helper function to add event to stack
  const addEventToFILOStack = (event) => {
    if (!uniqueEvents.has(event)) {
      FILOStack.push(event);
      uniqueEvents.add(event);
    }
  };

  // helper function to add mutation observers to DOM elements
  const attachClickListeners = () => {
    // Main function to attach listeners and observers
    if (iframeRef.current) {
      const iframeDocument = iframeRef.current.contentWindow.document;

      // Attach MutationObserver to listen for relevant DOM mutations (e.g., new buttons added)
      const observer = new MutationObserver(async (mutationsList) => {
        await Promise.all(
          mutationsList.map(async (mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              await Promise.all(
                Object.keys(buttonEvents).map(async (selector) => {
                  await attachListenerForTitle(iframeDocument, selector, buttonEvents);
                  makeTransparentByTitle(iframeDocument);
                  // attachEraseButtonListener();
                })
              );
            }
          })
        );

        if (!LAYERING_FLAGS.skipTemplateName) {
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
    return null;
  };

  // ref functions when a canvas is saved using main "SAVE" button
  useImperativeHandle(ref, () => ({
    onSaveFileK2SC: async () => {
      await fetchKetcherData(editor);
      const canvasDataMol = await editor.structureDef.editor.getMolfile();
      const svgElement = await reArrangeImagesOnCanvas(iframeRef);
      const result = await saveMolfile(svgElement, canvasDataMol);
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
