require 'rails_helper'

RSpec.describe 'ReallyDestroyTask' do
#  let(:sample) { create(:sample) }
#  let(:reaction) { create(:reaction) }
  let(:s0) { create(:sample) }
  let(:s1) { create(:sample,deleted_at: 9.days.ago) }
  let(:s2) { create(:sample,deleted_at: 7.days.ago) }
  let(:r0) { create(:reaction) }
  let(:r1) { create(:reaction,deleted_at: 9.days.ago) }
  let(:r2) { create(:reaction,deleted_at: 7.days.ago) }

  describe 'before execute!' do
    before do
      s0.save!
      s1.save!
      s2.save!
      r0.save!
      r1.save!
      r2.save!
    end

    it 'does not really destroy samples or reactions' do
      expect(Sample.with_deleted).to eq [s0,s1,s2]
      expect(Sample.all).to eq [s0]
      expect(Sample.only_deleted).to eq [s1,s2]
      expect(Sample.only_deleted.size).to eq 2
      expect(Reaction.with_deleted).to eq [r0,r1,r2]
      expect(Reaction.only_deleted).to eq [r1,r2]
      expect(Reaction.only_deleted.size).to eq 2
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
      s0.save!
      s1.save!
      s2.save!
      r0.save!
      r1.save!
      r2.save!

      ReallyDestroyTask.execute!
    end

    it 'does really destroy samples and reactions older than 8 days' do

      expect(Sample.with_deleted.size).to eq 2
      expect(Sample.with_deleted.where( deleted_at: nil).size).to eq 1
      expect(Sample.with_deleted).to eq [s0,s2]
      expect(Sample.only_deleted).to eq [s2]
      expect(Sample.only_deleted).to_not be_empty
      expect(Reaction.with_deleted).to eq [r0,r2]
      expect(Reaction.only_deleted).to eq [r2]
      expect(Reaction.only_deleted).to_not be_empty
    end
  end
end
