import React from 'react';
import expect from 'expect';
import { configure, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { DndProvider } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import ReactionFactory from 'factories/ReactionFactory';
import MaterialGroup from 'src/apps/mydb/elements/details/reactions/schemeTab/MaterialGroup';
import DeleteButton from 'src/components/common/DeleteButton';
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
