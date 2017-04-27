require 'rails_helper'

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

  describe 'deletion' do
    let(:reaction)   { create(:reaction) }
    let(:literature) { create(:literature, reaction: reaction) }
    let(:sample)     { create(:sample) }
    let(:collection) { create(:collection) }

    before do
      CollectionsReaction.create!(reaction: reaction, collection: collection)
      ReactionsStartingMaterialSample.create!(sample: sample, reaction: reaction)
      ReactionsReactantSample.create!(sample: sample, reaction: reaction)
      ReactionsProductSample.create!(sample: sample, reaction: reaction)
      reaction.destroy
    end

    it 'destroys associations properly' do
      expect(collection.collections_reactions).to eq []
      expect(sample.reactions_reactant_samples).to eq []
      expect(sample.reactions_product_samples).to eq []
      expect(sample.reactions_starting_material_samples).to eq []
      expect(Literature.count).to eq 0
    end

    it 'only soft deletes reaction and associated samples' do
      expect(Reaction.with_deleted).to eq [reaction]
      expect(Sample.with_deleted).to eq [sample]
    end
  end
end
