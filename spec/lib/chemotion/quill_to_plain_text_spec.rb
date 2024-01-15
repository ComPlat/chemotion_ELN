# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'QuillToPlainText' do
  subject(:lib) { Chemotion::QuillToPlainText.new }

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
    let(:plain_text) do
      ''
    end

    it 'converts a quill delta ops as ruby array to plain text' do
      expect(lib.convert(delta_ops)).to match(plain_text)
    end

    it 'converts a quill delta ops as ruby json string to plain text' do
      expect(lib.convert(JSON.parse(delta_ops))).to match(plain_text)
    end
  end
end
