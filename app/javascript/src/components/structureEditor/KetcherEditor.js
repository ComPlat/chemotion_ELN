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
  useEffect, useRef, useImperativeHandle, forwardRef,
  useState
} from 'react';
import {
  // methods
  hasKetcherData,
  prepareImageFromTemplateList,
  removeImagesFromData,
  addPolymerTags,
  addTextNodeDescriptionOnTextPopup,
  addTextNodes,
  arrangePolymers,
  arrangeTextNodes,
  assembleTextDescriptionFormula,
  hasTextNodes,
  isAliasConsistent,
  onAddAtom,
  onAddText,
  onDeleteImage,
  onDeleteText,
  placeImageOnAtoms,
  placeTextOnAtoms,
  reArrangeImagesOnCanvas,
  redoKetcher,
  removeTextFromData,
  undoKetcher,

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
  fetchSurfaceChemistryImageData,

  buttonClickForRectangleSelection,
  collectMissingAliases,
  deepCompare,
  deepCompareNumbers,
  deepCompareContent,
  removeImageTemplateAtom,
  handleOnDeleteAtom,
  reArrangeImagesOnCanvasViaKetcher
} from 'src/utilities/Ketcher2SurfaceChemistryUtils';
import {
  PolymerListIconKetcherToolbarButton,
  PolymerListModal,
  rescaleToolBarButoon
} from 'src/components/structureEditor/PolymerListModal';

export let FILOStack = []; // a stack to main a list of event triggered
export const uniqueEvents = new Set(); // list of unique event from the canvas
export let latestData = null; // latestData contains the updated ket2 format always
export let imagesList = []; // image list has all nodes matching type === image
export let mols = []; // mols has list of molecules present in ket2 format ['mol0', 'mol1']
export let allNodes = []; // contains a list of latestData.root.nodes list
export let allAtoms = []; // contains list of all atoms present in a ketcher2 format
export let imageNodeCounter = -1; // counter of how many images are used/present in data.root.nodes
export let reloadCanvas = false; // flag to re-render canvas
export let canvasSelection = null; // contains list of images, atoms, bonds selected in the canvas
export let deletedAtoms = []; // has a list of deleted atoms on delete "atom event"
export let textList = []; // contains a list of original images when tool bar buttons are called
export let textNodeStruct = {}; // contains a list of original text when tool bar buttons are called
export let allTemplates = {};
// local
let oldImagePack = [];
let selectedImageForTextNode = null;
let imageListCopyContainer = [];
let textListCopyContainer = [];

// to reset all data containers
export const resetStore = () => {
  uniqueEvents.clear();
  latestData = null;
  imagesList = [];
  mols = [];
  allNodes = [];
  imageNodeCounter = -1;
  reloadCanvas = false;
  deletedAtoms = [];
  FILOStack = [];
  allAtoms = [];
  imageListCopyContainer = [];
  textListCopyContainer = [];
};

// prepare/load ket2 format data
export const loadKetcherData = async (data) => {
  allAtoms = [];
  allNodes = [...data.root.nodes];
  imagesList = allNodes.filter((item) => item.type === 'image');
  textList = allNodes.filter((item) => item.type === 'text');
  const sliceEnd = Math.max(0, allNodes.length - imagesList.length - textList.length);
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

export const imageNodeForTextNodeSetter = async (data) => {
  selectedImageForTextNode = data;
};

export const templateListSetter = async (data) => {
  allTemplates = data;
};

export const TextListSetter = async (data) => {
  textList = data;
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
export const fetchKetcherData = async (editor) => {
  try {
    if (!editor) throw new 'Editor instance is invalid'();
    latestData = JSON.parse(await editor.structureDef.editor.getKet());
    await loadKetcherData(latestData);
  } catch (err) {
    console.error('fetchKetcherData', err.message);
  }
};

const fetchTemplateList = async () => {
  try {
    const response = await fetch('/json/surfaceChemistryShapes.json'); // Path to your JSON file
    const templateListStorage = await response.json(); // Parse the JSON response
    return templateListStorage;
  } catch (error) {
    console.error('Error fetching the JSON data:', error); // Handle any errors
    return [];
  }
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
  console.log('addAtomAliasHelper');
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
    return { d: null, isConsistent: false };
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

const countLessThan = (set, number) => {
  let count = 0;

  for (const value of set) {
    if (value < number) {
      count++;
    }
  }

  return count;
};

/* istanbul ignore next */
// save molfile with source, should_fetch, should_move
export const saveMoveCanvas = async (editor, data, isFetchRequired, isMoveRequired, recenter = false) => {
  const dataCopy = data || latestData;
  if (editor) {
    // if (recenter || (latestData && !imagesList.length)) {
    //   await editor.structureDef.editor.setMolecule(JSON.stringify(dataCopy), false);
    // } else {
    //   await editor.structureDef.editor.setMolecule(JSON.stringify(dataCopy), false);
    // }
    if (recenter) {
      await editor.structureDef.editor.setMolecule(JSON.stringify(dataCopy), true);
    } else {
      await editor.structureDef.editor.setMolecule(JSON.stringify(dataCopy), false);
    }

    if (isFetchRequired) {
      fetchKetcherData(editor);
    }

    if (isMoveRequired) {
      onTemplateMove(editor, recenter);
    }
  } else {
    console.error('Editor is undefined');
  }
};

/* istanbul ignore next */
// container function for template move
const onTemplateMove = async (editor, recenter = false) => {
  if (!editor || !editor.structureDef) return;

  // for tool bar button events
  if (!recenter && (imageListCopyContainer.length || textListCopyContainer.length)) {
    recenter = true;
  }

  // first fetch to save values
  await fetchKetcherData(editor);

  const molCopy = mols;
  const imageListCopy = imageListCopyContainer.length ? imageListCopyContainer : imagesList;
  const textListCopy = textListCopyContainer.length ? textListCopyContainer : textList;

  // second fetch save and place
  await fetchKetcherData(editor);

  const imageNodes = await placeImageOnAtoms(molCopy, imageListCopy);
  latestData.root.nodes = imageNodes;
  const textNodes = await placeTextOnAtoms(molCopy, textListCopy);
  latestData.root.nodes = textNodes;
  await saveMoveCanvas(editor, latestData, true, false, recenter);

  // clear required
  ImagesToBeUpdatedSetter(true); // perform image layer in DOM
  reloadCanvas = false; // stop load canvas
  imageListCopyContainer = [];
  textListCopyContainer = [];
  deletedAtoms = [];
};

/* istanbul ignore next */
/* container function on atom delete
  removes an atom: atoms should always be consistent
    case1: when last(current count for image counter) image is deleted means aliases are consistent
    case1: when any image is deleted means aliases are in-consistent
*/
const onAtomDelete = async (editor) => {
  try {
    if (!editor || !editor.structureDef) return;
    const listOfAliasesBefore = await collectMissingAliases();
    await fetchKetcherData(editor);
    const listOfAliasesAfter = await collectMissingAliases();
    const aliasDifferences = await deepCompareNumbers(listOfAliasesBefore, listOfAliasesAfter);
    let hasImageDifferences = await deepCompare(oldImagePack, imagesList);
    const imageDifferences = await deepCompareContent(oldImagePack, imagesList);

    if (hasImageDifferences && !aliasDifferences.length) { // image delete
      // console.warn('image has to be deleted');
      hasImageDifferences = true;
      aliasDifferences.push(...imageDifferences);
      latestData = await removeImageTemplateAtom(latestData, imageDifferences);
    } else if (!hasImageDifferences) { // atom delete with not image diff
      // console.warn('when image is not deleted?');
      const templateList = await fetchTemplateList();
      const filteredImages = [];
      for (let i = 0; i < imagesList.length; i++) {
        if (aliasDifferences.indexOf(i) !== -1) {
          const templateId = await findTemplateByPayload(templateList, imagesList[i].data);
          if (templateId == null) {
            filteredImages.push(imagesList[i]);
          }
        } else {
          filteredImages.push(imagesList[i]);
        }
      }
      imagesList = filteredImages;
      imageNodeCounter = imagesList.length - 1;
    } else if (hasImageDifferences) { // atom removed selected
      // console.warn('image difference & missing numbers called');
      imageNodeCounter = imagesList.length - 1;
    }

    latestData = await handleOnDeleteAtom(aliasDifferences, latestData, imagesList);
    await filterTextList(aliasDifferences); // text node structure
    await saveMoveCanvas(editor, latestData, true, false);
    deletedAtoms = [];
    oldImagePack = [];
  } catch (err) {
    console.log(err);
  }
};

// filter text nodes by key, key as in text key
const filterTextList = async (aliasDifferences) => {
  // rewire all the index when deleted index is small then existing third part
  const keys = Object.values(textNodeStruct);
  const valueList = [];
  if (aliasDifferences.length) {
    textList.forEach((item) => {
      if (keys.includes(JSON.parse(item.data.content).blocks[0].key)) {
        valueList.push(item);
      }
    });
    const diff = await deepCompareContent(textList, valueList);
    latestData.root.nodes = [...removeTextFromData(latestData), ...valueList];
    textList = [...valueList];
  }
};

const fetchAndReplace = () => {
  imageListCopyContainer = [...imagesList];
  textListCopyContainer = [...textList];
};

const removeTextNodeDescriptionOnTextPopup = () => {
  const paragraph = document.getElementById(KET_TAGS.templateEditProps.id);
  if (paragraph) {
    paragraph.remove();
  }
  selectedImageForTextNode = null;
};

const findTemplateByPayload = async (templateList, targetPayload) => {
  for (const category of templateList) {
    for (const subTab of category.subTabs) {
      for (const shape of subTab.shapes) {
        if (shape.payload === targetPayload) {
          return shape.template_id;
        }
      }
    }
  }
  return null;
};

/* istanbul ignore next */
const KetcherEditor = forwardRef((props, ref) => {
  const {
    editor, iH, iS, molfile
  } = props;

  const [showShapes, setShowShapes] = useState(false);

  const iframeRef = useRef();
  const initMol = molfile || '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';

  // Handlers for each event operation, mapped by operation name;
  const eventOperationHandlers = {
    'Load canvas': async () => {
      if (reloadCanvas) onTemplateMove(editor, true);
      ImagesToBeUpdatedSetter(true);
      await runImageLayering();
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
    'Move atom': async () => {
      console.log('Move atom');
      // const { exists } = isCanvasUpdateRequiredOnMove(eventItem);
      allowProcessingSetter(true);
      addEventToFILOStack('Move atom');
    },
    'Delete image': async () => {
      console.log('Delete image called delete atom!');
      addEventToFILOStack('Delete atom');
    },
    'Delete atom': async (eventItem) => {
      console.log('delete atom');
      let atomCount = -1;
      if (eventItem.label === KET_TAGS.inspiredLabel) {
        for (let m = 0; m < mols?.length; m++) {
          const mol = mols[m];
          const atoms = latestData[mol]?.atoms;
          for (let a = 0; a < atoms?.length; a++) {
            atomCount++;
            if (atomCount === eventItem.id) {
              deletedAtoms.push(allAtoms[atomCount]);
            }
          }
        }
      }
      addEventToFILOStack('Delete atom');
    },
    'Add text': async () => {
      addEventToFILOStack('Add text');
    },
    'Delete text': async () => {
      if (!FILOStack.includes('Delete atom') && !FILOStack.includes('Delete image')) {
        addEventToFILOStack('Delete text');
      }
    }
  };

  // action based on event-name
  const eventHandlers = {
    'Move image': async () => onTemplateMove(editor),
    'Delete image': async () => {
      oldImagePack = [...imagesList];
      await fetchKetcherData(editor);
      mols = mols.filter((item) => item != null);
      await onDeleteImage(editor, canvasSelection, oldImagePack, textList, deletedAtoms);
    },
    'Move atom': async () => {
      oldImagePack = [...imagesList];
      await onTemplateMove(editor, false);
    },
    'Add atom': async () => onAddAtom(editor),
    'Delete atom': async () => {
      oldImagePack = [...imagesList];
      await onAtomDelete(editor);
      canvasSelection = null;
    },
    'Add text': async () => onAddText(editor, selectedImageForTextNode),
    'Delete text': async () => {
      const response = await onDeleteText(editor, textList, textNodeStruct);
      textList = response.textList;
      textNodeStruct = { ...response.textNodeStruct };
    },
    'Upsert image': async () => {
      oldImagePack = [...imagesList];
      await fetchKetcherData(editor);
      await onImageAddedOrCopied();
    }
  };

  // DOM button events with scope
  const buttonEvents = {
    // fetch and place data
    "[title='Clean Up \\(Ctrl\\+Shift\\+L\\)']": async () => fetchAndReplace(),
    "[title='Calculate CIP \\(Ctrl\\+P\\)']": async () => fetchAndReplace(),
    "[title='Layout \\(Ctrl\\+L\\)']": async () => fetchAndReplace(),
    "[title='Add/Remove explicit hydrogens']": async () => fetchAndReplace(),
    "[title='Aromatize \\(Alt\\+A\\)']": async () => fetchAndReplace(),
    "[title='3D Viewer']": async () => fetchAndReplace(),
    // others
    "[title='Rescale Polymer Canvas']": async () => {
      await fetchKetcherData(editor);
      await saveMoveCanvas(editor, null, true, true, true);
      ImagesToBeUpdatedSetter(true);
      await runImageLayering();
    },
    "[title='Open... \\(Ctrl\\+O\\)']": async () => removeTextNodeDescriptionOnTextPopup(),
    "[title='Save as... \\(Ctrl\\+S\\)']": async () => removeTextNodeDescriptionOnTextPopup(),
    "[title='Undo \\(Ctrl\\+Z\\)']": async () => undoKetcher(editor),
    "[title='Redo \\(Ctrl\\+Shift\\+Z\\)']": () => redoKetcher(editor),
    "[title='Polymer List']": async () => setShowShapes(!showShapes),
    "[title='Clear Canvas \\(Ctrl\\+Del\\)']": async () => {
      resetStore();
      removeTextNodeDescriptionOnTextPopup();
    }
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
      loadTemplates();
    }
    return () => {
      if (iframe) {
        iframe.removeEventListener('load', attachClickListeners);
      }
      window.removeEventListener('message', loadContent);
    };
  }, [editor]);

  // add all the images at the end of the canvas
  const runImageLayering = async () => {
    if (ImagesToBeUpdated && !LAYERING_FLAGS.skipImageLayering) {
      setTimeout(async () => {
        await updateImagesInTheCanvas(iframeRef);
      }, [100]);
    }
  };

  // enable editor change listener
  const onEditorContentChange = () => {
    editor._structureDef.editor.editor.subscribe('change', async (eventData) => {
      canvasSelection = editor._structureDef.editor.editor._selection;
      const result = await eventData;
      handleEventCapture(result);
    });
    editor._structureDef.editor.editor.subscribe('selectionChange', async () => {
      const currentSelection = editor._structureDef.editor.editor._selection;
      if (currentSelection?.images) {
        selectedImageForTextNode = editor._structureDef.editor.editor._selection?.images;
      }
    });
  };

  const loadTemplates = async () => {
    const response = await fetch('/json/surfaceChemistryShapes.json');
    allTemplates = await response.json();
  };

  // Load the editor content and set up the molecule
  const loadContent = async (event) => {
    if (event.data.eventType === 'init') {
      window.editor = editor;
      if (editor && editor.structureDef) {
        textNodeStruct = {};
        onEditorContentChange(editor);
        const polymerTag = await hasKetcherData(initMol);
        const textNodes = await hasTextNodes(initMol);
        const ketFile = await editor._structureDef.editor.indigo.convert(initMol).catch((err) => {
          console.error('invalid molfile. Please try again', err.message);
        });
        const fileContent = JSON.parse(ketFile.struct);

        // process polymers
        const { molfileData } = await addPolymerTags(polymerTag, fileContent);
        const textNodeList = await addTextNodes(textNodes, molfileData);
        if (textNodeList.length) molfileData.root.nodes.push(...textNodeList);
        const toRecenter = !polymerTag?.length;
        saveMoveCanvas(editor, molfileData, true, true, !!toRecenter);
        ImagesToBeUpdatedSetter(true);
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
        console.log(event);
        // eslint-disable-next-line no-await-in-loop
        await eventHandlers[event]();
      }
    }
    await runImageLayering(); // post all the images at the end of the canvas not duplicate
    FILOStack = [];
    uniqueEvents.clear();
  };

  // main function to capture all events from editor
  const handleEventCapture = async (data) => {
    allowProcessingSetter(true);

    const selection = editor._structureDef.editor.editor._selection;
    if (selection?.images || selection?.texts) {
      addEventToFILOStack('Move atom');
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

  // helper function to add event to stack
  const addEventToFILOStack = (event) => {
    if (event === 'Delete image' && FILOStack.includes('Delete atom')) {
      console.log('Cannot add "Delete image" after "Delete atom" event.');
      return;
    }

    // if (event === 'Delete atom' && FILOStack.includes('Move atom')) {
    //   console.log('Cannot add "Delete atom" after "Move atom" event.', '##');
    //   return;
    // }

    if (event === 'Delete atom' && FILOStack.includes('Delete text')) {
      console.log('Cannot add "Delete atom" after "Delete text" event.');
      return;
    }

    if (event === 'Delete image' && FILOStack.includes('Delete text')) {
      console.log('Cannot add "Delete image" after "Delete text" event.');
      return;
    }

    if (event === 'Upsert image' && FILOStack.includes('Add atom')) {
      console.log('Cannot add "Upsert image" after "Add atom" event.');
      return;
    }

    // Add event to FILO stack only if it's not already in uniqueEvents
    if (!uniqueEvents.has(event)) {
      FILOStack.push(event);
      uniqueEvents.add(event);
    }
  };

  // helper function to add mutation observers to DOM elements
  const attachClickListeners = () => {
    // Main function to attach listeners and observers
    if (iframeRef.current && iframeRef.current?.contentWindow?.document) {
      const iframeDocument = iframeRef.current.contentWindow.document;

      // Attach MutationObserver to listen for relevant DOM mutations (e.g., new elements added)
      const observer = new MutationObserver(async (mutationsList) => {
        await Promise.all(
          mutationsList.map(async (mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              await Promise.all(
                Object.keys(buttonEvents).map(async (selector) => {
                  await attachListenerForTitle(iframeDocument, selector, buttonEvents);
                  makeTransparentByTitle(iframeDocument);
                })
              );
              if (selectedImageForTextNode) {
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                  const node = mutation.addedNodes[i]; // Access each node
                  await addTextNodeDescriptionOnTextPopup(node);
                }
              }
            }
          })
        );

        const cancelButton = iframeDocument.querySelector('.Dialog-module_cancel__8d83c');
        const crossButton = iframeDocument.querySelector('.Dialog-module_buttonTop__91ha8');

        if (cancelButton) {
          cancelButton?.addEventListener('click', () => {
            console.log('Cancel button clicked');
            selectedImageForTextNode = null;
          });
        }
        if (crossButton) {
          crossButton?.addEventListener('click', () => {
            console.log('cross button clicked');
            selectedImageForTextNode = null;
          });
        }

        if (!LAYERING_FLAGS.skipTemplateName) {
          await updateTemplatesInTheCanvas(iframeRef);
        }
      });

      // Start observing the iframe's document for changes (child nodes added anywhere in the subtree)
      observer.observe(iframeDocument, {
        childList: true,
        subtree: true,
      });

      // Fallback: Try to manually find buttons after some time, debounce the function
      const debounceAttach = setTimeout(() => {
        Object.keys(buttonEvents).forEach((title) => {
          attachListenerForTitle(iframeDocument, title);
        });

        // Ensure iframe content is loaded before adding the button
        if (iframeRef?.current?.contentWindow?.document?.readyState === 'complete') {
          PolymerListIconKetcherToolbarButton(iframeDocument);
          rescaleToolBarButoon(iframeDocument);
        } else if (iframeRef?.current?.onload) {
          iframeRef.current.onload = PolymerListIconKetcherToolbarButton;
          iframeRef.current.onload = rescaleToolBarButoon;
        }
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
      try {
        let textNodesFormula = '';
        await fetchKetcherData(editor);
        const canvasDataMol = await editor.structureDef.editor.getMolfile();
        const svgElement = await reArrangeImagesOnCanvas(iframeRef); // svg display
        // const svgElement = await reArrangeImagesOnCanvasViaKetcher(editor); // svg display using ketcher service
        const ket2Lines = await arrangePolymers(canvasDataMol); // polymers added
        const ket2LineTextArranged = await arrangeTextNodes(ket2Lines); // text node
        if (textList.length) textNodesFormula = await assembleTextDescriptionFormula(ket2LineTextArranged); // text node formula
        ket2LineTextArranged.push(KET_TAGS.fileEndIdentifier);
        resetStore();
        return { ket2Molfile: ket2LineTextArranged.join('\n'), svgElement, textNodesFormula };
      } catch (e) {
        console.log(e);
        return e.message;
      }
    }
  }));

  const onImageAddedOrCopied = async () => {
    const item = imagesList[imagesList.length - 1];
    const templateList = await fetchTemplateList();
    const templateId = await findTemplateByPayload(templateList, item.data);
    if (templateId != null) {
      await onShapeSelection(templateId, false);
    }
  };

  const onShapeSelection = async (tempId, imageToBeAdded = true) => {
    const rootStruct = {
      nodes: [
        {
          $ref: 'mol0'
        },

      ],
      connections: [],
      templates: []
    };
    const dummyContentToCopy = {
      root: {},
      mol0: {
        type: 'molecule',
        atoms: [
          {
            label: 'A',
            alias: 't_1_0',
            location: [
              21.07065471112727,
              -12.001127313397285,
              0
            ]
          },
        ],
        bonds: [],
        stereoFlagPosition: {
          x: 25.07065471112727,
          y: -12.001127313397285,
          z: 0
        }
      }
    };

    setShowShapes(false);
    dummyContentToCopy.root = { ...rootStruct };
    const dummyAlias = { ...dummyContentToCopy };
    if (imageToBeAdded) {
      const imageItem = await fetchSurfaceChemistryImageData(tempId);
      dummyAlias.root.nodes.push(imageItem);
    }

    dummyAlias.mol0.atoms[0].alias = `t_${tempId}`;
    dummyAlias.mol0.atoms.selected = true;
    await editor._structureDef.editor.addFragment(
      JSON.stringify(dummyAlias)
    );

    await fetchKetcherData(editor);
    await onAddAtom(editor);
    await buttonClickForRectangleSelection(iframeRef);
    FILOStack = [];
    allAtoms = [];
  };

  return (
    <div>
      <PolymerListModal
        loading={showShapes}
        onShapeSelection={onShapeSelection}
        onCloseClick={() => setShowShapes(false)}
        title="Select a template"
      />
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
