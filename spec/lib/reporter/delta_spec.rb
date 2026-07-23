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
  end
end
