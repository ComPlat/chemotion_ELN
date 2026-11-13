import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import alt from 'src/stores/alt/alt';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import InboxFetcher from 'src/fetchers/InboxFetcher';
import InboxStore from 'src/stores/alt/stores/InboxStore';
import ContainerFetcher from 'src/fetchers/ContainerFetcher';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import DeviceBox from 'src/apps/mydb/inbox/DeviceBox';
import Pagination from 'src/apps/mydb/inbox/Pagination';
import {
  DragDropItemTypes, targetContainerDataField,
} from 'src/utilities/DndConst';

configure({ adapter: new Adapter() });

const fetchInboxActionId = InboxActions.fetchInbox.id;
const fetchContainerActionId = InboxActions.fetchInboxContainer.id;
const dataset = (id) => ({
  id, name: `Dataset ${id}`, attachments: [{ id: id + 1000, attachable_id: id }],
});
const inboxPayload = () => ({
  count: 2,
  inbox_count: 37,
  unlinked_attachments: [],
  children: [{ id: 100, name: 'Device A', children_count: 36, children: [dataset(101)] },
    { id: 200, name: 'Device B', children_count: 1, children: [dataset(201)] }],
});

const selectDevicePage = (containerId, currentContainerPage) => alt.dispatch(fetchContainerActionId, {
  inbox: {
    id: containerId,
    inbox_count: 37,
    children_count: containerId === 100 ? 36 : 1,
    children: [dataset(containerId + currentContainerPage)],
  },
  containerId,
  currentContainerPage,
});

describe('Inbox device folder visibility during refresh', () => {
  let wrapper;
  let onStoreChange;

  beforeEach(() => {
    alt.recycle(InboxStore);
    alt.dispatch(fetchInboxActionId, { inbox: inboxPayload() });
    selectDevicePage(100, 1);
    sinon.stub(InboxActions, 'fetchInboxContainer');
    wrapper = shallow(
      <DeviceBox device_box={InboxStore.getState().inbox.children[0]} deviceBoxVisible />
    );
    // Match InboxModal.inboxSubtrees: the store selection controls this prop.
    onStoreChange = (state) => wrapper.setProps({
      device_box: state.inbox.children.find((box) => box.id === 100) || inboxPayload().children[0],
      deviceBoxVisible: state.activeDeviceBoxId === 100,
    });
    InboxStore.listen(onStoreChange);
  });

  afterEach(() => {
    InboxStore.unlisten(onStoreChange);
    wrapper.unmount();
    sinon.restore();
  });

  it('keeps the source folder open when the inbox refreshes after an unsaved drop', async () => {
    const attachment = InboxStore.getState().inbox.children[0].children[0].attachments[0];
    const targetDataset = { attachments: [] };
    targetContainerDataField.dataTarget.drop({ datasetContainer: targetDataset, onChange: sinon.spy() }, {
      getItem: () => ({ attachment }),
      getItemType: () => DragDropItemTypes.DATA,
    });
    expect(wrapper.state('visible')).toBe(true);
    sinon.stub(InboxFetcher, 'fetchInbox').resolves({ inbox: inboxPayload() });

    await InboxActions.fetchInbox();

    expect(InboxStore.getState().activeDeviceBoxId).toBe(100);
    expect(wrapper.state('visible')).toBe(true);
    expect(wrapper.find('i.fa-folder-open').exists()).toBe(true);
    expect(wrapper.instance().props.device_box.children[0].attachments).toEqual([]);
    expect(targetDataset.attachments).toEqual([attachment]);
  });

  it('refreshes the expanded folder on page 2 without changing its selected page', async () => {
    wrapper.find(Pagination).prop('handleNextClick')();
    selectDevicePage(100, 2);
    InboxActions.fetchInboxContainer.resetHistory();
    sinon.stub(InboxFetcher, 'fetchInbox').resolves({ inbox: inboxPayload() });

    await InboxActions.fetchInbox();

    sinon.assert.calledOnceWithExactly(InboxActions.fetchInboxContainer, 100, 2);
    expect(wrapper.state('visible')).toBe(true);
    expect(wrapper.find(Pagination).prop('currentDataSetPage')).toBe(2);
  });

  it('does not reopen a folder that the user explicitly collapsed', async () => {
    wrapper.find('div[role="button"]').simulate('click');
    expect(wrapper.state('visible')).toBe(false);
    sinon.stub(InboxFetcher, 'fetchInbox').resolves({ inbox: inboxPayload() });

    await InboxActions.fetchInbox();

    expect(wrapper.state('visible')).toBe(false);
  });

  it('honors an explicit request to clear the selected folder', () => {
    alt.dispatch(fetchInboxActionId, { inbox: inboxPayload(), activeDeviceBoxId: null });

    expect(InboxStore.getState().activeDeviceBoxId).toBe(null);
    expect(wrapper.state('visible')).toBe(false);
    sinon.assert.notCalled(InboxActions.fetchInboxContainer);
  });

  it('honors an explicit selection of another device folder', () => {
    alt.dispatch(fetchInboxActionId, { inbox: inboxPayload(), activeDeviceBoxId: 200 });

    expect(InboxStore.getState().activeDeviceBoxId).toBe(200);
    expect(wrapper.state('visible')).toBe(false);
    sinon.assert.calledOnceWithExactly(InboxActions.fetchInboxContainer, 200, 1);
  });

  it('preserves Unsorted without fetching it as a device folder', async () => {
    InboxActions.setActiveDeviceBoxId(-1);
    sinon.stub(InboxFetcher, 'fetchInbox').resolves({ inbox: inboxPayload() });

    await InboxActions.fetchInbox();

    expect(InboxStore.getState().activeDeviceBoxId).toBe(-1);
    expect(wrapper.state('visible')).toBe(false);
    sinon.assert.notCalled(InboxActions.fetchInboxContainer);
  });

  it('clears the selection if the selected device is no longer in the returned inbox page', async () => {
    const inbox = inboxPayload();
    inbox.children.shift();
    sinon.stub(InboxFetcher, 'fetchInbox').resolves({ inbox });

    await InboxActions.fetchInbox();

    expect(InboxStore.getState().activeDeviceBoxId).toBe(null);
    expect(wrapper.state('visible')).toBe(false);
    sinon.assert.notCalled(InboxActions.fetchInboxContainer);
  });

  it('shows page 2 after closing and reopening the inbox with page-2 datasets still loaded', () => {
    selectDevicePage(100, 2);
    wrapper.unmount();
    wrapper = shallow(
      <DeviceBox device_box={InboxStore.getState().inbox.children[0]} deviceBoxVisible />
    );

    expect(wrapper.find(Pagination).prop('currentDataSetPage')).toBe(2);
    wrapper.find(Pagination).prop('handlePrevClick')();
    sinon.assert.calledWithExactly(InboxActions.fetchInboxContainer, 100, 1);
  });

  it('keeps the current datasets displayed until the refreshed device page arrives', async () => {
    selectDevicePage(100, 2);
    const displayed = wrapper.instance().props.device_box.children;
    sinon.stub(InboxFetcher, 'fetchInbox').resolves({ inbox: inboxPayload() });

    await InboxActions.fetchInbox();

    expect(wrapper.instance().props.device_box.children).toBe(displayed);
    expect(wrapper.find(Pagination).prop('currentDataSetPage')).toBe(2);
    sinon.assert.calledWithExactly(InboxActions.fetchInboxContainer, 100, 2);
  });

  it('fetches page 1 after deleting the only dataset on page 2', () => {
    selectDevicePage(100, 2);
    InboxActions.fetchInboxContainer.resetHistory();

    alt.dispatch(InboxActions.deleteContainer.id, { id: 102 });

    expect(wrapper.instance().props.device_box.children_count).toBe(35);
    sinon.assert.calledOnceWithExactly(InboxActions.fetchInboxContainer, 100, 1);
    alt.dispatch(fetchContainerActionId, {
      inbox: {
        id: 100, inbox_count: 36, children_count: 35,
        children: Array.from({ length: 35 }, (_, index) => dataset(index + 101)),
      },
      containerId: 100,
      currentContainerPage: 1,
    });
    expect(wrapper.find(Pagination).exists()).toBe(false);
    expect(wrapper.instance().props.device_box.children).toHaveLength(35);
    expect(InboxStore.getState().currentContainerPage).toBe(1);
  });

  it('clamps a refresh to page 1 when the server now has only 35 datasets', async () => {
    selectDevicePage(100, 2);
    InboxActions.fetchInboxContainer.resetHistory();
    const inbox = inboxPayload();
    inbox.children[0].children_count = 35;
    sinon.stub(InboxFetcher, 'fetchInbox').resolves({ inbox });

    await InboxActions.fetchInbox();

    sinon.assert.calledOnceWithExactly(InboxActions.fetchInboxContainer, 100, 1);
    expect(InboxStore.getState().currentContainerPage).toBe(1);
  });

  it('recovers when a device response reports that the requested page no longer exists', () => {
    selectDevicePage(100, 2);
    InboxActions.fetchInboxContainer.resetHistory();

    alt.dispatch(fetchContainerActionId, {
      inbox: { id: 100, inbox_count: 36, children_count: 35, children: [] },
      containerId: 100,
      currentContainerPage: 2,
    });

    sinon.assert.calledOnceWithExactly(InboxActions.fetchInboxContainer, 100, 1);
  });

  it('keeps the page selected when deleting its last dataset fails, without also deleting its files', async () => {
    wrapper.find(Pagination).prop('handleNextClick')();
    selectDevicePage(100, 2);
    InboxActions.fetchInboxContainer.resetHistory();
    sinon.stub(ContainerFetcher, 'deleteContainer').rejects(new Error('Delete failed'));
    const deleteFiles = sinon.stub(AttachmentFetcher, 'bulkDeleteAttachments');
    sinon.stub(console, 'log');
    wrapper.setState({ checkedDeviceIds: [102], checkedIds: [1102] });

    wrapper.instance().deleteCheckedDataset(wrapper.instance().props.device_box);
    await new Promise((resolve) => setImmediate(resolve));

    expect(wrapper.find(Pagination).prop('currentDataSetPage')).toBe(2);
    expect(wrapper.instance().props.device_box.children[0].id).toBe(102);
    sinon.assert.notCalled(InboxActions.fetchInboxContainer);
    sinon.assert.notCalled(deleteFiles);
  });

  it('bulk-deletes independently selected files while excluding files inside selected datasets', async () => {
    alt.dispatch(fetchContainerActionId, {
      inbox: { id: 100, inbox_count: 38, children_count: 37, children: [dataset(102), dataset(103)] },
      containerId: 100,
      currentContainerPage: 2,
    });
    const deleteContainer = sinon.stub(ContainerFetcher, 'deleteContainer').resolves();
    const deleteFiles = sinon.stub(AttachmentFetcher, 'bulkDeleteAttachments').resolves({
      deleted_attachments: [{ id: 1103 }],
    });
    wrapper.setState({ checkedDeviceIds: [102], checkedIds: [1102, 1103] });

    wrapper.instance().deleteCheckedDataset(wrapper.instance().props.device_box);
    await new Promise((resolve) => setImmediate(resolve));

    sinon.assert.calledOnce(deleteContainer);
    sinon.assert.calledOnceWithExactly(deleteFiles, [1103]);
  });

  [
    ['HTTP 500 with JSON', () => Promise.resolve(new Response('{"error":"Delete failed"}', { status: 500 }))],
    ['HTTP 500 with HTML', () => Promise.resolve(new Response('<html>Delete failed</html>', { status: 500 }))],
    ['HTTP 401', () => Promise.resolve(new Response('{"error":"Unauthorized"}', { status: 401 }))],
    ['a network failure', () => Promise.reject(new TypeError('Failed to fetch'))],
  ].forEach(([failure, response]) => {
    it(`keeps both selected datasets and page 2 when their DELETE requests fail with ${failure}`, async () => {
      alt.dispatch(fetchContainerActionId, {
        inbox: { id: 100, inbox_count: 38, children_count: 37, children: [dataset(102), dataset(103)] },
        containerId: 100,
        currentContainerPage: 2,
      });
      InboxActions.fetchInboxContainer.resetHistory();
      const fetch = sinon.stub(global, 'fetch').callsFake(response);
      const deleteFiles = sinon.stub(AttachmentFetcher, 'bulkDeleteAttachments');
      sinon.stub(console, 'log');
      wrapper.setState({ checkedDeviceIds: [102, 103], checkedIds: [1102, 1103] });
      const count = InboxStore.getState().numberOfAttachments;

      wrapper.instance().deleteCheckedDataset(wrapper.instance().props.device_box);
      await new Promise((resolve) => setImmediate(resolve));

      sinon.assert.calledTwice(fetch);
      expect(fetch.getCalls().map((call) => call.args[0])).toEqual([
        '/api/v1/containers/102', '/api/v1/containers/103',
      ]);
      fetch.getCalls().forEach((call) => expect(call.args[1].method).toBe('DELETE'));
      expect(wrapper.state('visible')).toBe(true);
      expect(wrapper.find(Pagination).prop('currentDataSetPage')).toBe(2);
      expect(wrapper.instance().props.device_box.children.map((child) => child.id)).toEqual([102, 103]);
      expect(wrapper.instance().props.device_box.children_count).toBe(37);
      expect(InboxStore.getState().numberOfAttachments).toBe(count);
      sinon.assert.notCalled(InboxActions.fetchInboxContainer);
      sinon.assert.notCalled(deleteFiles);
    });
  });

  [false, true].forEach((bothSucceed) => {
    const outcome = bothSucceed ? 'both datasets succeed' : 'one dataset fails';
    it(`removes only confirmed deletes when ${outcome}`, async () => {
      alt.dispatch(fetchContainerActionId, {
        inbox: { id: 100, inbox_count: 38, children_count: 37, children: [dataset(102), dataset(103)] },
        containerId: 100,
        currentContainerPage: 2,
      });
      InboxActions.fetchInboxContainer.resetHistory();
      const fetch = sinon.stub(global, 'fetch').callsFake((url) => Promise.resolve(
        bothSucceed || url.endsWith('/102')
          ? new Response(null, { status: 204 })
          : new Response('{"error":"Delete failed"}', { status: 500 })
      ));
      const deleteFiles = sinon.stub(AttachmentFetcher, 'bulkDeleteAttachments');
      sinon.stub(InboxFetcher, 'fetchInboxUnsorted').resolves({
        inbox: { inbox_count: bothSucceed ? 36 : 37, unlinked_attachments: [] },
      });
      sinon.stub(console, 'log');
      wrapper.setState({ checkedDeviceIds: [102, 103], checkedIds: [1102, 1103] });

      wrapper.instance().deleteCheckedDataset(wrapper.instance().props.device_box);
      await new Promise((resolve) => setImmediate(resolve));

      sinon.assert.calledTwice(fetch);
      sinon.assert.notCalled(deleteFiles);
      expect(wrapper.instance().props.device_box.children.map((child) => child.id))
        .toEqual(bothSucceed ? [] : [103]);
      expect(wrapper.instance().props.device_box.children_count).toBe(bothSucceed ? 35 : 36);
      expect(wrapper.state('visible')).toBe(true);
      if (bothSucceed) {
        sinon.assert.calledOnceWithExactly(InboxActions.fetchInboxContainer, 100, 1);
      } else {
        sinon.assert.notCalled(InboxActions.fetchInboxContainer);
        expect(wrapper.find(Pagination).prop('currentDataSetPage')).toBe(2);
      }
    });
  });

  it('keeps a pending move excluded when deleting the last page loads page 1', async () => {
    const attachment = InboxStore.getState().inbox.children[0].children[0].attachments[0];
    const targetDataset = { attachments: [] };
    targetContainerDataField.dataTarget.drop({ datasetContainer: targetDataset, onChange: sinon.spy() }, {
      getItem: () => ({ attachment }),
      getItemType: () => DragDropItemTypes.DATA,
    });
    selectDevicePage(100, 2);
    InboxActions.fetchInboxContainer.resetHistory();
    sinon.stub(InboxFetcher, 'fetchInboxUnsorted').resolves({
      inbox: { inbox_count: 36, unlinked_attachments: [] },
    });

    alt.dispatch(InboxActions.deleteContainer.id, { id: 102 });
    sinon.assert.calledOnceWithExactly(InboxActions.fetchInboxContainer, 100, 1);
    alt.dispatch(fetchContainerActionId, {
      inbox: { id: 100, inbox_count: 36, children_count: 35, children: [dataset(101)] },
      containerId: 100,
      currentContainerPage: 1,
    });
    await new Promise((resolve) => setImmediate(resolve));

    expect(wrapper.state('visible')).toBe(true);
    expect(wrapper.find(Pagination).exists()).toBe(false);
    expect(wrapper.instance().props.device_box.children[0].attachments).toEqual([]);
    expect(InboxStore.getState().cache.map((item) => item.id)).toEqual([attachment.id]);
    expect(targetDataset.attachments).toEqual([attachment]);
  });
});
