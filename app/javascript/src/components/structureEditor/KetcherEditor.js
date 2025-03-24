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
import {
  findTemplateByPayload
} from 'src/utilities/ketcherSurfaceChemistry/Ketcher2SurfaceChemistryUtils';
import { PolymerListModal } from 'src/components/structureEditor/PolymerListModal';
import {
  fetchKetcherData,
  setupEditorIframe,
  prepareKetcherData,
} from 'src/utilities/ketcherSurfaceChemistry/InitializeAndParseKetcher';
import {
  handleOnDeleteAtom,
  removeImageTemplateAtom,
  collectMissingAliases,
  removeInvalidAliases
} from 'src/utilities/ketcherSurfaceChemistry/AtomsAndMolManipulation';
import { LAYERING_FLAGS } from 'src/utilities/ketcherSurfaceChemistry/constants';
import {
  deepCompare, deepCompareContent, deepCompareNumbers,
  filterTextList
} from 'src/utilities/ketcherSurfaceChemistry/TextNode';
import {
  buttonClickForRectangleSelection,
  updateImagesInTheCanvas,
  undoKetcher,
  redoKetcher,
  attachClickListeners,
  imageNodeForTextNodeSetter,
} from 'src/utilities/ketcherSurfaceChemistry/DomHandeling';
import {
  onAddAtom,
  onDeleteText,
  centerPositionCanvas,
  onTemplateMove,
  saveMoveCanvas,
  onFinalCanvasSave,
  onPasteNewShapes
} from 'src/utilities/ketcherSurfaceChemistry/canvasOperations';
import { handleEventCapture } from 'src/utilities/ketcherSurfaceChemistry/eventHandler';
import {
  ImagesToBeUpdated,
  ImagesToBeUpdatedSetter,
  imagesListSetter,
  imagesList,
  resetKetcherStore,
  reloadCanvas,
  canvasSelectionsSetter,
  deletedAtomsSetter,
  fetchAndReplace,
  eventUpsertImageSetter,
  upsertImageCalled,
  allTemplates
} from 'src/utilities/ketcherSurfaceChemistry/stateManager';

export let latestData = null; // latestData contains the updated ket2 format always
export let imageNodeCounter = -1; // counter of how many images are used/present in data.root.nodes

// local
let oldImagePack = [];

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
    // 1st collect difference between old and new data to know whats removed
    const listOfAliasesAfter = await collectMissingAliases();
    const aliasDifferences = await deepCompareNumbers(listOfAliasesBefore, listOfAliasesAfter);
    let hasImageDifferences = await deepCompare(oldImagePack, imagesList);
    let imageDifferences = await deepCompareContent(oldImagePack, imagesList);
    let dataRes = latestData;

    if ((hasImageDifferences && !aliasDifferences.length) || aliasDifferences.length) {
      // 2nd remove images if not removed
      if (hasImageDifferences && !aliasDifferences.length) { // image delete
        // console.warn('image has to be deleted');
        hasImageDifferences = true;
        aliasDifferences.push(...imageDifferences);
        dataRes = await removeImageTemplateAtom(dataRes, imageDifferences);
        imageNodeCounter = imagesList.length - 1;
      } else if (!hasImageDifferences) { // atom delete with not image diff
        // console.warn('when image is not deleted?');
        const filteredImages = [];
        for (let i = 0; i < imagesList.length; i++) {
          if (aliasDifferences.indexOf(i) !== -1) {
            const templateId = await findTemplateByPayload(allTemplates, imagesList[i].data);
            if (templateId == null) {
              filteredImages.push(imagesList[i]);
            }
          } else {
            filteredImages.push(imagesList[i]);
          }
        }
        imageDifferences = await deepCompareContent(imagesList, filteredImages);
        imagesListSetter(filteredImages);
        imageNodeCounter = imagesList.length - 1;
      } else if (hasImageDifferences) { // a187325
        // to removed selected
        // console.warn('image difference & missing numbers called');
        imageNodeCounter = imagesList.length - 1;
      }

      // 3rd resettle aliases in inspired atom alias A
      const filteredData = await removeInvalidAliases(dataRes, aliasDifferences);
      dataRes = await handleOnDeleteAtom(imageDifferences, filteredData, imagesList);
      dataRes.root.nodes = await filterTextList(aliasDifferences, dataRes); // remove text nodes
    }
    await saveMoveCanvas(editor, dataRes, false, true, false);
    deletedAtomsSetter([]);
    oldImagePack = [];
  } catch (err) {
    console.error('onAtomDelete', err);
  }
};

export const eventLoadCanvas = async (editor) => {
  if (editor && editor.structureDef) {
    if (reloadCanvas) onTemplateMove(editor, true);
    ImagesToBeUpdatedSetter(true);
  }
};

/* istanbul ignore next */
const KetcherEditor = forwardRef((props, ref) => {
  const {
    editor, iH, iS, molfile
  } = props;

  const [showShapes, setShowShapes] = useState(false);

  const iframeRef = useRef();
  const initMol = molfile || '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';

  // action based on event-name
  const eventHandlers = {
    'Move image': async () => onTemplateMove(editor),
    'Move atom': async () => {
      oldImagePack = [...imagesList];
      await onTemplateMove(editor, false);
    },
    'Add atom': async () => onAddAtom(editor),
    'Delete atom': async () => {
      oldImagePack = [...imagesList];
      await onAtomDelete(editor);
      canvasSelectionsSetter(null);
    },
    'Add text': async () => {
      console.log('Add Text!');
      // await onAddText(editor, selectedImageForTextNode);
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
    "[title='Rescale Polymer Canvas']": async () => {
      await centerPositionCanvas(editor);
      ImagesToBeUpdatedSetter(true);
      await runImageLayering();
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
      canvasSelectionsSetter(editor._structureDef.editor.editor._selection);
      const result = await eventData;
      await handleEventCapture(editor, result, eventHandlers);
      await runImageLayering(); // post all the images at the end of the canvas not duplicate
    });
    editor._structureDef.editor.editor.subscribe('selectionChange', async () => {
      const currentSelection = editor._structureDef.editor.editor._selection;
      if (currentSelection?.images) {
        imageNodeForTextNodeSetter(editor._structureDef.editor.editor._selection?.images);
      }
    });
  };

  // Load the editor content and set up the molecule
  const loadContent = async (event) => {
    if (event.data.eventType === 'init') {
      window.editor = editor;
      if (editor && editor.structureDef) {
        onEditorContentChange(editor);
        await prepareKetcherData(editor, initMol);
      }
    }
  };

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

  const onShapeSelection = async (tempId, imageToBeAdded = true) => {
    await onPasteNewShapes(editor, tempId, imageToBeAdded, iframeRef);
    setShowShapes(false);
  };

  // ref functions when a canvas is saved using main "SAVE" button
  useImperativeHandle(ref, () => ({
    onSaveFileK2SC: () => onFinalCanvasSave(editor, iframeRef),
  }));

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
  editor: PropTypes.object?.isRequired,
  iH: PropTypes.string.isRequired,
  iS: PropTypes.object?.isRequired,
};

KetcherEditor.displayName = 'KetcherEditor';

export default KetcherEditor;
