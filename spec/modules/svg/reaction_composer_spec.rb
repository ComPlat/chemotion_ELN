# frozen_string_literal: true

require 'rails_helper'

RSpec.describe SVG::ReactionComposer do
  #  let(:composer) {
  #    SVG::ReactionComposer.new({
  #      starting_materials: ["AFABGHUZZDYHJO-UHFFFAOYSA-N", "KIWAUQFHKHLABA-AATRIKPKSA-N", "XLYOFNOQVPJJNP-UHFFFAOYSA-N"],
  #      reactants:          ["AFABGHUZZDYHJO-UHFFFAOYSA-N", "KIWAUQFHKHLABA-AATRIKPKSA-N", "XLYOFNOQVPJJNP-UHFFFAOYSA-N"],
  #      products:           ["AFABGHUZZDYHJO-UHFFFAOYSA-N", "KIWAUQFHKHLABA-AATRIKPKSA-N", "XLYOFNOQVPJJNP-UHFFFAOYSA-N"]
  #    })
  #  }
  let(:composer) do
    described_class.new(
      {
        materials_svg_paths: {
          starting_materials: ['no_image_180.svg'],
          reactants: ['no_image_180.svg'],
          products: ['no_image_180.svg']
        }
      },
      solvents: [],
      temperature: '',
      is_report: false
    )
  end
  let(:file_path) { composer.send(:file_path) }

  describe '#temperature_duration_it' do
    subject(:duration_svg) { duration_composer.send(:temperature_duration_it) }

    let(:duration_composer) do
      described_class.new(
        {
          starting_materials: [],
          reactants: [],
          products: [],
        },
        solvents: [],
        temperature: temperature,
        duration: duration,
        is_report: false,
      )
    end
    let(:temperature) { '' }

    context 'with a valid duration' do
      let(:duration) { '12.3 Hour(s)' }

      it 'renders the shortened duration unit' do
        expect(duration_svg).to include('12.3 h')
      end
    end

    context 'with an invalid duration containing repeated zeroes' do
      let(:duration) { "#{'0' * 10_000}x Hour(s)" }
      let(:temperature) { '25 C' }

      it 'ignores the duration without backtracking through it' do
        expect(duration_svg).to include('25 C')
        expect(duration_svg).not_to include('Hour')
      end
    end
  end

  describe 'composing the SVG' do
    let(:svg) { composer.compose_reaction_svg }
    let(:expected_svg) { File.read(Rails.root.join('spec/fixtures/images/compose_reaction_svg.svg')) }

    it 'generates a svg' do
      expect(svg.strip).to eq(expected_svg.strip)
    end

    it 'saves the svg' do
      expect(composer.compose_reaction_svg_and_save && File.exist?(file_path)).to eq(true)
    end
  end

  describe 'numbered steps of a standard reaction with hidden steps' do
    it 'does not count the step labels as reactants when sizing the text' do
      numbered = described_class.new(
        { reactants: %w[a.svg b.svg] },
        solvents: [], temperature: '', numbered_steps: true,
        steps: [{ reactants: [['a.svg']] }, { reactants: [['b.svg']] }]
      )

      expect(numbered.num_reactants).to eq(2)
    end

    it 'spaces the lines under the arrow by the text size so they never overlap' do
      busy = described_class.new(
        { reactants: Array.new(30) { |i| "r#{i}.svg" } },
        solvents: [], temperature: '', conditions: "first line\nsecond line",
      )
      ys = busy.send(:conditions_it).scan(/y="(\d+)"/).flatten.map(&:to_i)

      expect(ys[1] - ys[0]).to be >= busy.word_size
    end

    it 'shows reactants and solvents that have no step yet with step 1' do
      numbered = described_class.new(
        { reactants: %w[step_one.svg added_later.svg] },
        solvents: %w[THF Water],
        temperature: '',
        numbered_steps: true,
        steps: [
          { reactants: [['step_one.svg']], solvents: ['THF'] },
          { reactants: [], solvents: [], conditions: 'UV' },
        ],
      )

      expect(numbered.reactants).to eq(['step_label/1', ['step_one.svg'], 'added_later.svg'])
      expect(numbered.send(:numbered_step_lines)).to eq(['1. THF, Water', '2. UV'])
    end
  end

  describe 'parts switched off on the arrow' do
    let(:options) do
      { solvents: %w[THF], temperature: '80 °C', duration: '2 Hour(s)', conditions: 'UV' }
    end

    it 'leaves out the hidden parts of a plain reaction' do
      plain = described_class.new({ starting_materials: %w[s.svg], reactants: %w[r.svg] },
                                  **options, hide: %w[reactants temperature solvents])

      expect([plain.reactants, plain.solvents, plain.temperature, plain.duration, plain.conditions])
        .to eq([[], [], nil, nil, 'UV'])
    end

    it 'leaves out the hidden parts of every numbered step' do
      numbered = described_class.new(
        { reactants: %w[a.svg] }, **options, numbered_steps: true, hide: %w[reactants solvents],
                                             steps: [{ reactants: [['a.svg']], solvents: ['THF'], conditions: 'UV' }]
      )

      expect(numbered.reactants).to eq([])
      expect(numbered.send(:numbered_step_lines)).to eq(['1. UV'])
    end
  end
end
