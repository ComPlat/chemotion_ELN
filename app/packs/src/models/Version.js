import Change from 'src/models/Change';

export default class Version {
  constructor({
    v, k, n, t, u, c,
  }) {
    const changes = Object.entries(c).map((change) => (new Change(change)));

    this.id = v;
    this.klass = k;
    this.name = n;
    this.createdAt = new Date(t);
    this.userName = u;
    this.changes = changes;
  }
}
