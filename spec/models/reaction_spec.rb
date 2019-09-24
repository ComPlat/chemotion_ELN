# frozen_string_literal: true

require 'rails_helper'
require Rails.root.join 'spec/concerns/taggable.rb'
require Rails.root.join 'spec/concerns/reaction_rinchi.rb'

RSpec.describe Reaction, type: :model do
  describe 'creation' do
    let(:reaction) { create(:reaction) }

    it 'is possible to create a valid reaction' do
      expect(reaction.valid?).to be(true)
    end
  end

  describe 'after creation' do
    let(:reaction) { create(:reaction) }

    it 'has a CodeLog' do
      expect(reaction.code_log.value).to match(/\d{40}/)
      expect(reaction.code_log.id).to match(
        /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i
      )
    end
  end

  describe 'taggable' do
    it_behaves_like 'taggable_element_before_and_after_create'
    it_behaves_like 'taggable_element_before_and_after_collection_update'
  end

  describe 'deletion' do
    let(:collection) { create(:collection) }
    let(:literature) { create(:literature, reaction: reaction) }
    let(:s1) { create(:sample) }
    let(:s2) { create(:sample) }
    let(:s3) { create(:sample) }
    let(:s4) { create(:sample) }
    let(:reaction) do
      create(
        :reaction, starting_materials: [s1], solvents: [s2],
                   reactants: [s3], products: [s4],
                   collections: [collection]
      )
    end

    before { reaction.destroy }

    it 'destroys associations properly' do
      expect(reaction.collections_reactions).to eq []
      expect(
        reaction.collections.with_deleted.pluck(:deleted_at, :id)
      ).to eq([[nil, collection.id]])
      expect(
        [
          reaction.reactions_reactant_samples,
          reaction.reactions_product_samples,
          reaction.reactions_starting_material_samples,
          reaction.reactions_solvent_samples
        ].flatten.compact
      ).to eq []
      expect(Literature.count).to eq 0
    end

    it 'only soft deletes reaction and associated samples' do
      expect(reaction.deleted_at).not_to be_nil
      expect(
        [
          reaction.reactions_starting_material_samples
                  .only_deleted.pluck(:sample_id),
          reaction.reactions_solvent_samples.only_deleted.pluck(:sample_id),
          reaction.reactions_reactant_samples.only_deleted.pluck(:sample_id),
          reaction.reactions_product_samples.only_deleted.pluck(:sample_id)
        ].flatten
      ).to eq [s1.id, s2.id, s3.id, s4.id]
    end
  end

  describe 'include ReactionRinchi' do
    it_behaves_like 'Esterification'
    # it_behaves_like '1_reactant_-_no_structure'
    it_behaves_like 'Inverted_stereochemistry'
  end
end
