# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Usecases::CellLines::Update do
  describe 'execute!' do
    before do
      CollectionsCellline.create(
        collection: collection,
        cellline_sample: original_cellline_sample,
      )
      user.collections << collection
      user.save
    end

    let(:user) { create(:user) }
    let(:cell_line_sample) { use_case.execute! }
    let(:use_case) { described_class.new(params, user) }
    let(:collection) { create(:collection) }
    let(:original_cellline_sample) { create(:cellline_sample) }
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
  end
end
