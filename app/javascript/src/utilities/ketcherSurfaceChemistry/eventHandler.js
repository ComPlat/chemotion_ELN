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

// helper function to add event to stack
const addEventToFILOStack = (event) => {
  if (event === EventNames.DELETE_TEXT && FILOStack.includes(EventNames.UPSERT_IMAGE)) return;
  if (event === EventNames.DELETE_TEXT && FILOStack.includes(EventNames.DELETE_ATOM)) return;
  if (event === EventNames.UPSERT_IMAGE && FILOStack.includes(EventNames.DELETE_ATOM)) return;
  if (!uniqueEvents.has(event)) {
    FILOStack.push(event);
    uniqueEventsAddEvent(event);
  }
};

// Handlers for each event operation, mapped by operation name;
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
  }
};

// helper function to execute a stack: first in last out
const processFILOStack = async (eventHandlers) => {
  const loadCanvasIndex = FILOStack.indexOf(EventNames.LOAD_CANVAS);
  if (loadCanvasIndex > -1) {
    FILOStack.splice(loadCanvasIndex, 1);
    uniqueEvents.delete(EventNames.LOAD_CANVAS);
  }
  while (FILOStack.length > 0) {
    const event = FILOStack.pop();
    uniqueEvents.delete(event);
    if (eventHandlers[event]) {
      // eslint-disable-next-line no-await-in-loop
      await eventHandlers[event]();
    }
  }
  FILOStackSetter([]);
  uniqueEventsClear();
};

// main function to capture all events from editor
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
