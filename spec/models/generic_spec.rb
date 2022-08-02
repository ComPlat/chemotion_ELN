# frozen_string_literal: true

require 'rails_helper'
require 'digest'

RSpec.describe 'Generic models' do
  context 'with Generic Elements' do
    let!(:ek) { create(:element_klass) }
    let!(:el) { create(:element) }

    describe 'creation' do
      it 'is possible to create a valid element klass and related element' do
        expect(ek.valid?).to be(true)
        expect(el.valid?).to be(true)
      end
    end

    describe 'deletion' do
      before do
        ek.destroy
      end

      it 'only soft deletes element klass and associated element' do
        expect(ek.deleted_at).not_to be_nil
        expect(ek.elements.length).to eq(0)
      end
    end
  end

  context 'with Generic Segmenets' do
    let!(:ek) { create(:element_klass) }
    let!(:sk) { create(:segment_klass) }
    let!(:sg) { create(:segment) }

    describe 'creation' do
      it 'is possible to create a valid segment klass and related segment' do
        expect(sk.valid?).to be(true)
        expect(sg.valid?).to be(true)
      end
    end

    describe 'deletion' do
      before do
        sk.destroy
      end

      it 'only soft deletes segment klass and associated segment' do
        expect(sk.deleted_at).not_to be_nil
        expect(sk.segments.length).to eq(0)
      end
    end
  end

  context 'with Generic Datasets' do
    let!(:dk) { create(:dataset_klass) }
    let!(:ds) { create(:dataset) }

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
