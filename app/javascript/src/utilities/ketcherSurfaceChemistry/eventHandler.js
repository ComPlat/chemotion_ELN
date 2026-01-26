/* eslint-disable no-underscore-dangle */
import { eventLoadCanvas } from 'src/components/structureEditor/KetcherEditor';
import {
  FILOStack,
  FILOStackSetter,
  uniqueEventsAddEvent,
  uniqueEventsClear,
  uniqueEvents,
  allowProcessing,
  allowProcessingSetter,
  eventUpsertImageDecrement,
} from 'src/utilities/ketcherSurfaceChemistry/stateManager';
import { eventCollectDeletedAtoms } from 'src/utilities/ketcherSurfaceChemistry/AtomsAndMolManipulation';
import { EventNames } from 'src/utilities/ketcherSurfaceChemistry/constants';

// Flag to prevent re-entrant stack processing during async operations
let isProcessingStack = false;

// Helper function to add event to stack with conflict resolution
const addEventToFILOStack = (event) => {
  // Prevent conflicting event combinations
  if (event === EventNames.DELETE_TEXT && FILOStack.includes(EventNames.UPSERT_IMAGE)) return;
  if (event === EventNames.DELETE_TEXT && FILOStack.includes(EventNames.DELETE_ATOM)) return;
  if (event === EventNames.UPSERT_IMAGE && FILOStack.includes(EventNames.DELETE_ATOM)) return;

  if (!uniqueEvents.has(event)) {
    FILOStack.push(event);
    uniqueEventsAddEvent(event);
  }
};

// Handlers for each event operation, mapped by operation name
const eventOperationHandlers = {
  [EventNames.LOAD_CANVAS]: async () => {
    await eventLoadCanvas();
  },
  [EventNames.MOVE_IMAGE]: async () => {
    addEventToFILOStack(EventNames.MOVE_IMAGE);
  },
  [EventNames.ADD_ATOM]: async () => {
    addEventToFILOStack(EventNames.ADD_ATOM);
  },
  [EventNames.UPSERT_IMAGE]: async () => {
    eventUpsertImageDecrement();
    addEventToFILOStack(EventNames.UPSERT_IMAGE);
  },
  [EventNames.MOVE_ATOM]: async () => {
    allowProcessingSetter(true);
    addEventToFILOStack(EventNames.MOVE_ATOM);
  },
  [EventNames.DELETE_IMAGE]: async () => {
    addEventToFILOStack(EventNames.DELETE_ATOM);
  },
  [EventNames.DELETE_ATOM]: async (eventItem) => {
    await eventCollectDeletedAtoms(eventItem);
    addEventToFILOStack(EventNames.DELETE_ATOM);
  },
  [EventNames.ADD_TEXT]: async () => {
    addEventToFILOStack(EventNames.ADD_TEXT);
  },
  [EventNames.DELETE_TEXT]: async () => {
    addEventToFILOStack(EventNames.DELETE_TEXT);
  },
  [EventNames.ADD_BOND]: async () => {
    addEventToFILOStack(EventNames.ADD_BOND);
  }
};

// Process event stack with re-entrancy protection
// ADD_ATOM is prioritized to ensure aliases are fixed before other handlers use them
const processFILOStack = async (eventHandlers) => {
  if (isProcessingStack) return;

  isProcessingStack = true;

  try {
    // Remove LOAD_CANVAS from stack if present
    const loadCanvasIndex = FILOStack.indexOf(EventNames.LOAD_CANVAS);
    if (loadCanvasIndex > -1) {
      FILOStack.splice(loadCanvasIndex, 1);
      uniqueEvents.delete(EventNames.LOAD_CANVAS);
    }

    // Take snapshot and prioritize ADD_ATOM to fix aliases first
    const eventsToProcess = [...FILOStack].reverse();
    const addAtomIndex = eventsToProcess.indexOf(EventNames.ADD_ATOM);
    if (addAtomIndex > 0) {
      eventsToProcess.splice(addAtomIndex, 1);
      eventsToProcess.unshift(EventNames.ADD_ATOM);
    }

    // Clear original stack to prevent mutation issues during async processing
    FILOStack.length = 0;

    for (const event of eventsToProcess) {
      uniqueEvents.delete(event);
      if (eventHandlers[event]) {
        // eslint-disable-next-line no-await-in-loop
        await eventHandlers[event]();
      }
    }
    FILOStackSetter([]);
    uniqueEventsClear();
  } finally {
    isProcessingStack = false;
  }
};

// Main function to capture and process all events from editor
const handleEventCapture = async (editor, data, eventHandlers) => {
  if (data) {
    allowProcessingSetter(true);

    const selection = editor._structureDef.editor.editor._selection;
    if (selection?.images || selection?.texts) {
      addEventToFILOStack(EventNames.MOVE_ATOM);
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
      processFILOStack(eventHandlers);
    }
  }
};

export { addEventToFILOStack, processFILOStack, handleEventCapture };
