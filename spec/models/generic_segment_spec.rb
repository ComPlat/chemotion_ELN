# frozen_string_literal: true

require 'rails_helper'
require 'digest'

RSpec.describe 'Generic Segmenets', type: :model do
  context 'with Generic Segmenets' do
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
end
