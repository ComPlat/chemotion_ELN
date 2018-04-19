import alt from '../alt'
import _ from 'lodash'
import MoleculesFetcher from '../fetchers/MoleculesFetcher'

class DetailActions {
  select(index) {
    return index
  }

  close(deleteEl, force = false) {
    return {deleteEl, force}
  }

  confirmDelete(confirm) {
    return confirm
  }

  changeCurrentElement(oriEl, nextEl) {
    return {oriEl, nextEl}
  }

  getMoleculeCas(sample) {
    return (dispatch) => { MoleculesFetcher.fetchCas(sample.molecule.inchikey)
      .then((result) => {
        sample.molecule = result
        dispatch(sample)
      }).catch((errorMessage) => {
        console.log(errorMessage)
      })
    }
  }

  updateMoleculeNames(sample, newMolName = '') {
    const inchikey = sample.molecule.inchikey;
    if (!inchikey) { return null; }

    return (dispatch) => {
      MoleculesFetcher
        .updateNames(inchikey, newMolName)
        .then((result) => {
          const mn = result.find(r => r.name === newMolName);
          if (mn) sample.molecule_name = { label: mn.name, value: mn.id };
          sample.molecule_names = result;
          dispatch(sample);
        })
        .catch(errorMessage => console.log(errorMessage));
    };
  }

  updateMoleculeCas(sample, newCas = '') {
    const m = sample.molecule;
    m.cas = [...m.cas, newCas];
    sample.molecule = m;
    return sample;
  }
}

export default alt.createActions(DetailActions)
