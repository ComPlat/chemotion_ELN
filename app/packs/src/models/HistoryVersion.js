import HistoryChange from 'src/models/HistoryChange';

export default class HistoryVersion {
  constructor({
    id, time, user, changes,
  }) {
    this.id = id;
    this.createdAt = new Date(time);
    this.userName = user;
    this.changes = changes.map((change) => (new HistoryChange(change)));
  }
}
