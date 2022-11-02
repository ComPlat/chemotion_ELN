/* eslint-disable camelcase */
import HistoryField from 'src/models/HistoryField';

export default class HistoryChange {
  constructor({
    name, fields, db_id, klass_name,
  }) {
    this.name = name;
    this.db_id = db_id;
    this.klass_name = klass_name;
    this.fields = Object.entries(fields).map((field) => (new HistoryField(field)));
  }
}
