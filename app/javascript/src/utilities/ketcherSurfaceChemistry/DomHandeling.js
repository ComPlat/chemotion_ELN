/* eslint-disable import/no-mutable-exports */
/* eslint-disable no-param-reassign */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
/* eslint-disable no-underscore-dangle */

// DOM functions
// Function to attach click listeners based on titles
import {
  KET_TAGS, LAYERING_FLAGS, EventNames, KET_DOM_TAG
} from 'src/utilities/ketcherSurfaceChemistry/constants';
import { fetchKetcherData } from 'src/utilities/ketcherSurfaceChemistry/InitializeAndParseKetcher';
import {
  PolymerListIconKetcherToolbarButton,
  SolidSurfaceTemplatesIconTextButton,
} from 'src/components/structureEditor/PolymerListModal';
import {
  ImagesToBeUpdated,
  ImagesToBeUpdatedSetter,
  canvasIframeRef
} from 'src/utilities/ketcherSurfaceChemistry/stateManager';
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
const makeTransparentByTitle = (iframeRef) => {
  const iframeDocument = iframeRef?.current?.contentWindow?.document;
  if (!iframeDocument) return;

  const svg = iframeDocument.querySelector('[data-testid="canvas"]');
  if (!svg) return;

  const elements = svg.querySelectorAll('text');
  if (elements.length === 0) return;

  elements.forEach((element) => {
    if (element.textContent.trim() === KET_DOM_TAG.textBehindImg) {
      const tspan = element.querySelector('tspan');
      if (tspan) {
        tspan.style.setProperty('fill', 'transparent', 'important');
      }
    }
  });
};

const addGreenCircleOnCanvasImages = async (imageElements, iframeDocument = null, iframeRef = null) => {
  imageElements.forEach((img) => {
    // Create circle overlay element
    const circle = iframeDocument.createElement('div');
    circle.className = '__green-circle-overlay';
    circle.style.position = 'absolute';
    circle.style.border = '1px solid rgb(22,119,130)';
    circle.style.borderRadius = '50%';
    circle.style.pointerEvents = 'none';
    circle.style.opacity = '0';
    circle.style.transition = 'opacity 0.15s';
    circle.style.zIndex = '999999'; // above canvas
    circle.style.background = 'transparent';

    // Append circle to iframe body
    iframeDocument.body.appendChild(circle);

    const positionCircle = () => {
      const rect = img.getBoundingClientRect();

      const size = 26; // match r=13 → 26px diameter

      circle.style.width = `${size}px`;
      circle.style.height = `${size}px`;

      circle.style.left = `${rect.left + iframeRef.current.contentWindow.scrollX
        + rect.width / 2 - size / 2}px`;

      circle.style.top = `${rect.top + iframeRef.current.contentWindow.scrollY
        + rect.height / 2 - size / 2}px`;
    };

    img.addEventListener('mouseenter', () => {
      positionCircle();
      circle.style.opacity = '1';
    });

    img.addEventListener('mouseleave', () => {
      circle.style.opacity = '0';
    });

    // Keep circle aligned on resize/scroll inside iframe
    iframeRef.current.contentWindow.addEventListener('scroll', positionCircle);
    iframeRef.current.contentWindow.addEventListener('resize', positionCircle);
  });
};

/* istanbul ignore next */
// helper function to update DOM images using layering technique
const updateImagesInTheCanvas = async (iframeRef) => {
  const iframeDocument = iframeRef?.current?.contentWindow?.document;
  if (iframeDocument) {
    const svg = iframeDocument.querySelector('[data-testid="canvas"]');
    if (svg) {
      const imageElements = iframeDocument.querySelectorAll(KET_DOM_TAG.imageTag);
      imageElements.forEach((img) => {
        svg?.removeChild(img);
      });

      imageElements.forEach((img) => {
        svg?.appendChild(img);
      });
      iframeDocument.querySelectorAll('.__green-circle-overlay').forEach((el) => el.remove());
      await addGreenCircleOnCanvasImages(imageElements, iframeDocument, iframeRef);
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
        if (textContent === KET_TAGS.inspiredLabel) {
          textElem.setAttribute('fill', 'transparent'); // Set fill to transparent
          const tspans = textElem.querySelectorAll('tspan');
          tspans.forEach((tspan) => {
            tspan.setAttribute('fill', 'transparent');
            tspan.style.fill = 'transparent'; // For good measure
          });
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
      if (list[i]?.operations[0]?.type !== EventNames.LOAD_CANVAS) {
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
      if (list[i]?.operations[0]?.type !== EventNames.LOAD_CANVAS) {
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

    if (parentElement) {
      // Ensure showTextNode is used properly
      newParagraph = document.createElement('p');
      const firstChild = parentElement.lastChild;
      newParagraph.id = KET_TAGS.templateEditProps.id; // Add an ID to the paragraph

      newParagraph.textContent = KET_TAGS.templateEditProps.text;
      parentElement.insertBefore(newParagraph, firstChild.nextSibling);
    }
  }
};

// add all the images at the end of the canvas
const runImageLayering = async (iframeRef = canvasIframeRef) => {
  const targetIframe = iframeRef || canvasIframeRef;
  if (!targetIframe) return;
  if (!ImagesToBeUpdated || LAYERING_FLAGS.skipImageLayering) return;

  // Hybrid approach: RAF + minimum delay for reliability
  // RAF syncs with render cycle, timeout ensures minimum wait
  await Promise.all([
    new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    }),
    new Promise((resolve) => setTimeout(resolve, 50)) // Minimum 50ms
  ]);

  await makeTransparentByTitle(targetIframe);
  await updateImagesInTheCanvas(targetIframe);
  ImagesToBeUpdatedSetter(false);
};

// set image count
export const imageNodeForTextNodeSetter = async (data) => {
  selectedImageForTextNode = data;
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
        }
      })
    );

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
      SolidSurfaceTemplatesIconTextButton(iframeDocument);
    } else if (iframeRef?.current?.onload) {
      iframeRef.current.onload = PolymerListIconKetcherToolbarButton;
      iframeRef.current.onload = SolidSurfaceTemplatesIconTextButton;
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
};
