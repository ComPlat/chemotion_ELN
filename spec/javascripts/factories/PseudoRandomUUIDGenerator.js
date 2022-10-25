import v5 from 'uuid/v5';

export default class PseudoRandomUUIDGenerator {
  static UUID_NAMESPACE = 'bf08b226-5395-11ed-bdc3-0242ac120002';

  static currentNumber = 0;

  static reset() {
    PseudoRandomUUIDGenerator.currentNumber = 0;
  }

  static createNextUUID() {
    PseudoRandomUUIDGenerator.currentNumber += 1;
    return v5(
      PseudoRandomUUIDGenerator.currentNumber.toString(),
      PseudoRandomUUIDGenerator.UUID_NAMESPACE
    );
  }
}
