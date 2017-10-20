import expect from 'expect';
import Delta from 'quill-delta';

import {
  deltaToMarkdown, markdownToDelta
} from '../../../app/assets/javascripts/components/utils/deltaMarkdownConverter';

describe('Delta to Markdown converter', () => {
  it('should convert inline characters', () => {
    const bDelta = new Delta({
      ops: [
        { insert: 'Hello '},
        { insert: 'ComPlat Group', attributes: { bold: true }},
        { insert: '\n'},
      ]
    });
    const iDelta = new Delta({
      ops: [
        { insert: 'Hello '},
        { insert: 'ComPlat Group', attributes: { italic: true }},
        { insert: '\n'},
      ]
    });
    const uDelta = new Delta({
      ops: [
        { insert: 'Hello '},
        { insert: 'ComPlat Group', attributes: { underline: true }},
        { insert: '\n'},
      ]
    });
    const bMd =  'Hello **ComPlat Group**\n\n';
    const iMd =  'Hello *ComPlat Group*\n\n';
    const uMd =  'Hello <u>ComPlat Group</u>\n\n';

    expect(deltaToMarkdown(bDelta)).toEqual(bMd);
    expect(deltaToMarkdown(iDelta)).toEqual(iMd);
    expect(deltaToMarkdown(uDelta)).toEqual(uMd);

    expect(markdownToDelta(bMd)).toEqual(bDelta);
    expect(markdownToDelta(iMd)).toEqual(iDelta);
    expect(markdownToDelta(uMd)).toEqual(uDelta);
  })

  it('shold convert combined inline characters', () => {
    const delta = new Delta({
      ops: [
        { insert: 'Hello '},
        {
          insert: 'ComPlat Group',
          attributes: { bold: true, italic: true, underline: true }
        },
        { insert: '\n'},
      ]
    })
    const md = 'Hello <u>***ComPlat Group***</u>\n\n';

    expect(deltaToMarkdown(delta)).toEqual(md);
    expect(markdownToDelta(md)).toEqual(delta);
  })

  it('should convert subscript and superscript', () => {
    const delta = new Delta({
      ops: [
        { insert: 'A '},
        {
          insert: 'subscript',
          attributes: { script: 'sub'},
        },
        { insert: ' and a '},
        {
          insert: 'superscript',
          attributes: { script: 'super'},
        },
        { insert: '\n'},
      ]
    })
    const md = 'A <sub>subscript</sub> and a <sup>superscript</sup>\n\n';

    expect(deltaToMarkdown(delta)).toEqual(md);
    expect(markdownToDelta(md)).toEqual(delta);
  })

  it('should convert header', () => {
    const delta = new Delta({
      ops: [
        {
          insert: 'This is a ',
        },
        {
          insert: '2-Header',
          attributes: { bold: true, italic: true, underline: true },
        },
        { insert: '\n' , attributes: { header: 2 }},
      ]
    })
    const md = '## This is a <u>***2-Header***</u>\n\n';

    expect(deltaToMarkdown(delta)).toEqual(md);
    expect(markdownToDelta(md)).toEqual(delta);
  })

  it('should convert list', () => {
    const delta = new Delta({
      ops: [
        { insert: 'First item'},
        { insert: '\n' , attributes: { list: 'ordered' }},
        { insert: 'Second item'},
        { insert: '\n' , attributes: { list: 'ordered' }},
        { insert: 'Third item'},
        { insert: '\n' , attributes: { list: 'ordered' }},
        { insert: 'A line of text\nFirst bullet' },
        { insert: '\n' , attributes: { list: 'bullet' }},
        { insert: 'Second bullet'},
        { insert: '\n' , attributes: { list: 'bullet' }},
      ]
    })
    const md = '1. First item\n2. Second item\n3. Third item\n\n' +
               'A line of text\n\n* First bullet\n* Second bullet\n\n'

    expect(deltaToMarkdown(delta)).toEqual(md);
    expect(markdownToDelta(md)).toEqual(delta);
  })
})
