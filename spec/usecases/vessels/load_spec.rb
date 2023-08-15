# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Usecases::Vessels::Load do
  let(:user) { create(:user) }
  let(:collection) { create(:collection) }
  let(:vessel) { create(:vessel) }
  let(:vessel2) { create(:vessel) }
  let(:id) { vessel.id }

  let(:loaded_vessel) { described_class.new(id, user).execute! }

  describe 'execute!' do
    before do
      CollectionsVessel.create(
        collection: collection,
        vessel: vessel,
      )
      user.collections << collection
      user.save
    end

    context 'when data is not valid' do
      let(:loaded_vessel) { described_class.new(id, nil).execute! }

      it 'error message delivered' do
        expect { loaded_vessel }.to raise_error(RuntimeError, 'user is not valid')
      end
    end

    context 'when vessel does not exist' do
      let(:id) { -1 }

      it 'returned value is empty' do
        expect { loaded_vessel }.to raise_error(RuntimeError, 'id not valid')
      end
    end

    context 'when cell line does exist but user has no access' do
      let(:id) { vessel2.id }

      it 'returned value is empty' do
        expect { loaded_vessel }.to raise_error(RuntimeError, 'user has no access to object')
      end
    end

    context 'when cell line does exist and user has access' do
      it 'returned value is the vessel' do
        expect(loaded_vessel).to eq(vessel)
      end
    end
  end
end
