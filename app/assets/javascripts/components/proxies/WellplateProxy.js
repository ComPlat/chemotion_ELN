import Wellplate from '../models/Wellplate';
import Well from '../models/Well';

export default class WellplateProxy extends Wellplate {
  constructor(args) {
    super(args)

    let methodsWithGetAndSet = [
      'name', 'description'
    ]

    methodsWithGetAndSet.forEach((m) => {
      Object.defineProperty(this, m, {
        get: function() { return this.methodOrRestrictionPattern(m) },
        set: function(arg) { super[m] = arg }
      })
    })

    let methodsWithGet = [

    ]

    methodsWithGet.forEach((m) => {
      Object.defineProperty(this, m, {
        get: function() { return this.methodOrRestrictionPattern(m) },
      })
    })
  }

  // serialize() {
  //   let sampleSerialization = super.serialize();
  //
  //   Object.keys(sampleSerialization).forEach((method) => {
  //     if(sampleSerialization[method] == this.restrictionPattern) {
  //       delete sampleSerialization[method];
  //     }
  //   })
  //
  //   return sampleSerialization;
  // }

  get restrictionPattern() {
    return '***';
  }

  methodOrRestrictionPattern(method) {
    if(super.isRestricted() == true && (super[method] === undefined)) {
      return this.restrictionPattern;
    } else {
      return super[method];
    }
  }

  get wells() {
    return super.wells == undefined ? [] : super.wells;
  }

  // WellProxy
  set wells(wells) {
    super.wells = wells.map(w => new Well(w));;
  }

  isMethodRestricted(method) {
    return this.isRestricted() == true && this.methodOrRestrictionPattern(method) == this.restrictionPattern;
  }

  isMethodDisabled(method) {
    return this.isMethodRestricted(method) == true && this.isNew
  }
}
