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
  let(:moved_at) { 1.day.ago.change(usec: 0) }
  let(:solvent) do
    old_sample(name: 'solvent', target_amount_value: 10, target_amount_unit: 'ml')
  end

  before { migration.verbose = false }

  # A sample that exists well before the move, as on a real instance (its history starts then).
  def old_sample(**attributes)
    travel_to(moved_at - 2.days) { create(:sample, creator: user, collections: [collection], **attributes) }
  end

  # One request of +by+: its versions share a logidze uuid, as in the API.
  def as_request(by, at)
    travel_to(at) do
      Logidze.with_responsible!(by.id)
      yield
    ensure
      Logidze.clear_responsible!
    end
  end

  # An older client's save of +to+ that took the link: it writes its amount to the sample, then moves the link.
  def move(link, to:, amount: 3, at: moved_at, name: nil)
    as_request(user, at) do
      to.update!(updated_at: Time.current)
      link.sample.update!({ target_amount_value: amount, name: name }.compact)
      link.update!(reaction_id: to.id)
    end
  end

  def link_to(reaction, sample, klass: ReactionsPurificationSolventSample, **values)
    travel_to(moved_at - 1.day) { klass.create!(reaction: reaction, sample: sample, position: 0, **values) }
  end

  def links_of(reaction)
    ReactionsSample.where(reaction_id: reaction.id)
  end

  context 'when a reaction copy took a purification solvent' do
    let!(:link) { link_to(original, solvent, position: 2) }
    let(:copy_link) { links_of(copy).first }

    before do
      move(link, to: copy)
      as_request(user, moved_at + 1.minute) do
        copy.update!(updated_at: Time.current)
        link.update!(position: 0)
      end
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
      expect(copy_link.sample.collections).to include(copy_collection)
    end

    it 'leaves one live link per sample' do
      expect(ReactionsSample.where(sample_id: solvent.id).pluck(:reaction_id)).to eq([original.id])
    end
  end

  context 'when someone else changed the sample after the move' do
    let(:other_user) { create(:person) }
    let!(:link) { link_to(original, solvent) }

    before do
      move(link, to: copy)
      as_request(other_user, moved_at + 1.hour) { solvent.update!(target_amount_value: 7) }
      migration.up
    end

    it 'keeps that change on the original sample' do
      expect(solvent.reload.target_amount_value).to eq(7)
      expect(link.reload.reaction_id).to eq(original.id)
    end
  end

  context 'when the copy has variations stored by variation uuid' do # rubocop:disable RSpec/MultipleMemoizedHelpers
    let(:sample) { old_sample }
    let!(:link) { link_to(original, sample, klass: ReactionsStartingMaterialSample, equivalent: 1) }
    let(:entry) { { 'aux' => { 'equivalent' => 1 } } }

    before do
      move(link, to: copy)
      materials = { sample.id.to_s => entry, '999' => entry }
      stored = { 'u1' => { 'id' => 1, 'uuid' => 'u1', 'startingMaterials' => materials } }
      copy.update_columns(variations: stored) # rubocop:disable Rails/SkipsModelValidations
      migration.up
    end

    it 'renames only that key to the new sample and keeps the stored shape' do
      new_id = links_of(copy).first.sample_id
      stored = copy.reload[:variations]
      expect(stored).to be_a(Hash)
      expect(stored['u1']['startingMaterials'].keys).to contain_exactly(new_id.to_s, '999')
    end
  end

  context 'when the original reaction has that material again' do
    let!(:link) { link_to(original, solvent) }

    before do
      move(link, to: copy)
      readded = create(:sample, creator: user, collections: [collection], molecule: solvent.molecule)
      ReactionsPurificationSolventSample.create!(reaction: original, sample: readded, position: 0)
      migration.up
    end

    it 'leaves the link with the copy' do
      expect(link.reload.reaction_id).to eq(copy.id)
      expect(links_of(copy).count).to eq(1)
    end
  end

  context 'when a copy took two links of one molecule' do
    let(:second) { old_sample(name: 'second', molecule: solvent.molecule) }
    let!(:links) { [link_to(original, solvent), link_to(original, second, position: 1)] }

    before do
      links.each_with_index { |link, index| move(link, to: copy, at: moved_at + index.minutes) }
      migration.up
    end

    it 'returns both, the second not blocked by the first' do
      expect(links.map { |link| link.reload.reaction_id }).to eq([original.id, original.id])
      expect(links_of(copy).count).to eq(2)
    end
  end

  context 'when the original reaction always had another material of that molecule' do
    let!(:link) { link_to(original, solvent) }

    before do
      link_to(original, old_sample(name: 'kept', molecule: solvent.molecule), position: 1)
      move(link, to: copy)
      migration.up
    end

    it 'still returns the link' do
      expect(link.reload.reaction_id).to eq(original.id)
    end
  end

  context 'when the creator of the copy is deleted' do
    let(:copy_owner) { create(:person) }
    let(:copy) { create(:reaction, name: 'Reaction', creator: copy_owner, collections: [copy_collection]) }
    let!(:link) { link_to(original, solvent) }

    before do
      move(link, to: copy)
      copy_owner.destroy
      migration.up
    end

    it "gives the copy's new sample to the sample's live creator" do
      expect(link.reload.reaction_id).to eq(original.id)
      expect(links_of(copy).first.sample.created_by).to eq(user.id)
    end
  end

  context 'when a starting material was moved' do
    let(:sample) { old_sample }
    let!(:link) { link_to(original, sample, klass: ReactionsStartingMaterialSample) }

    before do
      move(link, to: copy)
      migration.up
    end

    it 'points the element tags at the reaction of each sample' do
      expect(sample.reload.tag.taggable_data['reaction_id']).to eq(original.id)
      expect(links_of(copy).first.sample.tag.taggable_data['reaction_id']).to eq(copy.id)
    end
  end

  context 'when the history predates the weight percentage columns' do
    let(:sample) { old_sample }
    let!(:link) { link_to(original, sample, klass: ReactionsStartingMaterialSample) }

    before do
      ActiveRecord::Base.connection.execute(<<~SQL.squish)
        UPDATE reactions_samples
        SET log_data = jsonb_set(log_data, '{h,0,c}', (log_data #> '{h,0,c}') - 'weight_percentage' - 'weight_percentage_reference')
        WHERE id = #{link.id}
      SQL
      move(link, to: copy)
      as_request(user, moved_at + 1.minute) do
        copy.update!(updated_at: Time.current)
        link.update!(weight_percentage_reference: true, weight_percentage: 0.5)
      end
      migration.up
    end

    it 'returns the link with the default weight percentage values' do
      expect(link.reload).to have_attributes(reaction_id: original.id, weight_percentage_reference: false,
                                             weight_percentage: nil)
    end
  end

  context 'when the link came back to the original reaction in between' do
    let(:third) { create(:reaction, name: 'Reaction', creator: user, collections: [copy_collection]) }
    let!(:link) { link_to(original, solvent) }

    before do
      move(link, to: copy, amount: 3)
      move(link, to: original, amount: 7, at: moved_at + 1.hour)
      move(link, to: third, amount: 5, at: moved_at + 2.hours)
      migration.up
    end

    it "keeps the original's own change from when it had the link again" do
      expect(link.reload.reaction_id).to eq(original.id)
      expect(solvent.reload.target_amount_value).to eq(7)
    end
  end

  context 'when the original reaction has a new reference material since' do
    let(:sample) { old_sample }
    let!(:link) { link_to(original, sample, klass: ReactionsStartingMaterialSample, reference: true) }

    before do
      move(link, to: copy)
      ReactionsStartingMaterialSample.create!(reaction: original, sample: create(:sample, creator: user),
                                              reference: true, position: 1)
      migration.up
    end

    it 'returns the link without a second reference, and the copy keeps its own' do
      expect(link.reload).to have_attributes(reaction_id: original.id, reference: false)
      expect(links_of(copy).first.reference).to be(true)
    end
  end

  context 'when a copy of the copy took it on' do
    let(:third) { create(:reaction, name: 'Reaction', creator: user, collections: [copy_collection]) }
    let!(:link) { link_to(original, solvent, position: 2) }

    before do
      move(link, to: copy, amount: 3)
      as_request(user, moved_at + 1.minute) do
        copy.update!(updated_at: Time.current)
        link.update!(position: 1)
      end
      move(link, to: third, amount: 5, at: moved_at + 1.hour, name: 'renamed')
      migration.up
    end

    it 'returns the link to the first reaction, and gives each copy its values', :aggregate_failures do
      expect(link.reload).to have_attributes(reaction_id: original.id, position: 2)
      expect(links_of(copy).first).to have_attributes(position: 1)
      expect(links_of(copy).first.sample).to have_attributes(parent: solvent, target_amount_value: 3,
                                                             name: 'solvent')
      expect(links_of(third).first.sample).to have_attributes(parent: solvent, target_amount_value: 5)
      expect(solvent.reload.target_amount_value).to eq(10)
    end
  end

  context 'when the copy was deleted with the moved link' do
    let!(:link) { link_to(original, solvent) }

    before do
      move(link, to: copy)
      copy.destroy
      migration.up
    end

    it 'revives the link in the original reaction' do
      expect(ReactionsSample.find_by(id: link.id)).to have_attributes(reaction_id: original.id, deleted_at: nil)
    end
  end

  context 'when the sample is deleted' do
    let!(:link) { link_to(original, solvent) }

    before do
      move(link, to: copy)
      copy.destroy
      solvent.destroy
      migration.up
    end

    it 'leaves the link soft-deleted where it is' do
      expect(ReactionsSample.with_deleted.find(link.id)).to have_attributes(reaction_id: copy.id)
      expect(ReactionsSample.find_by(id: link.id)).to be_nil
    end
  end

  context 'when a product was moved' do
    let(:product) { old_sample }
    let!(:link) { link_to(original, product, klass: ReactionsProductSample) }

    before do
      move(link, to: copy)
      migration.up
    end

    it 'gives the copy a new product, not a split of the original one' do
      new_product = links_of(copy).first.sample
      expect(new_product.parent).to be_nil
      expect(new_product.id).not_to eq(product.id)
    end
  end

  context 'when the original reaction is deleted' do
    let!(:link) { link_to(original, solvent) }

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

  context 'when one link fails' do # rubocop:disable RSpec/MultipleMemoizedHelpers
    let(:other_solvent) { old_sample(name: 'other') }
    let!(:failing) { link_to(original, solvent) }
    let!(:link) { link_to(original, other_solvent, position: 1) }

    before do
      move(failing, to: copy)
      move(link, to: copy, at: moved_at + 1.minute)
      allow(migration).to receive(:give_takers_samples).and_wrap_original do |method, moved, *rest|
        raise ActiveRecord::RecordInvalid if moved['id'] == failing.id

        method.call(moved, *rest)
      end
      migration.up
    end

    it 'leaves that link unchanged and repairs the others' do
      expect(failing.reload.reaction_id).to eq(copy.id)
      expect(link.reload.reaction_id).to eq(original.id)
    end
  end

  context 'when the history changes the sample' do
    let!(:link) { link_to(original, solvent) }

    before do
      move(link, to: copy)
      link.update!(sample: create(:sample, creator: user, collections: [copy_collection]))
      migration.up
    end

    it 'leaves it unchanged' do
      expect(link.reload.reaction_id).to eq(copy.id)
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
