import expect from 'expect';
import React from 'react';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import Aviator from 'aviator';
import sinon from 'sinon';
import toast from 'react-hot-toast';
import alt from 'src/stores/alt/alt';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import InboxStore from 'src/stores/alt/stores/InboxStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ContainerActions from 'src/stores/alt/actions/ContainerActions';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import ContainerFetcher from 'src/fetchers/ContainerFetcher';
import InboxFetcher from 'src/fetchers/InboxFetcher';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import AnnotationsFetcher from 'src/fetchers/AnnotationsFetcher';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import LoadingStore from 'src/stores/alt/stores/LoadingStore';
import LoadingModal from 'src/components/common/LoadingModal';
import SampleDetails from 'src/apps/mydb/elements/details/samples/SampleDetails';
import Sample from 'src/models/Sample';
import Container from 'src/models/Container';
import Attachment from 'src/models/Attachment';
import { rootStore } from 'src/stores/mobx/RootStore';
import MoveToAnalysisButton from 'src/apps/mydb/inbox/MoveToAnalysisButton';
import UnsortedBox from 'src/apps/mydb/inbox/UnsortedBox';
import {
  DragDropItemTypes, targetAttachmentDropzone, targetContainerDataField,
} from 'src/utilities/DndConst';

const fetchInboxActionId = InboxActions.fetchInbox.id;
const defaultFetch = global.fetch;
configure({ adapter: new Adapter() });

const inboxPayload = () => ({
  inbox_count: 10, // Includes attachments on device/dataset pages that are not loaded.
  count: 2,
  children: [{
    id: 100,
    children_count: 40,
    children: [{
      id: 101,
      attachments: [{ id: 1, attachable_id: 101 }, { id: 2, attachable_id: 101 }],
    }, {
      id: 102,
      attachments: [{ id: 3, attachable_id: 102 }],
    }],
  }],
  unlinked_attachments: [{ id: 4, attachable_id: null }, { id: 5, attachable_id: null }],
});

const loadInbox = () => alt.dispatch(fetchInboxActionId, { inbox: inboxPayload() });
const count = () => InboxStore.getState().numberOfAttachments;
const firstDataset = () => InboxStore.getState().inbox.children[0].children[0];
const drop = (target, props, itemType, item) => target.dataTarget.drop(props, {
  getItemType: () => itemType,
  getItem: () => item,
});

describe('InboxStore attachment assignment count', () => {
  beforeEach(() => {
    alt.flush();
    loadInbox();
  });

  afterEach(() => sinon.restore());

  it('includes unloaded device attachments and unsorted files in the initial count', () => {
    expect(count()).toBe(12);
  });

  [
    ['a new dataset', targetAttachmentDropzone, () => ({ handleAddWithAttachments: sinon.spy() })],
    ['an existing dataset', targetContainerDataField, () => ({
      datasetContainer: { attachments: [{ id: 99 }] }, onChange: sinon.spy(),
    })],
  ].forEach(([destination, target, makeProps]) => {
    it(`decreases the badge by one when dragging a device attachment to ${destination}`, () => {
      const attachment = firstDataset().attachments[0];
      const listener = sinon.spy();
      InboxStore.listen(listener);
      try {
        drop(target, makeProps(), DragDropItemTypes.DATA, { attachment });
        expect(firstDataset().attachments.map((item) => item.id)).toEqual([2]);
        expect(count()).toBe(11);
        expect(listener.lastCall.args[0].numberOfAttachments).toBe(11);
      } finally {
        InboxStore.unlisten(listener);
      }
    });

    it(`decreases the badge by the number of files when dragging a dataset to ${destination}`, () => {
      drop(target, makeProps(), DragDropItemTypes.DATASET, { dataset: firstDataset() });
      expect(firstDataset().attachments).toEqual([]);
      expect(count()).toBe(10);
    });

    it(`counts an unsorted attachment only once when dragging it to ${destination}`, () => {
      const attachment = InboxStore.getState().inbox.unlinked_attachments[0];
      drop(target, makeProps(), DragDropItemTypes.UNLINKED_DATA, { attachment });
      expect(count()).toBe(11);
    });
  });

  it('does not subtract an attachment again if the removal is repeated', () => {
    const attachment = firstDataset().attachments[0];
    InboxActions.removeAttachmentFromList(attachment);
    InboxActions.removeAttachmentFromList(attachment);
    expect(count()).toBe(11);
  });

  it('keeps pending assignments excluded after refreshing the inbox', () => {
    InboxActions.removeAttachmentFromList(firstDataset().attachments[0]);
    InboxActions.removeUnlinkedAttachmentFromList(InboxStore.getState().inbox.unlinked_attachments[0]);
    loadInbox();
    expect(firstDataset().attachments.map((item) => item.id)).toEqual([2]);
    expect(count()).toBe(10);
  });

  [
    ['device file', DragDropItemTypes.DATA, () => firstDataset().attachments[0]],
    ['Unsorted file', DragDropItemTypes.UNLINKED_DATA, () => InboxStore.getState().inbox.unlinked_attachments[0]],
    ['whole dataset', DragDropItemTypes.DATASET, () => firstDataset()],
  ].forEach(([label, itemType, source]) => {
    it(`counts the first ${label} drag when the inbox objects refresh during the drop`, () => {
      const item = source();
      const expectedCount = itemType === DragDropItemTypes.DATASET ? 10 : 11;
      const props = { datasetContainer: { attachments: [] }, onChange: loadInbox };

      expect(InboxStore.getState().cache).toEqual([]);
      loadInbox();
      drop(targetContainerDataField, props, itemType, {
        attachment: item, dataset: item,
      });

      expect(count()).toBe(expectedCount);
      expect(InboxStore.getState().cache.length).toBe(12 - expectedCount);
    });
  });

  it('keeps pending assignments excluded after a count-only refresh', () => {
    InboxActions.removeAttachmentFromList(firstDataset().attachments[0]);
    InboxActions.removeUnlinkedAttachmentFromList(InboxStore.getState().inbox.unlinked_attachments[0]);
    alt.dispatch(InboxActions.fetchInboxCount.id, { inbox_count: 12 });
    expect(count()).toBe(10);
  });

  it('keeps pending assignments excluded after refreshing unsorted files', () => {
    InboxActions.removeUnlinkedAttachmentFromList(InboxStore.getState().inbox.unlinked_attachments[0]);
    // The unsorted endpoint uses InboxService's linked-only count, without device children.
    const { inbox_count: inboxCount, unlinked_attachments: unlinkedAttachments } = inboxPayload();
    alt.dispatch(InboxActions.fetchInboxUnsorted.id, {
      inbox_count: inboxCount,
      unlinked_attachments: unlinkedAttachments,
    });
    expect(InboxStore.getState().inbox.unlinked_attachments.map((item) => item.id)).toEqual([5]);
    expect(count()).toBe(11);
  });

  it('preserves the count when switching to another device page with pending assignments', () => {
    InboxActions.removeAttachmentFromList(firstDataset().attachments[0]);
    alt.dispatch(InboxActions.fetchInboxContainer.id, {
      inbox: { id: 100, inbox_count: 10, children_count: 40, children: [] },
      currentContainerPage: 2,
      containerId: 100,
    });
    expect(count()).toBe(11);
  });

  it('normalizes the container endpoint count before adding unsorted files', () => {
    InboxActions.removeAttachmentFromList(firstDataset().attachments[0]);
    alt.dispatch(InboxActions.fetchInboxContainer.id, {
      inbox: {
        id: 100, inbox_count: 12, unlinked_attachments: [{ id: 4 }, { id: 5 }], children: [],
      },
      currentContainerPage: 2,
      containerId: 100,
    });
    expect(count()).toBe(11);
  });

  [DragDropItemTypes.DATA, DragDropItemTypes.UNLINKED_DATA].forEach((sourceType) => {
    it(`does not treat a completed move-to-analysis assignment from ${sourceType} as pending`, () => {
      const inbox = inboxPayload();
      const attachment = sourceType === DragDropItemTypes.DATA
        ? firstDataset().attachments[0] : InboxStore.getState().inbox.unlinked_attachments[0];
      new MoveToAnalysisButton({ attachment, sourceType }).removeAttachment();
      expect(count()).toBe(11);
      expect(InboxStore.getState().cache).toEqual([]);

      if (sourceType === DragDropItemTypes.DATA) {
        inbox.inbox_count -= 1;
        inbox.children[0].children[0].attachments.shift();
      } else {
        inbox.unlinked_attachments.shift();
      }
      alt.dispatch(fetchInboxActionId, { inbox });
      expect(count()).toBe(11);
      alt.dispatch(InboxActions.fetchInboxCount.id, { inbox_count: 11 });
      expect(count()).toBe(11);
    });
  });

  it('clears pending assignments when an analysis is saved directly', async () => {
    const attachment = firstDataset().attachments[0];
    InboxActions.removeAttachmentFromList(attachment);
    sinon.stub(InboxActions, 'fetchInbox');
    sinon.stub(AttachmentFetcher, 'uploadNewAttachmentsForContainer').resolves();
    sinon.stub(ContainerFetcher, 'updateContainer').resolves({
      container: { children: [{ attachments: [attachment], children: [] }] },
    });

    await ContainerActions.updateContainerWithFiles({});

    expect(InboxStore.getState().cache).toEqual([]);
    sinon.assert.calledOnce(InboxActions.fetchInbox);
    alt.dispatch(InboxActions.fetchInboxCount.id, { inbox_count: 11 });
    expect(count()).toBe(11);
  });

  [undefined, null, {}].forEach((container) => {
    it(`keeps a successful save successful when the returned container is ${JSON.stringify(container)}`, async () => {
      const attachment = firstDataset().attachments[0];
      InboxActions.removeAttachmentFromList(attachment);
      sinon.stub(InboxActions, 'fetchInbox');
      sinon.stub(AttachmentFetcher, 'uploadNewAttachmentsForContainer').resolves();
      sinon.stub(ContainerFetcher, 'updateContainer').resolves({ container });
      const successNotification = sinon.stub(toast, 'success');
      const errorLog = sinon.stub(console, 'error');

      await expect(ContainerActions.updateContainerWithFiles({})).resolves.toEqual({
        container, variations: null,
      });

      expect(InboxStore.getState().cache).toEqual([attachment]);
      expect(count()).toBe(11);
      sinon.assert.calledOnce(successNotification);
      expect(successNotification.firstCall.args[0]).toBe('Analysis has been updated.');
      sinon.assert.notCalled(errorLog);
      sinon.assert.notCalled(InboxActions.fetchInbox);
    });
  });

  [
    ['analysis', (container) => ContainerActions.updateContainerWithFiles(container)],
    ['sample', (container) => alt.dispatch(ElementActions.updateSample.id, {
      element: { isEdited: true, container },
    })],
  ].forEach(([elementType, save]) => {
    it(`refreshes the active device folder on its current page after saving the ${elementType}`, async () => {
      const attachment = firstDataset().attachments[0];
      InboxActions.removeAttachmentFromList(attachment);
      InboxActions.setInboxPagination({ currentPage: 3 });
      alt.dispatch(InboxActions.fetchInboxContainer.id, {
        inbox: { id: 100, inbox_count: 10, children_count: 40, children: [] },
        currentContainerPage: 2,
        containerId: 100,
      });
      const container = { children: [{ attachments: [attachment], children: [] }] };
      const inbox = inboxPayload();
      inbox.inbox_count = 9;
      inbox.children[0].children[0].attachments.shift();
      const fetchInbox = sinon.stub(InboxFetcher, 'fetchInbox').resolves({ inbox });
      const fetchContainer = sinon.stub(InboxActions, 'fetchInboxContainer');
      sinon.stub(AttachmentFetcher, 'uploadNewAttachmentsForContainer').resolves();
      sinon.stub(ContainerFetcher, 'updateContainer').resolves({ container });

      await save(container);

      sinon.assert.calledOnceWithExactly(fetchInbox, false, {
        currentPage: 3, itemsPerPage: 20, activeDeviceBoxId: 100,
      });
      sinon.assert.calledOnceWithExactly(fetchContainer, 100, 2);
      expect(InboxStore.getState().activeDeviceBoxId).toBe(100);
      expect(InboxStore.getState().currentContainerPage).toBe(2);
      expect(InboxStore.getState().cache).toEqual([]);
      expect(count()).toBe(11);
    });
  });

  it('preserves the unsorted selection without fetching it as a device folder', () => {
    const fetchContainer = sinon.stub(InboxActions, 'fetchInboxContainer');

    alt.dispatch(fetchInboxActionId, { inbox: inboxPayload(), activeDeviceBoxId: -1 });

    expect(InboxStore.getState().activeDeviceBoxId).toBe(-1);
    expect(count()).toBe(12);
    sinon.assert.notCalled(fetchContainer);
  });

  [undefined, null].forEach((children) => {
    it(`accepts a device folder with ${children} children when synchronizing the inbox`, () => {
      const inbox = inboxPayload();
      inbox.children[0].children = children;

      alt.dispatch(fetchInboxActionId, { inbox });

      expect(count()).toBe(12);
    });
  });

  it('retains pending assignments and their count when saving an analysis fails', async () => {
    const attachment = firstDataset().attachments[0];
    InboxActions.removeAttachmentFromList(attachment);
    sinon.stub(InboxActions, 'fetchInbox');
    sinon.stub(AttachmentFetcher, 'uploadNewAttachmentsForContainer').resolves();
    sinon.stub(ContainerFetcher, 'updateContainer').rejects(new Error('Save failed'));
    sinon.stub(console, 'error');

    await expect(ContainerActions.updateContainerWithFiles({})).rejects.toThrow('Save failed');

    expect(InboxStore.getState().cache).toEqual([attachment]);
    expect(count()).toBe(11);
    sinon.assert.notCalled(InboxActions.fetchInbox);
  });

  it('restores the count when a pending attachment is returned to the inbox', () => {
    const attachment = firstDataset().attachments[0];
    InboxActions.removeAttachmentFromList(attachment);
    sinon.stub(InboxActions, 'fetchInbox');
    InboxActions.backToInbox(attachment);
    loadInbox();
    expect(count()).toBe(12);
    expect(InboxStore.getState().cache).toEqual([]);
  });

  it('uses the new server total after assigned attachments are saved', () => {
    const attachment = firstDataset().attachments[0];
    InboxActions.removeAttachmentFromList(attachment);
    sinon.stub(InboxActions, 'fetchInbox');
    alt.dispatch(ElementActions.updateSample.id, {
      element: { isEdited: true, container: { children: [{ attachments: [attachment], children: [] }] } },
    });
    const inbox = inboxPayload();
    inbox.inbox_count = 9;
    inbox.children[0].children[0].attachments.shift();
    alt.dispatch(fetchInboxActionId, { inbox });
    expect(count()).toBe(11);
    expect(InboxStore.getState().cache).toEqual([]);
  });
});

describe('InboxStore deletion count', () => {
  beforeEach(() => {
    alt.recycle(InboxStore);
    loadInbox();
    sinon.stub(InboxFetcher, 'fetchInbox').resolves({ inbox: inboxPayload() });
  });

  afterEach(() => sinon.restore());

  const settleRequests = () => new Promise((resolve) => setImmediate(resolve));
  const mockInboxAfterDelete = (ids) => {
    const inbox = inboxPayload();
    inbox.children[0].children.forEach((dataset) => {
      dataset.attachments = dataset.attachments.filter((attachment) => !ids.includes(attachment.id));
    });
    inbox.inbox_count -= ids.length;
    sinon.stub(InboxFetcher, 'fetchInboxUnsorted').resolves({
      inbox: { inbox_count: inbox.inbox_count, unlinked_attachments: inbox.unlinked_attachments },
    });
    return inbox;
  };

  it('decreases the badge when the DELETE succeeds even while its count refresh is pending', async () => {
    const attachment = firstDataset().attachments[0];
    sinon.stub(AttachmentFetcher, 'deleteAttachment').resolves(attachment);
    sinon.stub(InboxFetcher, 'fetchInboxUnsorted').returns(new Promise(() => {}));

    InboxActions.deleteAttachment(attachment);
    await settleRequests();

    expect(firstDataset().attachments.map((item) => item.id)).toEqual([2]);
    expect(count()).toBe(11);
  });

  it('decreases the badge after bulk deletion even if its background count refresh fails', async () => {
    sinon.stub(AttachmentFetcher, 'bulkDeleteAttachments').resolves({ deleted_attachments: [{ id: 1 }, { id: 2 }] });
    sinon.stub(InboxFetcher, 'fetchInboxUnsorted').rejects(new Error('Count unavailable'));
    sinon.stub(console, 'log');

    InboxActions.bulkDeleteAttachments([1, 2]);
    await settleRequests();

    expect(firstDataset().attachments).toEqual([]);
    expect(count()).toBe(10);
  });

  it('keeps a fresh count-only total as the baseline for the next Unsorted deletion', async () => {
    alt.dispatch(InboxActions.fetchInboxCount.id, { inbox_count: 11 });
    const attachment = InboxStore.getState().inbox.unlinked_attachments[0];
    sinon.stub(AttachmentFetcher, 'deleteAttachment').resolves(attachment);

    InboxActions.deleteAttachment(attachment, true);
    await settleRequests();

    expect(count()).toBe(10);
  });

  it('normalizes a count-only refresh with pending device and Unsorted moves before another deletion', async () => {
    InboxActions.removeAttachmentFromList(firstDataset().attachments[0]);
    InboxActions.removeUnlinkedAttachmentFromList(InboxStore.getState().inbox.unlinked_attachments[0]);
    alt.dispatch(InboxActions.fetchInboxCount.id, { inbox_count: 11 });
    const attachment = InboxStore.getState().inbox.unlinked_attachments[0];
    sinon.stub(AttachmentFetcher, 'deleteAttachment').resolves(attachment);

    InboxActions.deleteAttachment(attachment, true);
    await settleRequests();

    expect(count()).toBe(8);
    expect(InboxStore.getState().cache.map((item) => item.id)).toEqual([1, 4]);
  });

  it('refreshes the count after deleting a device file without an active device ID', async () => {
    const attachment = firstDataset().attachments[0];
    sinon.stub(AttachmentFetcher, 'deleteAttachment').resolves(attachment);
    const fetchContainer = sinon.stub(InboxActions, 'fetchInboxContainer');
    mockInboxAfterDelete([attachment.id]);

    InboxActions.deleteAttachment(attachment);
    await settleRequests();

    expect(count()).toBe(11);
    expect(firstDataset().attachments.map((item) => item.id)).toEqual([2]);
    sinon.assert.calledOnce(InboxFetcher.fetchInboxUnsorted);
    sinon.assert.notCalled(InboxFetcher.fetchInbox);
    sinon.assert.notCalled(fetchContainer);
  });

  it('refreshes the count after bulk deletion without an active device ID', async () => {
    sinon.stub(AttachmentFetcher, 'bulkDeleteAttachments').resolves({ deleted_attachments: [{ id: 1 }, { id: 2 }] });
    const fetchContainer = sinon.stub(InboxActions, 'fetchInboxContainer');
    mockInboxAfterDelete([1, 2]);

    InboxActions.bulkDeleteAttachments([1, 2]);
    await settleRequests();

    expect(count()).toBe(10);
    expect(firstDataset().attachments).toEqual([]);
    sinon.assert.notCalled(fetchContainer);
  });

  it('updates a page-2 file in place without reloading the inbox or device page', async () => {
    const attachment = firstDataset().attachments[0];
    const dataset = firstDataset();
    alt.dispatch(InboxActions.fetchInboxContainer.id, {
      inbox: { id: 100, inbox_count: 10, children_count: 40, children: [dataset] },
      currentContainerPage: 2,
      containerId: 100,
    });
    const pageChildren = InboxStore.getState().inbox.children[0].children;
    sinon.stub(AttachmentFetcher, 'deleteAttachment').resolves(attachment);
    mockInboxAfterDelete([attachment.id]);
    const fetchContainer = sinon.stub(InboxFetcher, 'fetchInboxByContainer');

    InboxActions.deleteAttachment(attachment);
    await settleRequests();

    expect(count()).toBe(11);
    expect(InboxStore.getState().activeDeviceBoxId).toBe(100);
    expect(InboxStore.getState().currentContainerPage).toBe(2);
    expect(InboxStore.getState().inbox.children[0].children).toBe(pageChildren);
    expect(firstDataset().attachments.map((item) => item.id)).toEqual([2]);
    sinon.assert.notCalled(InboxFetcher.fetchInbox);
    sinon.assert.notCalled(fetchContainer);
  });

  it('refreshes the count after deleting a dataset and preserves other pending assignments', async () => {
    InboxActions.removeAttachmentFromList(firstDataset().attachments[0]);
    const dataset = InboxStore.getState().inbox.children[0].children[1];
    sinon.stub(ContainerFetcher, 'deleteContainer').resolves();
    InboxStore.getState().inbox.children[0].children_count = 40;
    const inbox = mockInboxAfterDelete([3]);
    inbox.children[0].children.pop();

    InboxActions.deleteContainer(dataset);
    await settleRequests();

    expect(count()).toBe(10); // 12 minus the pending move and the deleted attachment.
    expect(InboxStore.getState().cache.map((attachment) => attachment.id)).toEqual([1]);
    expect(InboxStore.getState().inbox.children[0].children.map((child) => child.id)).toEqual([101]);
    expect(InboxStore.getState().inbox.children[0].children_count).toBe(39);
    sinon.assert.notCalled(InboxFetcher.fetchInbox);
  });

  it('refreshes the count and clears the active selection after deleting that device folder', async () => {
    const device = InboxStore.getState().inbox.children[0];
    InboxActions.setActiveDeviceBoxId(device.id);
    sinon.stub(ContainerFetcher, 'deleteContainer').resolves();
    const inbox = inboxPayload();
    inbox.children = [];
    inbox.count = 0;
    inbox.inbox_count = 0;
    InboxFetcher.fetchInbox.resolves({ inbox });
    const fetchContainer = sinon.stub(InboxActions, 'fetchInboxContainer');

    InboxActions.deleteContainer(device);
    await settleRequests();

    expect(count()).toBe(2);
    expect(InboxStore.getState().activeDeviceBoxId).toBe(null);
    sinon.assert.notCalled(fetchContainer);
  });

  it('does not decrease the count or refresh when deleting a device file fails', async () => {
    const attachment = firstDataset().attachments[0];
    sinon.stub(AttachmentFetcher, 'deleteAttachment').rejects(new Error('Delete failed'));
    const fetchInbox = sinon.stub(InboxActions, 'fetchInbox');
    const fetchContainer = sinon.stub(InboxActions, 'fetchInboxContainer');
    sinon.stub(console, 'log');

    InboxActions.deleteAttachment(attachment);
    await settleRequests();

    expect(count()).toBe(12);
    expect(firstDataset().attachments.map((item) => item.id)).toEqual([1, 2]);
    sinon.assert.notCalled(fetchInbox);
    sinon.assert.notCalled(fetchContainer);
  });

  it('still decreases the count after deleting an individual Unsorted file', async () => {
    const attachment = InboxStore.getState().inbox.unlinked_attachments[0];
    sinon.stub(AttachmentFetcher, 'deleteAttachment').resolves(attachment);

    InboxActions.deleteAttachment(attachment, true);
    await settleRequests();

    expect(count()).toBe(11);
    expect(InboxStore.getState().inbox.unlinked_attachments.map((item) => item.id)).toEqual([5]);
  });
});

describe('Inbox deletion background updates', () => {
  const settleRequests = () => new Promise((resolve) => setImmediate(resolve));

  beforeEach(() => {
    // Some earlier specs remove the setup fetch implementation during cleanup.
    if (!global.fetch) global.fetch = defaultFetch;
    alt.recycle(InboxStore);
    loadInbox();
  });

  afterEach(() => sinon.restore());

  [false, true].forEach((fromUnsorted) => {
    ['network', 'unauthorized', 'invalid response'].forEach((failure) => {
      it(`keeps ${fromUnsorted ? 'Unsorted' : 'device'} files and counts after bulk-delete ${failure}`, async () => {
        const fetch = sinon.stub(global, 'fetch');
        if (failure === 'network') {
          fetch.rejects(new TypeError('Failed to fetch'));
        } else {
          fetch.resolves(new Response(JSON.stringify({ error: 'Delete failed' }), {
            status: failure === 'unauthorized' ? 401 : 200,
          }));
        }
        sinon.stub(console, 'log');
        const refresh = sinon.stub(InboxActions, 'refreshInboxCounts');

        InboxActions.bulkDeleteAttachments(fromUnsorted ? [4, 5] : [1, 2], fromUnsorted);
        await settleRequests();

        expect(count()).toBe(12);
        expect(firstDataset().attachments.map((attachment) => attachment.id)).toEqual([1, 2]);
        expect(InboxStore.getState().inbox.unlinked_attachments.map((attachment) => attachment.id)).toEqual([4, 5]);
        expect(InboxStore.getState().cache).toEqual([]);
        sinon.assert.notCalled(refresh);
      });
    });
  });

  it('removes only attachments confirmed deleted by the bulk response', async () => {
    sinon.stub(AttachmentFetcher, 'bulkDeleteAttachments').resolves({ deleted_attachments: [{ id: 4 }] });

    InboxActions.bulkDeleteAttachments([4, 5], true);
    await settleRequests();

    expect(count()).toBe(11);
    expect(InboxStore.getState().inbox.unlinked_attachments.map((attachment) => attachment.id)).toEqual([5]);
  });

  it('counts the first drag after failed, delayed and overlapping deletes with no prior pending moves', async () => {
    const serverInbox = inboxPayload();
    serverInbox.children[0].children.push(
      { id: 103, attachments: [{ id: 10, attachable_id: 103 }, { id: 11, attachable_id: 103 }] },
      { id: 104, attachments: [{ id: 12, attachable_id: 104 }] },
      { id: 105, attachments: [13, 14, 15, 16].map((id) => ({ id, attachable_id: 105 })) },
    );
    const refresh = () => alt.dispatch(fetchInboxActionId, { inbox: JSON.parse(JSON.stringify(serverInbox)) });
    const removeOnServer = (ids) => {
      serverInbox.children[0].children.forEach((dataset) => {
        dataset.attachments = dataset.attachments.filter((attachment) => !ids.includes(attachment.id));
      });
      serverInbox.inbox_count -= ids.length;
    };
    refresh();
    sinon.stub(console, 'log');
    const deleteFile = sinon.stub(AttachmentFetcher, 'deleteAttachment');
    deleteFile.onFirstCall().rejects(new TypeError('Failed to fetch'));
    const bulkDelete = sinon.stub(AttachmentFetcher, 'bulkDeleteAttachments');
    bulkDelete.onFirstCall().resolves(undefined);
    bulkDelete.onSecondCall().resolves({ error: '401 Unauthorized' });
    sinon.stub(InboxFetcher, 'fetchInboxUnsorted').callsFake(async () => ({
      inbox: { inbox_count: serverInbox.inbox_count, unlinked_attachments: serverInbox.unlinked_attachments },
    }));

    InboxActions.deleteAttachment({ id: 1 });
    await settleRequests();
    InboxActions.bulkDeleteAttachments([1, 2]);
    await settleRequests();
    refresh();

    let finishFirst;
    let finishSecond;
    deleteFile.onSecondCall().returns(new Promise((resolve) => { finishFirst = resolve; }));
    deleteFile.onThirdCall().returns(new Promise((resolve) => { finishSecond = resolve; }));
    InboxActions.deleteAttachment({ id: 2 });
    InboxActions.deleteAttachment({ id: 3 });
    removeOnServer([3]);
    finishSecond({ id: 3 });
    await settleRequests();
    removeOnServer([2]);
    finishFirst({ id: 2 });
    await settleRequests();

    let finishDataset;
    sinon.stub(ContainerFetcher, 'deleteContainer').returns(new Promise((resolve) => { finishDataset = resolve; }));
    InboxActions.deleteContainer({ id: 103 });
    InboxActions.bulkDeleteAttachments([10, 11]);
    removeOnServer([10, 11]);
    serverInbox.children[0].children = serverInbox.children[0].children.filter((dataset) => dataset.id !== 103);
    finishDataset();
    await settleRequests();

    deleteFile.onCall(3).resolves({ id: 12 });
    removeOnServer([12]);
    InboxActions.deleteAttachment({ id: 12 });
    await settleRequests();

    expect(count()).toBe(7);
    expect(InboxStore.getState().cache).toEqual([]);
    const attachment = firstDataset().attachments[0];
    const props = { datasetContainer: { attachments: [] }, onChange: refresh };
    drop(targetContainerDataField, props, DragDropItemTypes.DATA, { attachment });

    expect(count()).toBe(6);
    expect(props.datasetContainer.attachments.map((item) => item.id)).toEqual([1]);
    expect(InboxStore.getState().cache.map((item) => item.id)).toEqual([1]);
    expect(firstDataset().attachments).toEqual([]);
  });

  it('ignores an older count response that arrives after a later deletion response', async () => {
    let completeFirst;
    let completeSecond;
    const summary = sinon.stub(InboxFetcher, 'fetchInboxUnsorted');
    summary.onFirstCall().returns(new Promise((resolve) => { completeFirst = resolve; }));
    summary.onSecondCall().returns(new Promise((resolve) => { completeSecond = resolve; }));

    InboxActions.refreshInboxCounts();
    InboxActions.refreshInboxCounts();
    completeSecond({ inbox: { inbox_count: 8, unlinked_attachments: inboxPayload().unlinked_attachments } });
    await settleRequests();
    expect(count()).toBe(10);

    completeFirst({ inbox: { inbox_count: 9, unlinked_attachments: inboxPayload().unlinked_attachments } });
    await settleRequests();
    expect(count()).toBe(10);
  });

  it('keeps the displayed device page while multiple selected datasets are deleted', async () => {
    const datasets = [...InboxStore.getState().inbox.children[0].children];
    InboxStore.getState().inbox.children[0].children_count = 40;
    sinon.stub(ContainerFetcher, 'deleteContainer').resolves();
    const fetchInbox = sinon.stub(InboxFetcher, 'fetchInbox');
    const fetchContainer = sinon.stub(InboxFetcher, 'fetchInboxByContainer');
    const summary = sinon.stub(InboxFetcher, 'fetchInboxUnsorted').resolves({
      inbox: { inbox_count: 7, unlinked_attachments: inboxPayload().unlinked_attachments },
    });

    datasets.forEach((dataset) => InboxActions.deleteContainer(dataset));
    await settleRequests();

    expect(count()).toBe(9);
    expect(InboxStore.getState().inbox.children[0].children).toEqual([]);
    expect(InboxStore.getState().inbox.children[0].children_count).toBe(38);
    sinon.assert.called(summary);
    sinon.assert.notCalled(fetchInbox);
    sinon.assert.notCalled(fetchContainer);
  });

  it('keeps pending Unsorted files and their pagination while refreshing counts', async () => {
    InboxActions.removeUnlinkedAttachmentFromList(InboxStore.getState().inbox.unlinked_attachments[0]);
    InboxActions.nextClick();
    const attachment = InboxStore.getState().inbox.children[0].children[1].attachments[0];
    sinon.stub(AttachmentFetcher, 'deleteAttachment').resolves(attachment);
    sinon.stub(InboxFetcher, 'fetchInboxUnsorted').resolves({
      inbox: { inbox_count: 9, unlinked_attachments: inboxPayload().unlinked_attachments },
    });
    const fetchInbox = sinon.stub(InboxFetcher, 'fetchInbox');

    InboxActions.deleteAttachment(attachment);
    await settleRequests();

    expect(count()).toBe(10);
    expect(InboxStore.getState().currentUnsortedBoxPage).toBe(2);
    expect(InboxStore.getState().inbox.unlinked_attachments.map((item) => item.id)).toEqual([5]);
    InboxActions.removeAttachmentFromList(firstDataset().attachments[0]);
    expect(count()).toBe(9);
    sinon.assert.notCalled(fetchInbox);
  });

  it('does not load stale Unsorted files while bulk deletion is still pending', async () => {
    let completeDelete;
    sinon.stub(AttachmentFetcher, 'bulkDeleteAttachments').returns(new Promise((resolve) => {
      completeDelete = resolve;
    }));
    const fetchUnsorted = sinon.stub(InboxFetcher, 'fetchInboxUnsorted').resolves({ inbox: inboxPayload() });
    const context = {
      state: { checkedIds: [4, 5], currentUnsortedBoxPage: 1, dataItemsPerPage: 35 },
      toggleTooltip: sinon.spy(),
      setState: sinon.spy(),
    };

    UnsortedBox.prototype.deleteCheckedAttachment.call(context, InboxStore.getState().inbox.unlinked_attachments);
    await settleRequests();
    sinon.assert.notCalled(fetchUnsorted);
    expect(count()).toBe(12);

    completeDelete({ deleted_attachments: [{ id: 4 }, { id: 5 }] });
    await settleRequests();
    expect(count()).toBe(10);
    expect(InboxStore.getState().inbox.unlinked_attachments).toEqual([]);
  });
});

describe('Inbox pending moves after a sample save failure', () => {
  const settleRequests = () => new Promise((resolve) => setImmediate(resolve));

  beforeEach(() => {
    if (!global.fetch) global.fetch = defaultFetch;
    alt.recycle(InboxStore);
    alt.recycle(ElementStore);
    loadInbox();
    sinon.stub(AttachmentFetcher, 'uploadNewAttachmentsForContainer').resolves();
    sinon.stub(GenericElsFetcher, 'uploadGenericFiles').resolves();
    sinon.stub(AnnotationsFetcher, 'updateAnnotationsInContainer').resolves();
    sinon.stub(console, 'log');
  });

  afterEach(() => sinon.restore());

  ['network', 'unauthorized', 'validation', 'invalid response'].forEach((failure) => {
    it(`preserves the form and pending file on ${failure} failure, then allows retry`, async () => {
      const attachment = firstDataset().attachments[0];
      InboxActions.removeAttachmentFromList(attachment);
      const container = { children: [{ attachments: [attachment], children: [] }] };
      const sample = {
        id: 762, container, isEdited: true, serialize: () => ({ container }), isMixture: () => false,
      };
      alt.dispatch(ElementActions.fetchSampleById.id, sample);
      const { currentElement } = ElementStore.getState();
      expect(currentElement).toBe(sample);
      const saveEvents = sinon.spy();
      const stopLoading = sinon.stub(LoadingActions, 'stop');
      const errorNotification = sinon.stub(toast, 'error');
      const fetch = sinon.stub(global, 'fetch');
      if (failure === 'network') fetch.rejects(new TypeError('Failed to fetch'));
      else fetch.resolves(new Response(JSON.stringify({ error: 'Save failed' }), {
        status: { unauthorized: 401, validation: 422, 'invalid response': 200 }[failure],
      }));
      const refresh = sinon.stub(InboxActions, 'fetchInbox');
      ElementStore.listen(saveEvents);
      try {
        ElementActions.updateSample(sample);
        await settleRequests();

        expect(ElementStore.getState().currentElement).toBe(currentElement);
        sinon.assert.notCalled(saveEvents);
        expect(sample.container.children[0].attachments).toEqual([attachment]);
        expect(InboxStore.getState().cache).toEqual([attachment]);
        expect(count()).toBe(11);
        sinon.assert.calledOnce(stopLoading);
        sinon.assert.calledOnce(errorNotification);
        sinon.assert.notCalled(refresh);

        // The real fetcher must reject rather than produce an inaccessible Sample.
        await expect(SamplesFetcher.update(sample)).rejects.toThrow();
        const saved = { ...sample, components: [] };
        sinon.stub(SamplesFetcher, 'sampleElement').returns(saved);
        fetch.callsFake(async () => new Response(JSON.stringify({ sample: { id: 762 } })));
        await ElementActions.updateSample(sample);
        expect(ElementStore.getState().currentElement).toBe(saved);
        expect(InboxStore.getState().cache).toEqual([]);
        sinon.assert.calledOnce(refresh);
      } finally {
        ElementStore.unlisten(saveEvents);
      }
    });
  });
});

describe('Inbox save through SampleDetails with the real loading modal', () => {
  let modal;
  let clock;

  const settleRequests = () => new Promise((resolve) => setImmediate(resolve));
  const formWithPendingMove = () => {
    const source = firstDataset().attachments[0];
    const sample = Sample.buildEmpty();
    sample.id = 762;
    sample.is_new = false;
    sample.decoupled = true;
    sample.sum_formula = 'H2O';
    sample.molecule = null;
    sample.segments = [];
    sample.updateChecksum();
    const analysis = Container.buildAnalysis('other', 'Inbox target');
    const dataset = Container.buildEmpty();
    dataset.container_type = 'dataset';
    dataset.attachments = [new Attachment(source)];
    analysis.children.push(dataset);
    sample.container.children[0].children.push(analysis);
    InboxActions.removeAttachmentFromList(source);
    alt.dispatch(ElementActions.fetchSampleById.id, sample);
    const form = {
      state: { sample, validCas: true, trackMolfile: sample.molfile },
      props: { sample },
      context: { notifications: rootStore.notificationsStore },
      matchSelectedCollection: () => false,
      checkMolfileChange: () => {},
      setState(update) { this.state = { ...this.state, ...update }; },
    };
    form.handleSubmit = SampleDetails.prototype.handleSubmit.bind(form);
    return { sample, form };
  };

  beforeEach(() => {
    if (!global.fetch) global.fetch = defaultFetch;
    alt.recycle(InboxStore);
    alt.recycle(ElementStore);
    alt.recycle(LoadingStore);
    LoadingActions.stop();
    loadInbox();
    sinon.stub(AttachmentFetcher, 'uploadNewAttachmentsForContainer').resolves();
    sinon.stub(GenericElsFetcher, 'uploadGenericFiles').resolves();
    sinon.stub(AnnotationsFetcher, 'updateAnnotationsInContainer').resolves();
    sinon.stub(ElementActions, 'fetchSamplesByCollectionId');
    sinon.stub(console, 'log');
    sinon.stub(toast, 'error');
    modal = shallow(React.createElement(LoadingModal));
    clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  afterEach(() => {
    modal.unmount();
    sinon.restore();
  });

  ['network', 'unauthorized', 'validation', 'invalid response'].forEach((failure) => {
    it(`closes the modal after immediate ${failure} failure and permits saving the kept file again`, async () => {
      const { sample, form } = formWithPendingMove();
      const fetch = sinon.stub(global, 'fetch');
      if (failure === 'network') fetch.rejects(new TypeError('Failed to fetch'));
      else fetch.resolves(new Response(JSON.stringify({ error: 'Save failed' }), {
        status: { unauthorized: 401, validation: 422, 'invalid response': 200 }[failure],
      }));
      const refresh = sinon.stub(InboxActions, 'fetchInbox');

      SampleDetails.prototype.saveSampleOrChemical.call(form);
      await settleRequests();
      clock.tick(0);

      expect(modal.prop('show')).toBe(false);
      expect(LoadingStore.getState().loading).toBe(false);
      expect(ElementStore.getState().currentElement).toBe(sample);
      expect(sample.isPendingToSave).toBe(true);
      expect(InboxStore.getState().cache.map((attachment) => attachment.id)).toEqual([1]);
      expect(count()).toBe(11);
      sinon.assert.calledOnce(toast.error);
      sinon.assert.notCalled(refresh);

      const savedPayload = { sample: sample.serialize() };
      fetch.callsFake(async () => new Response(JSON.stringify(savedPayload)));
      SampleDetails.prototype.saveSampleOrChemical.call(form);
      await settleRequests();
      clock.tick(0);

      expect(fetch.getCalls().filter((call) => call.args[0] === '/api/v1/samples/762'
        && call.args[1].method === 'PUT')).toHaveLength(2);
      expect(modal.prop('show')).toBe(false);
      expect(ElementStore.getState().currentElement.container.children[0].children[0]
        .children[0].attachments.map((attachment) => attachment.id)).toEqual([1]);
      expect(InboxStore.getState().cache).toEqual([]);
      expect(count()).toBe(11);
      sinon.assert.calledOnce(refresh);
    });
  });

  it('does not open the loading modal when validation prevents the save', async () => {
    const { sample, form } = formWithPendingMove();
    sample.boiling_point_lowerbound = 100;
    sample.boiling_point_upperbound = 50;
    const fetch = sinon.stub(global, 'fetch');

    SampleDetails.prototype.saveSampleOrChemical.call(form);
    await settleRequests();
    clock.tick(0);

    expect(modal.prop('show')).toBe(false);
    expect(sample.isPendingToSave).toBe(true);
    sinon.assert.notCalled(fetch);
  });

  it('keeps Save and Close open on a delayed failure, then closes only after a successful retry', async () => {
    const { sample, form } = formWithPendingMove();
    const uiState = UIStore.getState();
    sinon.stub(UIStore, 'getState').returns({ ...uiState, currentCollection: { id: 41 } });
    const navigate = sinon.stub(Aviator, 'navigate');
    let finishSave;
    const fetch = sinon.stub(global, 'fetch').returns(new Promise((resolve) => { finishSave = resolve; }));
    sinon.stub(InboxActions, 'fetchInbox');

    SampleDetails.prototype.saveSampleOrChemical.call(form, true);
    await settleRequests();
    clock.tick(0);
    expect(modal.prop('show')).toBe(true);
    expect(ElementStore.getState().currentElement).toBe(sample);

    finishSave(new Response(JSON.stringify({ error: 'Save failed' }), { status: 422 }));
    await settleRequests();
    clock.tick(0);
    expect(modal.prop('show')).toBe(false);
    expect(sample.isPendingToSave).toBe(true);
    expect(ElementStore.getState().currentElement).toBe(sample);
    expect(InboxStore.getState().cache.map((attachment) => attachment.id)).toEqual([1]);

    const savedPayload = { sample: sample.serialize() };
    fetch.callsFake(async () => new Response(JSON.stringify(savedPayload)));
    SampleDetails.prototype.saveSampleOrChemical.call(form, true);
    await settleRequests();
    clock.tick(0);

    expect(ElementStore.getState().selecteds.some((element) => element.id === 762)).toBe(false);
    expect(modal.prop('show')).toBe(false);
    expect(InboxStore.getState().cache).toEqual([]);
    sinon.assert.calledOnce(navigate);
    sinon.assert.calledOnce(toast.error);
  });
});
