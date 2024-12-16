import ElementContainer from 'src/models/Container';
import ArrayUtils from 'src/utilities/ArrayUtils';
import Attachment from 'src/models/Attachment';
import { reOrderArr } from 'src/utilities/DndControl';

function buildEmptyAnalyContainer(isComparison = false) {
  const newContainer = ElementContainer.buildEmpty();
  newContainer.container_type = 'analysis';
  newContainer.extended_metadata.content = { ops: [{ insert: '\n' }] };
  newContainer.extended_metadata.is_comparison = isComparison;
  return newContainer;
}

function sortedContainers(sample) {
  const containers = sample.analysesContainers()[0].children;
  return ArrayUtils.sortArrByIndex(containers);
}

function indexedContainers(containers) {
  return containers.map((c, i) => {
    const container = c;
    container.extended_metadata.index = i;
    return container;
  });
}

function addNewAnalyses(element, isComparison = false) {
  const newContainer = buildEmptyAnalyContainer(isComparison);

  const sortedConts = sortedContainers(element);
  const newSortConts = [...sortedConts, newContainer];
  const newIndexedConts = indexedContainers(newSortConts);

  element.analysesContainers()[0].children = newIndexedConts;

  return newContainer;
}

function createDataset() {
  const datasetContainer = ElementContainer.buildEmpty();
  datasetContainer.container_type = 'dataset';
  return datasetContainer;
}

function createAttachements(files) {
  return files.map((f) => {
    const newAttachment = Attachment.fromFile(f);
    newAttachment.is_pending = true;
    return newAttachment;
  });
}

function createAnalsesForSingelFiles(element, files, name, ontology = '') {
  const newContainer = addNewAnalyses(element);
  newContainer.extended_metadata.kind = ontology;
  newContainer.name = `File: ${name}`;
  const datasetContainer = createDataset();
  const newAttachments = createAttachements(files);

  newContainer.children.push(datasetContainer);
  datasetContainer.attachments.push(...newAttachments);
}

function findAnalysesContainer(element) {
  return element.container.children.find(
    (c) => ~c.container_type.indexOf('analyses')
  );
}

function reorderAnalyses(analysesContainer, source, target) {
  const sorted = ArrayUtils.sortArrByIndex(analysesContainer.children);
  const isEqCId = (c, t) => c.id === t.id;
  const reordered = reOrderArr(source, target, isEqCId, sorted);
  analysesContainer.children = indexedContainers(reordered);
}

export {
  addNewAnalyses,
  indexedContainers,
  sortedContainers,
  buildEmptyAnalyContainer,
  createDataset,
  createAnalsesForSingelFiles,
  createAttachements,
  findAnalysesContainer,
  reorderAnalyses,
};
