# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::Search::ConditionsForAdvancedSearch do
  describe '#filter!' do
    let(:sample) { create(:sample) }
    let(:params) do
      [
        { 'link' => '', 'match' => 'ILIKE', 'table' => 'samples', 'element_id' => 0,
          'field' => { 'column' => 'content', 'table' => 'samples' }, 'value' => 'sample note' },
      ]
    end

    before do
      create(:private_note, noteable: sample, user_id: sample.created_by, content: 'sample note')
    end

    it 'matches no private notes when no user is supplied' do
      conditions = described_class.new(params: params, detail_levels: { sample_detail_level: 10 }).filter!
      results = Sample.joins(conditions[:joins].join(' ')).where(conditions[:query])

      expect(results).to be_empty
    end
  end
end
