# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ProfileHelpers do
  let(:helper) do
    Class.new do
      include ProfileHelpers
      attr_accessor :current_user
    end.new
  end
  let(:user) { create(:person) }
  let(:bao_value) { 'BAO:0000001 | bioassay' }

  before { helper.current_user = user }

  it 'stores BAO selections made through the shared analysis selector in BAO history' do
    helper.recent_ols_term_update('chmo', [bao_value])

    term = user.profile.reload.data.fetch('bao').first
    expect(term).to include('owl_name' => 'bao', 'term_id' => 'BAO:0000001', 'value' => " #{bao_value}")
    expect(user.profile.data.fetch('chmo').pluck('term_id')).not_to include('BAO:0000001')
  end

  it 'records dedicated BAO selections too' do
    helper.recent_ols_term_update('bao', [bao_value])
    expect(user.profile.reload.data.fetch('bao').first['term_id']).to eq('BAO:0000001')
  end

  it 'processes later terms even when an earlier term was already recently selected' do
    helper.recent_ols_term_update('chmo', [bao_value])
    helper.recent_ols_term_update('chmo', [bao_value, 'CHMO:0000001 | test method'])

    data = user.profile.reload.data
    expect(data.fetch('bao').size).to eq(1)
    expect(data.fetch('chmo').first['term_id']).to eq('CHMO:0000001')
  end
end
