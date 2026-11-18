# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Import::ImportCollections do
  let(:user) { create(:person) }
  let(:collection) { create(:collection, user: user) }
  let(:importer) { described_class.new(nil, user.id) }
  let(:sample) { create(:sample, creator: user) }
  let(:reaction) { create(:reaction, creator: user, collections: [collection]) }
  let(:other_reaction) { create(:reaction, creator: user, collections: [collection]) }

  after do
    FileUtils.remove_entry(importer.instance_variable_get(:@tmp_dir))
  end

  def import_links(links)
    importer.instance_variable_set(:@data, links)
    importer.instance_variable_set(
      :@instances,
      { 'Reaction' => { 'r1' => reaction, 'r2' => other_reaction }, 'Sample' => { 's1' => sample } },
    )
    importer.send(:import_reactions_samples)
    # the importer keeps the links by their class
    links.keys.map { |model| importer.instance_variable_get(:@instances).fetch(model) }.reduce(:merge)
  end

  context 'when the exported data links a sample to two reactions' do
    let!(:links) do
      import_links(
        'ReactionsStartingMaterialSample' => { 'l1' => { 'reaction_id' => 'r1', 'sample_id' => 's1' } },
        'ReactionsReactantSample' => { 'l2' => { 'reaction_id' => 'r2', 'sample_id' => 's1', 'equivalent' => 2 } },
      )
    end

    it 'links the imported sample to the first reaction' do
      expect(links.fetch('l1')).to have_attributes(reaction: reaction, sample: sample)
    end

    it 'links a sample split from it to the second reaction' do
      expect(links.fetch('l2')).to have_attributes(reaction: other_reaction, equivalent: 2)
      expect(links.fetch('l2').sample).to have_attributes(parent: sample, created_by: user.id)
    end

    it 'puts the split sample into the collections of the second reaction' do
      expect(links.fetch('l2').sample.collections).to include(collection)
    end
  end

  context 'when the exported data links a sample to a reaction in two roles' do
    let!(:links) do
      import_links(
        'ReactionsStartingMaterialSample' => { 'l1' => { 'reaction_id' => 'r1', 'sample_id' => 's1' } },
        'ReactionsProductSample' => { 'l2' => { 'reaction_id' => 'r1', 'sample_id' => 's1' } },
      )
    end

    it 'keeps both roles, the second with a sample split from the first' do
      expect(links.fetch('l1').sample).to eq(sample)
      expect(links.fetch('l2')).to have_attributes(reaction: reaction, type: 'ReactionsProductSample')
      expect(links.fetch('l2').sample.parent).to eq(sample)
    end
  end
end
