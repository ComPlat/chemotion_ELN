# frozen_string_literal: true

require 'rails_helper'

describe ElementPolicy do
  let(:user) { create(:user) }
  let(:other_user) { create(:user) }
  let(:owner) { user }
  let(:own_collection_of_user) { create(:collection, user: user, label: "Own collection of #{user.name}") }
  let(:own_collection_of_other_user) do
    create(:collection, user: other_user, label: "Own collection of #{other_user.name}")
  end
  let(:permission_level) { 0 }
  let(:shared_collection_of_other_user) do
    create(:collection, user: other_user, label: "Shared collection of #{other_user.name}").tap do |collection|
      create(:collection_share, collection: collection, shared_with: user, permission_level: permission_level)
    end
  end
  let(:screen) { create(:screen) }

  let(:element_policy) { described_class.new(user, screen) }

  describe '#read?' do
    context 'when the record is in an own collection' do
      before { own_collection_of_user.screens << screen }

      it 'returns true' do
        expect(element_policy.read?).to be true
      end
    end

    context 'when the record is in a collection shared to me' do
      before { shared_collection_of_other_user.screens << screen }

      it 'returns true' do
        expect(element_policy.read?).to be true
      end
    end

    context 'when the record is neither in a collection of mine or shared to me' do
      let(:owner) { other_user }

      before { own_collection_of_other_user.screens << screen }

      it 'returns false' do
        expect(element_policy.read?).to be false
      end
    end
  end

  describe '#update?' do
    context 'when the record is in an own collection' do
      before { own_collection_of_user.screens << screen }

      it 'returns true' do
        expect(element_policy.update?).to be true
      end
    end

    context 'when the record is in a collection shared to me with a permission level of 0' do
      let(:permission_level) { 0 }

      before { shared_collection_of_other_user.screens << screen }

      it 'returns false' do
        expect(element_policy.update?).to be false
      end
    end

    context 'when the record is in a collection shared to me with a permission level of 1 or higher' do
      let(:permission_level) { 1 }

      before { shared_collection_of_other_user.screens << screen }

      it 'returns true' do
        expect(element_policy.update?).to be true
      end
    end

    context 'when the record is neither in a collection of mine or shared to me' do
      let(:owner) { other_user }

      before { own_collection_of_other_user.screens << screen }

      it 'returns false' do
        expect(element_policy.update?).to be false
      end
    end
  end

  describe '#copy?' do
    context 'when the record is in an own collection' do
      before { own_collection_of_user.screens << screen }

      it 'returns true' do
        expect(element_policy.copy?).to be true
      end
    end

    context 'when the record is in a collection shared to me with a permission level of 0' do
      let(:permission_level) { 0 }

      before { shared_collection_of_other_user.screens << screen }

      it 'returns false' do
        expect(element_policy.copy?).to be false
      end
    end

    context 'when the record is in a collection shared to me with a permission level of 1 or higher' do
      let(:permission_level) { 1 }

      before { shared_collection_of_other_user.screens << screen }

      it 'returns true' do
        expect(element_policy.copy?).to be true
      end
    end

    context 'when the record is neither in a collection of mine or shared to me' do
      let(:owner) { other_user }

      before { own_collection_of_other_user.screens << screen }

      it 'returns false' do
        expect(element_policy.copy?).to be false
      end
    end
  end

  describe '#share?' do
    context 'when the record is in an own collection' do
      before { own_collection_of_user.screens << screen }

      it 'returns true' do
        expect(element_policy.share?).to be true
      end
    end

    context 'when the record is in a collection shared to me with a permission level below 2' do
      let(:permission_level) { 1 }

      before { shared_collection_of_other_user.screens << screen }

      it 'returns false' do
        expect(element_policy.share?).to be false
      end
    end

    context 'when the record is in a collection shared to me with a permission level of 2 or higher' do
      let(:permission_level) { 2 }

      before { shared_collection_of_other_user.screens << screen }

      it 'returns true' do
        expect(element_policy.share?).to be true
      end
    end

    context 'when the record is neither in a collection of mine or shared to me' do
      let(:owner) { other_user }

      before { own_collection_of_other_user.screens << screen }

      it 'returns false' do
        expect(element_policy.share?).to be false
      end
    end
  end

  describe '#destroy?' do
    context 'when the record is in an own collection' do
      before { own_collection_of_user.screens << screen }

      it 'returns true' do
        expect(element_policy.destroy?).to be true
      end
    end

    # Destroying an element record is owner-only. A sharee at :remove_elements may unlink it from the
    # shared collection (Usecases::Collections::RemoveElements), but never destroy it.
    CollectionShare::PERMISSION_LEVELS.each_value do |level|
      context "when the record is in a collection shared to me with a permission level of #{level}" do
        let(:permission_level) { level }

        before { shared_collection_of_other_user.screens << screen }

        it 'returns false' do
          expect(element_policy.destroy?).to be false
        end
      end
    end

    context 'when the record is neither in a collection of mine or shared to me' do
      let(:owner) { other_user }

      before { own_collection_of_other_user.screens << screen }

      it 'returns false' do
        expect(element_policy.destroy?).to be false
      end
    end
  end

  describe '#import?' do
    context 'when the record is in an own collection' do
      before { own_collection_of_user.screens << screen }

      it 'returns true' do
        expect(element_policy.import?).to be true
      end
    end

    context 'when the record is in a collection shared to me below :add_elements' do
      let(:permission_level) { CollectionShare.permission_level(:edit_elements) }

      before { shared_collection_of_other_user.screens << screen }

      it 'returns false' do
        expect(element_policy.import?).to be false
      end
    end

    context 'when the record is in a collection shared to me at :add_elements or higher' do
      let(:permission_level) { CollectionShare.permission_level(:add_elements) }

      before { shared_collection_of_other_user.screens << screen }

      it 'returns true' do
        expect(element_policy.import?).to be true
      end
    end

    context 'when the record is neither in a collection of mine or shared to me' do
      let(:owner) { other_user }

      before { own_collection_of_other_user.screens << screen }

      it 'returns false' do
        expect(element_policy.import?).to be false
      end
    end
  end

  describe '#pass_ownership?' do
    context 'when the record is in an own collection' do
      before { own_collection_of_user.screens << screen }

      it 'returns true' do
        expect(element_policy.pass_ownership?).to be true
      end
    end

    context 'when the record is in a collection shared to me below :pass_ownership' do
      let(:permission_level) { CollectionShare.permission_level(:manage_shares) }

      before { shared_collection_of_other_user.screens << screen }

      it 'returns false' do
        expect(element_policy.pass_ownership?).to be false
      end
    end

    context 'when the record is in a collection shared to me at :pass_ownership' do
      let(:permission_level) { CollectionShare.permission_level(:pass_ownership) }

      before { shared_collection_of_other_user.screens << screen }

      it 'returns true' do
        expect(element_policy.pass_ownership?).to be true
      end
    end

    context 'when the record is neither in a collection of mine or shared to me' do
      let(:owner) { other_user }

      before { own_collection_of_other_user.screens << screen }

      it 'returns false' do
        expect(element_policy.pass_ownership?).to be false
      end
    end
  end
end
