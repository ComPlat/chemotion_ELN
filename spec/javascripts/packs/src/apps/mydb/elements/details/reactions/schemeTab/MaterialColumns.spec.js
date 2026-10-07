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
        // As the Scheme tab hands it in where no product shows a conversion rate.
        displayYieldField
        index={1}
        dragRef={() => {}}
        dropRef={() => {}}
      />
    );
    const cells = wrapper.find('.d-flex.gap-2.align-items-start').hostNodes().first().getDOMNode().children;
    /*
    A cell may be a plain wrapper - for a tooltip - around the one input that carries the class. A
    wrapper holding anything next to that input is wider than the column, which counts as no column.
    */
    const columns = Array.from(cells).map((cell) => {
      const columnOf = (element) => element?.className.match(/reaction-material__([a-z-]+)-data/)?.[1];
      if (columnOf(cell)) return columnOf(cell);
      return cell.childElementCount === 1 ? (columnOf(cell.firstElementChild) ?? null) : null;
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

  /*
  The columns line up from the right edge, so a cell wider than its column shifts every column left of
  it: the warning next to a yield above 100 % did that to a whole product row. It sits inside the column.
  */
  it('keeps the warning of a yield above 100 % inside the yield column', () => {
    const [product] = reaction.products;
    const reference = reaction.getReferenceMaterial();
    const stoichiometryCoeff = (product.coefficient || 1) / (reference.coefficient || 1);
    const maxAmount = reference.amount_mol * stoichiometryCoeff * product.molecule_molecular_weight
      / (product.purity || 1);
    product.setAmount({ value: maxAmount * 1.21, unit: 'g' });

    expect(columnsOf(product, 'products')).toEqual([
      'ref', 'target', 'coefficient', 'amount', 'molar-mass', 'density', 'purity', 'concentration',
      'yield', 'delete',
    ]);
  });

  it('gives a product the same columns, its empty Ref cell included', () => {
    expect(columnsOf(reaction.products[0], 'products')).toEqual([
      'ref', 'target', 'coefficient', 'amount', 'molar-mass', 'density', 'purity', 'concentration',
      'yield', 'delete',
    ]);
  });
});
