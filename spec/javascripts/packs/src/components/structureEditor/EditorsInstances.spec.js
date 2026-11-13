import expect from 'expect';
import sinon from 'sinon';
import { describe, it, beforeEach, afterEach } from 'mocha';
// Load RootStore first: entering the store/model graph elsewhere hits the Sample <-> Component import cycle.
import 'src/stores/mobx/RootStore';
import { createEditors } from 'src/components/structureEditor/EditorsInstances';
import UIStore from 'src/stores/alt/stores/UIStore';

const availableEditors = {
  ketcher: { label: 'Ketcher' },
  chemdraw: { label: 'ChemDraw' },
};

const matrice = (editor) => ({ name: `${editor}Editor`, configs: { editor } });

describe('createEditors', () => {
  beforeEach(() => {
    sinon.stub(UIStore, 'getState').returns({ structureEditors: { editors: availableEditors } });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('offers Ketcher when no licensed editor is enabled', async () => {
    const editors = await createEditors({ matriceConfigs: [] });
    expect(Object.keys(editors)).toEqual(['ketcher']);
    expect(editors.ketcher.label).toEqual('Ketcher');
  });

  it('offers Ketcher first, followed by the enabled licensed editors', async () => {
    const editors = await createEditors({ matriceConfigs: [matrice('chemdraw')] });
    expect(Object.keys(editors)).toEqual(['ketcher', 'chemdraw']);
  });

  it('does not duplicate Ketcher when a matrice still configures it', async () => {
    const editors = await createEditors({ matriceConfigs: [matrice('ketcher'), matrice('chemdraw')] });
    expect(Object.keys(editors)).toEqual(['ketcher', 'chemdraw']);
  });
});
