# frozen_string_literal: true

# == Schema Information
#
# Table name: reactions
#
#  id                     :integer          not null, primary key
#  conditions             :string
#  created_by             :integer
#  dangerous_products     :string           default([]), is an Array
#  deleted_at             :datetime
#  description            :text
#  duration               :string
#  gaseous                :boolean          default(FALSE)
#  name                   :string
#  observation            :text
#  origin                 :jsonb
#  plain_text_description :text
#  plain_text_observation :text
#  purification           :string           default([]), is an Array
#  reaction_svg_file      :string
#  rf_value               :string
#  rinchi_long_key        :text
#  rinchi_short_key       :string
#  rinchi_string          :text
#  rinchi_web_key         :string
#  role                   :string
#  rxno                   :string
#  short_label            :string
#  solvent                :string
#  status                 :string
#  temperature            :jsonb
#  timestamp_start        :string
#  timestamp_stop         :string
#  tlc_description        :text
#  tlc_solvents           :string
#  variations             :jsonb
#  vessel_size            :jsonb
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#
# Indexes
#
#  index_reactions_on_deleted_at        (deleted_at)
#  index_reactions_on_rinchi_short_key  (rinchi_short_key)
#  index_reactions_on_rinchi_web_key    (rinchi_web_key)
#  index_reactions_on_role              (role)
#  index_reactions_on_rxno              (rxno)
#
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

  describe 'create private note' do
    let(:reaction) { create(:reaction) }
    let(:note_1) do
      create(:private_note, content: 'Note 1', noteable_id: reaction.id, noteable_type: 'Reaction')
    end

    before do
      reaction.update(private_notes: [note_1])
    end

    it 'is possible to create a valid private note' do
      expect(reaction.private_notes).not_to be_nil
    end

    context 'is content valid' do
      let(:n) { reaction.private_notes[0] }
      it 'is content valid' do
        expect(n.content).to eq note_1.content
      end
    end
  end
  describe 'create private note' do
    let(:reaction) { create(:reaction) }

    let(:note_1) { create(:private_note, content: 'Note 1', noteable_id: reaction.id, noteable_type: 'Reaction') }

    before do
      reaction.update(private_notes: [note_1])
    end

    it 'is possible to create a valid private note' do
      expect(reaction.private_notes).not_to be_nil
    end

    context 'is content valid' do
      let(:n) { reaction.private_notes[0] }
      it 'is content valid' do
        expect(n.content).to eq note_1.content
      end
    end

  end
end
