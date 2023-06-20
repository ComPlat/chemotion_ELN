import Chemical from 'src/models/Chemical';

class ChemicalFactory {
  static createChemical(chemicalData = [{ }], cas = null, changed = false) {
    const chemical = new Chemical();
    chemical.chemical_data = chemicalData;
    chemical.cas = cas;
    chemical.changed = changed;
    return chemical;
  }
}

export default ChemicalFactory;
