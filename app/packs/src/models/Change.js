export default class Change {
  constructor([name, {
    l, k, o, n,
  }]) {
    this.name = name;
    this.label = l;
    this.kind = k;
    this.oldValue = o;
    this.newValue = n;
  }
}
