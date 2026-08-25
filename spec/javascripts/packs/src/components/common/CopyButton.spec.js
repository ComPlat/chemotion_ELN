/* eslint-disable no-undef */
import React from 'react';
import { configure, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import expect from 'expect';
import sinon from 'sinon';
import CopyButton from 'src/components/common/CopyButton';
import * as clipboard from 'src/utilities/clipboard';

configure({ adapter: new Adapter() });

describe('CopyButton', () => {
  let copyStub;
  let wrapper;

  const buildWrapper = (props = {}) => mount(
    React.createElement(CopyButton, { text: 'copy me', ...props })
  );

  // click the button, then flush the async handler's microtasks before asserting
  const clickCopy = async () => {
    wrapper.find('button').simulate('click');
    await new Promise((resolve) => { setTimeout(resolve, 0); });
  };

  beforeEach(() => {
    copyStub = sinon.stub(clipboard, 'copyToClipboard');
  });

  afterEach(() => {
    copyStub.restore();
    if (wrapper) wrapper.unmount();
  });

  it('exposes an accessible name for the icon-only button', () => {
    copyStub.resolves(true);
    wrapper = buildWrapper({ tooltip: 'copy the CAS number' });

    expect(wrapper.find('button').prop('aria-label')).toBe('copy the CAS number');
  });

  it('copies the provided text through the shared helper', async () => {
    copyStub.resolves(true);
    wrapper = buildWrapper({ text: 'hello' });

    await clickCopy();

    expect(copyStub.calledOnceWith('hello')).toBe(true);
  });

  it('swaps the clipboard icon for a check icon on success', async () => {
    copyStub.resolves(true);
    wrapper = buildWrapper();

    expect(wrapper.find('i.fa-clipboard').exists()).toBe(true);
    expect(wrapper.find('i.fa-check').exists()).toBe(false);

    await clickCopy();
    wrapper.update();

    expect(wrapper.find('i.fa-check').exists()).toBe(true);
    expect(wrapper.find('i.fa-clipboard').exists()).toBe(false);
  });

  it('keeps the default icon when the copy fails (helper owns the error toast)', async () => {
    copyStub.resolves(false);
    wrapper = buildWrapper();

    await clickCopy();
    wrapper.update();

    expect(wrapper.find('i.fa-clipboard').exists()).toBe(true);
    expect(wrapper.find('i.fa-check').exists()).toBe(false);
  });
});
