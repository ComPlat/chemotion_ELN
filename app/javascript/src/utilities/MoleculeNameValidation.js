// Blocks C0/C1 control chars, bidi overrides (U+202A-U+202E, U+2066-U+2069),
// and zero-width/invisible chars (U+200B-U+200D, U+FEFF).
// Allows all printable Unicode: en dash, middle dot, Greek letters, etc.
// eslint-disable-next-line no-control-regex
const INVALID_MOLECULE_NAME_CHARS = /[\x00-\x1f\x7f\u0080-\u009f\u200b-\u200d\u202a-\u202e\u2066-\u2069\ufeff]/;

const isValidMoleculeName = (name) => !INVALID_MOLECULE_NAME_CHARS.test(name);

export { INVALID_MOLECULE_NAME_CHARS, isValidMoleculeName };
