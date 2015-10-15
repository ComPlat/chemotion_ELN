import Reaction from '../models/Reaction';
import Wellplate from '../models/Wellplate';

export default class ReactionProxy extends Reaction {
  constructor(args) {
    super(args)

    let methodsWithGetAndSet = [
      'name', 'status', 'description', 'timestamp_start', 'timestamp_stop', 'observation',
      'purification', 'solvents', 'rf_value', 'temperature', 'tlc_description'
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

  get wellplates() {
    return super.wellplates == undefined ? [] : super.wellplates;
  }

  // WellplateProxy
  set wellplates(wellplates) {
    super.wellplates = wellplates.map(w => new Wellplate(w));
  }

  isMethodRestricted(method) {
    return this.isRestricted() == true && this.methodOrRestrictionPattern(method) == this.restrictionPattern;
  }

  isMethodDisabled(method) {
    return this.isMethodRestricted(method) == true && this.isNew
  }
}
