require 'rails_helper'

describe 'Report::Docx::Document instance' do
  let(:t1) { "title 1" }
  let(:t2) { "title 2" }
  let(:r1) { create(:reaction, name: t1)}
  let(:r2) { create(:reaction, name: t2)}
  let(:instance) { Report::Docx::Document.new(reactions: [r1, r2]) }

  context '.reactions' do
    let(:content) { instance.reactions }

    it "returns an array class" do
      expect(content.class).to eq(Array)
    end

    it "has correct titles" do
      expect(content[0][:title]).to eq(t1)
      expect(content[1][:title]).to eq(t2)
    end
  end
end
