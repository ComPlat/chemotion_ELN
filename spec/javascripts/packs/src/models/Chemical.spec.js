// eslint-disable-next-line import/no-unresolved
import ChemicalFactory from 'factories/ChemicalFactory';
import Chemical from 'src/models/Chemical';
import expect from 'expect';
import {
  describe, it
} from 'mocha';

describe('Chemical model', () => {
  describe('use factory to simulate creating chemical instance', () => {
    it('Create Chemical with expected data objects', () => {
      const chemicalData = [{
        host_building: '319',
        host_owner: 'person'
      }];
      const chemical = ChemicalFactory.createChemical(chemicalData, '7681-82-5', false);
      expect(chemical.chemical_data).toBe(chemicalData);
      expect(chemical.id).toBeTruthy();
      expect(chemical.cas).toBe('7681-82-5');
      expect(chemical.changed).toBe(false);
    });
  });

  describe('cas getter and setter', () => {
    it('should set cas correctly', () => {
      const cas = '7681-82-5';
      const chemical = new Chemical();
      chemical.cas = cas;
      expect(chemical.cas).toBe(cas);
    });

    it('should not set cas if input is falsy', () => {
      const cas = '7681-82-5';
      const chemical = new Chemical();
      chemical.cas = cas;
      expect(chemical.cas).toBe(cas);

      chemical.cas = null;
      expect(chemical.cas).toBe(cas);
    });
  });

  describe('serialize method', () => {
    it('should serialize chemical data correctly', () => {
      const chemicalData = [{
        host_building: '319',
        host_owner: 'person'
      }];
      const cas = '7681-82-5';
      const chemical = new Chemical({ chemical_data: chemicalData, cas });
      const serializedData = chemical.serialize();
      expect(serializedData.chemical_data).toEqual(chemicalData);
      expect(serializedData.cas).toEqual(cas);
    });
  });

  describe('buildChemical method', () => {
    it('should build chemical data correctly', () => {
      const chemical = new Chemical();
      chemical.buildChemical('host_building', '319');
      expect(chemical.chemical_data[0].host_building).toBe('319');
      expect(chemical.changed).toBe(true);
    });

    it('should update existing chemical data correctly', () => {
      const chemicalData = [{
        host_building: '319',
        host_owner: 'person'
      }];
      const chemical = new Chemical({ chemical_data: chemicalData });
      chemical.buildChemical('host_building', '321');
      expect(chemical.chemical_data[0].host_building).toBe('321');
      expect(chemical.changed).toBe(true);
    });

    it('should update cas correctly', () => {
      const chemical = new Chemical();
      chemical.buildChemical('cas', '7681-82-5');
      expect(chemical.cas).toBe('7681-82-5');
      expect(chemical.changed).toBe(true);
    });
  });
});
