# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Reporter::Delta do
  describe '#getHTML' do
    [nil, {}, { 'ops' => nil }, { 'ops' => [] }].each do |blank_input|
      it "returns empty div for blank input #{blank_input}" do
        reporter = described_class.new(blank_input)
        expect(reporter.getHTML).to eq('<div></div>')
      end
    end
  end
end
