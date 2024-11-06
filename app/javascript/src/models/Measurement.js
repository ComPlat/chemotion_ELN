import Element from 'src/models/Element';

export default class Measurement extends Element {
  constructor(args) {
    super({
      description: args.description,
      errors: args.errors ?? [],
      id: args.id, // currently not implemented but added for future usage when we actually display measurements
      sample_identifier: args.sample_identifier,
      unit: args.unit,
      uuid: args.uuid,
      value: args.value
    });
  }
}
