require 'rails_helper'

RSpec.describe CodeLog, type: :model do
  it "logs creation of bar & qr codes" do
    sample = create(:sample_without_analysis)
    reaction = create(:reaction)
    screen = create(:screen)
    wellplate = create(:wellplate)

    expect(CodeLog.all.pluck(:source, :source_id)).to eq [
      ["sample",sample.id],
      ["reaction", reaction.id],
      ["screen", screen.id],
      ["wellplate", wellplate.id]
    ]
  end
end
