import expect from 'expect';
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
import MoveToAnalysisButton from 'src/apps/mydb/inbox/MoveToAnalysisButton';
import {
  DragDropItemTypes, targetAttachmentDropzone, targetContainerDataField,
} from 'src/utilities/DndConst';

const fetchInboxActionId = InboxActions.fetchInbox.id;

const inboxPayload = () => ({
  inbox_count: 10, // Includes attachments on device/dataset pages that are not loaded.
  count: 2,
  children: [{
    id: 100,
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
