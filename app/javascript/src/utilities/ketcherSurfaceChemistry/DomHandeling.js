/* eslint-disable import/no-mutable-exports */
/* eslint-disable no-param-reassign */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
/* eslint-disable no-underscore-dangle */

// DOM functions
// Function to attach click listeners based on titles
import { KET_TAGS, LAYERING_FLAGS } from 'src/utilities/ketcherSurfaceChemistry/constants';
import { fetchKetcherData } from 'src/utilities/ketcherSurfaceChemistry/InitializeAndParseKetcher';
import {
  PolymerListIconKetcherToolbarButton,
  specialCharButton
} from 'src/components/structureEditor/PolymerListModal';
import { ImagesToBeUpdated, ImagesToBeUpdatedSetter } from 'src/utilities/ketcherSurfaceChemistry/stateManager';
import { saveMoveCanvas } from 'src/utilities/ketcherSurfaceChemistry/canvasOperations';
import { handleAddAtom } from 'src/utilities/ketcherSurfaceChemistry/AtomsAndMolManipulation';

export let selectedImageForTextNode = null;
/* istanbul ignore next */
const attachListenerForTitle = (iframeDocument, selector, buttonEvents) => {
  const button = iframeDocument.querySelector(selector);
  if (button && !button.hasClickListener) {
    button.addEventListener('click', buttonEvents[selector]);
    button.hasClickListener = true;
  }
};

// function to switch back to selection button
const buttonClickForRectangleSelection = async (iframeRef) => {
  const iframeDocument = iframeRef?.current?.contentWindow?.document;
  const button = iframeDocument?.querySelector('[data-testid="select-rectangle"]');
  if (button) {
    button.click();
  }
};

/* istanbul ignore next */
// function to make template list extra content hidden
const makeTransparentByTitle = (iframeDocument) => {
  const elements = iframeDocument.querySelectorAll('[title]');

  /* istanbul ignore next */
  elements.forEach((element) => {
    if (KET_TAGS.shapes.indexOf(element.getAttribute('title')) !== -1) {
      element.querySelectorAll('path, text').forEach((child) => {
        if (
          (child.getAttribute('stroke-width') === '2'
            && child.getAttribute('stroke-linecap') === 'round'
            && child.getAttribute('stroke-linejoin') === 'round')
          || (
            child.tagName.toLowerCase() === 'text'
            && (child.textContent.trim() === 'A')
          )
        ) {
          child.style.opacity = '0';
        }
      });
    }
  });
};

/* istanbul ignore next */
// helper function to update DOM images using layering technique
const updateImagesInTheCanvas = async (iframeRef) => {
  if (iframeRef?.current && iframeRef?.current?.contentWindow?.document) {
    const iframeDocument = iframeRef.current.contentWindow.document;
    const svg = iframeDocument.querySelector('svg'); // Get the main SVG tag
    if (svg) {
      const imageElements = iframeDocument.querySelectorAll('image'); // Select all text elements
      imageElements.forEach((img) => {
        svg?.removeChild(img);
      });

      imageElements.forEach((img) => {
        svg?.appendChild(img);
      });
    }
    ImagesToBeUpdatedSetter(false);
  }
};

/* istanbul ignore next */
// helper function to update text > span > t_###_### fill transparent
const updateTemplatesInTheCanvas = async (iframeRef) => {
  if (iframeRef && iframeRef?.current?.contentWindow?.document) {
    const iframeDocument = iframeRef.current.contentWindow.document;
    const svg = iframeDocument.querySelector('svg'); // Get the main SVG tag
    if (svg) {
      const textElements = svg.querySelectorAll('text'); // Select all text elements
      textElements.forEach((textElem) => {
        const { textContent } = textElem; // Get the text content of the <text> element
        if (textContent === KET_TAGS.inspiredLabel) { // Check if it matches the pattern
          textElem.setAttribute('fill', 'transparent'); // Set fill to transparent
        }
      });
    }
  }
};
// helper function to handle ketcher undo DOM element
const undoKetcher = (editor) => {
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
};

// helper function to handle ketcher undo DOM element
const redoKetcher = (editor) => {
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
      await saveMoveCanvas(editor, data, false, true, false);
    }, [500]);
  } catch (error) {
    console.error({ redo: error });
  }
};

// helper function to show text on text popup
const addTextNodeDescriptionOnTextPopup = async (node) => {
  const hasSelectContainer = node?.classList?.contains('Select-module_selectContainer__yXT-t');
  const hasModalOverlay = node?.classList?.contains('Modal-module_modalOverlay__AzVeg');
  if (hasSelectContainer && hasModalOverlay) {
    // Your existing logic
    const parentElement = node.querySelector('.Dialog-module_body__EWh4H.Dialog-module_withMargin__-zVS4');

    let newParagraph; // Declare the variable to store the added paragraph

    if (parentElement) { // Ensure showTextNode is used properly
      newParagraph = document.createElement('p');
      const firstChild = parentElement.lastChild;
      newParagraph.id = KET_TAGS.templateEditProps.id; // Add an ID to the paragraph

      newParagraph.textContent = KET_TAGS.templateEditProps.text;
      parentElement.insertBefore(newParagraph, firstChild.nextSibling);
    }
  }
};

// add all the images at the end of the canvas
const runImageLayering = async (iframeRef) => {
  if (ImagesToBeUpdated && !LAYERING_FLAGS.skipImageLayering) {
    setTimeout(async () => {
      await updateImagesInTheCanvas(iframeRef);
    }, [100]);
  }
};

// set image count
export const imageNodeForTextNodeSetter = async (data) => {
  selectedImageForTextNode = data;
};

// newButton.title = 'Text Node Special Char';
const updateCharValue = async (iframeDocument) => {
  // Find element with class .textNodeChar
  const el = iframeDocument.querySelector("[title='Text Node Special Char']");

  if (el) {
    el.style.position = 'relative';
    const circle = iframeDocument.createElement('span');
    circle.style.width = '10px';
    circle.style.height = '10px';
    // circle.style.backgroundColor = '#337ab7';
    circle.style.borderRadius = '50%';
    circle.style.position = 'absolute';
    circle.style.top = '2px';
    circle.style.right = '2px';
    el.appendChild(circle);
  } else {
    console.warn('Element with class "textNodeChar" not found in iframe.');
  }
};

// helper function to add mutation observers to DOM elements
const attachClickListeners = (iframeRef, buttonEvents) => {
  // Main function to attach listeners and observers
  const iframeDocument = iframeRef?.current?.contentWindow?.document || null;

  // Attach MutationObserver to listen for relevant DOM mutations (e.g., new elements added)
  const observer = new MutationObserver(async (mutationsList) => {
    await Promise.all(
      mutationsList.map(async (mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          await Promise.all(
            Object.keys(buttonEvents).map(async (selector) => {
              await attachListenerForTitle(iframeDocument, selector, buttonEvents);
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
        imageNodeForTextNodeSetter(null);
      });
    }
    if (crossButton) {
      crossButton?.addEventListener('click', () => {
        imageNodeForTextNodeSetter(null);
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
      specialCharButton(iframeDocument);
    } else if (iframeRef?.current?.onload) {
      iframeRef.current.onload = PolymerListIconKetcherToolbarButton;
      iframeRef.current.onload = specialCharButton;
    }
    updateCharValue(iframeDocument);
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

export {
  attachListenerForTitle,
  buttonClickForRectangleSelection,
  makeTransparentByTitle,
  updateImagesInTheCanvas,
  updateTemplatesInTheCanvas,
  undoKetcher,
  redoKetcher,
  runImageLayering,
  attachClickListeners,
  addTextNodeDescriptionOnTextPopup,
  updateCharValue
};
