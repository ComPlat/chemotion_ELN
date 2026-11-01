/* eslint-disable camelcase */
export default class HistoryField {
  constructor([name, {
    label, kind, old_value, new_value, current_value, revert, revertible_value, linked_revertible_values = {},
    checkbox = false
  }]) {
    this.name = name;
    this.label = label;
    this.kind = kind;
    this.oldValue = old_value;
    this.newValue = new_value;
    this.currentValue = current_value;
    this.revert = revert;
    this.revertibleValue = revertible_value;
    // Columns restored together with this field (e.g. a structure's molfile), keyed by name.
    this.linkedRevertibleValues = linked_revertible_values;
    this.checkbox = checkbox;
  }
}
