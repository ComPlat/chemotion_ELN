/* eslint-disable no-underscore-dangle */
import {
  eventLoadCanvas,
} from 'src/components/structureEditor/KetcherEditor';
import {
  FILOStack,
  FILOStackSetter,
  uniqueEventsAddEvent,
  uniqueEventsClear,
  uniqueEvents,
  allowProcessing,
  allowProcessingSetter,
  eventUpsertImageDecrement
} from 'src/utilities/ketcherSurfaceChemistry/stateManager';
import { eventCollectDeletedAtoms } from 'src/utilities/ketcherSurfaceChemistry/AtomsAndMolManipulation';
import { KET_TAGS } from 'src/utilities/ketcherSurfaceChemistry/constants';

// helper function to add event to stack
const addEventToFILOStack = (event) => {
  // if (event === 'Delete image' && FILOStack.includes('Delete atom')) {
  //   console.log('Cannot add "Delete image" after "Delete atom" event.');
  //   return;
  // }

  // if (event === 'Delete atom' && FILOStack.includes('Move atom')) {
  //   console.log('Cannot add "Delete atom" after "Move atom" event.', '##');
  //   return;
  // }

  if (event === 'Delete text' && FILOStack.includes('Delete image')) {
    // console.log('Cannot add "Delete image" after "Delete text" event.');
    return;
  }

  if (event === 'Delete text' && FILOStack.includes('Delete atom')) {
    // console.log('Cannot add "Delete atom" after "Delete text" event.');
    return;
  }

  if (event === 'Upsert image' && FILOStack.includes('Add atom')) {
    // console.log('Cannot add "Upsert image" after "Add atom" event.');
    return;
  }

  // if (event === 'Add Text' && FILOStack.includes('Add atom')) {
  //   console.log('Cannot add "Add Text" after "Add atom" event.');
  //   return;
  // }

  // Add event to FILO stack only if it's not already in uniqueEvents
  if (!uniqueEvents.has(event)) {
    FILOStack.push(event);
    uniqueEventsAddEvent(event);
  }
};

// Handlers for each event operation, mapped by operation name;
const eventOperationHandlers = {
  'Load canvas': async () => {
    await eventLoadCanvas();
  },
  'Move image': async () => {
    addEventToFILOStack('Move image');
  },
  'Add atom': async () => {
    addEventToFILOStack('Add atom');
  },
  'Upsert image': async () => {
    eventUpsertImageDecrement();
    addEventToFILOStack('Upsert image');
  },
  'Move atom': async () => {
    allowProcessingSetter(true);
    addEventToFILOStack('Move atom');
  },
  'Delete image': async () => {
    addEventToFILOStack('Delete atom');
  },
  'Delete atom': async (eventItem) => {
    await eventCollectDeletedAtoms(eventItem);
    addEventToFILOStack('Delete atom');
  },
  'Add text': async () => {
    addEventToFILOStack('Add text');
  },
  'Delete text': async () => {
    addEventToFILOStack('Delete text');
  }
};

// helper function to execute a stack: first in last out
const processFILOStack = async (eventHandlers) => {
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
  FILOStackSetter([]);
  uniqueEventsClear();
};

// main function to capture all events from editor
const handleEventCapture = async (editor, data, eventHandlers) => {
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
    processFILOStack(eventHandlers);
  }
};

export { addEventToFILOStack, processFILOStack, handleEventCapture };
