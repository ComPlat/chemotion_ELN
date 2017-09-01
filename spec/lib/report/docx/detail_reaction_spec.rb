require 'rails_helper'

describe 'Reporter::Docx::DetailReaction instance' do
  let(:tit)   { 'According to General Procedure N' }
  let(:sta)   { 'Planned' }
  let(:sol)   { 'correct solvent' }
  let(:pur)   { '{TLC, Distillation}' }
  let(:rf)    { 'correct tlc_rf' }
  let(:t_sol) { 'correct tlc_solvents' }
  let(:t_des) { 'correct tlc_description' }
  let(:obs)   { { "ops" => [{"insert" => "correct observation" }] } }
  let(:des)   { { "ops" => [{"insert" => "correct description" }] } }
  let(:prev_index) { 5 }
  let(:equiv) { 0.88 }
  let(:d1)    { "Damage to environment" }
  let(:d2)    { "Explosive (Class 1)" }
  let(:dangerous) { "{\"#{d1}\", \"#{d2}\"}" }
  let!(:user) { create(:user) }
  let!(:gp)   { create(:group, users: [user]) }
  let!(:c1)   { create(:collection,
                        label: 'C1',
                        user: user,
                        permission_level: 10,
                        sample_detail_level: 10,
                        reaction_detail_level: 10,
                        is_shared: false) }
  let!(:r1)   { create(:reaction, name: tit,
                                  status: sta,
                                  solvent: sol,
                                  description: des,
                                  purification: pur,
                                  rf_value: rf,
                                  tlc_solvents: t_sol,
                                  tlc_description: t_des,
                                  observation: obs,
                                  dangerous_products: dangerous) }
  let!(:s1) { create(:sample, name: 'Sample 1') }
  let!(:s2) { create(:sample, name: 'Sample 2') }
  let!(:s3) { create(:sample, name: 'Sample 3') }
  let!(:r1_serialized) do
    CollectionsReaction.create!(reaction: r1, collection: c1)
    CollectionsSample.create!(sample: s1, collection: c1)
    CollectionsSample.create!(sample: s2, collection: c1)
    CollectionsSample.create!(sample: s3, collection: c1)
    ReactionsStartingMaterialSample.create!(
      reaction: r1, sample: s1, equivalent: equiv
    )
    ReactionsProductSample.create!(
      reaction: r1, sample: s2, equivalent: equiv
    )
    ReactionsProductSample.create!(
      reaction: r1, sample: s3, equivalent: equiv
    )
    ElementReportPermissionProxy.new(user, r1, [user.id]).serialized
  end
  let!(:target) do
    Reporter::Docx::DetailReaction.new(reaction: OpenStruct.new(r1_serialized),
                                        index: prev_index)
  end

  context '.content' do
    let(:content) { target.content }

    it "returns a Hash" do
      expect(content.class).to eq(Hash)
    end

    it "has a png image & a bin file" do
      expect(content[:equation_reaction].class).to eq(Sablon::Chem::Definition)
      expect(content[:equation_reaction].img.name.split('.').last).to eq('png')
      expect(content[:equation_reaction].ole.name.split('.').last).to eq('bin')
    end

    it "has a correct status" do
      expect(content[:status].name).to include('png')
      expect(content[:status].name).to include(sta.downcase)
    end

    it "has correct content" do
      expect(content[:title]).to eq(tit)
      expect(content[:solvents]).to eq(sol)
      expect(content[:description]).to eq(
        Sablon.content(:html, Reporter::Delta.new(des).getHTML())
      )
      expect(content[:observation]).to eq(
        Sablon.content(:html, Reporter::Delta.new(obs).getHTML())
      )
      expect(content[:tlc_rf]).to eq(rf)
      expect(content[:tlc_solvent]).to eq(t_sol)
      expect(content[:tlc_description]).to eq(t_des)
      expect(content[:short_label]).to eq(r1.short_label)
      expect(content[:products_html].class).to eq(Sablon::Content::HTML)
      expect(content[:synthesis_html].class).to eq(Sablon::Content::HTML)

      pur.tr('{}', '').split(',').each do |p|
        expect(content[:purification]).to include(p)
      end
    end
  end

  context 'private methods' do
    it "has correct data" do
      expect(target.send(:title)).to eq(tit)
      expect(target.send(:gp_title_delta)).to eq(
        [
          {"insert"=>"[3.#{prev_index + 1}] "},
          {"insert"=>"#{tit} "},
          {"insert"=>"(#{r1.short_label})"}
        ]
      )
      expect(target.send(:synthesis_title_delta)).to eq(
        [
          {"insert"=>"[4.#{prev_index + 1}] "},
          {"insert"=>"#{s2.molecule.iupac_name}"},
          {"insert"=>" / "},
          {"insert"=>"#{s3.molecule.iupac_name}"},
          {"insert"=>" ("},
          {"attributes"=>{"bold"=>"true"}, "insert"=>"xx"},
          {"insert"=>")"}
        ]
      )
      expect(target.send(:products_delta)).to eq(
        [
          {"insert"=>"Name: "},
          {"insert"=>"#{s2.molecule.iupac_name}"},
          {"insert"=>"; "},
          {"insert"=>"Formula: "},
          {"insert"=>"H"},
          {"attributes"=>{"script"=>"sub"}, "insert"=>"2"},
          {"insert"=>"O"},
          {"insert"=>"; "},
          {"insert"=>"CAS: - ; " +
                      "Smiles: #{s2.molecule.cano_smiles}; " +
                      "InCHI: #{s2.molecule.inchikey}; " +
                      "Molecular Mass: 18.0153; Exact Mass: 18.0106; "},
          {"insert"=>"EA: "},
          {"insert"=>"H 11.19, O 88.81"},
          {"insert"=>"."},
          {"insert"=>"\n"},
          {"insert"=>"Name: "},
          {"insert"=>"#{s3.molecule.iupac_name}"},
          {"insert"=>"; "},
          {"insert"=>"Formula: "},
          {"insert"=>"H"},
          {"attributes"=>{"script"=>"sub"}, "insert"=>"2"},
          {"insert"=>"O"},
          {"insert"=>"; "},
          {"insert"=>"CAS: - ; " +
                      "Smiles: #{s3.molecule.cano_smiles}; " +
                      "InCHI: #{s3.molecule.inchikey}; " +
                      "Molecular Mass: 18.0153; " +
                      "Exact Mass: 18.0106; "},
          {"insert"=>"EA: "},
          {"insert"=>"H 11.19, O 88.81"},
          {"insert"=>"."},
          {"insert"=>"\n"}
        ]
      )
      expect(target.send(:synthesis_delta)).to eq(
        [
          {"insert"=>"#{tit}: "},
          {"insert"=>"{1|"},
          {"attributes"=>{"bold"=>"true"}, "insert"=>"xx"},
          {"insert"=>"} "},
          {"insert"=>"#{s2.molecule.iupac_name}"},
          {"insert"=>" (1.000 g, 55.508 mmol, 0.880 equiv.); "},
          {"insert"=>"Yield "},
          {"insert"=>"{2|"},
          {"attributes"=>{"bold"=>"true"}, "insert"=>"xx"},
          {"insert"=>"} = #{(equiv * 100).to_i}% (0.000 g, 0.000 mmol)"},
          {"insert"=>"; "},
          {"insert"=>"{3|"},
          {"attributes"=>{"bold"=>"true"}, "insert"=>"xx"},
          {"insert"=>"} = #{(equiv * 100).to_i}% (0.000 g, 0.000 mmol)"},
          {"insert"=>"."},
          {"insert"=>"\n"},
          {"insert"=>"correct observation"},
          {"insert"=>"R"},
          {"attributes"=>{"italic"=>true, "script"=>"sub"}, "insert"=>"f"},
          {"insert"=>" = #{rf} (#{t_sol})."}, {"insert"=>"\n"},
          {"insert"=>"analysis contents"},
          {"insert"=>"analysis contents"},
          {"insert"=>"\n"},
          {"attributes"=>{"bold"=>"true"}, "insert"=>"Attention! "},
          {"insert"=>"The reaction includes the use of dangerous chemicals, " +
                      "which have the following classification: #{d1}, #{d2}."}
        ]
      )
    end
  end
end
