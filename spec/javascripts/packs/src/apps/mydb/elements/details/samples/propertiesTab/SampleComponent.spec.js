import expect from 'expect';
import sinon from 'sinon';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { Form, OverlayTrigger } from 'react-bootstrap';
import DeleteButton from 'src/components/common/DeleteButton';
import { SampleComponent } from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleComponent';
import SampleDetailsComponents from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleDetailsComponents';
import Sample from 'src/models/Sample';
import Component from 'src/models/Component';

configure({ adapter: new Adapter() });

describe('SampleComponent reference switching for reaction-linked mixtures', () => {
  const build = (link = {}) => {
    const sample = new Sample({
      id: 1341, sample_type: 'Mixture', can_update: true,
      amount_value: 2, amount_unit: 'g', ...link,
    });
    sample.initialComponents([
      new Component({
        id: 1, position: 0, reference: true, material_group: 'solid', purity: 1,
        amount_mol: 0.01, amount_g: 1, relative_molecular_weight: 200,
        molecule: { molecular_weight: 100 },
      }),
      new Component({
        id: 2, position: 1, reference: false, material_group: 'solid', purity: 1,
        amount_mol: 0.005, amount_g: 1, relative_molecular_weight: 400,
        molecule: { molecular_weight: 200 },
      }),
    ]);
    const editor = Object.create(SampleDetailsComponents.prototype);
    editor.props = { sample, onChange: sinon.spy() };
    const onChange = sinon.spy((event) => editor.onChangeComponent(event));
    const row = Object.create(SampleComponent.prototype);
    row.props = { sample, material: sample.components[1], materialGroup: 'solid', onChange };
    return { sample, row, onChange, editor };
  };

  [
    ['opened from a saved reaction', { belongTo: { type: 'reaction', id: 110, samples: [{ id: 1341 }] } }],
    ['opened from a new reaction', { belongTo: { type: 'reaction', id: 'new-reaction', samples: [{ id: 1341 }] } }],
    ['opened from the collection list', {
      tag: { taggable_data: { reaction_id: 110, resources: [{ resource_context_type: 'Reaction' }] } },
    }],
    ['used as a product', { belongTo: { type: 'reaction', id: 110, samples: [{ id: 1341 }] }, matGroup: 'products' }],
  ].forEach(([context, link]) => {
    it(`disables switching and explains the reaction-row alternative when ${context}`, () => {
      const { sample, row, onChange } = build(link);
      const before = sample.serializeMaterial();
      const wrapper = shallow(row.materialRef(row.props.material));

      expect(wrapper.find(Form.Check).prop('disabled')).toBe(true);
      expect(wrapper.find(Form.Check).prop('checked')).toBe(false);
      expect(wrapper.find('span').prop('tabIndex')).toBe(0);
      expect(shallow(wrapper.find(OverlayTrigger).prop('overlay')).text()).toBe(
        'Change the reference component in the reaction’s material row '
        + 'so dependent amounts and equivalents update together.'
      );

      // Even a directly dispatched change must not propagate to the editor model.
      wrapper.find(Form.Check).prop('onChange')({ target: { value: 'on' } });

      sinon.assert.notCalled(onChange);
      expect(sample.reference_component.id).toBe(1);
      expect(sample.serializeMaterial()).toEqual(before);
      wrapper.unmount();
    });

    it(`blocks a direct parent-handler call when ${context}`, () => {
      const { sample, editor } = build(link);
      const before = sample.serializeMaterial();

      editor.updateSampleForReferenceChanged({ sampleID: 2 });

      expect(sample.reference_component.id).toBe(1);
      expect(sample.serializeMaterial()).toEqual(before);
    });

    it(`disables deletion only for the reference and explains how to proceed when ${context}`, () => {
      const { sample, row } = build(link);
      const reference = shallow(row.renderDeleteButton(sample.reference_component));
      const other = shallow(row.renderDeleteButton(row.props.material));

      expect(reference.find(DeleteButton).prop('disabled')).toBe(true);
      expect(reference.find('span').prop('tabIndex')).toBe(0);
      expect(shallow(reference.find(OverlayTrigger).prop('overlay')).text()).toBe(
        'Select another reference component in the reaction’s material row before deleting or merging this component.'
      );
      expect(other.find(DeleteButton).prop('disabled')).toBe(false);
      expect(other.find(OverlayTrigger).exists()).toBe(false);
      reference.unmount();
      other.unmount();
    });
  });

  [
    ['standalone mixture', {}],
    ['sample with an empty tag', { tag: { taggable_data: {} } }],
    ['sample in a wellplate', { belongTo: { type: 'wellplate', id: 5 } }],
    ['removed reaction material with a stale tag', {
      tag: { taggable_data: { reaction_id: 110, resources: [] } },
    }],
    ['removed material in an open reaction', {
      belongTo: { type: 'reaction', id: 110, samples: [] },
      tag: { taggable_data: { reaction_id: 110, resources: [{ resource_context_type: 'Reaction' }] } },
    }],
    ['new unsaved mixture created from a reaction', {
      is_new: true, belongTo: { type: 'reaction', id: 110, samples: [] },
    }],
  ].forEach(([context, link]) => {
    it(`keeps switching available for a ${context}`, () => {
      const { sample, row, onChange } = build(link);
      const wrapper = shallow(row.materialRef(row.props.material));
      const massBefore = sample.amount_g;

      expect(wrapper.find(Form.Check).prop('disabled')).toBe(false);
      expect(wrapper.find(OverlayTrigger).exists()).toBe(false);

      wrapper.find(Form.Check).prop('onChange')({ target: { value: 'on' } });

      sinon.assert.calledOnce(onChange);
      expect(sample.reference_component.id).toBe(2);
      expect(sample.amount_g).toBeCloseTo(massBefore, 12);
      expect(sample.components.map((component) => component.amount_mol)).toEqual([0.01, 0.005]);
      wrapper.unmount();
    });
  });

  it('keeps the existing edit permission check for standalone samples', () => {
    const { sample, row } = build();
    sample.can_update = false;
    const wrapper = shallow(row.materialRef(row.props.material));

    expect(wrapper.find(Form.Check).prop('disabled')).toBe(true);
    expect(wrapper.find(OverlayTrigger).exists()).toBe(false);
    wrapper.unmount();
  });

  it('allows deletion of a standalone reference but still respects edit permission', () => {
    const { sample, row } = build();
    const editable = shallow(row.renderDeleteButton(sample.reference_component));
    expect(editable.find(DeleteButton).prop('disabled')).toBe(false);
    expect(editable.find(OverlayTrigger).exists()).toBe(false);
    editable.unmount();

    sample.can_update = false;
    const readOnly = shallow(row.renderDeleteButton(sample.reference_component));
    expect(readOnly.find(DeleteButton).prop('disabled')).toBe(true);
    readOnly.unmount();
  });

  describe('pending amount edits on unmount', () => {
    let sandbox;
    let clock;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      clock = sandbox.useFakeTimers();
    });
    afterEach(() => { sandbox.restore(); });

    [false, true].forEach((blurred) => {
      it(`commits the latest amount exactly once when closing without waiting 500 ms, blurred=${blurred}`, () => {
        const { sample, row: propsRow, onChange } = build();
        const row = new SampleComponent(propsRow.props);
        const setState = sandbox.spy(row, 'setState');
        row.debounceHandleAmountChange({ value: 0.006, unit: 'mol' }, 0.005, '', false);
        clock.tick(100);
        row.debounceHandleAmountChange({ value: 0.0075, unit: 'mol' }, 0.005, '', false);
        if (blurred) row.debounceHandleAmountChange.flush();

        row.componentWillUnmount();

        expect(sample.components[1].amount_mol).toBeCloseTo(0.0075, 12);
        expect(sample.amount_g).toBeCloseTo(2.5, 12);
        sinon.assert.calledOnce(onChange);
        sinon.assert.notCalled(setState);
        clock.tick(1000);
        sinon.assert.calledOnce(onChange);
      });
    });

    it('does not restore a component deleted while its edit was pending', () => {
      const { sample, row: propsRow } = build();
      const row = new SampleComponent(propsRow.props);
      const other = sample.components[1];
      // The parent already handles an event for a removed component by returning early.
      sandbox.stub(console, 'error');
      row.debounceHandleAmountChange({ value: 0.0075, unit: 'mol' }, 0.005, '', false);
      clock.tick(100);
      sample.deleteMixtureComponent(other);

      row.componentWillUnmount();
      clock.tick(1000);

      expect(sample.components).toHaveLength(1);
      expect(sample.reference_component.id).toBe(1);
      expect(sample.amount_g).toBeCloseTo(1, 12);
    });
  });
});

describe('SampleComponent liquid ratio round trips', () => {
  it('reverses the reported ethanol Ratio input edits with a 2 M stock and inherited density', () => {
    const sample = new Sample({
      id: 'reported-liquid-ratio', sample_type: 'Mixture', can_update: true,
      amount_value: 7.26, amount_unit: 'g', density: 0.864,
      sample_details: { total_mixture_mass_g: 7.26 },
    });
    sample.initialComponents([
      new Component({
        id: 'solid', position: 0, reference: true, equivalent: 1, material_group: 'solid',
        amount_mol: 0.01, amount_g: 1.8, purity: 1, molecule: { molecular_weight: 180 },
      }),
      new Component({
        id: 'ethanol', position: 1, reference: false, equivalent: 1, material_group: 'liquid',
        amount_mol: 0.01, amount_g: 0.46, amount_l: 0.000575,
        purity: 1, density: 0.8, starting_molarity_value: 0, molecule: { molecular_weight: 46 },
      }),
      new Component({
        id: 'stock', position: 2, reference: false, equivalent: 1, material_group: 'liquid',
        amount_mol: 0.01, amount_l: 0.005, purity: 1, density: 0, starting_molarity_value: 2,
        molecule: { molecular_weight: 100 },
      }),
    ]);
    const editor = Object.create(SampleDetailsComponents.prototype);
    editor.props = { sample, onChange: sinon.spy() };
    const row = Object.create(SampleComponent.prototype);
    row.props = {
      sample, material: sample.components[1], materialGroup: 'liquid',
      onChange: (event) => editor.onChangeComponent(event),
    };

    [0.5, 1, 0.5, 1, 0.5, 1].forEach((ratio) => {
      row.componentRatio(row.props.material).props.children.props.onChange({ value: ratio });

      expect(sample.amount_g).toBeCloseTo(1.8 + 0.46 * ratio + 5, 12);
      expect(sample.components[0].amount_mol).toBeCloseTo(0.01, 12);
      expect(sample.components[1].amount_mol).toBeCloseTo(0.01 * ratio, 12);
      expect(sample.components[2].amount_l).toBeCloseTo(0.005, 12);
      expect(sample.sample_details.total_mixture_volume_l).toBeUndefined();
    });
  });
});
