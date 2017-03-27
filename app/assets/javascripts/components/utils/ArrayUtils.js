const Immutable = require('immutable');

export default class ArrayUtils {
  static pushUniq(list, value) {
    if(!list.includes(value)) {
      return list.push(value);
    }
  }

  static removeFromListByValue(list, value) {
    let index = list.indexOf(value);

    return this.removeFromListByIndex(list, index);
  }

  static removeFromListByIndex(list, index) {
    if(index != -1) {
      return list.delete(index);
    } else {
      return list;
    }
  }

  static isValInArray(array, value) {
    let index = array.indexOf(value);

    if(index != -1) {
      return true;
    } else {
      return false;
    }
  }

  static isValNotInArray(array, value) {
    return !ArrayUtils.isValInArray(array, value)
  }

  static flatten2D(array_2d) {
    return array_2d.reduce((a, b) => a.concat(b), []);
  }
}
