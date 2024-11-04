import React from 'react';
import { Card } from 'react-bootstrap';
import expect from 'expect';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { SampleSolventGroup, SolventDetails }
  from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleSolventGroup';
import SampleFactory from 'factories/SampleFactory';

import {
  describe, it
} from 'mocha';

Enzyme.configure({
  adapter: new Adapter(),
});

describe('SampleSolventGroup', () => {
  const dropSample = () => {};
  const deleteSolvent = () => {};
  const onChangeSolvent = () => {};
  const materialGroup = 'none';

  describe('when sample has no solvents', () => {
    it('renders a blank solvent area', async () => {
      const sample = await SampleFactory.build('SampleFactory.water_100g');
      const wrapper = shallow(
        <SampleSolventGroup
          dropSample={dropSample}
          deleteSolvent={deleteSolvent}
          onChangeSolvent={onChangeSolvent}
          sample={sample}
          materialGroup={materialGroup}
        />
      );

      expect(wrapper.contains(<Card.Header>Solvents</Card.Header>)).toBeTruthy();
    });
  });

  describe('when sample has two solvents', () => {
    it('renders a solvent area with header and two entries', async () => {
      const sample = await SampleFactory.build('SampleFactory.water_100g');
      sample.solvent = [{ label: 'water', ratio: 1.0 }, { label: 'ethanol', ratio: 2.0 }];
      sample.sample_type = 'Micromolecule';

      const wrapper = shallow(
        <SampleSolventGroup
          dropSample={dropSample}
          deleteSolvent={deleteSolvent}
          onChangeSolvent={onChangeSolvent}
          sample={sample}
          materialGroup={materialGroup}
        />
      );

      expect(wrapper.contains(<Card.Header>Solvents</Card.Header>)).toBeTruthy();
      expect(wrapper.find(SolventDetails)).toHaveLength(2);
    });
  });
});

describe('SolventDetails', () => {
  const deleteSolvent = () => {};
  const onChangeSolvent = () => {};
  const sampleType = 'Micromolecule';

  describe('when solvent prop is null', () => {
    const wrapper = shallow(
      <SolventDetails
        deleteSolvent={deleteSolvent}
        onChangeSolvent={onChangeSolvent}
        solvent={null}
        sampleType={sampleType}
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
        sampleType={sampleType}
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
