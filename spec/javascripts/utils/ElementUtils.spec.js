import React from 'react'
import expect from 'expect'

import { searchAndReplace } from '../../../app/assets/javascripts/components/utils/quillFormat';
import { sampleAnalysesFormatPattern } from '../../../app/assets/javascripts/components/utils/ElementUtils'


describe('sampleAnalysesFormatPattern', () => {
  describe('_1hnmr', () => {
    const _1hnmr = sampleAnalysesFormatPattern['_1hnmr']

    it('replaces "3 H" by "3H"', () => {
      let content = { ops: [{ insert: 'Hello 3 Hi, 3 H byebye'}] }
      const expected =  'Hello 3Hi, 3H byebye'
      _1hnmr.forEach((patt) => {
        content = searchAndReplace(content, patt.pattern, patt.replace);
      });
      expect(content.ops[0]['insert']).toEqual(expected)
    })
  })
})
