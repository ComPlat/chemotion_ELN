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

  # Defense in depth for zips exported before this remapping existed: their research plan bodies still
  # hold the raw source-system sample_id/reaction_id (not a uuid), which would never resolve against
  # @instances. Such a link must be dropped rather than kept, since the leftover numeric id could
  # coincidentally match an unrelated record on the importing system.
  describe '#remap_research_plan_body_links' do
    let(:user) { create(:person) }
    let(:attachment) { build(:attachment) }
    let(:importer) { Import::ImportCollections.new(attachment, user.id) }

    after { importer.cleanup }

    it 'drops sample/reaction fields whose id cannot be resolved to an imported instance' do
      body = [
        { 'id' => 'a', 'type' => 'sample', 'value' => { 'sample_id' => 999_999 } },
        { 'id' => 'b', 'type' => 'reaction', 'value' => { 'reaction_id' => 888_888 } },
      ]

      expect(importer.send(:remap_research_plan_body_links, body)).to be_empty
    end
  end

  # Negative case: the linked sample/reaction is not part of the exported collection (e.g. it lives in
  # a collection the exporting user didn't select), so it's never assigned an export uuid. The link
  # must be dropped rather than kept with its stale id, which could otherwise coincidentally match an
  # unrelated record on the importing system.
  describe 'import a collection with a researchplan linking a sample/reaction outside the export' do
    let(:exporting_user) { create(:person, first_name: 'Ex', last_name: 'Porter', name_abbreviation: 'EP') }
    let(:importing_user) { create(:person, first_name: 'Im', last_name: 'Porter', name_abbreviation: 'IP') }
    let(:collection) { create(:collection, user_id: exporting_user.id, label: 'collection-without-linked-sample') }
    let(:other_collection) { create(:collection, user_id: exporting_user.id, label: 'other-collection') }
    let(:outside_sample) do
      create(:sample, created_by: exporting_user.id, name: 'Outside Sample', collections: [other_collection])
    end
    let(:outside_reaction) { create(:reaction, name: 'Outside Reaction', collections: [other_collection]) }
    let(:job_id) { SecureRandom.uuid }
    let(:zip_path) { Rails.public_path.join('zip', "#{job_id}.zip") }

    let(:research_plan) do
      create(
        :research_plan,
        collections: [collection],
        body: [
          { 'id' => SecureRandom.uuid, 'type' => 'sample', 'value' => { 'sample_id' => outside_sample.id } },
          { 'id' => SecureRandom.uuid, 'type' => 'reaction', 'value' => { 'reaction_id' => outside_reaction.id } },
        ],
      )
    end

    let(:imported_collection) do
      Collection.find_by(label: 'collection-without-linked-sample', user_id: importing_user.id)
    end
    let(:imported_research_plan) { imported_collection.research_plans.first }
    let(:sample_field) { imported_research_plan.body.find { |field| field['type'] == 'sample' } }
    let(:reaction_field) { imported_research_plan.body.find { |field| field['type'] == 'reaction' } }

    before do
      research_plan
      # only `collection` is exported, not `other_collection`, so the linked sample/reaction never
      # gets an export uuid assigned
      export = Export::ExportCollections.new(job_id, [collection.id], 'zip', false, false)
      export.prepare_data
      export.to_file

      attachment = create(:attachment, file_path: zip_path)
      Import::ImportCollections.new(attachment, importing_user.id).execute
    end

    it 'imports the collection without the outside sample/reaction' do
      expect(imported_collection).to be_present
      expect(imported_collection.samples).to be_empty
      expect(imported_collection.reactions).to be_empty
    end

    it 'drops the unresolved sample link instead of keeping a stale id' do
      expect(sample_field).to be_nil
    end

    it 'drops the unresolved reaction link instead of keeping a stale id' do
      expect(reaction_field).to be_nil
    end
  end
end
# rubocop:enable RSpec/MultipleMemoizedHelpers
