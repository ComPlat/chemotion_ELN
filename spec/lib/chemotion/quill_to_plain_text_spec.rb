# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'QuillToPlainText' do
  subject(:lib) { Chemotion::QuillToPlainText }

  describe 'convert' do
    let(:delta_ops) do
      [
        { insert: "Hello\n" },
        { insert: 'This is colorful', attributes: { color: '#f00' } },
      ]
    end
    let(:plain_text) do
      "Hello\nThis is colorful"
    end

    it 'converts a quill delta ops as ruby array to plain text' do
      expect(lib.convert(delta_ops)).to match(plain_text)
    end

    it 'converts a quill delta ops as ruby json string to plain text' do
      expect(lib.convert(delta_ops.to_json)).to match(plain_text)
    end
  end

  describe 'convert empty array' do
    let(:delta_ops) do
      []
    end
    let(:plain_text) do
      ''
    end

    it 'converts a quill delta ops as ruby array to plain text' do
      expect(lib.convert(delta_ops)).to match(plain_text)
    end

    it 'converts a quill delta ops as ruby json string to plain text' do
      expect(lib.convert(delta_ops.to_json)).to match(plain_text)
    end
  end

  describe 'convert empty delta' do
    let(:delta_ops) do
      "{\"ops\":[{\"insert\":\"\"}]}"
    end
    let(:delta_ops_multi) do
      "{\"ops\":[{\"insert\":\"\"},{\"insert\":\"\"}]}"
    end
    let(:plain_text) do
      ''
    end

    it 'converts a quill delta ops as ruby array to plain text' do
      expect(lib.convert(delta_ops)).to match(plain_text)
    end

    it 'converts a quill delta ops as ruby json string to plain text' do
      expect(lib.convert(JSON.parse(delta_ops))).to match(plain_text)
    end

    it 'converts a quill delata with multiple empty inserts' do
      expect(lib.convert(JSON.parse(delta_ops_multi))).to match(plain_text)
    end
  end

  describe 'filter_image strips attachment ops across every shape' do
    # Locks the regex additions in lib/quill_utils.rb#filter_image so future
    # blot refactors that change the delta key (`image` → `attachment-image`,
    # etc.) can't silently leak raw JSON tokens into exported plain text.
    it 'strips current Embed-shape attachment-image and attachment-file ops' do
      delta = {
        ops: [
          { insert: 'Hello ' },
          { insert: { 'attachment-image' => { attachment_identifier: 'abc', filename: 'foo.png', width: '320' } } },
          { insert: ' and ' },
          { insert: { 'attachment-file' => { attachment_identifier: 'def', filename: 'bar.pdf', filesize: 1024 } } },
          { insert: " done\n" },
        ],
      }
      expect(lib.convert(delta.to_json)).to eq("Hello  and  done\n")
    end

    it 'still strips legacy shapes (raw dataURL image and inline attachment-file attribute)' do
      delta = {
        ops: [
          { insert: 'Before ' },
          { insert: { image: 'data:image/png;base64,AAA' } },
          { insert: 'middle ' },
          { insert: 'legacy.pdf', attributes: { 'attachment-file' => { attachment_identifier: 'ghi', filename: 'legacy.pdf' } } },
          { insert: " after\n" },
        ],
      }
      expect(lib.convert(delta.to_json)).to eq("Before middle  after\n")
    end
  end

  describe 'convert long delta' do
    let(:delta_ops) do
      "{\"ops\":[{\"insert\":\"#{'a' * 10_000}\"}]}"
    end
    let(:plain_text) do
      'a' * 10_000
    end

    it 'converts a long quill delta ops to plain text' do
      expect(lib.convert(delta_ops)).to match(plain_text)
    end
  end
end
