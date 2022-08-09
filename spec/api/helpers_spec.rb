# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::ReactionAPI do
  subject do
    Class.new(Grape::API) do |inst|
      inst.extend(ReactionHelpers)
      inst.extend(ContainerHelpers)
    end
  end

  describe 'ReactionHelpers' do
    let(:user) { create(:user) }
    let(:collection) { Collection.create!(label: 'Collection', user: user) }
    let(:reaction) { create(:reaction, name: 'Reaction', collections: [collection]) }
    let(:root_container) { create(:root_container) }
    let(:sample) { create(:sample, name: 'Sample', container: FactoryBot.create(:container)) }
    let(:molfile) { File.read(Rails.root + 'spec/fixtures/test_2.mol') }
    let(:starting_materials) do
      {
        'starting_materials' => [
          {
            # hits existing_sample branch
            'id' => sample.id,
            'name' => 'starting_material',
            'target_amount_unit' => 'mg',
            'target_amount_value' => 75.09596,
            'equivalent' => 1,
            'reference' => false,
            'is_new' => false,
            'molfile' => molfile,
            'container' => root_container
          }
        ]
      }
    end
    let(:reactants) do
      {
        'reactants' => [
          # hits subsample branch
          'target_amount_unit' => 'mg',
          'target_amount_value' => 86.09596,
          'equivalent' => 2,
          'reference' => false,
          'is_new' => true,
          'molfile' => molfile,
          'container' => root_container,
          'parent_id' => sample.id # gets named after parent, hence no name specified
        ]
      }
    end
    let(:products) do
      {
        'products' => [
          {
            # hits new_sample branch
            'name' => 'product',
            'target_amount_unit' => 'mg',
            'target_amount_value' => 99.08304,
            'equivalent' => 5.5,
            'reference' => false,
            'is_new' => true,
            'molfile' => molfile,
            'container' => root_container
          }
        ]
      }
    end
    let(:materials) do
      {
        'solvents' => [
          # hits new_sample branch
          'name' => 'solvent',
          'target_amount_unit' => 'mg',
          'target_amount_value' => 76.09596,
          'equivalent' => 1,
          'reference' => true,
          'is_new' => true,
          'molfile' => molfile,
          'container' => root_container
        ]
      }.merge(starting_materials, reactants, products)
    end

    it 'update existing sample' do
      subject.update_materials_for_reaction(reaction, starting_materials, user)
      expect(Sample.all.size).to eq(1) # RSpec creates `sample` fixture, and ReactionHelpers update it
      expect(Sample.find_by(name: 'starting_material').target_amount_value).to eq(75.09596)
    end

    it 'create sample for new materials with parent ID that are not products' do
      subject.update_materials_for_reaction(reaction, reactants, user)
      expect(Sample.all.size).to eq(2) # RSpec creates `sample` fixture (parent), ReactionHelpers derive new sample from it
      expect(Sample.find_by(short_label: 'reactant').target_amount_value).to eq(86.09596)
    end

    it 'create sample for new materials that are products' do
      subject.update_materials_for_reaction(reaction, products, user)
      expect(Sample.all.size).to eq(1) # ReactionHelpers create new sample
      expect(Sample.find_by(name: 'product').target_amount_value).to eq(99.08304)
    end

    it 'associate reaction with materials' do
      subject.update_materials_for_reaction(reaction, materials, user)
      expect(ReactionsSample.all.size).to eq(4)
      expect(ReactionsStartingMaterialSample.all.size).to eq(1)
      expect(ReactionsReactantSample.all.size).to eq(1)
      expect(ReactionsSolventSample.all.size).to eq(1)
      expect(ReactionsProductSample.all.size).to eq(1)
      expect(reaction.reactions_samples).to eq(ReactionsSample.all)
    end
  end
end

describe Chemotion::CollectionAPI do
  subject do
    Class.new(Grape::API) do |inst|
      inst.extend(CollectionHelpers)
      inst.instance_eval { def user_ids(); end }
      inst.instance_eval { def current_user(); end }
    end
  end

  let(:p1) { create(:person) }
  let(:p2) { create(:person) }
  let(:g) { create(:group, users: [p1, p2]) }

  let(:c_sync) do
    create(:collection,
           user_id: p2.id, is_shared: false, is_synchronized: true)
  end
  let(:c_own) do
    create(:collection, user_id: p1.id, is_shared: false)
  end
  let(:c_shared) do
    create(
      :collection,
      user_id: p1.id, is_shared: true, shared_by_id: p2.id, permission_level: 1
    )
  end
  let(:c_shared_0) do
    create(
      :collection,
      user_id: p1.id, is_shared: true, shared_by_id: p2.id, permission_level: 0
    )
  end
  let(:c_group_shared) do
    create(
      :collection,
      user_id: g.id, is_shared: true, shared_by_id: p2.id, permission_level: 1
    )
  end
  let(:c_shared_by) do
    create(
      :collection,
      user_id: p2.id, is_shared: true, shared_by_id: p1.id, permission_level: 0
    )
  end
  let(:sync) do
    create(:sync_collections_user,
           user_id: p1.id, collection_id: c_sync.id,
           shared_by_id: p2.id, permission_level: 1)
  end
  let(:sync_g) do
    create(:sync_collections_user,
           user_id: g.id, collection_id: c_sync.id,
           shared_by_id: p2.id, permission_level: 1)
  end
  let(:sync_0) do
    create(:sync_collections_user,
           user_id: p1.id, collection_id: c_sync.id,
           shared_by_id: p2.id, permission_level: 0)
  end
  let(:sync_g_0) do
    create(:sync_collections_user,
           user_id: g.id, collection_id: c_sync.id,
           shared_by_id: p2.id, permission_level: 0)
  end

  let(:user_ids_) { [p1.id, g.id] }

  before do
    allow(subject).to receive(:user_ids) { user_ids_ }
    allow(subject).to receive(:current_user) { p1 }
  end

  describe 'fetch_collection_id_w_current_user to get collection id,' do
    it 'returns 0 if no collection found for user' do
      expect(
        subject.fetch_collection_id_w_current_user(c_sync.id)
      ).to eq(0)
    end
    it 'returns collection id if collection found for user' do
      expect(
        subject.fetch_collection_id_w_current_user(c_own.id)
      ).to eq(c_own.id)
    end
    it 'returns associated collection id of sync_coll if allowed for user' do
      expect(
        subject.fetch_collection_id_w_current_user(sync.id, true)
      ).to eq(c_sync.id)
      expect(
        subject.fetch_collection_id_w_current_user(sync_g.id, true)
      ).to eq(c_sync.id)
    end
  end

  describe 'fetch_collection_id_for_assign,' do
    it 'create a new collection and return its id with newCollection params' do
      expect(
        subject.fetch_collection_id_for_assign(newCollection: 'Hello Kitty')
      ).to eq(Collection.find_by(label: 'Hello Kitty')&.id)
    end
    it 'returns the assoc collection id (perm level >=1) w sync_to_me params' do
      expect(
        subject.fetch_collection_id_for_assign(
          is_sync_to_me: true, collection_id: sync.id
        )
      ).to eq(c_sync.id)
      expect(
        subject.fetch_collection_id_for_assign(
          is_sync_to_me: true, collection_id: sync_g.id
        )
      ).to eq(c_sync.id)
      expect(
        subject.fetch_collection_id_for_assign(
          is_sync_to_me: true, collection_id: sync_0.id
        )
      ).to be nil
      expect(
        subject.fetch_collection_id_for_assign(
          is_sync_to_me: true, collection_id: sync_g_0.id
        )
      ).to be nil
    end
    it 'returns the coll id if the coll is owned by or shared (w perm level >=1) to current user ' do
      expect(
        subject.fetch_collection_id_for_assign(collection_id: c_own.id)
      ).to eq(c_own.id)
      expect(
        subject.fetch_collection_id_for_assign(collection_id: c_shared.id)
      ).to eq(c_shared.id)
      expect(
        subject.fetch_collection_id_for_assign(collection_id: c_shared_0.id)
      ).to be nil
      expect(
        subject.fetch_collection_id_for_assign(collection_id: c_group_shared.id)
      ).to eq(c_group_shared.id)
    end
    it 'returns the coll id if the collection is shared by current user' do
      expect(
        subject.fetch_collection_id_for_assign(collection_id: c_shared_by.id)
      ).to eq(c_shared_by.id)
    end
  end
end
