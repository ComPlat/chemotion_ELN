# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Usecases::CellLines::Load do
  let(:user) { create(:user) }
  let(:collection) { create(:collection) }
  let(:material) { create(:cellline_material) }
  let(:cellline_sample) { create(:cellline_sample, cellline_material: material) }
  let(:cellline_sample2) { create(:cellline_sample, cellline_material: material) }
  let(:id) { cellline_sample.id }

  let(:loaded_cellline_sample) { described_class.new(id, user).execute! }

  describe 'execute!' do
    before do
      CollectionsCellline.create(
        collection: collection,
        cellline_sample: cellline_sample,
      )
      user.collections << collection
      user.save
    end

    context 'when data is not valid' do
      let(:loaded_cellline_sample) { described_class.new(id, nil).execute! }

      it 'error message delivered' do
        expect { loaded_cellline_sample }.to raise_error(RuntimeError, 'user is not valid')
      end
    end

    context 'when cell line does not exist' do
      let(:id) { -1 }

      it 'returned value is empty' do
        expect { loaded_cellline_sample }.to raise_error(RuntimeError, 'id not valid')
      end
    end

    context 'when cell line does exist but user has no access' do
      let(:id) { cellline_sample2.id }

      it 'returned value is empty' do
        expect { loaded_cellline_sample }.to raise_error(RuntimeError, 'user has no access to object')
      end
    end

    context 'when cell line does exist and user has access' do
      it 'returned value is the cellline' do
        expect(loaded_cellline_sample).to eq(cellline_sample)
      end
    end
  end
end
