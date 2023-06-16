# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'QuillToPlainText' do
  subject { Chemotion::QuillToPlainText }

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

    it 'converts a quill delta ops as ruby array to html' do
      expect(subject.new.convert(delta_ops)).to match(plain_text)
    end

    it 'converts a quill delta ops as ruby json string to html' do
      expect(subject.new.convert(delta_ops.to_json)).to match(plain_text)
    end
  end
end
