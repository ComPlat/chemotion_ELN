require 'rails_helper'

describe 'Report::Docx::Image instance' do
  let(:r1) { create(:reaction, name: 't1')}
  let(:instance) { Report::Docx::Image.new(obj: r1) }

  context '.generate_png' do
    let(:png) { instance.generate_png }

    it "returns an image class" do
      expect(png.class).to eq(Sablon::Image::Definition)
    end

    it "returns a png file" do
      expect(png.name.split('.').last).to eq('png')
    end
  end
end
