# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::Collections::Create do
  let(:user) { create(:person) }
  let(:usecase) { described_class.new(user) }
  let(:repository_root) do
    Collection.find_by!(user_id: user.id, label: 'chemotion-repository.net', is_locked: true)
  end

  describe '#perform!' do
    it 'creates a root collection' do
      collection = usecase.perform!(parent_id: nil, label: 'Project', inventory_id: nil)

      expect(collection).to have_attributes(label: 'Project', ancestry: '/', is_locked: false)
    end

    it 'creates a sub-collection under an ordinary parent' do
      parent = create(:collection, user: user, label: 'Parent')

      collection = usecase.perform!(parent_id: parent.id, label: 'Child', inventory_id: nil)

      expect(collection.parent_id).to eq(parent.id)
    end

    # UpdateTree refuses to move anything out of a locked container, so a collection created inside
    # one could never be moved back out.
    it 'refuses a locked parent' do
      expect do
        usecase.perform!(parent_id: repository_root.id, label: 'Child', inventory_id: nil)
      end.to raise_error(Usecases::Collections::Errors::CreateForbidden)
    end
  end
end
