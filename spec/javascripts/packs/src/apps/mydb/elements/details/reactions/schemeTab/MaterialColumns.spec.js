import React from 'react';
import expect from 'expect';
import { configure, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import ReactionFactory from 'factories/ReactionFactory';
import Material from 'src/apps/mydb/elements/details/reactions/schemeTab/Material';

configure({ adapter: new Adapter() });

/*
The columns of a material row take their width from the header above them, by the
`reaction-material__<column>-data` class each cell carries. A cell without it is as wide as what it
holds - a product's empty Ref cell had none, and shifted every column after it to the left.
*/
describe('Scheme tab material columns', () => {
  let reaction;

  const columnsOf = (material, materialGroup) => {
    const wrapper = mount(
      <Material
        variations={[]}
        reaction={reaction}
        material={material}
        materialGroup={materialGroup}
        onChange={() => {}}
        showLoadingColumn={false}
        index={1}
        dragRef={() => {}}
        dropRef={() => {}}
      />
    );
    const cells = wrapper.find('.d-flex.gap-2.align-items-start').hostNodes().first().getDOMNode().children;
    // A cell may be a plain wrapper - for a tooltip - around the input that carries the class.
    const columns = Array.from(cells).map((cell) => {
      const columnOf = (element) => element?.className.match(/reaction-material__([a-z-]+)-data/)?.[1];
      return columnOf(cell) ?? columnOf(cell.firstElementChild) ?? null;
    });
    wrapper.unmount();
    return columns;
  };

  beforeEach(async () => {
    reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.starting_materials[0].reference = true;
  });

  it('gives every cell of a starting material its column', () => {
    expect(columnsOf(reaction.starting_materials[1], 'starting_materials')).toEqual([
      'ref', 'target', 'coefficient', 'amount', 'molar-mass', 'density', 'purity', 'concentration',
      'equivalent', 'delete',
    ]);
  });

  it('gives a product the same columns, its empty Ref cell included', () => {
    expect(columnsOf(reaction.products[0], 'products')).toEqual([
      'ref', 'target', 'coefficient', 'amount', 'molar-mass', 'density', 'purity', 'concentration',
      'yield', 'delete',
    ]);
  });
});
