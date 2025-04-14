import InboxActions from 'src/stores/alt/actions/InboxActions';

const DragDropItemTypes = {
  WELL: 'well',
  ELEMENT: 'element',
  SAMPLE: 'sample',
  MATERIAL: 'material',
  REACTION: 'reaction',
  WELLPLATE: 'wellplate',
  MOLECULE: 'molecule',
  RESEARCH_PLAN: 'research_plan',
  RESEARCH_PLAN_FIELD: 'research_plan_field',
  GENERAL: 'general',
  DATA: 'data',
  UNLINKED_DATA: 'unlinked_data',
  DATASET: 'dataset',
  CONTAINER: 'container',
  GENERALPROCEDURE: 'generalProcedure',
  ELEMENT_FIELD: 'element_field',
  GENERIC_GRID: 'generic_grid',
  CELL_LINE: 'cell_line',
  DEVICE_DESCRIPTION: 'device_description',
  VESSEL: 'vessel',
  SEQUENCE_BASED_MACROMOLECULE: 'sequence_based_macromolecule',
  SEQUENCE_BASED_MACROMOLECULE_SAMPLE: 'sequence_based_macromolecule_sample',
};

const dropTargetTypes = [
  DragDropItemTypes.DATA,
  DragDropItemTypes.UNLINKED_DATA,
  DragDropItemTypes.DATASET
];

const collectTarget = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});

const canDrop = (_props, monitor) => {
  const itemType = monitor.getItemType();
  return itemType === DragDropItemTypes.DATA
    || itemType === DragDropItemTypes.UNLINKED_DATA
    || itemType === DragDropItemTypes.DATASET;
};

// define dataTarget, collectTarget, and dropTargetTypes ()
// for use in src/components/container/AttachmentDropzone.js
const targetAttachmentDropzone = {
  dropTargetTypes,
  dataTarget: {
    canDrop,
    drop(props, monitor) {
      const item = monitor.getItem();
      const itemType = monitor.getItemType();
      const { handleAddWithAttachments } = props;
      switch (itemType) {
        case DragDropItemTypes.DATA:
          handleAddWithAttachments([item.attachment]);
          InboxActions.removeAttachmentFromList(item.attachment);
          break;
        case DragDropItemTypes.UNLINKED_DATA:
          handleAddWithAttachments([item.attachment]);
          InboxActions.removeUnlinkedAttachmentFromList(item.attachment);
          break;
        case DragDropItemTypes.DATASET:
          handleAddWithAttachments(item.dataset.attachments);
          InboxActions.removeDatasetFromList(item.dataset);
          break;
        default:
          console.warn(`Unhandled itemType: ${itemType}`);
          break;
      }
    },
  },
  collectTarget,
};

// define dataTarget, collectTarget, and dropTargetTypes ()
// for use in src/components/container/ContainerDatasetField.js

const targetContainerDataField = {
  dropTargetTypes,
  dataTarget: {
    canDrop,
    drop(props, monitor) {
      const item = monitor.getItem();
      const itemType = monitor.getItemType();
      const { datasetContainer, onChange } = props;

      switch (itemType) {
        case DragDropItemTypes.DATA:
          datasetContainer.attachments.push(item.attachment);
          onChange(datasetContainer);
          InboxActions.removeAttachmentFromList(item.attachment);
          break;
        case DragDropItemTypes.UNLINKED_DATA:
          datasetContainer.attachments.push(item.attachment);
          InboxActions.removeUnlinkedAttachmentFromList(item.attachment);
          break;
        case DragDropItemTypes.DATASET:
          item.dataset.attachments.forEach((attachment) => {
            datasetContainer.attachments.push(attachment);
          });
          onChange(datasetContainer);
          InboxActions.removeDatasetFromList(item.dataset);
          break;
        default:
          console.warn(`Unknown itemType: ${itemType}`);
          break;
      }
    }
  },
  collectTarget,
};


export {
  DragDropItemTypes,
  targetAttachmentDropzone,
  targetContainerDataField,
};
