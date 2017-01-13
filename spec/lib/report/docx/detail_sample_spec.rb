require 'rails_helper'

describe 'Report::Docx::DetailSample instance' do
  let(:analyses)   do
    [{"id"=>"1",
      "type"=>"analysis",
      "name"=>"new Analysis",
      "report"=>true,
      "kind"=>"13C NMR",
      "status"=>"Confirmed",
      "content"=>{"ops"=>[{"insert"=>"correct analyses"}]},
      "description"=>"correct description",
      "datasets"=>[]}]
  end
  let(:s1)  { create(:sample, analyses: analyses) }
  let(:instance) { Report::Docx::DetailSample.new(sample: s1) }

  context '.content' do
    let!(:content) { instance.content }

    it "returns a Hash" do
      expect(content.class).to eq(Hash)
    end

    it "has a png image & a bin file" do
      expect(content[:structure].class).to eq(Sablon::Chem::Definition)
      expect(content[:structure].img.name.split('.').last).to eq('png')
      expect(content[:structure].ole.name.split('.').last).to eq('bin')
    end

    it "has correct analyses content" do
      target_html = Sablon.content(:html,
                      Report::Delta.new(analyses[0]["content"]).getHTML)
      expect(content[:analyses][0][:content]).to eq(target_html)
    end

    it "has correct analyses description" do
      expect(content[:analyses][0][:description]).to eq(analyses[0]["description"])
    end
  end
end
