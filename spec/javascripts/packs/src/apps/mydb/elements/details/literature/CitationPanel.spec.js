/* eslint-disable no-undef */
import React from 'react';
import { configure, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import expect from 'expect';
import sinon from 'sinon';
import CitationPanel from 'src/apps/mydb/elements/details/literature/CitationPanel';
import Literature from 'src/models/Literature';
import * as clipboard from 'src/utilities/clipboard';

configure({ adapter: new Adapter() });

describe('CitationPanel copy button', () => {
  let copyStub;
  let wrapper;

  const citation = Literature.buildEmpty();
  Object.assign(citation, {
    id: 1,
    title: 'A Fine Reference',
    year: 2024,
    litype: 'uncategorized',
    user_name: 'Alice',
  });

  const buildWrapper = () => mount(
    React.createElement(CitationPanel, {
      title: 'uncategorized',
      fnDelete: sinon.spy(),
      fnUpdate: sinon.spy(),
      sortedIds: [1],
      rows: new Map([[1, citation]]),
      citationMap: { def: 'General' },
      typeMap: {},
      readOnly: false,
    })
  );

  // click the copy button, then flush the async handler's microtasks before asserting
  const clickCopy = async () => {
    wrapper.find('i.fa-clipboard').closest('button').simulate('click');
    await new Promise((resolve) => { setTimeout(resolve, 0); });
  };

  beforeEach(() => {
    // stub the shared helper so the test never touches a real clipboard
    // (the helper owns the failure toast; that behaviour is covered in clipboard.spec.js)
    copyStub = sinon.stub(clipboard, 'copyToClipboard');
  });

  afterEach(() => {
    copyStub.restore();
    wrapper.unmount();
  });

  it('copies the plain-text citation content when the button is clicked', async () => {
    copyStub.resolves(true);
    wrapper = buildWrapper();

    await clickCopy();

    expect(copyStub.calledOnceWith('A Fine Reference')).toBe(true);
  });

  it('swaps the clipboard icon for a check icon on success', async () => {
    copyStub.resolves(true);
    wrapper = buildWrapper();

    // before clicking: the clipboard icon
    expect(wrapper.find('i.fa-clipboard').exists()).toBe(true);
    expect(wrapper.find('i.fa-check').exists()).toBe(false);

    await clickCopy();
    wrapper.update();

    // after a successful copy: the check icon replaces the clipboard icon
    expect(wrapper.find('i.fa-check').exists()).toBe(true);
    expect(wrapper.find('i.fa-clipboard').exists()).toBe(false);
  });

  it('does not show the confirmation icon when the copy fails', async () => {
    copyStub.resolves(false);
    wrapper = buildWrapper();

    await clickCopy();
    wrapper.update();

    // the button stays in its default state; the helper handles the failure toast
    expect(wrapper.find('i.fa-clipboard').exists()).toBe(true);
    expect(wrapper.find('i.fa-check').exists()).toBe(false);
  });
});
