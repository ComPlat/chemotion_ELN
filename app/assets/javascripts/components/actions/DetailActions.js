import alt from '../alt'
import _ from 'lodash'

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
}

export default alt.createActions(DetailActions)
