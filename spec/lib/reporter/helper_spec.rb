# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Reporter::Helper do
  describe '.product_name' do
    it 'marks a carried product as intermediate and leaves other products alone' do
      expect(described_class.product_name(showed_name: 'benzene', carry_on: true)).to eq('benzene (intermediate)')
      expect(described_class.product_name(showed_name: 'benzene', carry_on: false)).to eq('benzene')
    end
  end
end
