# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CachedTokenThirdPartyApp do
  subject(:cached) { described_class.new('a-token', 2, 'MyApp') }

  describe '#initialize' do
    it 'stores token, counter and app name' do
      expect(cached).to have_attributes(token: 'a-token', counter: 2, name_tpa: 'MyApp')
    end
  end

  describe 'accessors' do
    it 'allows the counter to be updated' do
      cached.counter -= 1

      expect(cached.counter).to eq 1
    end
  end
end
