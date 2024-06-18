# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'QuillToHtml' do
  subject(:quill_to_html) { Chemotion::QuillToHtml }

  describe 'convert' do
    let(:delta_ops) do
      [
        { insert: "Hello\n" },
        { insert: 'This is colorful', attributes: { color: '#f00' } },
      ]
    end
    let(:delta_ops_as_hash) do
      { 'ops' => delta_ops }
    end
    let(:html) do
      '<p>Hello<br/><span style="color:#f00">This is colorful</span></p>'
    end

    it 'converts a quill delta ops as ruby array to html' do
      expect(quill_to_html.convert(delta_ops)).to match(html)
    end

    it 'converts a quill delta ops as json string to html' do
      expect(quill_to_html.convert(delta_ops.to_json)).to match(html)
    end

    it 'converts a quill delta ops as Hash to html' do
      expect(quill_to_html.convert(delta_ops_as_hash)).to match(html)
    end

    it 'converts a quill delta ops as ActiveSupport::HashWithIndifferentAccess to html' do
      expect(quill_to_html.convert(delta_ops_as_hash.with_indifferent_access)).to match(html)
    end
  end
end
