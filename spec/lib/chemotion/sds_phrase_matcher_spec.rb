# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::SdsPhraseMatcher do
  def codes(*lines)
    described_class.match(lines)[:codes]
  end

  it 'matches US spelling against the British catalogue wording' do
    expect(codes('Highly flammable liquid and vapor')).to eq(%w[H225])
  end

  it 'keeps a near neighbour apart by its severity word', :aggregate_failures do
    expect(codes('Flammable liquid and vapor')).to eq(%w[H226])
    expect(codes('Causes serious eye irritation')).to eq(%w[H319])
    expect(codes('Toxic if swallowed')).to eq(%w[H301])
    expect(codes('Causes eye irritation')).to eq(%w[H320])
  end

  it 'tells the acute toxicity, reproductive and target organ categories apart', :aggregate_failures do
    expect(codes('Fatal if swallowed', 'Harmful if swallowed', 'May be harmful if swallowed'))
      .to eq(%w[H300 H302 H303])
    expect(codes('May damage fertility or the unborn child')).to eq(%w[H360])
    expect(codes('Suspected of damaging fertility or the unborn child')).to eq(%w[H361])
    expect(codes('May cause damage to organs')).to eq(%w[H371])
    expect(codes('May cause damage to organs through prolonged or repeated exposure')).to eq(%w[H373])
    expect(codes('Immediately call a POISON CENTER or doctor/physician')).to eq(%w[P310])
    expect(codes('Call a POISON CENTER or doctor/physician')).to eq(%w[P311])
  end

  it 'keeps a mild irritant apart from an irritant' do
    expect(codes('Causes mild skin irritation')).to eq(%w[H316])
  end

  it 'matches nothing to a negated statement, placeholder or not', :aggregate_failures do
    expect(codes('Does not cause skin irritation')).to be_empty
    expect(codes('Do not use water to extinguish')).to be_empty
    expect(codes('In case of fire: Do not use water jet to extinguish')).to be_empty
    expect(codes('Do not wash hands after handling')).to be_empty
    expect(codes('Never wear protective gloves')).to be_empty
    expect(codes('Do not wear respiratory protection')).to be_empty
  end

  it 'still matches a catalogue statement that carries its own negation' do
    expect(codes('IF SWALLOWED: Rinse mouth. Do NOT induce vomiting')).to eq(%w[P301+P330+P331])
  end

  it 'refuses a block too long to be a label block', :aggregate_failures do
    lines = Array.new(described_class::MAX_FRAGMENTS + 1) { 'Highly flammable liquid and vapor' }
    result = described_class.match(lines)
    expect(result[:codes]).to be_empty
    expect(result[:refused]).to include(described_class::MAX_FRAGMENTS.to_s)
  end

  it 'leaves a statement with no catalogue code unmatched rather than taking the nearest one', :aggregate_failures do
    result = described_class.match(['May form combustible dust concentrations in air'])
    expect(result[:codes]).to be_empty
    expect(result[:unmatched]).to eq(['May form combustible dust concentrations in air'])
  end

  it 'ignores a combination whose part the catalogue has deleted' do
    expect(codes('IF exposed: Call a POISON CENTER or doctor')).to eq(%w[P308+P311])
  end

  it 'reads a combined statement as its combined code', :aggregate_failures do
    expect(codes('Toxic if swallowed, in contact with skin or if inhaled')).to eq(%w[H301+H311+H331])
    expect(codes('IF IN EYES: Rinse cautiously with water for several minutes. Remove contact lenses, ' \
                 'if present and easy to do. Continue rinsing')).to eq(%w[P305+P351+P338])
  end

  it 'lets a catalogue placeholder take the words the sheet fills in', :aggregate_failures do
    expect(codes('In case of fire: Use CO2, dry chemical, or foam to extinguish')).to eq(%w[P370+P378])
    expect(codes('Dispose of contents/container to an approved waste disposal plant')).to eq(%w[P501])
  end

  it 'prefers the entry that accounts for more of the words over a shorter one with a placeholder',
     :aggregate_failures do
    expect(codes('Call a POISON CENTER or doctor if you feel unwell')).to eq(%w[P312])
    expect(codes('Causes damage to organs through prolonged or repeated exposure')).to eq(%w[H372])
  end

  it 'matches the spillage statement of a corrosive to metals' do
    expect(codes('Absorb spillage to prevent material damage')).to eq(%w[P390])
  end

  it 'reads the US wording of a statement the EU text words differently' do
    expect(codes('Take action to prevent static discharges', 'Wear protective gloves')).to eq(%w[P243 P280])
  end

  it 'takes the organs a target organ statement names' do
    expect(codes('Causes damage to organs (Eyes, Central nervous system).')).to eq(%w[H370])
  end

  it 'joins a statement wrapped over two lines' do
    expect(codes('Keep away from heat, hot surfaces, sparks, open flames and other', 'ignition sources. No smoking'))
      .to eq(%w[P210])
  end

  it 'skips sub-headings, page furniture and a Sigma row label', :aggregate_failures do
    result = described_class.match(['Precautionary Statements', 'Prevention', '_' * 40, 'Page  1 / 9',
                                    'Aniline        Revision Date  19-Dec-2025',
                                    'Hazard statements        :   Flammable liquid and vapour.'])
    expect(result[:codes]).to eq(%w[H226])
    expect(result[:unmatched]).to be_empty
  end

  it 'skips a running header that wraps or holds a sentence break', :aggregate_failures do
    result = described_class.match(['Causes skin irritation', 'Page   1 / 10',
                                    'Hydrobromic acid, ca. 48%        Revision Date  18-Dec-2025',
                                    'Hydrogen bromide in glacial acetic        Revision Date  18-Dec-2025',
                                    'acid', '_' * 40, 'Causes serious eye irritation'])
    expect(result[:codes]).to eq(%w[H315 H319])
    expect(result[:unmatched]).to be_empty
  end

  it 'keeps a statement that follows a running header without a rule' do
    expect(codes('Aniline        Revision Date  19-Dec-2025', 'Causes skin irritation')).to eq(%w[H315])
  end

  it 'reports the score of each match' do
    expect(described_class.match(['Use non-sparking tools'])[:matched])
      .to eq([{ 'text' => 'Use non-sparking tools', 'code' => 'P242', 'score' => 0.89 }])
  end

  it 'files a duplicated wording under the combined code' do
    expect(codes('IF SWALLOWED: Immediately call a POISON CENTER or doctor')).to eq(%w[P301+P310])
  end

  it 'caps the unmatched statements it reports' do
    lines = Array.new(30) { |index| "Unrelated sentence number #{index}" }
    expect(described_class.match(lines)[:unmatched].length).to eq(described_class::MAX_UNMATCHED_REPORTED)
  end

  it 'returns nothing for no lines', :aggregate_failures do
    result = described_class.match([])
    expect(result[:codes]).to be_empty
    expect(result[:unmatched]).to be_empty
  end

  describe '.tokenize' do
    it 'drops filler words, folds spelling and plurals, and lowercases' do
      expect(described_class.tokenize('Avoid breathing the Vapours or fumes')).to eq(%w[avoid breathing vapor fume])
    end

    it 'turns a catalogue placeholder into one wildcard', :aggregate_failures do
      expect(described_class.tokenize('Use … to extinguish. [As modified by IV ATP]', catalogue: true))
        .to eq(['use', described_class::WILDCARD, 'to', 'extinguish'])
      expect(described_class.tokenize('Wash … [… with soap]', catalogue: true))
        .to eq(['wash', described_class::WILDCARD])
    end

    it 'leaves ellipses in sheet text as plain punctuation' do
      expect(described_class.tokenize('Use … to extinguish')).to eq(%w[use to extinguish])
    end
  end

  describe 'with a catalogue of its own' do
    def entry(code, text)
      tokens = described_class.tokenize(text, catalogue: true)
      described_class::Entry.new(code: code, words: tokens - [described_class::WILDCARD],
                                 wildcards: tokens.count(described_class::WILDCARD))
    end

    let(:matcher) do
      described_class.new([entry('P900', 'Keep the lid on the drum.'), entry('P901', 'Keep the lid on the drum.'),
                           entry('P902', 'Rinse the drum.')])
    end

    it 'reports a statement two codes tie on, and matches neither', :aggregate_failures do
      result = matcher.match(['Keep the lid on the drum'])
      expect(result[:codes]).to be_empty
      expect(result[:ambiguous]).to eq(['Keep the lid on the drum'])
    end

    it 'does not report a tie the final cover did not use', :aggregate_failures do
      result = matcher.match(['Rinse the drum'])
      expect(result[:codes]).to eq(%w[P902])
      expect(result[:ambiguous]).to be_empty
    end
  end

  describe '.catalog' do
    let(:codes) { described_class.catalog.map(&:code) }

    it 'leaves out deleted entries and combinations with a deleted part', :aggregate_failures do
      expect(codes).not_to include('P281', 'P307+P311', 'P309+P311')
      expect(codes).to include('P308+P311')
    end

    it 'adds the US variants under codes the catalogue knows' do
      expect(codes.count('P243')).to eq(2)
    end
  end
end
