# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ReactionsProductSample, type: :model do
  let(:sample) { described_class.new }
  let(:eq_val) { 5.0 }

  describe 'formatted_yield' do
    context 'without an equivalent value' do
      it 'yields " %" only' do
        expect(sample.formatted_yield).to eq ' %'
      end
    end

    context 'with an equivalent value' do
      before do
        sample.update_attribute :equivalent, eq_val
      end

      it 'yields "#{eq_val * 100} %"' do
        expect(sample.formatted_yield).to eq "#{eq_val * 100} %"
      end
    end
  end
end
