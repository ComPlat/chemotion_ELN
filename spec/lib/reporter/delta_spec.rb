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
  end
end
