import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { SampleSolventGroup } from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleSolventGroup';
import SampleFactory from 'factories/SampleFactory';
import Sample from 'src/models/Sample';

Enzyme.configure({
  adapter: new Adapter(),
});

describe('SampleSolventGroup.render()', async () => {
  const dropSample = () => {};
  const deleteSolvent = () => {};
  const onChangeSolvent = () => {};
  const sample = await SampleFactory.build('water_100g');
  const materialGroup = 'none';

  describe('when sample has no solvents', async () => {
    const wrapper = shallow(
      <SampleSolventGroup
        dropSample={dropSample}
        deleteSolvent={deleteSolvent}
        onChangeSolvent={onChangeSolvent}
        sample={sample}
        materialGroup={materialGroup}
      />
    );

    it('renders a blank solvent area', async () => {
      const html = wrapper.html();
      expect(html.includes('<h5 style="font-weight:bold">Solvents:</h5>')).toEqual(true);
      expect(html.includes('<td style="width:50%;font-weight:bold">Label:</td>')).toEqual(false);
      expect(html.includes('<td style="width:50%;font-weight:bold">Ratio:</td>')).toEqual(false);
    });
  });

  describe('when sample has two solvents', async () => {
    const sample_with_solvents = await SampleFactory.build('water_100g');
    sample_with_solvents.solvent = [{ label: 'water', ratio: 1.0 }, { label: 'ethanol', ratio: 2.0 }];
    const wrapper = shallow(
      <SampleSolventGroup
        dropSample={dropSample}
        deleteSolvent={deleteSolvent}
        onChangeSolvent={onChangeSolvent}
        sample={sample_with_solvents}
        materialGroup={materialGroup}
      />
    );
    it('renders a solvent area with header and two entries', () => {
      const html = wrapper.html();

      expect(html.includes('<h5 style="font-weight:bold">Solvents:</h5>')).toEqual(true);
      expect(html.includes('<td style="width:50%;font-weight:bold">Label:</td>')).toEqual(true);
      expect(html.includes('<td style="width:50%;font-weight:bold">Ratio:</td>')).toEqual(true);
      expect(html.includes('value="water"')).toEqual(true);
      expect(html.includes('value="ethanol"')).toEqual(true);
    });
  });
});
