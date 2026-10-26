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
import { deltaToDraftContent } from 'src/utilities/ketcherSurfaceChemistry/deltaDraftContentConverter';
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
  textListSetter,
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

    // Sync textList to remove orphaned image-linked text nodes whose image was deleted.
    // Free-standing labels (not in textNodeStruct) are always kept.
    // saveMoveCanvas re-injects all of textList into the canvas, so this must be done
    // before that call, otherwise orphaned text nodes reappear on the canvas.
    const activeTextKeys = new Set(Object.values(textNodeStruct));
    textListSetter(textList.filter((item) => {
      try {
        const { key } = JSON.parse(item.data.content).blocks[0];
        // Keep free-standing labels (not linked to any image)
        if (!activeTextKeys.has(key)) return true;
        // Keep image-linked labels whose image survived
        const linkedAlias = Object.entries(textNodeStruct).find(([, v]) => v === key)?.[0];
        const imgIdx = linkedAlias !== undefined ? parseInt(linkedAlias, 10) : -1;
        return imagesList.some((_, i) => i === imgIdx);
      } catch (_e) {
        return false;
      }
    }));

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

  const iframeRef = useRef();
  const eventCleanupRef = useRef(() => { });
  // Prevent duplicate 'init' messages from Ketcher (fired on iframe resize/recomposite
  // triggered by parent-document reflows) from resetting the canvas mid-session.
  const initHandledRef = useRef(false);
  useEffect(() => {
    canvasIframeRefSetter(iframeRef);
    return () => canvasIframeRefSetter(null);
  }, [iframeRef]);
  const defaultEmptyMol = 'null\n  Ketcher  3272610132D 1   1.00000     0.00000     0\n\n'
    + '  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n';
  const initMol = molfile || defaultEmptyMol;

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
      if (editor && editor.structureDef && (imagesList.length > 0 || textList.length > 0)) {
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

      // Check if a text node is selected and has an associated image.
      // Only enable when textNodeStruct explicitly maps this key to a polymer image —
      // free-standing labels can coexist with polymer images on the same canvas.
      if (selectedTextKey && Object.values(textNodeStruct).includes(selectedTextKey)) {
        shouldEnable = true;
      }

      // Enable the button whenever a polymer image is selected.
      // findAtomByImageIndex matches Ketcher's internal entity ID against the alias
      // sequence counter — this works for newly added shapes (entity ID = 0 = counter)
      // but fails after load because multiple setMolecule calls during the load path
      // increment Ketcher's entity counter past 0 while the alias still has counter 0.
      // imagesList tracks every polymer image we manage; if it has entries and Ketcher
      // reports an image selection, the selected image must be one of ours.
      if (!shouldEnable && imageIndexes && imageIndexes.length > 0) {
        if (imagesList.length > 0) {
          shouldEnable = true;
        } else {
          // Fallback for edge cases (e.g. imagesList not yet populated)
          const { alias } = await findAtomByImageIndex(imageIndexes[0]);
          if (alias) shouldEnable = true;
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
    [getButtonSelector(ButtonSelectors.POLYMER_LIST)]: async () => {
      // Do NOT click rect-select here — that fires a Ketcher change event which
      // triggers onTemplateMove → setMolecule → visible restart flash.
      // rect-select is activated at the end of onPasteNewShapes, which is the
      // only place it's actually needed.
      try { editor._structureDef.editor.editor._selection = null; } catch (e) { /* ignore */ }
      setShowShapes(!showShapes);
    },
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
    initHandledRef.current = false; // fresh editor — allow the next 'init' through

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    let selectionLayeringTimer = null;
    const debouncedRunImageLayering = () => {
      clearTimeout(selectionLayeringTimer);
      selectionLayeringTimer = setTimeout(() => runImageLayering(iframeRef), 80);
    };

    // Looks up the existing label text for an image index via textNodeStruct + textList.
    // Returns { content, textKey } where content is full Draft content (JSON string) or null.
    const getLabelForImage = async (imageIndex) => {
      const { alias } = await findAtomByImageIndex(imageIndex);
      if (!alias) return { content: null, textKey: null };
      const textKey = textNodeStruct[alias];
      if (!textKey) return { content: null, textKey: null };
      for (const tn of (textList || [])) {
        try {
          const c = JSON.parse(tn.data.content);
          if (c.blocks[0].key === textKey) {
            return { content: tn.data.content, textKey };
          }
        } catch (e) { /* skip malformed nodes */ }
      }
      return { content: null, textKey: null };
    };

    const selectionChangeHandler = async () => {
      try {
        const currentSelection = editor?._structureDef?.editor?.editor?._selection;
        let selectedTextContent = null;
        let selectedTextKey = null;

        let linkedImageIndexes = null;

        if (currentSelection?.images?.length > 0) {
          // Image selected — use the image as the source of truth to find the label.
          // This is reliable whether or not Ketcher also reports a text selection.
          canvasSelectionsSetter(currentSelection);
          imageNodeForTextNodeSetter(currentSelection.images);
          const { content, textKey } = await getLabelForImage(currentSelection.images[0]);
          selectedTextContent = content; // full Draft content (JSON string) or null
          selectedTextKey = textKey;
        } else if (currentSelection?.texts?.length > 0) {
          // Only a text node is selected (no image in selection).
          // currentSelection.texts[0] is Ketcher's internal text entity ID, NOT an array index.
          // Look it up directly from Ketcher's internal struct to get the exact content.
          const selectedTextId = currentSelection.texts[0];

          try {
            const ketcherStruct = editor._structureDef?.editor?.editor?.struct?.();
            const ketcherTextEntity = ketcherStruct?.texts?.get(selectedTextId);
            if (ketcherTextEntity?.content) {
              const parsedContent = JSON.parse(ketcherTextEntity.content);

              // Ketcher 3.18+ converts stored Draft.js content to Lexical format internally.
              // Try Draft.js format (blocks[0].key) first, then Lexical (root.children).
              if (parsedContent?.blocks?.[0]) {
                selectedTextKey = parsedContent.blocks[0].key;
              } else if (parsedContent?.root) {
                // Lexical format: match against textList by plain-text content
                const lexicalText = parsedContent.root?.children?.[0]?.children?.[0]?.text ?? '';
                for (const tn of (textList || [])) {
                  try {
                    const c = JSON.parse(tn.data.content);
                    if (c.blocks?.[0]?.text === lexicalText) {
                      selectedTextKey = c.blocks[0].key;
                      selectedTextContent = tn.data.content;
                      break;
                    }
                  } catch { /* skip malformed */ }
                }
              }

              // Use our Draft.js textList as the source of truth for content —
              // Ketcher's internal representation may be Lexical JSON which the modal
              // cannot render. Only fall back to Ketcher's content if textList has nothing.
              if (selectedTextKey && !selectedTextContent) {
                for (const tn of (textList || [])) {
                  try {
                    const c = JSON.parse(tn.data.content);
                    if (c.blocks?.[0]?.key === selectedTextKey) {
                      selectedTextContent = tn.data.content;
                      break;
                    }
                  } catch { /* skip malformed */ }
                }
              }
              if (!selectedTextContent) selectedTextContent = ketcherTextEntity.content;

              // Sync imageNodeForTextNode to the image linked with this text node.
              // Try textNodeStruct first (populated on fresh add); fall back to imagesList
              // indices when textNodeStruct wasn't repopulated after a load/reload.
              for (const [alias, textKeyInStruct] of Object.entries(textNodeStruct)) {
                if (textKeyInStruct === selectedTextKey) {
                  const aliasParts = alias.split('_');
                  if (aliasParts.length >= 3) {
                    const imgIdx = parseInt(aliasParts[2], 10);
                    imageNodeForTextNodeSetter([imgIdx]);
                    linkedImageIndexes = [imgIdx];
                  }
                  break;
                }
              }
              if (!linkedImageIndexes && imagesList.length > 0) {
                // textNodeStruct lookup failed (e.g. after load); default to index 0.
                // All text on this canvas belongs to a polymer image.
                imageNodeForTextNodeSetter([0]);
                linkedImageIndexes = [0];
              }
            }
          } catch (e) {
            console.error('Error reading selected text node from Ketcher struct:', e);
          }
        } else if (currentSelection?.atoms?.length > 0) {
          // Atom selected — clicking the polymer bead area may hit the underlying R# atom
          // rather than the SVG image overlay, especially for shapes loaded from saved data.
          // Read each atom's alias from Ketcher's internal struct; if it follows the
          // three-part alias pattern (TYPE_SUBTYPE_INDEX), treat it as a polymer image atom.
          try {
            const ketcherStruct = editor._structureDef?.editor?.editor?.struct?.();
            for (const atomId of currentSelection.atoms) {
              const atomEntity = ketcherStruct?.atoms?.get(atomId);
              const alias = atomEntity?.alias;
              if (alias && /^[^_]+_[^_]+_\d+$/.test(alias)) {
                const aliasParts = alias.split('_');
                const imgIdx = parseInt(aliasParts[2], 10);
                imageNodeForTextNodeSetter([imgIdx]);
                linkedImageIndexes = [imgIdx];
                break;
              }
            }
          } catch (e) {
            console.error('Error reading selected atom alias from Ketcher struct:', e);
          }
        } else {
          imageNodeForTextNodeSetter(null);
        }

        // Store selected text content for modal
        setSelectedTextNodeContent(selectedTextContent);

        // When a text label is clicked directly (no image in selection), pass the linked
        // image index so updateAddLabelButtonState can find the alias even if textNodeStruct
        // was reset on editor reload and the selectedTextKey path returns false.
        const effectiveImages = currentSelection?.images?.length > 0
          ? currentSelection.images
          : linkedImageIndexes;
        await updateAddLabelButtonState(effectiveImages, selectedTextKey);

        // Ketcher re-renders the canvas SVG on every selection change, which puts
        // <image> elements back inside their original <g> group and undoes layering.
        // Debounced to avoid firing on every mouse-move during a drag selection.
        ImagesToBeUpdatedSetter(true);
        debouncedRunImageLayering();
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
      clearTimeout(selectionLayeringTimer);
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
        // Ignore spurious duplicate 'init' messages — Ketcher re-fires 'init' when
        // the iframe is resized by a parent-document reflow (e.g. modal image loads).
        // Responding to a second 'init' would call prepareKetcherData(initMol) and
        // wipe every polymer shape the user drew.
        if (initHandledRef.current) return;
        initHandledRef.current = true;

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
          const draftContent = deltaToDraftContent(contents);
          // Preserve the existing Draft.js block key when editing an existing text node
          // so Ketcher can match the node by key for in-place updates.
          let existingKey;
          try {
            const existing = selectedTextNodeContent ? JSON.parse(selectedTextNodeContent) : null;
            existingKey = existing?.blocks?.[0]?.key;
          } catch { /* new node */ }
          if (existingKey && draftContent?.blocks?.[0]) {
            draftContent.blocks[0].key = existingKey;
          }
          const contentJson = JSON.stringify(draftContent);

          await onAddTextFromEditor(editor, contentJson, selectedImageForTextNode, selectedTextNodeContent !== null);
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
