import alt from '../alt'
import DetailActions from '../actions/DetailActions'
import ElementActions from '../actions/ElementActions'
import Utils from '../utils/Functions'
import ArrayUtils from '../utils/ArrayUtils'
import Sample from '../models/Sample'
import Reaction from '../models/Reaction'
import { SameEleTypId, UrlSilentNavigation } from '../utils/ElementUtils'

class DetailStore {
  constructor() {
    this.selecteds = []
    this.activeKey = 0
    this.deletingElement = null

    this.bindListeners({
      handleSelect: DetailActions.select,
      handleClose: DetailActions.close,
      handleConfirmDelete: DetailActions.confirmDelete,
      handleChangeCurrentElement: DetailActions.changeCurrentElement,
      handleGetMoleculeCas: DetailActions.getMoleculeCas,
      handleUpdateMoleculeNames: DetailActions.updateMoleculeNames,
    })
  }

  handleSelect(index) {
    this.resetCurrentElement(index, this.selecteds)
  }

  handleClose({deleteEl, force}) {
    let isDeletable = this.isDeletable(deleteEl)
    // Currently ignore report "isPendingToSave"
    if (deleteEl.type === "report") isDeletable = true

    if(force || isDeletable) {
      this.deleteCurrentElement(deleteEl)
    } else {
      this.setState({ deletingElement: deleteEl })
    }
  }

  handleConfirmDelete(confirm) {
    const deleteEl = this.deletingElement
    if(confirm) {
      this.deleteCurrentElement(deleteEl)
    }
    this.setState({ deletingElement: null })
  }

  handleChangeCurrentElement({oriEl, nextEl}) {
    const selecteds = this.selecteds
    const index = this.elementIndex(selecteds, nextEl)
    let activeKey = index
    let newSelecteds = null

    let sync = this.synchronizeElements(oriEl, nextEl)
    oriEl = sync.ori
    nextEl = sync.next

    if(!oriEl || index === -1) {
      activeKey = selecteds.length
      newSelecteds = this.addElement(nextEl)
    } else {
      newSelecteds = this.updateElement(nextEl, index)
    }

    this.setState({ selecteds: newSelecteds })
    this.resetActiveKey(activeKey)
  }

  handleGetMoleculeCas(updatedSample) {
    const selecteds = this.selecteds
    const index = this.elementIndex(selecteds, updatedSample)
    const newSelecteds = this.updateElement(updatedSample, index)
    this.setState({ selecteds: newSelecteds })
  }

  handleUpdateMoleculeNames(updatedSample) {
    if (updatedSample) {
      const selecteds = this.selecteds;
      const index = this.elementIndex(selecteds, updatedSample);
      const newSelecteds = this.updateElement(updatedSample, index);
      this.setState({ selecteds: newSelecteds });
    }
  }

  synchronizeElements(close, open) {
    let associatedSampleFromReaction = (
      close instanceof Reaction && open instanceof Sample &&
      close.samples.map(s => s.id).includes(open.id)
    )

    let associatedReactionFromSample = (
      close instanceof Sample && open instanceof Reaction &&
      open.samples.map(s => s.id).includes(close.id)
    )

    if (associatedSampleFromReaction) {
      let s = close.samples.filter(x => x.id == open.id)[0]

      open.amount_value = s.amount_value
      open.amount_unit = s.amount_unit
      open.container = s.container
    } else if (associatedReactionFromSample) {
      open.updateMaterial(close)
      if (close.isPendingToSave) open.changed = close.isPendingToSave
    }

    return {ori: close, next: open}
  }

  addElement(addEl) {
    const selecteds = this.selecteds
    return [...selecteds, addEl]
  }

  updateElement(updateEl, index) {
    const selecteds = this.selecteds
    return  [ ...selecteds.slice(0, index),
              updateEl,
              ...selecteds.slice(index + 1) ]
  }

  deleteElement(deleteEl) {
    const selecteds = this.selecteds

    return selecteds.map( s => {
      const isSame = SameEleTypId(s, deleteEl)
      return isSame ? null : s
    }).filter(r => r != null)
  }

  elementIndex(selecteds, newSelected) {
    let index = -1
    selecteds.forEach( (s, i) => {
      const isSame = SameEleTypId(s, newSelected)
      if(isSame) { index = i }
    })
    return index
  }

  resetCurrentElement(newKey, newSelecteds) {
    const newCurrentElement = newKey < 0 ? newSelecteds[0] : newSelecteds[newKey]
    if(newSelecteds.length === 0) {
      ElementActions.deselectCurrentElement.defer()
    } else {
      ElementActions.setCurrentElement.defer(newCurrentElement)
    }

    UrlSilentNavigation(newCurrentElement)
  }

  deleteCurrentElement(deleteEl) {
    const newSelecteds = this.deleteElement(deleteEl)
    const left = this.activeKey - 1
    this.setState(
      { selecteds: newSelecteds },
      this.resetCurrentElement(left, newSelecteds)
    )
  }

  isDeletable(deleteEl) {
    return deleteEl && deleteEl.isPendingToSave ? false : true
  }

  resetActiveKey(activeKey) {
    setTimeout(this.setState.bind(this, { activeKey }), 300)
  }
}

export default alt.createStore(DetailStore, 'DetailStore')
