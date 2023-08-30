/* global describe, it */

import React from 'react';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { SampleSolventGroup, SolventDetails }
  from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleSolventGroup';
import SampleFactory from 'factories/SampleFactory';

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
    const sampleWithSolvents = await SampleFactory.build('water_100g');
    sampleWithSolvents.solvent = [{ label: 'water', ratio: 1.0 }, { label: 'ethanol', ratio: 2.0 }];
    const wrapper = shallow(
      <SampleSolventGroup
        dropSample={dropSample}
        deleteSolvent={deleteSolvent}
        onChangeSolvent={onChangeSolvent}
        sample={sampleWithSolvents}
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

describe('SolventDetails.render()', () => {
  const deleteSolvent = () => {};
  const onChangeSolvent = () => {};

  describe('when solvent prop is null', () => {
    const wrapper = shallow(
      <SolventDetails
        deleteSolvent={deleteSolvent}
        onChangeSolvent={onChangeSolvent}
        solvent={null}
      />
    );

    it('renders an empty fragment', () => {
      const html = wrapper.html();
      expect(html).toBe(null);
    });
  });

  describe('when solvent prop is provided', () => {
    const solvent = { label: 'water', ratio: 1.0 };
    const wrapper = shallow(
      <SolventDetails
        deleteSolvent={deleteSolvent}
        onChangeSolvent={onChangeSolvent}
        solvent={solvent}
      />
    );

    it('renders a solvent details row', () => {
      const html = wrapper.html();

      expect(html.includes('<td>')).toEqual(true);
      expect(html.includes('type="text"')).toEqual(true);
      expect(html.includes('type="number"')).toEqual(true);
      expect(html.includes('value="water"')).toEqual(true);
      expect(html.includes('value="1"')).toEqual(true);
      expect(html.includes('<i class="fa fa-trash-o fa-lg"')).toEqual(true);
    });
  });
});
