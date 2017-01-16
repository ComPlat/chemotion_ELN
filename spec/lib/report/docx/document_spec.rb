require 'rails_helper'

describe 'Report::Docx::Document instance' do
  let(:t1) { "title 1" }
  let(:t2) { "title 2" }
  let(:r1) { create(:reaction, name: t1)}
  let(:r2) { create(:reaction, name: t2)}
  let(:s1) { create(:sample) }
  let(:instance) do
    Report::Docx::Document.new(objs: [r1, r2, s1],
      spl_settings: all_spl_settings,
      rxn_settings: all_rxn_settings,
      configs: all_configs)
  end
  let!(:content) { instance.convert }

  it "returns an array class" do
    expect(content.class).to eq(Array)
  end

  context '.reactions' do
    it "has correct reaction titles" do
      expect(content[0][:title]).to eq(t1)
      expect(content[1][:title]).to eq(t2)
    end
  end

  context '.samples' do
    it "has correct sample titles" do
      expect(content[2][:title]).to include(s1.molecule_iupac_name)
    end
  end
end
