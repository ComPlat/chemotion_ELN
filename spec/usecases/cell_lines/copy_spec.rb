# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Usecases::CellLines::Copy do
  let(:user) { create(:user) }
  let(:collection) { create(:collection) }
  let(:cell_line_sample_to_copy) { create(:cellline_sample) }
  let(:use_case) { described_class.new(cell_line_sample_to_copy, user) }

  describe 'execute!' do
    let(:cell_line_sample_copied) { use_case.execute! }

    context 'when cell line is copyable' do
      it 'cell line sample was copied' do
        expect(cell_line_sample_copied).not_to be_nil
      end

      it 'cell line sample match' do # rubocop:disable RSpec/MultipleExpectations
        expect(cell_line_sample_copied.amount).to be cell_line_sample_to_copy.amount
        expect(cell_line_sample_copied.passage).to be cell_line_sample_to_copy.passage
        expect(cell_line_sample_copied.contamination).to eq(cell_line_sample_to_copy.contamination)
        expect(cell_line_sample_copied.name).to eq(cell_line_sample_to_copy.name)
        expect(cell_line_sample_copied.description).to eq(cell_line_sample_to_copy.description)

        expect(cell_line_sample_copied.cellline_material).to be cell_line_sample_to_copy.cellline_material
      end

      it 'attributes are deep copied' do 
        expected_amount = cell_line_sample_to_copy.amount
        expected_name = cell_line_sample_to_copy.name
        expect(cell_line_sample_copied.amount).to be expected_amount
        expect(cell_line_sample_copied.name).to eq(expected_name)
        cell_line_sample_to_copy.amount = 100
        cell_line_sample_to_copy.name = 'new'
        expect(cell_line_sample_copied.amount).to be expected_amount
        expect(cell_line_sample_copied.name).to eq(expected_name)
      end

      it 'cell line sample label was created' do
      end
    end
  end
end
