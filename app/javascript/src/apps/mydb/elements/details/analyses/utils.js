import ElementContainer from "src/models/Container";
import ArrayUtils from "src/utilities/ArrayUtils";
import Attachment from "../../../../../models/Attachment";

function buildEmptyAnalyContainer() {
    const newContainer = ElementContainer.buildEmpty();
    newContainer.container_type = 'analysis';
    newContainer.extended_metadata.content = {ops: [{insert: '\n'}]};
    return newContainer;
};

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

function addNewAnalyses(element) {
    const newContainer = buildEmptyAnalyContainer();

    const sortedConts = sortedContainers(element);
    const newSortConts = [...sortedConts, newContainer];
    const newIndexedConts = indexedContainers(newSortConts);

    element.analysesContainers()[0].children = newIndexedConts;

    return newContainer;
}

function createAnalsesForSingelFiles(element, files, name) {
    const newContainer = addNewAnalyses(element);

    const newAttachments = files.map((f) => {
        const newAttachment = Attachment.fromFile(f);
        newAttachment.is_pending = true;
        return newAttachment;
    });


    newContainer.name = `File: ${name}`;
    const datasetContainer = ElementContainer.buildEmpty();
    datasetContainer.container_type = 'dataset';

    newContainer.children.push(datasetContainer);
    datasetContainer.attachments.push(...newAttachments);
};

export {
    addNewAnalyses,
    indexedContainers,
    sortedContainers,
    buildEmptyAnalyContainer,
    createAnalsesForSingelFiles
}