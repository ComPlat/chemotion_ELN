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

  # Ketcher preview svgs are bundled into the zip under images/research_plans/ but extracted only to a
  # temp dir (see extract's zip-entry handling) — this materializes them into
  # public/images/research_plans/ so the frontend's <img src="/images/research_plans/...svg"> actually
  # resolves after import, for hand-drawn structures and synthesized ones alike.
  describe '#materialize_researchplan_ketcher_images' do
    let(:user) { create(:person) }
    let(:attachment) { build(:attachment) }
    let(:importer) { Import::ImportCollections.new(attachment, user.id) }
    let(:tmp_dir) { importer.instance_variable_get(:@tmp_dir) }

    after { importer.cleanup }

    it 'copies a bundled preview svg into public/images/research_plans' do
      svg_file = "#{SecureRandom.hex(16)}.svg"
      source_dir = Pathname.new(tmp_dir).join('images', 'research_plans')
      FileUtils.mkdir_p(source_dir)
      File.write(source_dir.join(svg_file), '<svg>materialized</svg>')
      target_path = Rails.public_path.join('images', 'research_plans', svg_file)

      begin
        body = [{ 'id' => 'a', 'type' => 'ketcher', 'value' => { 'svg_file' => svg_file } }]
        importer.send(:materialize_researchplan_ketcher_images, body)

        expect(File.file?(target_path)).to be true
        expect(File.read(target_path)).to eq('<svg>materialized</svg>')
      ensure
        FileUtils.rm_f(target_path)
      end
    end

    it 'ignores a svg_file value that is not a bare filename, rather than writing outside the target folder' do
      body = [{ 'id' => 'a', 'type' => 'ketcher', 'value' => { 'svg_file' => '../../evil.svg' } }]

      expect { importer.send(:materialize_researchplan_ketcher_images, body) }.not_to raise_error
      expect(Rails.public_path.join('images', 'research_plans', 'evil.svg')).not_to exist
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

  # When the exporting user can actually read the outside sample, its structure is preserved as a
  # static Ketcher schema instead of being dropped outright — the live sample record still isn't part
  # of the export, but the chemistry survives.
  describe 'import a collection with a researchplan linking an accessible sample outside the export' do
    let(:exporting_user) { create(:person, first_name: 'Ex', last_name: 'Porter', name_abbreviation: 'EP') }
    let(:importing_user) { create(:person, first_name: 'Im', last_name: 'Porter', name_abbreviation: 'IP') }
    let(:collection) { create(:collection, user_id: exporting_user.id, label: 'collection-with-accessible-link') }
    let(:other_collection) { create(:collection, user_id: exporting_user.id, label: 'other-owned-collection') }
    let(:molfile) { build(:molfile, type: 'test_2') }
    let(:outside_sample) do
      create(:sample, created_by: exporting_user.id, name: 'Outside Sample', molfile: molfile,
                      collections: [other_collection])
    end
    let(:job_id) { SecureRandom.uuid }
    let(:zip_path) { Rails.public_path.join('zip', "#{job_id}.zip") }

    let(:research_plan) do
      create(
        :research_plan,
        collections: [collection],
        body: [
          { 'id' => SecureRandom.uuid, 'type' => 'sample', 'value' => { 'sample_id' => outside_sample.id } },
        ],
      )
    end

    let(:imported_collection) do
      Collection.find_by(label: 'collection-with-accessible-link', user_id: importing_user.id)
    end
    let(:imported_research_plan) { imported_collection.research_plans.first }
    let(:sample_field) { imported_research_plan.body.find { |field| field['type'] == 'sample' } }
    let(:ketcher_field) { imported_research_plan.body.find { |field| field['type'] == 'ketcher' } }

    before do
      research_plan
      # other_collection is owned by the exporting user but not part of the export
      export = Export::ExportCollections.new(job_id, [collection.id], 'zip', false, false, exporting_user.id)
      export.prepare_data
      export.to_file

      attachment = create(:attachment, file_path: zip_path)
      Import::ImportCollections.new(attachment, importing_user.id).execute
    end

    it 'does not import the outside sample record itself' do
      expect(imported_collection.samples).to be_empty
    end

    it 'replaces the sample field with a ketcher field' do
      expect(sample_field).to be_nil
      expect(ketcher_field).to be_present
    end

    it 'embeds the sample structure' do
      expect(ketcher_field['value']['sdf_file']).to eq(outside_sample.molfile)
    end

    it 'materializes a rendered preview svg under public/images/research_plans' do
      svg_file = ketcher_field['value']['svg_file']
      expect(svg_file).to be_present

      svg_path = Rails.public_path.join('images', 'research_plans', svg_file)
      expect(File.file?(svg_path)).to be true
      expect(File.read(svg_path)).to include('</svg>')
    end
  end

  # Regression: fetch_one mints a uuid for every ancestor id while writing a split sample's
  # 'ancestry' string, whether or not that ancestor is ever itself fetched into @data — so a plain
  # @uuids lookup ("has a uuid ever been minted for this id") is not a valid "is this sample part of
  # the export" test. A parent sample split into a child that lives in the exported collection is
  # exactly this case: the parent's own collection is never exported, but its uuid gets minted as a
  # side effect of exporting the child.
  describe "import a collection with a researchplan linking a split sample's unexported parent" do
    let(:exporting_user) { create(:person, first_name: 'Ex', last_name: 'Porter', name_abbreviation: 'EP') }
    let(:importing_user) { create(:person, first_name: 'Im', last_name: 'Porter', name_abbreviation: 'IP') }
    let(:collection) { create(:collection, user_id: exporting_user.id, label: 'collection-with-split-sample') }
    let(:parent_collection) { create(:collection, user_id: exporting_user.id, label: 'parent-collection') }
    let(:molfile) { build(:molfile, type: 'test_2') }
    let(:parent_sample) do
      create(:sample, created_by: exporting_user.id, name: 'Parent Sample', molfile: molfile,
                      collections: [parent_collection])
    end
    let(:child_sample) do
      create(:sample, created_by: exporting_user.id, name: 'Child Sample', parent: parent_sample,
                      collections: [collection])
    end
    let(:job_id) { SecureRandom.uuid }
    let(:zip_path) { Rails.public_path.join('zip', "#{job_id}.zip") }

    let(:research_plan) do
      create(
        :research_plan,
        collections: [collection],
        body: [
          { 'id' => SecureRandom.uuid, 'type' => 'sample', 'value' => { 'sample_id' => parent_sample.id } },
        ],
      )
    end

    let(:imported_collection) do
      Collection.find_by(label: 'collection-with-split-sample', user_id: importing_user.id)
    end
    let(:imported_research_plan) { imported_collection.research_plans.first }
    let(:sample_field) { imported_research_plan.body.find { |field| field['type'] == 'sample' } }
    let(:ketcher_field) { imported_research_plan.body.find { |field| field['type'] == 'ketcher' } }

    before do
      child_sample
      research_plan
      # only `collection` (holding the child) is exported; parent_collection (holding the parent) is not
      export = Export::ExportCollections.new(job_id, [collection.id], 'zip', false, false, exporting_user.id)
      export.prepare_data
      export.to_file

      attachment = create(:attachment, file_path: zip_path)
      Import::ImportCollections.new(attachment, importing_user.id).execute
    end

    it 'imports the child sample but not the parent' do
      expect(imported_collection.samples.pluck(:name)).to eq(['Child Sample'])
    end

    it 'converts the parent link into a ketcher field instead of silently dropping it' do
      expect(sample_field).to be_nil
      expect(ketcher_field).to be_present
      expect(ketcher_field['value']['sdf_file']).to eq(parent_sample.molfile)
    end
  end

  # The exporting user does not have read access to the outside sample (it lives in someone else's,
  # unshared collection). The link must still be dropped, never converted — otherwise a research plan
  # could be used to exfiltrate a structure the exporting user isn't allowed to see.
  describe 'import a collection with a researchplan linking an inaccessible sample outside the export' do
    let(:exporting_user) { create(:person, first_name: 'Ex', last_name: 'Porter', name_abbreviation: 'EP') }
    let(:importing_user) { create(:person, first_name: 'Im', last_name: 'Porter', name_abbreviation: 'IP') }
    let(:stranger) { create(:person, first_name: 'Str', last_name: 'Anger', name_abbreviation: 'SA') }
    let(:collection) { create(:collection, user_id: exporting_user.id, label: 'collection-with-inaccessible-link') }
    let(:strangers_collection) { create(:collection, user_id: stranger.id, label: 'strangers-collection') }
    let(:molfile) { build(:molfile, type: 'test_2') }
    let(:inaccessible_sample) do
      create(:sample, created_by: stranger.id, name: 'Inaccessible Sample', molfile: molfile,
                      collections: [strangers_collection])
    end
    let(:job_id) { SecureRandom.uuid }
    let(:zip_path) { Rails.public_path.join('zip', "#{job_id}.zip") }

    let(:research_plan) do
      create(
        :research_plan,
        collections: [collection],
        body: [
          { 'id' => SecureRandom.uuid, 'type' => 'sample', 'value' => { 'sample_id' => inaccessible_sample.id } },
        ],
      )
    end

    let(:imported_collection) do
      Collection.find_by(label: 'collection-with-inaccessible-link', user_id: importing_user.id)
    end
    let(:imported_research_plan) { imported_collection.research_plans.first }

    before do
      research_plan
      export = Export::ExportCollections.new(job_id, [collection.id], 'zip', false, false, exporting_user.id)
      export.prepare_data
      export.to_file

      attachment = create(:attachment, file_path: zip_path)
      Import::ImportCollections.new(attachment, importing_user.id).execute
    end

    it 'drops the link instead of converting or keeping it' do
      expect(imported_research_plan.body).to be_empty
    end
  end

  # The exporting user has general read access to the outside sample via a share, but that share caps
  # the sample detail level at the lowest tier, where SampleEntity anonymizes the molfile (see
  # `anonymize_below: 1`). ElementPolicy#read? alone would pass here — #read_structure? is what must
  # block the conversion, since the exporting user isn't actually allowed to see the structure.
  describe 'import a collection with a researchplan linking a sample shared at the lowest detail level' do
    let(:exporting_user) { create(:person, first_name: 'Ex', last_name: 'Porter', name_abbreviation: 'EP') }
    let(:importing_user) { create(:person, first_name: 'Im', last_name: 'Porter', name_abbreviation: 'IP') }
    let(:sample_owner) { create(:person, first_name: 'Ow', last_name: 'Ner', name_abbreviation: 'ON') }
    let(:collection) { create(:collection, user_id: exporting_user.id, label: 'collection-with-low-detail-link') }
    let(:owners_collection) do
      create(:collection, user_id: sample_owner.id, label: 'owners-collection').tap do |shared_collection|
        create(:collection_share, collection: shared_collection, shared_with: exporting_user,
                                  permission_level: CollectionShare.permission_level(:read_elements),
                                  sample_detail_level: 0)
      end
    end
    let(:molfile) { build(:molfile, type: 'test_2') }
    let(:low_detail_sample) do
      create(:sample, created_by: sample_owner.id, name: 'Low Detail Sample', molfile: molfile,
                      collections: [owners_collection])
    end
    let(:job_id) { SecureRandom.uuid }
    let(:zip_path) { Rails.public_path.join('zip', "#{job_id}.zip") }

    let(:research_plan) do
      create(
        :research_plan,
        collections: [collection],
        body: [
          { 'id' => SecureRandom.uuid, 'type' => 'sample', 'value' => { 'sample_id' => low_detail_sample.id } },
        ],
      )
    end

    let(:imported_collection) do
      Collection.find_by(label: 'collection-with-low-detail-link', user_id: importing_user.id)
    end
    let(:imported_research_plan) { imported_collection.research_plans.first }

    before do
      research_plan
      export = Export::ExportCollections.new(job_id, [collection.id], 'zip', false, false, exporting_user.id)
      export.prepare_data
      export.to_file

      attachment = create(:attachment, file_path: zip_path)
      Import::ImportCollections.new(attachment, importing_user.id).execute
    end

    it 'drops the link instead of converting it, since the molfile is not visible at this detail level' do
      expect(imported_research_plan.body).to be_empty
    end
  end

  # When the exporting user holds full detail access to the outside reaction, its report-style scheme
  # (see Reaction#compose_report_scheme_svg) is preserved as a static image instead of being dropped
  # outright — the live reaction record still isn't part of the export, but the chemistry survives.
  describe 'import a collection with a researchplan linking an accessible reaction outside the export' do
    let(:exporting_user) { create(:person, first_name: 'Ex', last_name: 'Porter', name_abbreviation: 'EP') }
    let(:importing_user) { create(:person, first_name: 'Im', last_name: 'Porter', name_abbreviation: 'IP') }
    let(:collection) { create(:collection, user_id: exporting_user.id, label: 'collection-with-accessible-rxn') }
    let(:other_collection) { create(:collection, user_id: exporting_user.id, label: 'other-owned-collection-rxn') }
    let(:product) { create(:sample, molfile: build(:molfile, type: 'test_2')) }
    let(:outside_reaction) do
      create(:reaction, name: 'Outside Reaction', products: [product], collections: [other_collection])
    end
    let(:job_id) { SecureRandom.uuid }
    let(:zip_path) { Rails.public_path.join('zip', "#{job_id}.zip") }

    let(:research_plan) do
      create(
        :research_plan,
        collections: [collection],
        body: [
          { 'id' => SecureRandom.uuid, 'type' => 'reaction', 'value' => { 'reaction_id' => outside_reaction.id } },
        ],
      )
    end

    let(:imported_collection) do
      Collection.find_by(label: 'collection-with-accessible-rxn', user_id: importing_user.id)
    end
    let(:imported_research_plan) { imported_collection.research_plans.first }
    let(:reaction_field) { imported_research_plan.body.find { |field| field['type'] == 'reaction' } }
    let(:image_field) { imported_research_plan.body.find { |field| field['type'] == 'image' } }
    let(:image_attachment) { Attachment.find_by(identifier: image_field['value']['public_name']) }
    let(:export) { Export::ExportCollections.new(job_id, [collection.id], 'zip', false, false, exporting_user.id) }

    before do
      research_plan
      export.prepare_data
      export.to_file

      attachment = create(:attachment, file_path: zip_path)
      Import::ImportCollections.new(attachment, importing_user.id).execute
    end

    it 'does not import the outside reaction record itself' do
      expect(imported_collection.reactions).to be_empty
    end

    it 'replaces the reaction field with an image field' do
      expect(reaction_field).to be_nil
      expect(image_field).to be_present
    end

    it 'backs the image field with a real attachment associated to the research plan' do
      expect(image_attachment).to be_present
      expect(image_attachment.attachable).to eq(imported_research_plan)
    end

    it 'embeds the report-style reaction scheme as svg content' do
      svg_content = image_attachment.attachment.open(&:read)
      expect(svg_content).to include('</svg>')
    end

    it 'does not leave the synthetic attachment (even soft-deleted) on the exporting system' do
      expect(Attachment.with_deleted.where(created_by: exporting_user.id, attachable_type: 'ResearchPlan')).to be_empty
    end
  end

  # The exporting user does not have read access to the outside reaction. The link must still be
  # dropped, never converted.
  describe 'import a collection with a researchplan linking an inaccessible reaction outside the export' do
    let(:exporting_user) { create(:person, first_name: 'Ex', last_name: 'Porter', name_abbreviation: 'EP') }
    let(:importing_user) { create(:person, first_name: 'Im', last_name: 'Porter', name_abbreviation: 'IP') }
    let(:stranger) { create(:person, first_name: 'Str', last_name: 'Anger', name_abbreviation: 'SA') }
    let(:collection) { create(:collection, user_id: exporting_user.id, label: 'collection-with-inaccessible-rxn') }
    let(:strangers_collection) { create(:collection, user_id: stranger.id, label: 'strangers-collection-rxn') }
    let(:product) { create(:sample, molfile: build(:molfile, type: 'test_2')) }
    let(:inaccessible_reaction) do
      create(:reaction, name: 'Inaccessible Reaction', products: [product], collections: [strangers_collection])
    end
    let(:job_id) { SecureRandom.uuid }
    let(:zip_path) { Rails.public_path.join('zip', "#{job_id}.zip") }

    let(:research_plan) do
      create(
        :research_plan,
        collections: [collection],
        body: [
          {
            'id' => SecureRandom.uuid, 'type' => 'reaction',
            'value' => { 'reaction_id' => inaccessible_reaction.id }
          },
        ],
      )
    end

    let(:imported_collection) do
      Collection.find_by(label: 'collection-with-inaccessible-rxn', user_id: importing_user.id)
    end
    let(:imported_research_plan) { imported_collection.research_plans.first }

    before do
      research_plan
      export = Export::ExportCollections.new(job_id, [collection.id], 'zip', false, false, exporting_user.id)
      export.prepare_data
      export.to_file

      attachment = create(:attachment, file_path: zip_path)
      Import::ImportCollections.new(attachment, importing_user.id).execute
    end

    it 'drops the link instead of converting or keeping it' do
      expect(imported_research_plan.body).to be_empty
    end
  end

  # The exporting user has general read access to the outside reaction via a share, but that share
  # caps the reaction detail level below full — where ReactionEntity anonymizes reaction_svg_file (see
  # `anonymize_below: 10`). #read? alone would pass here — #read_full_detail? is what must block the
  # conversion.
  describe 'import a collection with a researchplan linking a reaction shared below full detail' do
    let(:exporting_user) { create(:person, first_name: 'Ex', last_name: 'Porter', name_abbreviation: 'EP') }
    let(:importing_user) { create(:person, first_name: 'Im', last_name: 'Porter', name_abbreviation: 'IP') }
    let(:reaction_owner) { create(:person, first_name: 'Ow', last_name: 'Ner', name_abbreviation: 'ON') }
    let(:collection) { create(:collection, user_id: exporting_user.id, label: 'collection-with-low-detail-rxn') }
    let(:owners_collection) do
      create(:collection, user_id: reaction_owner.id, label: 'owners-collection-rxn').tap do |shared_collection|
        create(:collection_share, collection: shared_collection, shared_with: exporting_user,
                                  permission_level: CollectionShare.permission_level(:read_elements),
                                  reaction_detail_level: 9)
      end
    end
    let(:product) { create(:sample, molfile: build(:molfile, type: 'test_2')) }
    let(:low_detail_reaction) do
      create(:reaction, created_by: reaction_owner.id, name: 'Low Detail Reaction', products: [product],
                        collections: [owners_collection])
    end
    let(:job_id) { SecureRandom.uuid }
    let(:zip_path) { Rails.public_path.join('zip', "#{job_id}.zip") }

    let(:research_plan) do
      create(
        :research_plan,
        collections: [collection],
        body: [
          {
            'id' => SecureRandom.uuid, 'type' => 'reaction',
            'value' => { 'reaction_id' => low_detail_reaction.id }
          },
        ],
      )
    end

    let(:imported_collection) do
      Collection.find_by(label: 'collection-with-low-detail-rxn', user_id: importing_user.id)
    end
    let(:imported_research_plan) { imported_collection.research_plans.first }

    before do
      research_plan
      export = Export::ExportCollections.new(job_id, [collection.id], 'zip', false, false, exporting_user.id)
      export.prepare_data
      export.to_file

      attachment = create(:attachment, file_path: zip_path)
      Import::ImportCollections.new(attachment, importing_user.id).execute
    end

    it 'drops the link instead of converting it, since full detail access is required' do
      expect(imported_research_plan.body).to be_empty
    end
  end
end
# rubocop:enable RSpec/MultipleMemoizedHelpers
