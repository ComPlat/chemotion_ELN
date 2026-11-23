import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { configure, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { describe, it, beforeEach, afterEach } from 'mocha';
import SurfaceChemistryEditor from 'src/components/structureEditor/SurfaceChemistryEditor';

configure({ adapter: new Adapter() });

const MOLFILE = '\n  test\n\n  0  0  0  0  0  0  0  0  0  0999 V3000\nM  END\n';

describe('SurfaceChemistryEditor', () => {
  let container;
  let wrapper;
  let setMolecule;
  let fnCb;
  let editor;

  const mountEditor = () => {
    wrapper = mount(
      <SurfaceChemistryEditor
        editor={editor}
        molfile={MOLFILE}
        iH="630px"
        iS={{}}
        fnCb={fnCb}
      />,
      { attachTo: container }
    );
    return container.querySelector('iframe');
  };

  const postInit = (source, data = { eventType: 'init' }) => {
    window.dispatchEvent(new window.MessageEvent('message', { data, source }));
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    setMolecule = sinon.spy();
    fnCb = sinon.spy();
    editor = {
      id: 'surfaceChemistry',
      extSrc: '/editors/surfaceChemistry/standalone/index.html',
      structureDef: {
        set molfile(mf) { setMolecule(mf); },
      },
    };
  });

  afterEach(() => {
    if (wrapper && wrapper.length) wrapper.unmount();
    document.body.removeChild(container);
  });

  it('sets molfile once on init from its own iframe', () => {
    const iframe = mountEditor();
    expect(iframe.getAttribute('src')).toBe(editor.extSrc);
    expect(iframe.id).toBe('surfaceChemistry');

    postInit(iframe.contentWindow);

    expect(setMolecule.calledOnceWithExactly(MOLFILE)).toBe(true);
    expect(fnCb.calledOnceWithExactly(editor)).toBe(true);
  });

  it('ignores init from other windows', () => {
    mountEditor();

    postInit(window);
    postInit(null);

    expect(setMolecule.called).toBe(false);
    expect(fnCb.called).toBe(false);
  });

  it('removes the listener on unmount', () => {
    const iframe = mountEditor();
    const { contentWindow } = iframe;

    wrapper.unmount();
    postInit(contentWindow);

    expect(setMolecule.called).toBe(false);
    expect(fnCb.called).toBe(false);
  });
});
