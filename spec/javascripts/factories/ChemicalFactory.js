import Chemical from '@src/models/Chemical';

class ChemicalFactory {
  static createChemical(chemicalData = [{ }], cas = null) {
    const chemical = new Chemical();
    chemical.chemical_data = chemicalData;
    chemical.cas = cas;
    return chemical;
  }
}

export default ChemicalFactory;
