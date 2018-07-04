# frozen_string_literal: true

require 'spec_helper'

shared_examples_for 'Esterification' do
  let(:fixtures_path) { './spec/fixtures/rinchi/esterifica/' }
  let(:rct_01) { File.read(fixtures_path + 'rct_01.mol') }
  let(:rct_02) { File.read(fixtures_path + 'rct_02.mol') }
  let(:prd_01) { File.read(fixtures_path + 'prd_01.mol') }
  let(:prd_02) { File.read(fixtures_path + 'prd_02.mol') }
  let(:agt_01) { File.read(fixtures_path + 'agt_01.mol') }
  let(:correct) { File.readlines(fixtures_path + 'rinchi.txt') }

  let(:sp_rct_01) { create(:sample, molfile: rct_01) }
  let(:sp_rct_02) { create(:sample, molfile: rct_02) }
  let(:sp_prd_01) { create(:sample, molfile: prd_01) }
  let(:sp_prd_02) { create(:sample, molfile: prd_02) }
  let(:sp_agt_01) { create(:sample, molfile: agt_01) }

  let(:reaction) {
    create(
      :reaction, starting_materials: [sp_rct_01, sp_rct_02], solvents: [],
                 reactants: [sp_agt_01], products: [sp_prd_01, sp_prd_02]
    )
  }

  it 'has correct rinchi & rinchi-keys' do
    expect(reaction.rinchi_string).to eq(correct[0].chomp)
    expect(reaction.rinchi_long_key).to eq(correct[1].chomp)
    expect(reaction.rinchi_short_key).to eq(correct[2].chomp)
    expect(reaction.rinchi_web_key).to eq(correct[3].chomp)
  end
end

shared_examples_for '1_reactant_-_no_structure' do
  let(:fixtures_path) { './spec/fixtures/rinchi/1_rct_-_no/' }
  let(:rct_01) { File.read(fixtures_path + 'rct_01.mol') }
  let(:prd_01) { File.read(fixtures_path + 'prd_01.mol') }
  let(:correct) { File.readlines(fixtures_path + 'rinchi.txt') }

  let(:sp_rct_01) { create(:sample, molfile: rct_01) }
  let(:sp_prd_01) { create(:sample, molfile: prd_01) }

  let(:reaction) {
    sp_prd_01.molecule = nil
    create(
      :reaction, starting_materials: [sp_rct_01], solvents: [],
                 reactants: [], products: [sp_prd_01]
    )
  }

  it 'has correct rinchi & rinchi-keys' do
    expect(reaction.rinchi_string).to eq(correct[0].chomp)
    expect(reaction.rinchi_long_key).to eq(correct[1].chomp)
    expect(reaction.rinchi_short_key).to eq(correct[2].chomp)
    expect(reaction.rinchi_web_key).to eq(correct[3].chomp)
  end
end

shared_examples_for 'Inverted_stereochemistry' do
  let(:fixtures_path) { './spec/fixtures/rinchi/inv_stereo/' }
  let(:rct_01) { File.read(fixtures_path + 'rct_01.mol') }
  let(:prd_01) { File.read(fixtures_path + 'prd_01.mol') }
  let(:correct) { File.readlines(fixtures_path + 'rinchi.txt') }

  let(:sp_rct_01) { create(:sample, molfile: rct_01) }
  let(:sp_prd_01) { create(:sample, molfile: prd_01) }

  let(:reaction) {
    create(
      :reaction, starting_materials: [sp_rct_01], solvents: [],
                 reactants: [], products: [sp_prd_01]
    )
  }

  it 'has correct rinchi & rinchi-keys' do
    expect(reaction.rinchi_string).to eq(correct[0].chomp)
    expect(reaction.rinchi_long_key).to eq(correct[1].chomp)
    expect(reaction.rinchi_short_key).to eq(correct[2].chomp)
    expect(reaction.rinchi_web_key).to eq(correct[3].chomp)
  end
end
