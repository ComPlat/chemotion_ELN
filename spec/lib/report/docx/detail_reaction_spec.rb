# frozen_string_literal: true

require 'rails_helper'

describe 'Reporter::Docx::DetailReaction instance' do
  let(:svg_fixt_path) { Rails.root.join('spec', 'fixtures', 'images', 'molecule.svg') }
  let(:svg_image_path) { Rails.root.join('public', 'images', 'molecules', 'molecule.svg') }

  let(:tit)   { 'According to General Procedure N' }
  let(:sta)   { 'Planned' }
  let(:sol)   { 'correct solvent' }
  let(:pur)   { '{TLC, Distillation}' }
  let(:rf)    { 'correct tlc_rf' }
  let(:t_sol) { 'correct tlc_solvents' }
  let(:t_des) { 'correct tlc_description' }
  let!(:correct_obsv) { 'correct observation' }
  let(:obs)   { { 'ops' => [{ 'insert' => "#{correct_obsv}\n" }] } }
  let(:des)   { { 'ops' => [{ 'insert' => 'correct description' }] } }
  let(:prev_index) { 5 }
  let(:equiv) { 0.88 }
  let(:d1)    { 'Damage to environment' }
  let(:d2)    { 'Explosive (Class 1)' }
  let(:role)  { 'parts' }
  let(:dangerous) { "{\"#{d1}\", \"#{d2}\"}" }
  let!(:user) { create(:user) }
  let!(:gp)   { create(:group, users: [user]) }
  let!(:c1)   do
    create(:collection,
           label: 'C1',
           user: user,
           permission_level: 10,
           sample_detail_level: 10,
           reaction_detail_level: 10,
           is_shared: false)
  end
  let!(:r1) do
    create(:reaction, name: tit,
                      status: sta,
                      solvent: sol,
                      description: des,
                      purification: pur,
                      rf_value: rf,
                      tlc_solvents: t_sol,
                      tlc_description: t_des,
                      observation: obs,
                      role: role,
                      dangerous_products: dangerous)
  end
  let!(:s1) do
    create(
      :sample,
      name: 'Sample 1',
      real_amount_value: 5.0,
      real_amount_unit: 'g'
    )
  end
  let!(:s2) { create(:sample, name: 'Sample 2') }
  let!(:s3) { create(:sample, name: 'Sample 3') }
  let!(:s4) { create(:sample, name: 'Solvent') }
  let!(:correct_content) { 'analysis contents (true for report)' }
  let!(:non_breaking_space) { ' ' }
  let!(:inverse) { '{"attributes":{"color":"black","script":"super"},"insert":"-1"}' }
  let!(:r1_serialized) do
    CollectionsReaction.create!(reaction: r1, collection: c1)
    CollectionsSample.create!(sample: s1, collection: c1)
    CollectionsSample.create!(sample: s2, collection: c1)
    CollectionsSample.create!(sample: s3, collection: c1)
    ReactionsStartingMaterialSample.create!(
      reaction: r1, sample: s1, equivalent: equiv
    )
    ReactionsProductSample.create!(
      reaction: r1, sample: s2, equivalent: equiv, position: 1
    )
    ReactionsProductSample.create!(
      reaction: r1, sample: s3, equivalent: equiv, position: 2
    )
    ReactionsSolventSample.create!(
      reaction: r1, sample: s4, equivalent: equiv
    )
    r1.reload
    con = r1.products[0].container.children[0].children[0]
    con.extended_metadata['report'] = 'true'
    con.extended_metadata['content'] = "{\"ops\":
      [
        {\"insert\": \"  \\n\"},
        #{inverse},
        {\"insert\": \"#{correct_content} #{non_breaking_space} \"},
        {\"insert\": \" #{non_breaking_space} ;#{non_breaking_space} \\n\"}
      ]
    }"
    con.save!

    ElementReportPermissionProxy.new(user, r1, [user.id]).serialized
  end
  let!(:serial) { '1a' }
  let!(:mol_serials) do
    mol = s1.molecule
    mol2 = s2.molecule
    mol3 = s3.molecule
    [
      {
        'mol' => {
          'id' => mol.id,
          'svgPath' => mol.molecule_svg_file,
          'sumFormula' => mol.sum_formular,
          'iupacName' => mol.iupac_name
        },
        'value' => serial
      },
      {
        'mol' => {
          'id' => mol2.id,
          'svgPath' => mol2.molecule_svg_file,
          'sumFormula' => mol2.sum_formular,
          'iupacName' => mol2.iupac_name
        },
        'value' => serial
      },
      {
        'mol' => {
          'id' => mol3.id,
          'svgPath' => mol3.molecule_svg_file,
          'sumFormula' => mol3.sum_formular,
          'iupacName' => mol3.iupac_name
        },
        'value' => serial
      }
    ]
  end
  let!(:target) do
    Reporter::Docx::DetailReaction.new(reaction: OpenStruct.new(r1_serialized),
                                       mol_serials: mol_serials,
                                       index: prev_index,
                                       si_rxn_settings: all_si_rxn_settings)
  end

  before do
    `ln -s #{svg_fixt_path} #{Rails.root.join('public', 'images', 'molecules')} ` unless File.exist?(svg_image_path)
  end

  after(:all) do
    fp = Rails.root.join('public', 'images', 'molecules', 'molecule.svg')
    FileUtils.rm(fp, force: true) if File.exist?(fp)
  end

  context '.content' do
    let(:content) { target.content }

    it 'returns a Hash' do
      expect(content.class).to eq(Hash)
    end

    it 'has a png image & a bin file' do
      expect(content[:equation_reaction].class).to eq(Sablon::Chem::Definition)
      expect(content[:equation_reaction].img.name.split('.').last).to eq('png')
      expect(content[:equation_reaction].ole.name.split('.').last).to eq('bin')
    end

    it 'has a correct status' do
      expect(content[:status].name).to include('png')
      expect(content[:status].name).to include(sta.downcase)
    end

    it 'has correct content' do
      expect(content[:title]).to eq(tit)
      expect(content[:solvents]).to eq("#{s4.preferred_label} (55.5ml)")
      expect(content[:description]).to eq(
        Sablon.content(:html, Reporter::Delta.new(des).getHTML)
      )
      expect(content[:observation]).to eq(
        Sablon.content(:html, Reporter::Delta.new(obs).getHTML)
      )
      expect(content[:tlc_rf]).to eq(rf)
      expect(content[:tlc_solvent]).to eq(t_sol)
      expect(content[:tlc_description]).to eq(t_des)
      expect(content[:short_label]).to eq(r1.short_label)
      # expect(content[:products_html].class).to eq(Sablon::Content::HTML)
      # expect(content[:synthesis_html].class).to eq(Sablon::Content::HTML)

      pur.tr('{}', '').split(',').each do |p|
        expect(content[:purification]).to include(p)
      end
    end
  end

  context 'private methods' do
    it 'has correct data' do
      expect(target.send(:title)).to eq(tit)
      expect(target.send(:gp_title_delta)).to eq(
        [
          { 'attributes' => { 'font-size' => 13 }, 'insert' => "3.#{prev_index + 1} " },
          { 'attributes' => { 'font-size' => 13 }, 'insert' => "#{tit} " },
          { 'attributes' => { 'font-size' => 13 }, 'insert' => "(#{r1.short_label})" }
        ]
      )
      expect(target.send(:synthesis_title_delta)).to eq(
        [
          { 'attributes' => { 'bold' => true, 'font-size' => 13 }, 'insert' => s2.molecule_name_hash[:label].to_s },
          { 'attributes' => { 'font-size' => 13 }, 'insert' => ' (' },
          { 'attributes' => { 'font-size' => 13, 'bold' => 'true' }, 'insert' => serial },
          { 'attributes' => { 'font-size' => 13 }, 'insert' => ')' },
          { 'attributes' => { 'font-size' => 13 }, 'insert' => ', ' },
          { 'attributes' => { 'bold' => true, 'font-size' => 13 }, 'insert' => s3.molecule_name_hash[:label].to_s },
          { 'attributes' => { 'font-size' => 13 }, 'insert' => ' (' },
          { 'attributes' => { 'font-size' => 13, 'bold' => 'true' }, 'insert' => serial },
          { 'attributes' => { 'font-size' => 13 }, 'insert' => ')' }
        ]
      )
      expect(target.send(:products_delta)).to eq(
        [
          { 'insert' => 'Name ' },
          { 'insert' => '{P1|' },
          { 'attributes' => { 'bold' => 'true', 'font-size' => 12 }, 'insert' => '1a' },
          { 'insert' => '}' },
          { 'insert' => ': ' },
          { 'attributes' => { 'bold' => false, 'font-size' => 12 }, 'insert' => s2.molecule_name_hash[:label].to_s },
          { 'insert' => '; ' },
          { 'insert' => 'Formula: ' },
          { 'insert' => 'H' },
          { 'attributes' => { 'script' => 'sub' }, 'insert' => '2' },
          { 'insert' => 'O' },
          { 'insert' => '; ' },
          { 'insert' => 'CAS: - ; ' },
          { 'insert' => 'Molecular Mass: 18.0153; ' },
          { 'insert' => 'Exact Mass: 18.0106; ' },
          { 'insert' => 'EA: ' },
          { 'insert' => 'H, 11.19; O, 88.81' },
          { 'insert' => '.' },
          { 'insert' => "\n" },
          { 'insert' => "Smiles: #{s2.molecule.cano_smiles}" },
          { 'insert' => "\n" },
          { 'insert' => "InChIKey: #{s2.molecule.inchikey}" },
          { 'insert' => "\n" },
          { 'insert' => "\n" },
          { 'insert' => 'Name ' },
          { 'insert' => '{P2|' },
          { 'attributes' => { 'bold' => 'true', 'font-size' => 12 }, 'insert' => '1a' },
          { 'insert' => '}' },
          { 'insert' => ': ' },
          { 'attributes' => { 'bold' => false, 'font-size' => 12 }, 'insert' => s3.molecule_name_hash[:label].to_s },
          { 'insert' => '; ' },
          { 'insert' => 'Formula: ' },
          { 'insert' => 'H' },
          { 'attributes' => { 'script' => 'sub' }, 'insert' => '2' },
          { 'insert' => 'O' },
          { 'insert' => '; ' },
          { 'insert' => 'CAS: - ; ' },
          { 'insert' => 'Molecular Mass: 18.0153; ' },
          { 'insert' => 'Exact Mass: 18.0106; ' },
          { 'insert' => 'EA: ' },
          { 'insert' => 'H, 11.19; O, 88.81' },
          { 'insert' => '.' },
          { 'insert' => "\n" },
          { 'insert' => "Smiles: #{s3.molecule.cano_smiles}" },
          { 'insert' => "\n" },
          { 'insert' => "InChIKey: #{s3.molecule.inchikey}" },
          { 'insert' => "\n" },
          { 'insert' => "\n" }
        ]
      )
      expect(target.send(:synthesis_delta)).to eq(
        [
          { 'insert' => "#{tit}: " },
          { 'insert' => '{A|' },
          { 'attributes' => { 'bold' => 'true', 'font-size' => 12 }, 'insert' => serial },
          { 'insert' => '} ' },
          { 'attributes' => { 'bold' => false, 'font-size' => 12 }, 'insert' => s1.molecule_name_hash[:label].to_s },
          { 'insert' => ' (5.00 g, 278 mmol, 0.880 equiv); ' },
          { 'insert' => '{S1' },
          { 'insert' => '} ' },
          { 'attributes' => { 'bold' => false, 'font-size' => 12 }, 'insert' => s4.preferred_label },
          { 'insert' => ' (56 mL); ' },
          { 'insert' => 'Yield ' },
          { 'insert' => '{P1|' },
          { 'attributes' => { 'bold' => 'true', 'font-size' => 12 }, 'insert' => serial },
          { 'insert' => "} = #{(equiv * 100).to_i}% (0.00 g, 0.00 mmol)" },
          { 'insert' => '; ' },
          { 'insert' => '{P2|' },
          { 'attributes' => { 'bold' => 'true', 'font-size' => 12 }, 'insert' => serial },
          { 'insert' => "} = #{(equiv * 100).to_i}% (0.00 g, 0.00 mmol)" },
          { 'insert' => '.' },
          { 'insert' => "\n" },
          { 'insert' => correct_obsv.to_s },
          { 'insert' => '. ' },
          { 'attributes' => { 'italic' => 'true' }, 'insert' => 'R' },
          { 'attributes' => { 'italic' => 'true', 'script' => 'sub' }, 'insert' => 'f' },
          { 'insert' => " = #{rf} (" },
          { 'insert' => "#{t_sol}" },
          { "insert" => ")." },
          { 'insert' => "\n" },
          { 'attributes' => { 'color' => 'black', 'script' => 'super' }, 'insert' => '-1' },
          { 'insert' => correct_content },
          { 'insert' => '.' },
          { 'insert' => "\n" },
          { 'insert' => "\n" },
          { 'attributes' => { 'bold' => 'true' }, 'insert' => 'Attention! ' },
          { 'insert' => 'The reaction includes the use of dangerous chemicals, ' +
                      "which have the following classification: #{d1}, #{d2}." }
        ]
      )
    end
  end
end
