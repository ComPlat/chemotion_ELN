# frozen_string_literal: true

require 'rails_helper'

# rubocop:disable RSpec/MultipleMemoizedHelpers, RSpec/IndexedLet, Style/OpenStructUse
# rubocop:disable RSpec/BeforeAfterAll, RSpec/MultipleExpectations
describe 'Reporter::Docx::DetailReaction' do
  include_context 'reaction report setup'
  let(:svg_fixt_path) { Rails.root.join('spec/fixtures/images/molecule.svg') }
  let(:svg_image_path) { Rails.public_path.join('images/molecules/molecule.svg') }

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
  let(:user) { create(:user) }
  let(:gp)   { create(:group, users: [user]) }
  let(:collection) { create(:collection, user: user) }
  let(:reaction) do
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
                      dangerous_products: dangerous,
                      collections: [collection])
  end
  let(:sample1) do
    create(
      :sample,
      name: 'Sample 1',
      real_amount_value: 5.0,
      real_amount_unit: 'g',
      metrics: 'nmm',
      collections: [collection],
    )
  end
  let(:sample2) { create(:sample, name: 'Sample 2', collections: [collection]) }
  let(:sample3) { create(:sample, name: 'Sample 3', collections: [collection]) }
  let(:sample4) { create(:sample, name: 'Solvent', collections: [collection]) }
  let(:correct_content) { 'analysis contents (true for report)' }
  let(:non_breaking_space) { ' ' }
  let(:inverse) { '{"attributes":{"color":"black","script":"super"},"insert":"-1"}' }
  let(:reaction_serialized) do
    create(:reactions_starting_material_sample, reaction: reaction, sample: sample1, equivalent: equiv)
    create(:reactions_product_sample, reaction: reaction, sample: sample2, equivalent: equiv, position: 1)
    create(:reactions_product_sample, reaction: reaction, sample: sample3, equivalent: equiv, position: 2)
    create(:reactions_solvent_sample, reaction: reaction, sample: sample4, equivalent: equiv)
    reaction.reload
    con = reaction.products[0].container.children[0].children[0]
    con.extended_metadata['report'] = true
    con.extended_metadata['content'] = "{\"ops\":
      [
        {\"insert\": \"  \\n\"},
        #{inverse},
        {\"insert\": \"#{correct_content} #{non_breaking_space} \"},
        {\"insert\": \" #{non_breaking_space} ;#{non_breaking_space} \\n\"}
      ]
    }"
    con.save!

    Entities::ReactionReportEntity.represent(
      reaction,
      current_user: build(:user),
      detail_levels: ElementDetailLevelCalculator.new(user: user, element: reaction).detail_levels,
    ).serializable_hash
  end
  let(:serial) { '1a' }
  let(:mol_serials) do
    mol = sample1.molecule
    mol2 = sample2.molecule
    mol3 = sample3.molecule
    [
      {
        'mol' => {
          'id' => mol.id,
          'svgPath' => mol.molecule_svg_file,
          'sumFormula' => mol.sum_formular,
          'iupacName' => mol.iupac_name,
        },
        'value' => serial,
      },
      {
        'mol' => {
          'id' => mol2.id,
          'svgPath' => mol2.molecule_svg_file,
          'sumFormula' => mol2.sum_formular,
          'iupacName' => mol2.iupac_name,
        },
        'value' => serial,
      },
      {
        'mol' => {
          'id' => mol3.id,
          'svgPath' => mol3.molecule_svg_file,
          'sumFormula' => mol3.sum_formular,
          'iupacName' => mol3.iupac_name,
        },
        'value' => serial,
      },
    ]
  end
  let(:target) do
    Reporter::Docx::DetailReaction.new(
      reaction: OpenStruct.new(reaction_serialized),
      mol_serials: mol_serials,
      index: prev_index,
      si_rxn_settings: all_si_rxn_settings,
    )
  end

  before do
    `ln -s #{svg_fixt_path} #{Rails.public_path.join('images/molecules')} ` unless File.exist?(svg_image_path)
  end

  after(:all) do
    fp = Rails.public_path.join('images/molecules/molecule.svg')
    FileUtils.rm(fp, force: true)
  end

  describe '.content' do
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
      expect(content[:solvents]).to eq("#{sample4.preferred_label} (55.5ml)")
      expect(content[:description]).to eq(
        Sablon.content(:html, Reporter::Delta.new(des).getHTML),
      )
      expect(content[:observation]).to eq(
        Sablon.content(:html, Reporter::Delta.new(obs).getHTML),
      )
      expect(content[:tlc_rf]).to eq(rf)
      expect(content[:tlc_solvent]).to eq(t_sol)
      expect(content[:tlc_description]).to eq(t_des)
      expect(content[:short_label]).to eq(reaction.short_label)
      # expect(content[:products_html].class).to eq(Sablon::Content::HTML)
      # expect(content[:synthesis_html].class).to eq(Sablon::Content::HTML)

      pur.tr('{}', '').split(',').each do |p|
        expect(content[:purification]).to include(p)
      end
    end
  end

  describe 'private methods' do
    it 'has correct data' do
      expect(target.send(:title)).to eq(tit)
      expect(target.send(:gp_title_delta)).to eq(
        [
          { 'attributes' => { 'font-size' => 13 }, 'insert' => "3.#{prev_index + 1} " },
          { 'attributes' => { 'font-size' => 13 }, 'insert' => "#{tit} " },
          { 'attributes' => { 'font-size' => 13 }, 'insert' => "(#{reaction.short_label})" },
        ],
      )
      expect(target.send(:synthesis_title_delta)).to eq(
        [
          { 'attributes' => { 'bold' => true, 'font-size' => 13 },
            'insert' => sample2.molecule_name_hash[:label].to_s },
          { 'attributes' => { 'font-size' => 13 }, 'insert' => ' (' },
          { 'attributes' => { 'font-size' => 13, 'bold' => 'true' }, 'insert' => serial },
          { 'attributes' => { 'font-size' => 13 }, 'insert' => ')' },
          { 'attributes' => { 'font-size' => 13 }, 'insert' => ', ' },
          { 'attributes' => { 'bold' => true, 'font-size' => 13 },
            'insert' => sample3.molecule_name_hash[:label].to_s },
          { 'attributes' => { 'font-size' => 13 }, 'insert' => ' (' },
          { 'attributes' => { 'font-size' => 13, 'bold' => 'true' }, 'insert' => serial },
          { 'attributes' => { 'font-size' => 13 }, 'insert' => ')' },
        ],
      )
      expect(target.send(:products_delta)).to eq(
        [
          { 'insert' => 'Name ' },
          { 'insert' => '{P1|' },
          { 'attributes' => { 'bold' => 'true', 'font-size' => 12 }, 'insert' => '1a' },
          { 'insert' => '}' },
          { 'insert' => ': ' },
          { 'attributes' => { 'bold' => false, 'font-size' => 12 },
            'insert' => sample2.molecule_name_hash[:label].to_s },
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
          { 'insert' => "Smiles: #{sample2.molecule.cano_smiles}" },
          { 'insert' => "\n" },
          { 'insert' => "InChIKey: #{sample2.molecule.inchikey}" },
          { 'insert' => "\n" },
          { 'insert' => "\n" },
          { 'insert' => 'Name ' },
          { 'insert' => '{P2|' },
          { 'attributes' => { 'bold' => 'true', 'font-size' => 12 }, 'insert' => '1a' },
          { 'insert' => '}' },
          { 'insert' => ': ' },
          { 'attributes' => { 'bold' => false, 'font-size' => 12 },
            'insert' => sample3.molecule_name_hash[:label].to_s },
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
          { 'insert' => "Smiles: #{sample3.molecule.cano_smiles}" },
          { 'insert' => "\n" },
          { 'insert' => "InChIKey: #{sample3.molecule.inchikey}" },
          { 'insert' => "\n" },
          { 'insert' => "\n" },
        ],
      )
      expect(target.send(:synthesis_delta)).to eq(
        [
          { 'insert' => "#{tit}: " },
          { 'insert' => "\n" },
          { 'insert' => 'correct description' },
          { 'insert' => "\n" },
          { 'insert' => '{A|' },
          { 'attributes' => { 'bold' => 'true', 'font-size' => 12 }, 'insert' => serial },
          { 'insert' => '} ' },
          { 'attributes' => { 'bold' => false, 'font-size' => 12 },
            'insert' => sample1.molecule_name_hash[:label].to_s },
          { 'insert' => ' (5.00 g, 278 mmol, 0.880 equiv); ' },
          { 'insert' => '{S1' },
          { 'insert' => '} ' },
          { 'attributes' => { 'bold' => false, 'font-size' => 12 }, 'insert' => sample4.preferred_label },
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
          { 'insert' => t_sol.to_s },
          { 'insert' => ').' },
          { 'insert' => "\n" },
          { 'attributes' => { 'color' => 'black', 'script' => 'super' }, 'insert' => '-1' },
          { 'insert' => correct_content },
          { 'insert' => '.' },
          { 'insert' => "\n" },
          { 'insert' => "\n" },
          { 'attributes' => { 'bold' => 'true' }, 'insert' => 'Attention! ' },
          { 'insert' => 'The reaction includes the use of dangerous chemicals, ' \
                        "which have the following classification: #{d1}, #{d2}." },
        ],
      )
    end

    context 'when calculating_amount_mmol' do
      let(:valid_vessel_size) { { 'amount' => 10, 'unit' => 'ml' } }
      let!(:reaction_with_valid_vessel_size) { create(:reaction, vessel_size: valid_vessel_size) }
      let!(:first_serialized_reaction) { create_reaction_report(reaction_with_valid_vessel_size, sample3) }
      let(:invalid_vessel_size) { { 'amount' => nil, 'unit' => nil } }
      let!(:reaction_with_nil_vessel_size) { create(:reaction, vessel_size: invalid_vessel_size) }
      let!(:second_serialized_reaction) { create_reaction_report(reaction_with_nil_vessel_size, sample3) }
      let!(:report_one) do
        Reporter::Docx::DetailReaction.new(
          reaction: OpenStruct.new(first_serialized_reaction),
          mol_serials: mol_serials,
          index: prev_index,
          si_rxn_settings: all_si_rxn_settings,
        )
      end
      let!(:report_two) do
        Reporter::Docx::DetailReaction.new(
          reaction: OpenStruct.new(second_serialized_reaction),
          mol_serials: mol_serials,
          index: prev_index,
          si_rxn_settings: all_si_rxn_settings,
        )
      end

      it 'calculates amount in mmol for a product material of type gas' do
        expect(report_one.content[:products][0][:mol]).to eq('3.58')
      end

      it 'calculates amount in mmol of a product material of type gas for a reaction with nil values of vessel size' do
        expect(report_two.content[:products][0][:mol]).to eq('0.00')
      end
    end
  end
end
# rubocop:enable RSpec/BeforeAfterAll, RSpec/MultipleExpectations
# rubocop:enable RSpec/MultipleMemoizedHelpers, RSpec/IndexedLet, Style/OpenStructUse
