# frozen_string_literal: true

require 'rails_helper'
require 'digest'

RSpec.describe 'Generic Elements', type: :model do
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
end
