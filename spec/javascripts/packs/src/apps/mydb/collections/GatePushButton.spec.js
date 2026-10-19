/* eslint-disable no-undef */
import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import toast from 'react-hot-toast';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import GatePushButton from 'src/apps/mydb/collections/GatePushButton';
import GateFetcher from 'src/fetchers/GateFetcher';

configure({ adapter: new Adapter() });

describe('GatePushButton', () => {
  let fetcherStub;
  let toastSuccessStub;

  beforeEach(() => {
    fetcherStub = sinon.stub(GateFetcher, 'transmittingByCollectionId');
    // rootStore.notifications.add routes level 'success' to react-hot-toast's toast.success;
    // the MST action itself cannot be sinon-stubbed.
    toastSuccessStub = sinon.stub(toast, 'success');
  });

  afterEach(() => {
    fetcherStub.restore();
    toastSuccessStub.restore();
  });

  it('shows a toast once the transfer is queued', async () => {
    fetcherStub.resolves({ overlayTarget: null, status: 'queued', target: undefined });
    const wrapper = shallow(<GatePushButton collectionId={5} />);

    await wrapper.instance().transmit('POST');
    await Promise.resolve();

    sinon.assert.calledWith(fetcherStub, 'POST', 5);
    sinon.assert.calledOnce(toastSuccessStub);
    expect(toastSuccessStub.firstCall.args[0]).toMatch(/queued/);
    expect(toastSuccessStub.firstCall.args[1].id).toEqual('gate_transfer_queued');
    expect(wrapper.state('status')).toEqual('queued');
  });

  it('shows no toast for the GET check', async () => {
    fetcherStub.resolves({ overlayTarget: null, status: 'confirm', target: 'https://x/' });
    const wrapper = shallow(<GatePushButton collectionId={5} />);

    await wrapper.instance().transmit();
    await Promise.resolve();

    sinon.assert.calledWith(fetcherStub, 'GET', 5);
    sinon.assert.notCalled(toastSuccessStub);
  });
});
