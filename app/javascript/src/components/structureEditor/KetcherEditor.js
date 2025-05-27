/* eslint-disable react/require-default-props */
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
import UsersFetcher from 'src/fetchers/UsersFetcher';
import {
  findTemplateByPayload
} from 'src/utilities/ketcherSurfaceChemistry/Ketcher2SurfaceChemistryUtils';
import { PolymerListModal, SpecialCharModal } from 'src/components/structureEditor/PolymerListModal';
import {
  fetchKetcherData,
  setupEditorIframe,
  prepareKetcherData,
} from 'src/utilities/ketcherSurfaceChemistry/InitializeAndParseKetcher';
import {
  handleOnDeleteAtom,
  removeAtomFromData,
  analyzeAliasAndImageDifferences,
  filterImagesByDifferences
} from 'src/utilities/ketcherSurfaceChemistry/AtomsAndMolManipulation';
import { LAYERING_FLAGS } from 'src/utilities/ketcherSurfaceChemistry/constants';
import {
  deepCompareContent,
  filterTextList
} from 'src/utilities/ketcherSurfaceChemistry/TextNode';
import {
  buttonClickForRectangleSelection,
  updateImagesInTheCanvas,
  undoKetcher,
  redoKetcher,
  attachClickListeners,
  imageNodeForTextNodeSetter,
  selectedImageForTextNode
} from 'src/utilities/ketcherSurfaceChemistry/DomHandeling';
import {
  onAddAtom,
  onDeleteText,
  onTemplateMove,
  saveMoveCanvas,
  onFinalCanvasSave,
  onPasteNewShapes,
  onAddText
} from 'src/utilities/ketcherSurfaceChemistry/canvasOperations';
import { handleEventCapture } from 'src/utilities/ketcherSurfaceChemistry/eventHandler';
import {
  ImagesToBeUpdated,
  ImagesToBeUpdatedSetter,
  imagesList,
  resetKetcherStore,
  reloadCanvas,
  canvasSelectionsSetter,
  deletedAtomsSetter,
  fetchAndReplace,
  eventUpsertImageSetter,
  upsertImageCalled,
  allTemplates,
  imagesListSetter
} from 'src/utilities/ketcherSurfaceChemistry/stateManager';

export let latestData = null; // latestData contains the updated ket2 format always
export let imageNodeCounter = -1; // counter of how many images are used/present in data.root.nodes

// local
let oldImagePack = [];
let dashedSelectionCharacter = null;
let restSelectionCharacter = null;

// to reset all data containers
export const resetStore = () => {
  latestData = null;
  imageNodeCounter = -1;
  resetKetcherStore();
};

// latestData setter
export const latestDataSetter = async (data) => {
  latestData = data;
};

// image counter is strictly related and synced with how many images are there in the canvas
export const imageUsedCounterSetter = async (count) => {
  imageNodeCounter = count;
};

/* istanbul ignore next */
/**
 * Handles the deletion of atoms and ensures consistency in the canvas data.
 *
 * This function performs the following steps:
 * 1. Analyzes alias and image differences to determine which atoms or images need to be removed.
 * 2. Removes atoms or images based on the detected differences.
 * 3. Resettles aliases to maintain consistency in the atom data.
 * 4. Removes associated text nodes from the canvas.
 * 5. Saves the updated canvas data and resets relevant state variables.
 *
 * @async
 * @function onAtomDelete
 * @param {Object} editor - The Ketcher editor instance.
 * @throws {Error} Logs errors to the console if any step fails.
 */
const onAtomDelete = async (editor) => {
  try {
    if (!editor || !editor.structureDef) return;
    const {
      aliasDifferences,
      hasImageDifferences,
      imageDifferences
    } = await analyzeAliasAndImageDifferences(editor, oldImagePack);
    let imagesDifferencesContainer = imageDifferences;
    let dataRes = latestData;

    let removeFrom = 'atom-removal';
    // 2nd remove images if not removed
    if (hasImageDifferences) { // image delete
      aliasDifferences.push(...imagesDifferencesContainer);
      removeFrom = 'image-removal';
    } else if (!hasImageDifferences) { // atom delete with not image diff
      const filteredImages = await filterImagesByDifferences(aliasDifferences);
      imagesDifferencesContainer = await deepCompareContent(imagesList, filteredImages);
      imagesListSetter(filteredImages);
      removeFrom = 'atom-removal';
    }
    const missingList = removeFrom === 'image-removal' ? imagesDifferencesContainer : aliasDifferences;
    dataRes = await removeAtomFromData(dataRes, missingList);

    imageNodeCounter = imagesList.length - 1;
    // 3rd resettle aliases in inspired atom alias A
    dataRes = await handleOnDeleteAtom(imagesDifferencesContainer, dataRes, imagesList);
    dataRes.root.nodes = await filterTextList(aliasDifferences, dataRes); // remove text nodes
    await saveMoveCanvas(editor, dataRes, false, true, false);
    deletedAtomsSetter([]);
    oldImagePack = [];
  } catch (err) {
    console.error('onAtomDelete', err);
  }
};

/**
 * Handles the loading of the canvas and ensures that the editor is updated with the latest state.
 *
 * This function performs the following actions:
 * 1. If the canvas needs to be reloaded (`reloadCanvas` is true), it triggers the `onTemplateMove` function to reset the canvas state.
 * 2. Sets the `ImagesToBeUpdated` flag to `true` to perform images layering
 *
 * @async
 * @function eventLoadCanvas
 * @param {Object} editor - The Ketcher editor instance.
 */
export const eventLoadCanvas = async (editor) => {
  if (editor && editor.structureDef) {
    if (reloadCanvas) onTemplateMove(editor, null, true);
    ImagesToBeUpdatedSetter(true);
  }
};

/* istanbul ignore next */
const KetcherEditor = forwardRef((props, ref) => {
  const {
    editor, iH, iS, molfile
  } = props;

  const [showShapes, setShowShapes] = useState(false);
  const [showSpecialCharModal, setSpecialCharModal] = useState(false);

  const iframeRef = useRef();
  const initMol = molfile || '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';

  // action based on event-name
  const eventHandlers = {
    'Move image': async () => onTemplateMove(editor),
    'Move atom': async () => {
      oldImagePack = [...imagesList];
      await onTemplateMove(editor, null, false);
    },
    'Add atom': async () => onAddAtom(editor),
    'Delete atom': async () => {
      oldImagePack = [...imagesList];
      await onAtomDelete(editor);
      canvasSelectionsSetter(null);
    },
    'Add text': async () => {
      await onAddText(editor, selectedImageForTextNode);
      await buttonClickForRectangleSelection(iframeRef);
      imageNodeForTextNodeSetter(null);
    },
    'Delete text': async () => onDeleteText(editor),
    'Upsert image': async () => {
      await fetchKetcherData(editor);
      oldImagePack = [...imagesList];
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

    "[title='Open... \\(Ctrl\\+O\\)']": async () => imageNodeForTextNodeSetter(null),
    "[title='Save as... \\(Ctrl\\+S\\)']": async () => imageNodeForTextNodeSetter(null),
    "[title='Undo \\(Ctrl\\+Z\\)']": async () => undoKetcher(editor),
    "[title='Redo \\(Ctrl\\+Shift\\+Z\\)']": () => redoKetcher(editor),
    "[title='Polymer List']": async () => setShowShapes(!showShapes),
    "[title='Clear Canvas \\(Ctrl\\+Del\\)']": async () => {
      resetStore();
      imageNodeForTextNodeSetter(null);
    },
    "[title='Text Node Special Char']": async () => {
      setSpecialCharModal(true);
    },
  };

  // attach click listeners to the iframe and initialize the editor
  useEffect(() => {
    const cleanup = setupEditorIframe({
      iframeRef,
      editor,
      resetStore,
      loadContent,
      attachClickListeners,
      buttonEvents,
    });
    return cleanup;
  }, [editor]);

  /**
   * Ensures that all images are layered correctly on the canvas.
   * @async
   * @function runImageLayering
   */
  const runImageLayering = async () => {
    if (ImagesToBeUpdated && !LAYERING_FLAGS.skipImageLayering) {
      setTimeout(async () => {
        await updateImagesInTheCanvas(iframeRef);
      }, [100]);
    }
  };

  /**
   * Sets up listeners for changes in the editor's content and selection.
   *
   * This function performs the following actions:
   * 1. Subscribes to the `change` event in the editor to handle content updates.
   *    - Updates the canvas selection state.
   *    - Processes the event data using the `handleEventCapture` function.
   *    - Ensures that all images are layered correctly on the canvas.
   * 2. Subscribes to the `selectionChange` event in the editor to handle selection updates.
   *    - Updates the `imageNodeForTextNode` state with the currently selected images.
   * @function onEditorContentChange
   */
  const onEditorContentChange = () => {
    editor._structureDef.editor.editor.subscribe('change', async (eventData) => {
      canvasSelectionsSetter(editor._structureDef.editor.editor._selection);
      const result = await eventData;
      await handleEventCapture(editor, result, eventHandlers);
      await runImageLayering(); // post all the images at the end of the canvas not duplicate
    });

    // Subscribes to the `selectionChange` event
    editor._structureDef.editor.editor.subscribe('selectionChange', async () => {
      const currentSelection = editor._structureDef.editor.editor._selection;
      if (currentSelection?.images) {
        imageNodeForTextNodeSetter(editor._structureDef.editor.editor._selection?.images);
      }
    });
  };

  /**
 * Loads the editor content and initializes the molecule structure.
 *
 * This function performs the following actions:
 * 1. Sets the global `editor` instance to the `window` object for accessibility.
 * 2. Calls `onEditorContentChange` to set up listeners for content and selection changes in the editor.
 * 3. Prepares the Ketcher data by loading the initial molecule structure.
 *
 * @async
 * @function loadContent
 * @param {Object} event - The event object containing data about the editor initialization.
 */
  const loadContent = async (event) => {
    if (event.data.eventType === 'init') {
      window.editor = editor;
      if (editor && editor.structureDef) {
        onEditorContentChange(editor);
        await prepareKetcherData(editor, initMol);
      }
    }
  };

  /**
   * Handles the addition or copying of images to the canvas.
   *
   * This function performs the following actions:
   * 1. Retrieves the list of newly added images from the `imagesList` array.
   * 2. For each added image, attempts to find a corresponding template ID using the `findTemplateByPayload` function.
   * 3. If a valid template ID is found, calls the `onShapeSelection` function to add the shape to the canvas.
   * 4. Resets the `eventUpsertImageSetter` to 0 to indicate that the image addition process is complete.
   *
   * @async
   * @function onImageAddedOrCopied
   * @returns {Promise<void>} This function does not return any value.
   */
  const onImageAddedOrCopied = async () => {
    const imagesAddedList = imagesList.slice(upsertImageCalled);
    imagesAddedList.forEach(async (item) => {
      const templateId = await findTemplateByPayload(allTemplates, item.data);
      if (templateId != null) {
        await onShapeSelection(templateId, false);
      }
    });
    eventUpsertImageSetter(0);
  };

  /**
   * Handles the selection of a shape (template) and adds it to the canvas.
   *
   * This function performs the following actions:
   * 1. Pastes the selected shape (template) onto the canvas using the `onPasteNewShapes` function.
   * 2. Optionally adds the shape as an image to the canvas, based on the `imageToBeAdded` parameter.
   * 3. Closes the Polymer List Modal by setting `showShapes` to `false`.
   *
   * @async
   * @function onShapeSelection
   * @param {string} tempId - The ID of the selected template to be added to the canvas.
   * @param {boolean} [imageToBeAdded=true] - Determines whether the shape should be added as an image.
   */
  const onShapeSelection = async (tempId, imageToBeAdded = true) => {
    await onPasteNewShapes(editor, tempId, imageToBeAdded, iframeRef);
    setShowShapes(false);
  };

  const onCharSelection = (char) => {
    setSpecialCharModal(false);
    restSelectionCharacter = char;
  };

  const onDashedCharSelection = (char) => {
    setSpecialCharModal(false);
    dashedSelectionCharacter = char;
  };

  // ref functions when a canvas is saved using main "SAVE" button
  useImperativeHandle(ref, () => ({
    onSaveFileK2SC: () => onFinalCanvasSave(editor, iframeRef, { dashedSelectionCharacter, restSelectionCharacter }),
  }));

  return (
    <div>
      <PolymerListModal
        loading={showShapes}
        onShapeSelection={onShapeSelection}
        onCloseClick={() => setShowShapes(false)}
        title="Select a template"
      />
      <SpecialCharModal
        loading={showSpecialCharModal}
        onDashedSelection={onDashedCharSelection}
        onRestSelections={onCharSelection}
        onCloseClick={() => setSpecialCharModal(false)}
        dashedSelection={dashedSelectionCharacter}
        restSelection={restSelectionCharacter}
        title="Select a special character"
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
  editor: PropTypes.object?.isRequired,
  iH: PropTypes.string.isRequired,
  iS: PropTypes.object?.isRequired,
};

KetcherEditor.displayName = 'KetcherEditor';

export default KetcherEditor;
