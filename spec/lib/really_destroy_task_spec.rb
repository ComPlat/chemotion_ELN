require 'rails_helper'

RSpec.describe 'ReallyDestroyTask' do
#  let(:sample) { create(:sample) }
#  let(:reaction) { create(:reaction) }
  let(:s0) { create(:sample) }
  let(:s1) { create(:sample,deleted_at: 9.days.ago) }
  let(:s2) { create(:sample,deleted_at: 6.days.ago) }
  let(:r0) { create(:reaction) }
  let(:r1) { create(:reaction,deleted_at: 9.days.ago) }
  let(:r2) { create(:reaction,deleted_at: 6.days.ago) }
  let (:c0) { create(:collection) }
  let (:c1) { create(:collection, deleted_at: 9.days.ago) }
  let (:c3) { create(:collection) }

  before do
    c0.save!
    c1.save!
    c3.save!
    s0.save!
    s1.save!
    s2.save!
    r0.save!
    r1.save!
    r2.save!
    s0.collections << c0
    s0.collections << c1
    r0.collections << c0
    r0.collections << c1
    s0.save!
    r0.save!
    CollectionsReaction.create!(
      collection_id: c3.id, reaction_id: r0.id, deleted_at: 9.days.ago
    )
    CollectionsReaction.with_deleted.find_by(
      reaction_id: r0.id, collection_id: c1.id
    ).destroy!
  end

  describe 'before execute!' do
    it 'does not really destroy samples or reactions' do
      expect(Sample.with_deleted.to_a).to include(s0, s1, s2)
      expect(Sample.all.to_a).to include(s0)
      expect(Sample.all.to_a).to_not include(s1)
      expect(Sample.all.to_a).to_not include(s2)
      expect(Sample.only_deleted.to_a).to include(s1, s2)
      expect(Reaction.with_deleted.to_a).to include(r0, r1, r2)
      expect(Reaction.only_deleted.to_a).to include(r1,r2)
      expect(Reaction.only_deleted.to_a).to_not include(r0)
      expect(CollectionsReaction.with_deleted.find_by(
        reaction_id: r0.id, collection_id: c1.id)).to_not be_nil
    end
  end

  describe 'models' do
    let(:models){
      [
        'Collection', 'CollectionsReaction', 'CollectionsSample',
        'CollectionsScreen', 'CollectionsWellplate', 'ScreensWellplate',
        'ReactionsProductSample', 'Sample', 'Reaction',
        'ReactionsReactantSample', 'ReactionsStartingMaterialSample',
        'Literature', 'Molecule', 'Wellplate', 'Screen', 'Well', 'User',
        'CodeLog'
      ]
    }

    it 'return the list of paranoid models' do
      expect(ReallyDestroyTask.models).to eq models
    end
  end

  describe 'execute!' do
    before do
      ReallyDestroyTask.execute!
    end

    it 'does really destroy elements deleted more than 8 days ago' do
      expect(Sample.with_deleted.pluck(:id)).to_not include(s1.id)
      expect(Reaction.with_deleted.pluck(:id)).to_not include(r1.id)
      expect(Collection.with_deleted.pluck(:id)).to_not include(c1.id)
      expect(CollectionsReaction.with_deleted.find_by(
        reaction_id: r0.id, collection_id: c1.id)).to be_nil
    end

    it 'does not really destroy elements deleted less than 7 days ago' do
      expect(Sample.with_deleted.pluck(:id)).to_not include(s1.id)
      expect(Sample.with_deleted.pluck(:id)).to include(s0.id, s2.id)
      expect(Sample.with_deleted.where( deleted_at: nil).to_a).to include(s0)
      expect(Sample.with_deleted.where( deleted_at: nil).to_a).to_not include(s2)
      expect(Reaction.with_deleted.pluck(:id)).to include(r2.id)
      expect(CollectionsReaction.find_by(
        reaction_id: r0.id, collection_id: c3.id)).to be_nil
    end

    it 'does not really destroy non deleted elements' do
      expect(Sample.pluck(:id)).to include(s0.id)
      expect(Sample.where( deleted_at: nil).to_a).to include(s0)
      expect(Reaction.pluck(:id)).to include(r0.id)
      expect(Collection.pluck(:id)).to include(c0.id, c3.id)
      expect(CollectionsReaction.find_by(
        reaction_id: r0.id, collection_id: c0.id)).to_not be_nil
    end
  end
end
