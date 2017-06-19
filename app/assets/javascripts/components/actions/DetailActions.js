import alt from '../alt'
import _ from 'lodash'
import MoleculesFetcher from '../fetchers/MoleculesFetcher'

class DetailActions {
  select(index) {
    return index
  }

  close(deleteEl, force = false) {
    console.log(deleteEl)
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
}

export default alt.createActions(DetailActions)
