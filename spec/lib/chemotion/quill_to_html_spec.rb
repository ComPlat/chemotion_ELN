# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'QuillToHtml' do
  subject { Chemotion::QuillToHtml }

  describe 'convert' do
    let(:delta_ops) do
      [
        { insert: "Hello\n" },
        { insert: 'This is colorful', attributes: { color: '#f00' } }
      ]
    end
    let(:html) do
      '<p>Hello<br/><span style="color:#f00">This is colorful</span></p>'
    end

    it 'converts a quill delta ops as ruby array to html' do
      expect(subject.new.convert(delta_ops)).to match(html)
    end
    it 'converts a quill delta ops as ruby json string to html' do
      expect(subject.new.convert(delta_ops.to_json)).to match(html)
    end
  end
end
