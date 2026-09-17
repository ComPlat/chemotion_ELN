# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Reporter::Delta do
  describe '#getHTML' do
    [nil, {}, { 'ops' => nil }, { 'ops' => [] }].each do |blank_input|
      it "returns an empty string for blank input #{blank_input}" do
        reporter = described_class.new(blank_input)
        expect(reporter.getHTML).to eq('')
      end
    end

    it 'emits block elements without a wrapping <div> (valid sablon fragment)' do
      delta = { 'ops' => [{ 'insert' => "hello\n" }] }
      expect(described_class.new(delta).getHTML).to eq('<p>hello</p>')
    end

    # Quill superscript is script: "super", but "super" is not a valid HTML tag;
    # sablon >= 0.4.3 raises ArgumentError on it. The converter must emit <sup>.
    it 'renders script: "super" as a <sup> tag, not an invalid <super> tag' do
      delta = { 'ops' => [{ 'attributes' => { 'script' => 'super' }, 'insert' => '2+' }] }
      html = described_class.new(delta).getHTML
      expect(html).to include('<sup>').and include('</sup>')
      expect(html).not_to include('<super>')
    end

    it 'renders script: "sub" as a <sub> tag' do
      delta = { 'ops' => [{ 'attributes' => { 'script' => 'sub' }, 'insert' => '2' }] }
      html = described_class.new(delta).getHTML
      expect(html).to include('<sub>').and include('</sub>')
    end

    # New embed shapes emitted by AttachmentImageBlot / AttachmentFileBlot
    # (inline drop feature). Before B1 the reporter treated these as plain
    # text and either raised NoMethodError on gsub or dumped the raw hash
    # into the document as `{"attachment-image"=>{...}}`.
    context 'with new-shape inline attachment ops' do
      it 'does not raise when an attachment-image embed op is present' do
        delta = { 'ops' => [
          { 'insert' => 'before ' },
          { 'insert' => { 'attachment-image' => { 'attachment_identifier' => 'abc', 'filename' => 'x.png' } } },
          { 'insert' => "\n" },
        ] }
        expect { described_class.new(delta).getHTML }.not_to raise_error
      end

      it 'does not raise when an attachment-file embed op is present' do
        delta = { 'ops' => [
          { 'insert' => { 'attachment-file' => { 'attachment_identifier' => 'xyz', 'filename' => 'x.pdf' } } },
          { 'insert' => "\n" },
        ] }
        expect { described_class.new(delta).getHTML }.not_to raise_error
      end

      it 'does not dump the raw hash into the HTML for attachment-image' do
        delta = { 'ops' => [
          { 'insert' => { 'attachment-image' => { 'attachment_identifier' => 'abc' } } },
          { 'insert' => "\n" },
        ] }
        html = described_class.new(delta).getHTML
        expect(html).not_to include('attachment-image')
        expect(html).not_to include('attachment_identifier')
      end

      it 'does not dump the raw hash into the HTML for attachment-file' do
        delta = { 'ops' => [
          { 'insert' => { 'attachment-file' => { 'attachment_identifier' => 'xyz' } } },
          { 'insert' => "\n" },
        ] }
        html = described_class.new(delta).getHTML
        expect(html).not_to include('attachment-file')
        expect(html).not_to include('attachment_identifier')
      end

      it 'still renders legacy image embed ops without raising' do
        delta = { 'ops' => [
          { 'insert' => { 'image' => 'data:image/png;base64,legacy' } },
          { 'insert' => "\n" },
        ] }
        expect { described_class.new(delta).getHTML }.not_to raise_error
      end
    end
  end
end
