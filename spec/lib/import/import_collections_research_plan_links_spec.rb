# frozen_string_literal: true

require 'rails_helper'

# rubocop:disable RSpec/MultipleMemoizedHelpers
RSpec.describe 'ImportCollection' do
  # Regression test for: after importing a collection whose research plan links to a sample
  # in the same collection, opening the sample via the research plan raised "Sample is not
  # accessible!" because the embedded sample_id still pointed at the exporting system's id.
  describe 'import a collection with a researchplan linking a sample and a reaction' do
    let(:exporting_user) { create(:person, first_name: 'Ex', last_name: 'Porter', name_abbreviation: 'EP') }
    let(:importing_user) { create(:person, first_name: 'Im', last_name: 'Porter', name_abbreviation: 'IP') }
    let(:collection) { create(:collection, user_id: exporting_user.id, label: 'collection-with-rp-sample-link') }
    let(:sample) { create(:sample, created_by: exporting_user.id, name: 'Linked Sample', collections: [collection]) }
    let(:reaction) { create(:reaction, name: 'Linked Reaction', collections: [collection]) }
    let(:job_id) { SecureRandom.uuid }
    let(:zip_path) { Rails.public_path.join('zip', "#{job_id}.zip") }

    let(:research_plan) do
      create(
        :research_plan,
        collections: [collection],
        body: [
          { 'id' => SecureRandom.uuid, 'type' => 'sample', 'value' => { 'sample_id' => sample.id } },
          { 'id' => SecureRandom.uuid, 'type' => 'reaction', 'value' => { 'reaction_id' => reaction.id } },
        ],
      )
    end

    let(:imported_collection) do
      Collection.find_by(label: 'collection-with-rp-sample-link', user_id: importing_user.id)
    end
    let(:imported_sample) { imported_collection.samples.find_by(name: 'Linked Sample') }
    let(:imported_reaction) { imported_collection.reactions.find_by(name: 'Linked Reaction') }
    let(:imported_research_plan) { imported_collection.research_plans.first }
    let(:sample_field) { imported_research_plan.body.find { |field| field['type'] == 'sample' } }
    let(:reaction_field) { imported_research_plan.body.find { |field| field['type'] == 'reaction' } }

    before do
      research_plan
      export = Export::ExportCollections.new(job_id, [collection.id], 'zip', false, false)
      export.prepare_data
      export.to_file

      attachment = create(:attachment, file_path: zip_path)
      Import::ImportCollections.new(attachment, importing_user.id).execute
    end

    it 'imports the collection' do
      expect(imported_collection).to be_present
    end

    it 'rewrites the sample link to the newly imported sample' do
      expect(sample_field['value']['sample_id']).to eq(imported_sample.id)
      expect(sample_field['value']['sample_id']).not_to eq(sample.id)
    end

    it 'rewrites the reaction link to the newly imported reaction' do
      expect(reaction_field['value']['reaction_id']).to eq(imported_reaction.id)
      expect(reaction_field['value']['reaction_id']).not_to eq(reaction.id)
    end
  end
end
# rubocop:enable RSpec/MultipleMemoizedHelpers
