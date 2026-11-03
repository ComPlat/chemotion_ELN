# frozen_string_literal: true

require 'rails_helper'

load 'db/migrate/20261013120000_add_unique_index_to_reactions_samples.rb'

RSpec.describe 'migration 20261013120000: AddUniqueIndexToReactionsSamples' do # rubocop:disable RSpec/DescribeClass
  let(:migration) { AddUniqueIndexToReactionsSamples.new }
  let(:collection) { create(:collection) }
  let(:other_reaction) { create(:reaction, created_at: 2.days.ago) }
  let(:reaction) { create(:reaction, created_at: 1.day.ago, collections: [collection]) }
  let(:sample) { create(:sample) }
  let(:index_exists) do
    -> { ActiveRecord::Base.connection.index_name_exists?(:reactions_samples, AddUniqueIndexToReactionsSamples::INDEX_NAME) }
  end

  around do |example|
    migration.down
    example.run
  ensure
    migration.up unless index_exists.call
  end

  def live_links(sample)
    ReactionsSample.where(sample: sample)
  end

  shared_examples 'a link given a new sample' do
    it 'links a new sample split from the shared one' do
      new_sample = new_link.reload.sample
      expect(new_sample).to have_attributes(parent: sample, created_by: new_link.reaction.created_by)
    end

    it 'puts the new sample into the collections of its reaction' do
      expect(new_link.reload.sample.collections).to include(*new_link.reaction.collections)
    end
  end

  context 'when a link was moved from another reaction' do
    let!(:moved_link) do
      ReactionsStartingMaterialSample.create!(reaction: other_reaction, sample: sample, equivalent: 0.5, position: 1)
    end
    let!(:own_link) do
      ReactionsStartingMaterialSample.create!(reaction: reaction, sample: sample, equivalent: 1, position: 0)
    end

    before do
      moved_link.update!(reaction_id: reaction.id)
      moved_link.update!(equivalent: 2, position: 0)
    end

    it 'gives the link back to the other reaction with the values it had there' do
      migration.up
      expect(moved_link.reload).to have_attributes(reaction_id: other_reaction.id, equivalent: 0.5, position: 1)
    end

    it 'keeps the sample with the earlier created reaction' do
      migration.up
      expect(live_links(sample)).to contain_exactly(moved_link)
    end

    it 'keeps the latest values of the reaction on its own link' do
      migration.up
      expect(own_link.reload).to have_attributes(reaction_id: reaction.id, equivalent: 2, position: 0)
    end

    it 'keeps the values of the own link if it was updated last' do
      own_link.update!(equivalent: 3)
      migration.up
      expect(own_link.reload).to have_attributes(equivalent: 3, position: 0)
    end

    context 'when the links are repaired' do
      let(:new_link) { own_link }

      before { migration.up }

      it_behaves_like 'a link given a new sample'
    end

    context 'when the other reaction is deleted' do
      let(:new_link) { own_link }

      before do
        other_reaction.destroy
        migration.up
      end

      it 'keeps the sample with the earlier link, with its latest values' do
        expect(live_links(sample)).to contain_exactly(moved_link)
        expect(moved_link.reload).to have_attributes(reaction_id: reaction.id, equivalent: 2, position: 0)
      end

      it 'keeps both links of the reaction' do
        expect(ReactionsSample.where(reaction: reaction)).to contain_exactly(moved_link, own_link)
      end

      it_behaves_like 'a link given a new sample'
    end
  end

  context 'when links were moved from two reactions' do
    let(:third_reaction) { create(:reaction, created_at: 3.days.ago) }
    let!(:first_moved_link) do
      ReactionsStartingMaterialSample.create!(reaction: other_reaction, sample: sample, equivalent: 0.5)
    end
    let!(:second_moved_link) do
      ReactionsStartingMaterialSample.create!(reaction: third_reaction, sample: sample, equivalent: 0.25)
    end
    let!(:own_link) { ReactionsStartingMaterialSample.create!(reaction: reaction, sample: sample, equivalent: 1) }

    def move(link, equivalent, updated_at)
      link.update!(reaction_id: reaction.id)
      link.update!(equivalent: equivalent, position: equivalent * 10)
      link.update_columns(updated_at: updated_at) # rubocop:disable Rails/SkipsModelValidations
    end

    before do
      own_link.update_columns(updated_at: 3.hours.ago) # rubocop:disable Rails/SkipsModelValidations
    end

    it 'keeps the newest values on the own link when the later link was updated last' do
      move(first_moved_link, 2, 2.hours.ago)
      move(second_moved_link, 3, 1.hour.ago)
      migration.up
      expect(own_link.reload).to have_attributes(equivalent: 3, position: 30)
    end

    it 'keeps the newest values on the own link when the earlier link was updated last' do
      move(first_moved_link, 2, 1.hour.ago)
      move(second_moved_link, 3, 2.hours.ago)
      migration.up
      expect(own_link.reload).to have_attributes(equivalent: 2, position: 20)
    end

    it 'gives each moved link back to its reaction with the values it had there' do
      move(first_moved_link, 2, 2.hours.ago)
      move(second_moved_link, 3, 1.hour.ago)
      migration.up
      expect(first_moved_link.reload).to have_attributes(reaction_id: other_reaction.id, equivalent: 0.5)
      expect(second_moved_link.reload).to have_attributes(reaction_id: third_reaction.id, equivalent: 0.25)
    end
  end

  context 'when the gas data of a moved link was edited in its first reaction' do
    let!(:moved_link) { ReactionsProductSample.create!(reaction: other_reaction, sample: sample, gas_type: 'gas') }
    let(:gas_data_before_move) do
      moved_link.gas_phase_data.deep_merge(
        'turnover_number' => 16.49,
        'turnover_frequency' => { 'value' => 4.12 },
      )
    end

    before do
      ReactionsProductSample.create!(reaction: reaction, sample: sample, gas_type: 'gas')
      moved_link.update!(gas_phase_data: gas_data_before_move)
      moved_link.update!(reaction_id: reaction.id)
      moved_link.update!(gas_phase_data: gas_data_before_move.merge('part_per_million' => 99))
      migration.up
    end

    it 'restores the complete gas data it had there' do
      expect(moved_link.reload.gas_phase_data).to eq(gas_data_before_move)
    end
  end

  context 'when an object was removed from the gas data of a moved link in its first reaction' do
    let!(:moved_link) { ReactionsProductSample.create!(reaction: other_reaction, sample: sample, gas_type: 'gas') }
    let(:gas_data_before_move) { moved_link.gas_phase_data.except('time') }

    before do
      ReactionsProductSample.create!(reaction: reaction, sample: sample, gas_type: 'gas')
      moved_link.update!(gas_phase_data: gas_data_before_move)
      moved_link.update!(reaction_id: reaction.id)
      migration.up
    end

    it 'restores the gas data without the removed object' do
      expect(moved_link.reload.gas_phase_data).to eq(gas_data_before_move)
    end
  end

  context 'when two reactions link a sample' do
    let!(:new_link) { ReactionsReactantSample.create!(reaction: reaction, sample: sample, equivalent: 2) }
    let!(:first_link) { ReactionsStartingMaterialSample.create!(reaction: other_reaction, sample: sample) }

    before { migration.up }

    it 'keeps the sample with the earlier created reaction' do
      expect(live_links(sample)).to contain_exactly(first_link)
    end

    it 'keeps the values of the other link' do
      expect(new_link.reload).to have_attributes(reaction_id: reaction.id, type: 'ReactionsReactantSample',
                                                 equivalent: 2, deleted_at: nil)
    end

    it_behaves_like 'a link given a new sample'
  end

  context 'when a reaction links a sample in two roles' do
    let!(:first_link) { ReactionsStartingMaterialSample.create!(reaction: reaction, sample: sample) }
    let!(:new_link) { ReactionsProductSample.create!(reaction: reaction, sample: sample, equivalent: 0.8) }

    before { migration.up }

    it 'keeps the sample with the earlier link' do
      expect(live_links(sample)).to contain_exactly(first_link)
    end

    it 'keeps the second role with its values' do
      expect(new_link.reload).to have_attributes(type: 'ReactionsProductSample', equivalent: 0.8, deleted_at: nil)
    end

    it_behaves_like 'a link given a new sample'
  end

  context 'when a deleted reaction still has a live link to a shared sample' do
    let!(:first_link) { ReactionsStartingMaterialSample.create!(reaction: reaction, sample: sample) }
    let!(:dead_link) { ReactionsStartingMaterialSample.create!(reaction: other_reaction, sample: sample) }

    before do
      other_reaction.update_columns(deleted_at: Time.current) # rubocop:disable Rails/SkipsModelValidations
      migration.up
    end

    it 'keeps the sample with the live reaction' do
      expect(live_links(sample)).to contain_exactly(first_link)
    end

    it 'soft deletes the link of the deleted reaction' do
      expect(ReactionsSample.with_deleted.find(dead_link.id)).to have_attributes(sample_id: sample.id)
        .and(have_attributes(deleted_at: be_present))
    end
  end

  context 'when the index is in place' do
    before do
      migration.up
      ReactionsStartingMaterialSample.create!(reaction: reaction, sample: sample)
    end

    it 'rejects a second live link of the same reaction to the sample' do
      expect { ReactionsReactantSample.create!(reaction: reaction, sample: sample) }
        .to raise_error(ActiveRecord::RecordNotUnique)
    end

    it 'rejects a live link of another reaction to the sample' do
      expect { ReactionsReactantSample.create!(reaction: other_reaction, sample: sample) }
        .to raise_error(ActiveRecord::RecordNotUnique)
    end

    it 'allows a new link once the old one is soft deleted' do
      ReactionsSample.find_by(sample: sample).destroy
      expect { ReactionsReactantSample.create!(reaction: other_reaction, sample: sample) }.not_to raise_error
    end
  end
end
