/* eslint-disable camelcase */
export default class HistoryField {
  constructor([name, {
    label, kind, old_value, new_value, current_value, revert, revertible_value
  }]) {
    this.name = name;
    this.label = label;
    this.kind = kind;
    this.oldValue = old_value;
    this.newValue = new_value;
    this.currentValue = current_value;
    this.revert = revert;
    this.revertibleValue = revertible_value;
  }
}
