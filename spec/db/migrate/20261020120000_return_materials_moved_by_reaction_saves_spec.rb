# frozen_string_literal: true

require 'rails_helper'

load 'db/migrate/20261020120000_return_materials_moved_by_reaction_saves.rb'

RSpec.describe 'migration 20261020120000: ReturnMaterialsMovedByReactionSaves' do # rubocop:disable RSpec/DescribeClass
  let(:migration) { ReturnMaterialsMovedByReactionSaves.new }
  let(:user) { create(:person) }
  let(:collection) { create(:collection, user: user) }
  let(:copy_collection) { create(:collection, user: user) }
  let(:original) { create(:reaction, name: 'Reaction', creator: user, collections: [collection]) }
  let(:copy) { create(:reaction, name: 'Reaction', creator: user, collections: [copy_collection]) }
  let(:solvent) do
    create(:sample, name: 'solvent', creator: user, collections: [collection],
                    target_amount_value: 10, target_amount_unit: 'ml')
  end
  let(:moved_at) { 1.hour.ago.change(usec: 0) }

  before { migration.verbose = false }

  # The older client's copy: the save writes the copy's amounts to the original's sample, then moves the link.
  def move(link, to:, amount: 3, at: moved_at)
    travel_to(at - 1.second) { link.sample.update!(target_amount_value: amount) }
    travel_to(at) { link.update!(reaction_id: to.id) }
  end

  context 'when a reaction copy took a purification solvent' do
    let!(:link) do
      travel_to(moved_at - 1.day) do
        ReactionsPurificationSolventSample.create!(reaction: original, sample: solvent, position: 2)
      end
    end
    let(:copy_link) { ReactionsSample.find_by(reaction_id: copy.id) }

    before do
      move(link, to: copy)
      travel_to(moved_at + 1.minute) { link.update!(position: 0) }
      migration.up
    end

    it 'gives the link back to the original reaction with the values it had there' do
      expect(link.reload).to have_attributes(reaction_id: original.id, sample_id: solvent.id, position: 2,
                                             type: 'ReactionsPurificationSolventSample')
    end

    it "gives the original sample back its amount from before the copy's save" do
      expect(solvent.reload.target_amount_value).to eq(10)
    end

    it 'gives the copy a new sample split from the original, with the amount and link values it had' do
      expect(copy_link).to have_attributes(type: 'ReactionsPurificationSolventSample', position: 0)
      expect(copy_link.sample).to have_attributes(parent: solvent, target_amount_value: 3, created_by: user.id)
    end

    it "puts the copy's new sample into the copy's collections" do
      expect(copy_link.sample.collections).to include(copy_collection)
    end

    it 'leaves one live link per sample' do
      expect(ReactionsSample.where(sample_id: solvent.id).pluck(:reaction_id)).to eq([original.id])
    end
  end

  context 'when the moved material has variations in the reaction that took it' do
    let(:sample) { create(:sample, creator: user, collections: [collection]) }
    let!(:link) do
      travel_to(moved_at - 1.day) do
        ReactionsStartingMaterialSample.create!(reaction: original, sample: sample, equivalent: 1, position: 0)
      end
    end

    before do
      move(link, to: copy)
      entry = { 'aux' => { 'equivalent' => 1 } }
      variations = [{ 'id' => 1, 'startingMaterials' => { sample.id.to_s => entry, '999' => entry } }]
      copy.update_columns(variations: variations) # rubocop:disable Rails/SkipsModelValidations
      migration.up
    end

    it 're-keys only that material to the new sample' do
      new_id = ReactionsSample.find_by(reaction_id: copy.id).sample_id
      expect(copy.reload.variations.first['startingMaterials'].keys).to contain_exactly(new_id.to_s, '999')
    end
  end

  context 'when the original reaction has a new reference material since' do
    let(:sample) { create(:sample, creator: user, collections: [collection]) }
    let!(:link) do
      travel_to(moved_at - 1.day) do
        ReactionsStartingMaterialSample.create!(reaction: original, sample: sample, reference: true, position: 0)
      end
    end

    before do
      move(link, to: copy)
      ReactionsStartingMaterialSample.create!(reaction: original, sample: create(:sample, creator: user),
                                              reference: true, position: 0)
      travel_to(moved_at + 1.minute) { link.update!(reference: false) }
      migration.up
    end

    it 'returns the link without a second reference' do
      expect(link.reload).to have_attributes(reaction_id: original.id, reference: false)
    end
  end

  context 'when the link was moved more than once' do
    let(:third) { create(:reaction, creator: user, collections: [collection]) }
    let!(:link) do
      travel_to(moved_at - 1.day) do
        ReactionsPurificationSolventSample.create!(reaction: original, sample: solvent, position: 0)
      end
    end

    before do
      move(link, to: copy)
      move(link, to: third, at: moved_at + 1.minute)
      migration.up
    end

    it 'leaves it where it is' do
      expect(link.reload.reaction_id).to eq(third.id)
      expect(ReactionsSample.where(reaction_id: [copy.id, original.id])).to be_empty
    end
  end

  context 'when the original reaction is deleted' do
    let!(:link) do
      travel_to(moved_at - 1.day) do
        ReactionsPurificationSolventSample.create!(reaction: original, sample: solvent, position: 0)
      end
    end

    before do
      move(link, to: copy)
      original.destroy
      migration.up
    end

    it 'leaves the link with the reaction that took it' do
      expect(link.reload.reaction_id).to eq(copy.id)
      expect(solvent.reload.target_amount_value).to eq(3)
    end
  end

  context 'when the link was never moved' do
    let!(:link) { ReactionsPurificationSolventSample.create!(reaction: original, sample: solvent, position: 0) }

    before do
      link.update!(position: 1)
      migration.up
    end

    it 'leaves it unchanged' do
      expect(link.reload).to have_attributes(reaction_id: original.id, position: 1)
      expect(Sample.where(ancestry: "/#{solvent.id}/")).to be_empty
    end
  end
end
