import alt from '../alt'

class KeyboardActions {
  documentKeyDown(keyCode) {
    return keyCode
  }

  contextChange(context) {
    return context
  }
}

export default alt.createActions(KeyboardActions)
