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

      it 'cell line sample match' do
        
      end

      it 'cell line sample label was created' do
      end
    end
  end
end
