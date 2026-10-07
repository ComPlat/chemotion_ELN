import React from 'react';
import expect from 'expect';
import { configure, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { DndProvider } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import ReactionFactory from 'factories/ReactionFactory';
import MaterialGroup from 'src/apps/mydb/elements/details/reactions/schemeTab/MaterialGroup';
import DeleteButton from 'src/components/common/DeleteButton';
import CreateButton from 'src/components/common/CreateButton';
import { makeVariationReaction } from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import { StoreContext } from 'src/stores/mobx/RootStore';

configure({ adapter: new Adapter() });

/*
The "Open" panel of a variation shows the scheme of that one variation. Its material list follows
the parent reaction's, so it offers neither the selects that add a material nor the buttons that
remove one; the scheme tab of the reaction itself does.
*/
describe('MaterialGroup - changing the material list', () => {
  const render = async (materialGroup, canChangeMaterialList) => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.can_update = true;
    const materials = materialGroup === 'solvents' ? [] : reaction[materialGroup];
    return mount(
      <StoreContext.Provider value={{ notifications: { add: () => {} } }}>
        <DndProvider backend={TouchBackend}>
          <MaterialGroup
            reaction={reaction}
            variations={[]}
            materials={materials}
            materialGroup={materialGroup}
            deleteMaterial={() => {}}
            onChange={() => {}}
            dropMaterial={() => {}}
            dropSample={() => {}}
            canChangeMaterialList={canChangeMaterialList}
          />
        </DndProvider>
      </StoreContext.Provider>
    );
  };

  const placeholders = (wrapper) => wrapper.find('Select').map((select) => select.prop('placeholder'));

  it('offers to add and delete materials in the scheme tab', async () => {
    const wrapper = await render('starting_materials', true);
    expect(wrapper.find(DeleteButton).length).toBe(2);
    wrapper.unmount();
  });

  it('offers neither in a single variation', async () => {
    const wrapper = await render('starting_materials', false);
    expect(wrapper.find(DeleteButton).length).toBe(0);
    wrapper.unmount();
  });

  it('offers the reagent select only where the list can change', async () => {
    const editable = await render('reactants', true);
    const locked = await render('reactants', false);
    expect(placeholders(editable)).toContain('Add reagent...');
    expect(placeholders(locked)).not.toContain('Add reagent...');
    editable.unmount();
    locked.unmount();
  });

  it('offers the solvent select only where the list can change', async () => {
    const editable = await render('solvents', true);
    const locked = await render('solvents', false);
    expect(placeholders(editable)).toContain('Add solvent...');
    expect(placeholders(locked)).not.toContain('Add solvent...');
    editable.unmount();
    locked.unmount();
  });
});

/*
In a variation's Open panel the reagent and solvent selects are offered: a molecule picked there is
added to that variation only, as a sample dropped in is. Such a material can be removed there again;
those that come from the reaction cannot, and the "+" stays off.
*/
describe('MaterialGroup - a variation\'s material list', () => {
  const render = async (materialGroup, addOwnMaterial = false) => {
    const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.can_update = true;
    const variation = makeVariationReaction(reaction, {});
    if (addOwnMaterial) {
      // A copy with an id of its own, as a sample dropped or picked in the variation gets.
      const own = Object.assign(Object.create(Object.getPrototypeOf(variation.starting_materials[0])),
        variation.starting_materials[0], { id: 'variation-only' });
      variation.addMaterialAt(own, null, null, materialGroup);
    }
    const materials = materialGroup === 'starting_materials' ? variation.starting_materials : [];
    return mount(
      <StoreContext.Provider value={{ notifications: { add: () => {} } }}>
        <DndProvider backend={TouchBackend}>
          <MaterialGroup
            reaction={variation}
            variations={[]}
            materials={materials}
            materialGroup={materialGroup}
            deleteMaterial={() => {}}
            onChange={() => {}}
            dropMaterial={() => {}}
            dropSample={() => {}}
            canChangeMaterialList={false}
          />
        </DndProvider>
      </StoreContext.Provider>
    );
  };

  const placeholders = (wrapper) => wrapper.find('Select').map((select) => select.prop('placeholder'));

  it('offers the reagent select', async () => {
    const wrapper = await render('reactants');
    expect(placeholders(wrapper)).toContain('Add reagent...');
    expect(wrapper.find(CreateButton).length).toBe(0);
    wrapper.unmount();
  });

  it('offers the solvent select', async () => {
    const wrapper = await render('solvents');
    expect(placeholders(wrapper)).toContain('Add solvent...');
    expect(wrapper.find(CreateButton).length).toBe(0);
    wrapper.unmount();
  });

  it('offers no select for purification solvents', async () => {
    const wrapper = await render('purification_solvents');
    expect(placeholders(wrapper)).not.toContain('Add solvent...');
    wrapper.unmount();
  });

  it('deletes only what the variation added itself', async () => {
    const plain = await render('starting_materials');
    expect(plain.find(DeleteButton).length).toBe(0);
    plain.unmount();

    const withOwn = await render('starting_materials', true);
    expect(withOwn.find(DeleteButton).length).toBe(1);
    withOwn.unmount();
  });
});
