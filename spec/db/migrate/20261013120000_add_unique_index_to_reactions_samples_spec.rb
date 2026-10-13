# frozen_string_literal: true

require 'rails_helper'

load 'db/migrate/20261013120000_add_unique_index_to_reactions_samples.rb'

# rubocop:disable RSpec/DescribeClass
RSpec.describe 'migration 20261013120000: AddUniqueIndexToReactionsSamples' do
  let(:migration) { AddUniqueIndexToReactionsSamples.new }
  let(:reaction) { create(:reaction) }
  let(:other_reaction) { create(:reaction) }
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

  def live_links(reaction)
    ReactionsSample.where(reaction: reaction, sample: sample)
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

    it 'keeps the own link of the reaction' do
      migration.up
      expect(live_links(reaction)).to contain_exactly(own_link)
    end

    it 'soft deletes the link if the other reaction is deleted' do
      other_reaction.destroy
      migration.up
      expect(live_links(reaction).count).to eq(1)
    end
  end

  context 'when a reaction links a sample twice' do
    let!(:older_link) { ReactionsStartingMaterialSample.create!(reaction: reaction, sample: sample, equivalent: 1) }
    let!(:newer_link) { ReactionsStartingMaterialSample.create!(reaction: reaction, sample: sample, equivalent: 2) }

    before do
      older_link.update_columns(updated_at: 1.day.ago) # rubocop:disable Rails/SkipsModelValidations
      migration.up
    end

    it 'keeps the most recently updated link' do
      expect(live_links(reaction)).to contain_exactly(newer_link)
    end

    it 'soft deletes the other link' do
      expect(ReactionsSample.with_deleted.find(older_link.id).deleted_at).to be_present
    end
  end

  context 'when the index is in place' do
    before do
      migration.up
      ReactionsStartingMaterialSample.create!(reaction: reaction, sample: sample)
    end

    it 'rejects a second live link of the reaction to the sample' do
      expect { ReactionsReactantSample.create!(reaction: reaction, sample: sample) }
        .to raise_error(ActiveRecord::RecordNotUnique)
    end

    it 'allows another reaction to link the sample' do
      expect { ReactionsReactantSample.create!(reaction: other_reaction, sample: sample) }.not_to raise_error
    end
  end
end
# rubocop:enable RSpec/DescribeClass
