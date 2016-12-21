require 'rails_helper'

describe 'Report::Docx::Equation instance' do
  let(:r1) { create(:reaction, name: 't1')}
  let(:instance) { Report::Docx::Equation.new(obj: r1) }

  context '.generate_eps' do
    let(:equation) { instance.generate }

    it "returns an Sablon::Chem class" do
      expect(equation.class).to eq(Sablon::Chem::Definition)
    end

    it "contains a png file & a bin file" do
      expect(equation.img.name.split('.').last).to eq('png')
      expect(equation.ole.name.split('.').last).to eq('bin')
    end
  end
end
