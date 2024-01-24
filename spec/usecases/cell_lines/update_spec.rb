# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Usecases::CellLines::Update do
  describe 'execute!' do
    let(:user) { create(:user, collections: [collection]) }
    let(:cell_line_sample) { use_case.execute! }
    let(:use_case) { described_class.new(params, user) }
    let(:collection) { create(:collection) }
    let(:original_cellline_sample) { create(:cellline_sample, collections: [collection]) }
    let(:params) do
      {
        cell_line_sample_id: original_cellline_sample.id,
        amount: -1,
      }
    end

    context 'when data is not valid' do
      it 'error message delivered' do
        expect { cell_line_sample }.to raise_error(RuntimeError, 'amount not valid')
      end

      it 'original cell line sample was not changed' do
        expect(CelllineSample.find(original_cellline_sample.id).amount).to be 999
      end
    end

    context 'when cell line material was not changed' do
      let(:params) do
        {
          material_names: 'name-001',
          source: 'IPB',
          cell_line_sample_id: original_cellline_sample.id,
          amount: 200,
          passage: original_cellline_sample.passage,
          unit: original_cellline_sample.unit,
        }
      end

      it 'cell line sample has changed' do
        expect(cell_line_sample.amount).to be 200
        expect(CelllineSample.find(original_cellline_sample.id).amount).to be 200
      end

      it 'cell line material has not changed' do
        loaded_cellline_sample = CelllineSample.find(original_cellline_sample.id)
        expect(loaded_cellline_sample.cellline_material.id).to be original_cellline_sample.cellline_material.id
      end
    end

    context 'when cell line material was changed' do
      let(:params) do
        {
          material_names: 'name-002',
          source: 'IPB',
          cell_line_sample_id: original_cellline_sample.id,
          amount: 200,
          passage: original_cellline_sample.passage,
          unit: original_cellline_sample.unit,
        }
      end

      it 'cell line sample has changed' do
        expect(cell_line_sample.amount).to be 200
        expect(CelllineSample.find(original_cellline_sample.id).amount).to be 200
      end

      it 'cell line material has changed' do
        loaded_cellline_sample = CelllineSample.find(cell_line_sample.id)
        expect(loaded_cellline_sample.cellline_material.id).not_to be original_cellline_sample.cellline_material.id
      end
    end

    context 'when changing a cell line in a shared collection' do
      let(:user) { create(:user) }
      let(:sharring_user) { create(:user, collections: [collection]) }
      let(:sharred_collection) { create(:collection) }

      let(:params) do
        {
          material_names: 'name-001',
          source: 'IPB',
          cell_line_sample_id: original_cellline_sample.id,
          amount: 5000,
          passage: original_cellline_sample.passage,
          unit: original_cellline_sample.unit,
        }
      end

      before do
        Usecases::Sharing::ShareWithUser.new(
          user_ids: [user.id],
          cell_line_ids: [original_cellline_sample.id],
          collection_attributes: {
            user_id: user.id,
            label: 'shared_collection',
            permission_level: 10,
            shared_by_id: sharring_user.id,
          },
        ).execute!
      end

      it 'amount was changed to 5000' do
        expect(cell_line_sample.amount).to be 5000
      end
    end
  end
end
