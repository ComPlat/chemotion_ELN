import expect from 'expect';
import safeHref from 'src/utilities/safeHref';

describe('safeHref', () => {
  it('keeps http and https URLs', () => {
    expect(safeHref('https://www.sigmaaldrich.com/DE/en/sds/sigald/383112'))
      .toBe('https://www.sigmaaldrich.com/DE/en/sds/sigald/383112');
    expect(safeHref('http://example.com/a')).toBe('http://example.com/a');
  });

  it('keeps local paths and trims whitespace', () => {
    expect(safeHref(' /safety_sheets/merck/270709_abcd.pdf ')).toBe('/safety_sheets/merck/270709_abcd.pdf');
  });

  it('returns null for protocol-relative and backslash paths', () => {
    expect(safeHref('//example.com/a')).toBe(null);
    expect(safeHref('/\\example.com/a')).toBe(null);
  });

  it('returns null for other schemes', () => {
    ['javascript:void(0)', 'JavaScript:void(0)', 'data:text/html,x', 'ftp://example.com/a', 'mailto:a@b.c']
      .forEach((value) => expect(safeHref(value)).toBe(null));
  });

  it('returns null for blank, relative and non-string values', () => {
    ['', '   ', 'safety_sheets/a.pdf', null, undefined, 42, {}, []]
      .forEach((value) => expect(safeHref(value)).toBe(null));
  });
});
