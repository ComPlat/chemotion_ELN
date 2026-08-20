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

  beforeEach(() => {
    // stub the shared helper so the test never touches a real clipboard
    copyStub = sinon.stub(clipboard, 'copyToClipboard').resolves(true);
    wrapper = buildWrapper();
  });

  afterEach(() => {
    copyStub.restore();
    wrapper.unmount();
  });

  it('copies the plain-text citation content when the clipboard button is clicked', () => {
    const copyButton = wrapper.find('i.fa-clipboard').closest('button');
    expect(copyButton.exists()).toBe(true);

    copyButton.simulate('click');

    expect(copyStub.calledOnceWith('A Fine Reference')).toBe(true);
  });
});
