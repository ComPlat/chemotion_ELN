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

  describe 'filter_image strips attachment ops before HTML rendering' do
    # Locks the regex additions in lib/quill_utils.rb#filter_image. Without
    # them, `attachment-image` / `attachment-file` ops would leak into the
    # HTML output as raw JSON fragments and break every exporter that uses
    # QuillToHtml (export_research_plan, export_excel, ...).
    it 'strips current Embed-shape attachment-image and attachment-file ops' do
      delta = [
        { insert: 'Kept ' },
        { insert: { 'attachment-image' => { attachment_identifier: 'abc', filename: 'foo.png' } } },
        { insert: { 'attachment-file' => { attachment_identifier: 'def', filename: 'bar.pdf', filesize: 42 } } },
        { insert: "text\n" },
      ]
      html = quill_to_html.convert(delta.to_json)
      expect(html).to include('Kept ')
      expect(html).to include('text')
      expect(html).not_to include('attachment-image')
      expect(html).not_to include('attachment-file')
      expect(html).not_to include('attachment_identifier')
    end
  end
end
