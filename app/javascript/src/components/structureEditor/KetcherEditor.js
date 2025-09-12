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
  useEffect, useRef, useImperativeHandle, forwardRef, useState
} from 'react';
import { findTemplateByPayload } from 'src/utilities/ketcherSurfaceChemistry/Ketcher2SurfaceChemistryUtils';
import { PolymerListModal } from 'src/components/structureEditor/PolymerListModal';
import TextEditorModal from 'src/components/structureEditor/TextEditorModal';
import {
  fetchKetcherData,
  setupEditorIframe,
  prepareKetcherData,
} from 'src/utilities/ketcherSurfaceChemistry/InitializeAndParseKetcher';
import {
  handleOnDeleteAtom,
  removeAtomFromData,
  analyzeAliasAndImageDifferences,
  filterImagesByDifferences,
  findAtomByImageIndex,
} from 'src/utilities/ketcherSurfaceChemistry/AtomsAndMolManipulation';
import {
  EventNames,
  ButtonSelectors,
  getButtonSelector,
} from 'src/utilities/ketcherSurfaceChemistry/constants';
import { deepCompareContent, filterTextList } from 'src/utilities/ketcherSurfaceChemistry/TextNode';
import {
  runImageLayering,
  undoKetcher,
  redoKetcher,
  imageNodeForTextNodeSetter,
  selectedImageForTextNode,
} from 'src/utilities/ketcherSurfaceChemistry/DomHandeling';
import {
  onAddAtom,
  onDeleteText,
  onTemplateMove,
  saveMoveCanvas,
  onFinalCanvasSave,
  onPasteNewShapes,
  onAddText,
  onAddTextFromEditor,
} from 'src/utilities/ketcherSurfaceChemistry/canvasOperations';
import { handleEventCapture } from 'src/utilities/ketcherSurfaceChemistry/eventHandler';
import {
  ImagesToBeUpdatedSetter,
  imagesList,
  resetKetcherStore,
  reloadCanvas,
  canvasSelectionsSetter,
  deletedAtomsSetter,
  fetchAndReplace,
  eventUpsertImageSetter,
  upsertImageCalled,
  imagesListSetter,
  canvasIframeRefSetter,
  textNodeStruct,
  textList,
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
    const { aliasDifferences, hasImageDifferences, imageDifferences } = await analyzeAliasAndImageDifferences(
      editor,
      oldImagePack
    );
    let imagesDifferencesContainer = imageDifferences;
    let dataRes = latestData;

    let removeFrom = 'atom-removal';
    // 2nd remove images if not removed
    if (hasImageDifferences) {
      // image delete
      aliasDifferences.push(...imagesDifferencesContainer);
      removeFrom = 'image-removal';
    } else if (!hasImageDifferences) {
      // atom delete with not image diff
      const filteredImages = await filterImagesByDifferences(aliasDifferences);
      imagesDifferencesContainer = await deepCompareContent(imagesList, filteredImages);
      imagesListSetter(filteredImages);
      removeFrom = 'atom-removal';
    }
    const missingList = removeFrom === 'image-removal' ? imagesDifferencesContainer : aliasDifferences;
    if (missingList.length < 1) return;
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
  try {
    if (editor && editor.structureDef) {
      if (reloadCanvas) {
        await onTemplateMove(editor, true, {});
      }
      ImagesToBeUpdatedSetter(true);
    }
  } catch (err) {
    console.error('eventLoadCanvas error:', err);
    ImagesToBeUpdatedSetter(true);
  }
};

/* istanbul ignore next */
const KetcherEditor = forwardRef((props, ref) => {
  const {
    editor, iH, iS, molfile
  } = props;

  const [showShapes, setShowShapes] = useState(false);
  const [addLabelPopup, setAddLabelPopup] = useState(false);
  const [selectedTextNodeContent, setSelectedTextNodeContent] = useState(null);
  // const [showSpecialCharModal, setSpecialCharModal] = useState(false);

  const iframeRef = useRef();
  const eventCleanupRef = useRef(() => { });
  useEffect(() => {
    canvasIframeRefSetter(iframeRef);
    return () => canvasIframeRefSetter(null);
  }, [iframeRef]);
  const initMol = molfile || '\n  noname\n\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';

  // action based on event-name
  const eventHandlers = {
    [EventNames.MOVE_IMAGE]: async () => {
      if (editor && editor.structureDef) {
        await onTemplateMove(editor);
      }
    },
    [EventNames.MOVE_ATOM]: async () => {
      if (editor && editor.structureDef) {
        oldImagePack = [...imagesList];
        await onTemplateMove(editor, null, false);
      }
    },
    [EventNames.ADD_ATOM]: async () => {
      if (editor && editor.structureDef) {
        await onAddAtom(editor);
      }
    },
    [EventNames.DELETE_ATOM]: async () => {
      if (editor && editor.structureDef) {
        oldImagePack = [...imagesList];
        await onAtomDelete(editor);
        canvasSelectionsSetter(null);
      }
    },
    [EventNames.ADD_TEXT]: async () => {
      if (editor && editor.structureDef && selectedImageForTextNode) {
        await onAddText(editor, selectedImageForTextNode);
        imageNodeForTextNodeSetter(null);
      }
    },
    [EventNames.DELETE_TEXT]: async () => {
      if (editor && editor.structureDef) {
        await onDeleteText(editor);
        // Update button state after text is deleted (re-enable if image no longer has label)
        const currentSelection = editor?._structureDef?.editor?.editor?._selection;
        await updateAddLabelButtonState(currentSelection?.images || null);
      }
    },
    [EventNames.UPSERT_IMAGE]: async () => {
      if (editor && editor.structureDef) {
        await fetchKetcherData(editor);
        oldImagePack = [...imagesList];
        await onImageAddedOrCopied();
      }
    },
    [EventNames.ADD_BOND]: async () => {
      if (editor && editor.structureDef) {
        await onTemplateMove(editor);
      }
    }
  };

  // Function to update Add Label button disabled state
  const updateAddLabelButtonState = async (imageIndexes, selectedTextKey = null) => {
    try {
      const iframeDocument = iframeRef?.current?.contentWindow?.document;
      if (!iframeDocument) return;

      const buttonSelector = getButtonSelector(ButtonSelectors.ADD_LABEL);
      const button = iframeDocument.querySelector(buttonSelector);
      if (!button) return;

      // Default: button is disabled
      let shouldEnable = false;

      // Check if a text node is selected and has an associated image
      if (selectedTextKey) {
        // Check if this text key exists in textNodeStruct (meaning it has an associated image)
        const hasAssociatedImage = Object.values(textNodeStruct).includes(selectedTextKey);
        if (hasAssociatedImage) {
          shouldEnable = true;
        }
      }

      // If images are selected, check if any of them don't have labels yet
      if (!shouldEnable && imageIndexes && imageIndexes.length > 0) {
        // Check if the selected image already has a label
        const imageIndex = imageIndexes[0];
        const { alias } = await findAtomByImageIndex(imageIndex);

        // Enable button only if image is selected AND doesn't have a label yet
        if (alias && !textNodeStruct[alias]) {
          shouldEnable = true;
        }
      }

      button.disabled = !shouldEnable;
      button.style.opacity = shouldEnable ? '1' : '0.5';
      button.style.cursor = shouldEnable ? 'pointer' : 'not-allowed';

      // Also set aria-disabled for accessibility
      button.setAttribute('aria-disabled', !shouldEnable);
    } catch (err) {
      console.error('Error updating Add Label button state:', err);
    }
  };

  // DOM button events with scope
  const buttonEvents = {
    [getButtonSelector(ButtonSelectors.CLEAN_UP)]: async () => fetchAndReplace(editor),
    [getButtonSelector(ButtonSelectors.CALCULATE_CIP)]: async () => fetchAndReplace(editor),
    [getButtonSelector(ButtonSelectors.LAYOUT)]: async () => fetchAndReplace(editor),
    [getButtonSelector(ButtonSelectors.EXPLICIT_HYDROGENS)]: async () => fetchAndReplace(editor),
    [getButtonSelector(ButtonSelectors.AROMATIZE)]: async () => fetchAndReplace(editor),
    [getButtonSelector(ButtonSelectors.DEAROMATIZE)]: async () => fetchAndReplace(editor),
    [getButtonSelector(ButtonSelectors.VIEWER_3D)]: async () => fetchAndReplace(editor),
    [getButtonSelector(ButtonSelectors.OPEN)]: async () => imageNodeForTextNodeSetter(null),
    [getButtonSelector(ButtonSelectors.SAVE)]: async () => imageNodeForTextNodeSetter(null),
    [getButtonSelector(ButtonSelectors.UNDO)]: async () => undoKetcher(editor),
    [getButtonSelector(ButtonSelectors.REDO)]: () => redoKetcher(editor),
    [getButtonSelector(ButtonSelectors.POLYMER_LIST)]: async () => setShowShapes(!showShapes),
    [getButtonSelector(ButtonSelectors.ADD_LABEL)]: async () => {
      // Open modal if an image is selected OR if text with image is selected
      if (selectedImageForTextNode && selectedImageForTextNode.length > 0) {
        setAddLabelPopup(!addLabelPopup);
      }
    },
    [getButtonSelector(ButtonSelectors.CLEAR_CANVAS)]: async () => {
      resetStore();
      imageNodeForTextNodeSetter(null);
      updateAddLabelButtonState(false);
    },
  };

  // attach click listeners to the iframe and initialize the editor
  useEffect(() => {
    if (!editor) return () => { };

    const cleanup = setupEditorIframe({
      iframeRef,
      editor,
      resetStore,
      loadContent,
      buttonEvents,
      onPasteWithKetcherData: handlePasteWithKetcherData,
    });

    // Initialize button state (disabled by default)
    // Use multiple attempts to ensure button is found after iframe loads
    const initializeButtonState = async () => {
      for (let i = 0; i < 10; i++) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve();
          }, 200);
        });
        try {
          // eslint-disable-next-line no-await-in-loop
          await updateAddLabelButtonState(null);
          // If button was found and disabled, break
          const iframeDocument = iframeRef?.current?.contentWindow?.document;
          if (iframeDocument) {
            const buttonSelector = getButtonSelector(ButtonSelectors.ADD_LABEL);
            const button = iframeDocument.querySelector(buttonSelector);
            if (button && button.disabled) {
              break;
            }
          }
        } catch (err) {
          // Continue trying
        }
      }
    };
    initializeButtonState();

    return () => {
      if (cleanup) cleanup();
      // Cleanup event subscriptions when component unmounts
      if (eventCleanupRef.current) {
        eventCleanupRef.current();
        eventCleanupRef.current = () => { };
      }
    };
  }, [editor]);

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
   * @returns {Function} Cleanup function to unsubscribe from events
   */
  const onEditorContentChange = () => {
    if (!editor?._structureDef?.editor?.editor) {
      return () => { }; // Return no-op cleanup if editor not ready
    }

    const changeHandler = async (eventData) => {
      try {
        if (editor?._structureDef?.editor?.editor?._selection) {
          canvasSelectionsSetter(editor._structureDef.editor.editor._selection);
        }
        const result = await eventData;
        if (result && editor?.structureDef) {
          await handleEventCapture(editor, result, eventHandlers);
          await runImageLayering(iframeRef); // post all the images at the end of the canvas not duplicate
        }
      } catch (err) {
        console.error('Error in change event handler:', err);
      }
    };

    const selectionChangeHandler = async () => {
      try {
        const currentSelection = editor?._structureDef?.editor?.editor?._selection;
        let selectedTextContent = null;

        // Check if text nodes are selected
        let selectedTextKey = null;
        if (currentSelection?.texts && currentSelection.texts.length > 0) {
          // selectedText is an index into the nodes array
          const selectedTextIndex = currentSelection.texts[0];

          // Try to get the text node from latestData.root.nodes first
          let selectedTextNode = null;
          if (latestData?.root?.nodes && latestData.root.nodes[selectedTextIndex]) {
            const node = latestData.root.nodes[selectedTextIndex];
            if (node.type === 'text') {
              selectedTextNode = node;
            }
          }

          // If not found in latestData, try to find it in textList by index
          // (textList might have a different order, so we'll search by matching structure)
          if (!selectedTextNode && textList && textList.length > 0) {
            // Find text node in textList - we'll match by checking if index corresponds
            // Since we don't have direct mapping, we'll search all text nodes
            for (const textNode of textList) {
              try {
                const content = JSON.parse(textNode.data.content);
                const textKey = content.blocks[0].key;
                // Check if this text node is associated with an image
                const hasAssociatedImage = Object.values(textNodeStruct).includes(textKey);
                if (hasAssociatedImage) {
                  selectedTextNode = textNode;
                  break;
                }
              } catch (e) {
                // Skip invalid nodes
              }
            }
          }

          // If we found a text node, extract its content
          if (selectedTextNode) {
            try {
              const content = JSON.parse(selectedTextNode.data.content);
              selectedTextKey = content.blocks[0].key;
              // Extract the text content
              selectedTextContent = content.blocks[0].text || '';

              // Find associated image index from alias
              for (const [alias, textKeyInStruct] of Object.entries(textNodeStruct)) {
                if (textKeyInStruct === selectedTextKey) {
                  // Extract image index from alias (last part after _)
                  const aliasParts = alias.split('_');
                  if (aliasParts.length >= 3) {
                    const imageIndex = parseInt(aliasParts[2], 10);
                    imageNodeForTextNodeSetter([imageIndex]);
                  }
                  break;
                }
              }
            } catch (e) {
              console.error('Error parsing selected text node content:', e);
            }
          }
        } else if (currentSelection?.images) {
          canvasSelectionsSetter(currentSelection);
          imageNodeForTextNodeSetter(currentSelection.images);
          selectedTextContent = null;
          selectedTextKey = null;
        } else {
          imageNodeForTextNodeSetter(null);
          selectedTextContent = null;
          selectedTextKey = null;
        }

        // Store selected text content for modal
        setSelectedTextNodeContent(selectedTextContent);

        // Update button disabled state based on image/text selection and existing labels
        await updateAddLabelButtonState(
          currentSelection?.images || null,
          selectedTextKey
        );
      } catch (err) {
        console.error('Error in selectionChange event handler:', err);
      }
    };

    editor._structureDef.editor.editor.subscribe('change', changeHandler);
    editor._structureDef.editor.editor.subscribe('selectionChange', selectionChangeHandler);

    // Set Add Label button to disabled by default
    updateAddLabelButtonState(null);

    // Return cleanup function to unsubscribe
    return () => {
      try {
        if (editor?._structureDef?.editor?.editor) {
          editor._structureDef.editor.editor.unsubscribe('change', changeHandler);
          editor._structureDef.editor.editor.unsubscribe('selectionChange', selectionChangeHandler);
        }
      } catch (err) {
        console.error('Error unsubscribing from events:', err);
      }
    };
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
    try {
      if (event?.data?.eventType === 'init') {
        window.editor = editor;
        if (editor && editor.structureDef) {
          // Store cleanup function in ref for later use
          eventCleanupRef.current = onEditorContentChange(editor);
          await prepareKetcherData(editor, initMol);
        }
      }
    } catch (err) {
      console.error('Error in loadContent:', err);
    }
  };

  const handlePasteWithKetcherData = async (pastedText) => {
    try {
      if (editor?.structureDef && pastedText) {
        await prepareKetcherData(editor, pastedText, { isPaste: true });
      }
    } catch (err) {
      console.error('Error pasting molfile with polymer data:', err);
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
    try {
      if (!editor || !editor.structureDef) return;

      const imagesAddedList = imagesList.slice(upsertImageCalled);
      // Use for...of instead of forEach to properly await async operations
      for (const item of imagesAddedList) {
        try {
          if (item?.data) {
            const templateId = await findTemplateByPayload(item.data);
            if (templateId != null) {
              await onShapeSelection(templateId, false);
            }
          }
        } catch (err) {
          console.error('Error processing image item:', err);
        }
      }
      eventUpsertImageSetter(0);
    } catch (err) {
      console.error('Error in onImageAddedOrCopied:', err);
      eventUpsertImageSetter(0);
    }
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
  const onShapeSelection = async (tempId, imageToBeAdded) => {
    await onPasteNewShapes(editor, tempId, imageToBeAdded, iframeRef);
    setShowShapes(false);
  };

  // ref functions when a canvas is saved using main "SAVE" button
  useImperativeHandle(ref, () => ({
    onSaveFileK2SC: () => onFinalCanvasSave(editor, iframeRef, latestData),
  }));

  return (
    <div>
      <PolymerListModal
        loading={showShapes}
        onShapeSelection={onShapeSelection}
        onCloseClick={() => setShowShapes(false)}
        title="Surface Chemistry Templates"
      />

      <TextEditorModal
        loading={addLabelPopup}
        initialText={selectedTextNodeContent}
        onCloseClick={() => {
          setAddLabelPopup(false);
          setSelectedTextNodeContent(null);
        }}
        onApply={async (contents) => {
          // Convert Delta object to plain text
          const deltaToText = (delta) => {
            if (!delta || !delta.ops) return '';
            return delta.ops
              .filter((op) => typeof op.insert === 'string')
              .map((op) => op.insert)
              .join('');
          };
          const text = deltaToText(contents);

          // Use the improved function that handles text node creation/update and positioning
          await onAddTextFromEditor(editor, text, selectedImageForTextNode, selectedTextNodeContent !== null);
          // Update button state after text is added/updated
          await updateAddLabelButtonState(selectedImageForTextNode);
          setAddLabelPopup(false);
          setSelectedTextNodeContent(null);
        }}
      />
      <iframe
        ref={iframeRef}
        id={editor?.id}
        src={editor?.extSrc}
        title={editor?.label}
        height={iH}
        width='100%'
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
