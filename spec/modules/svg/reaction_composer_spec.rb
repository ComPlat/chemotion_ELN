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
end
