require 'rails_helper'

describe 'Report::Docx::Image instance' do
  let(:r1) { create(:reaction, name: 't1')}
  let(:instance) { Report::Docx::Image.new(obj: r1) }

  context '.generate_eps' do
    let(:eps) { instance.generate_img }

    it "returns an image class" do
      expect(eps.class).to eq(Sablon::Image::Definition)
    end

    it "returns a eps file" do
      expect(eps.name.split('.').last).to eq('eps')
    end
  end
end
