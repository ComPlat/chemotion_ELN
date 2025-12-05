# frozen_string_literal: true

require 'rails_helper'
require 'digest'

RSpec.describe 'Generic Datasets', type: :model do
  context 'with Generic Datasets' do
    let!(:dk) { create(:dataset_klass, ols_term_id: 'CHMO:0000593') }
    let!(:ds) { create(:dataset, dataset_klass: dk) }

    describe 'creation' do
      it 'is possible to create a valid datasets' do
        expect(ds.valid?).to be(true)
      end
    end

    describe 'deletion' do
      before do
        dk.destroy
      end

      it 'deletes datasets' do
        expect(dk.deleted_at).not_to be_nil
      end
    end
  end
end
