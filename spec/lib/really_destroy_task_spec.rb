require 'rails_helper'

RSpec.describe 'ReallyDestroyTask' do
#  let(:sample) { create(:sample) }
#  let(:reaction) { create(:reaction) }
  let(:s0) { create(:sample) }
  let(:s1) { create(:sample,deleted_at: Time.now - 9.days) }
  let(:s2) { create(:sample,deleted_at: Time.now - 7.days) }
  let(:r0) { create(:reaction) }
  let(:r1) { create(:reaction,deleted_at: Time.now - 9.days) }
  let(:r2) { create(:reaction,deleted_at: Time.now - 7.days) }

  describe 'before execute!' do
    before do
    #  ReallyDestroyTask.execute!
    end

    it 'does not really destroy samples or reactions' do
      expect(Sample.with_deleted).to eq [s0,s1,s2]
    # expect(Sample.without_deleted).to eq [s0]
      expect(Sample.only_deleted).to eq [s1,s2]
      expect(Reaction.with_deleted).to eq [r0,r1,r2]
    # expect(Reaction.without_deleted).to eq [r0]
      expect(Reaction.only_deleted).to eq [r1,r2]
    end
  end

  describe 'execute!' do
    before do
    #  ReallyDestroyTask.execute!
    end

    it 'does really destroy samples and reactions older than 8 days' do
      expect(Sample.with_deleted).to eq [s0,s2]
    #  expect(Sample.without_deleted).to eq [s0]
      expect(Sample.only_deleted).to eq [s2]
      expect(Reaction.with_deleted).to eq [r0,r2]
    # expect(Reaction.without_deleted).to eq [r0]
      expect(Reaction.only_deleted).to eq [r2]
    end
  end
end
