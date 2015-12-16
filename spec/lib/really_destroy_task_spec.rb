require 'rails_helper'

RSpec.describe 'ReallyDestroyTask' do
  let(:sample) { create(:sample) }
  let(:reaction) { create(:reaction) }

  describe 'execute!' do
    before do
      sample.destroy
      reaction.destroy
    end

    it 'really destroys elements' do
      expect(Sample.with_deleted).to eq [sample]
      expect(Reaction.with_deleted).to eq [reaction]

      ReallyDestroyTask.execute!
      expect(Sample.with_deleted).to eq []
      expect(Reaction.with_deleted).to eq []
    end
  end
end
