# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::QuillDeltaText do
  describe '.to_text' do
    it 'joins the string inserts of a Quill delta Hash' do
      delta = { 'ops' => [{ 'insert' => '1H NMR ' }, { 'insert' => 'δ = 7.26 (s, 1H).' }] }
      expect(described_class.to_text(delta)).to eq('1H NMR δ = 7.26 (s, 1H).')
    end

    it 'supports symbol keys (Grape/Hashie params)' do
      delta = { ops: [{ insert: 'IR (ATR) = 1707 cm-1.' }] }
      expect(described_class.to_text(delta)).to eq('IR (ATR) = 1707 cm-1.')
    end

    it 'parses a serialised (JSON string) delta' do
      expect(described_class.to_text('{"ops":[{"insert":"EI (m/z): 86 (100)."}]}')).to eq('EI (m/z): 86 (100).')
    end

    it 'ignores non-string inserts (embeds)' do
      delta = { 'ops' => [{ 'insert' => 'peak ' }, { 'insert' => { 'image' => 'x.png' } }, { 'insert' => 'list' }] }
      expect(described_class.to_text(delta)).to eq('peak list')
    end

    it 'returns a plain string unchanged' do
      expect(described_class.to_text('just text')).to eq('just text')
    end

    it 'accepts a bare ops array' do
      expect(described_class.to_text([{ 'insert' => 'a' }, { 'insert' => 'b' }])).to eq('ab')
    end

    it 'returns empty string for nil' do
      expect(described_class.to_text(nil)).to eq('')
    end
  end
end
