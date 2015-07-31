const Immutable = require('immutable');

var ArrayUtils = {
  pushUniq(list, value) {
    if(!list.includes(value)) {
      return list.push(value);
    }
  },

  removeFromListByValue(list, value) {
    var index = list.indexOf(value);

    if(index != -1) {
      return list.delete(index);
    } else {
      return list;
    }
  },

  isValInArray(array, value) {
    var index = array.indexOf(value);

    if(index != -1) {
      return true;
    } else {
      return false;
    }
  }
}

module.exports = ArrayUtils;
