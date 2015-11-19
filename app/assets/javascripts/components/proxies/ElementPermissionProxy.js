import Element from '../models/Element';
import _ from 'lodash';

export default class ElementPermissionProxy {
  constructor(element) {
    let elementMethodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(element)).concat(Object.getOwnPropertyNames(element));

    elementMethodNames.forEach((m) => {
      Object.defineProperty(this, m, {
        get: () => { return this.methodOrRestrictionPattern(element, m) },
        set: (arg) => { element[m] = arg }
      })
    });

    this.isMethodDisabled = (methodName) => {
      return this.methodOrRestrictionPattern(element, methodName) == this.restrictionPattern;
    };

    // get "superclass methods" and define them on proxy
    let rootMethodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(new Element));

    _.difference(rootMethodNames, elementMethodNames).forEach((m) => {
      Object.defineProperty(this, m, {
        get: () => { return element[m] },
        set: (arg) => { element[m] = arg }
      })
    });

    this.unwrap = () => {
      return element;
    }
  }

  methodOrRestrictionPattern(element, m) {
    if(element.isRestricted() == true && element[m] == undefined) {
      return this.restrictionPattern;
    } else {
      return element[m];
    }
  }

  get restrictionPattern() {
    return '***';
  }
}
