require 'rails_helper'

RSpec.describe CodeLog, type: :model do
  it "logs creation of bar & qr codes" do
    sample = create(:sample)
    reaction = create(:reaction)
    screen = create(:screen)
    wellplate = create(:wellplate)

    expect(CodeLog.get_bar_codes).to eq [sample.bar_code, reaction.bar_code, screen.bar_code, wellplate.bar_code]
    expect(CodeLog.get_qr_codes).to eq [sample.qr_code, reaction.qr_code, screen.qr_code, wellplate.qr_code]
  end
end
