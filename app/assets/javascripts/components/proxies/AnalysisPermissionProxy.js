import _ from 'lodash';

export default class AnalysisPermissionProxy {
  constructor(analysis, parentSample) {
    let analysisMethodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(analysis)).concat(Object.getOwnPropertyNames(analysis));

    analysisMethodNames.forEach((m) => {
      Object.defineProperty(this, m, {
        get: () => { return this.methodOrRestrictionPattern(analysis, parentSample, m) },
        set: (arg) => { analysis[m] = arg }
      })
    });

    this.isMethodDisabled = (methodName) => {
      return this.methodOrRestrictionPattern(analysis, parentSample, methodName) == this.restrictionPattern;
    };
  }

  methodOrRestrictionPattern(analysis, parentSample, m) {
    if(parentSample.is_restricted == true && analysis[m] == undefined) {
      return this.restrictionPattern;
    } else {
      return analysis[m];
    }
  }

  get restrictionPattern() {
    return '***';
  }
}
