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

  describe 'composing the SVG' do
    let(:svg) { composer.compose_reaction_svg.gsub(/\s/, '') }
    let(:expected_svg) { File.read(Rails.root.join('spec/fixtures/images/compose_reaction_svg.svg')).gsub(/\s/, '') }

    it 'generates a svg' do
      expect(svg.strip).to eq(expected_svg.strip)
    end

    it 'saves the svg' do
      file_path = composer.send(:file_path)
      composer.compose_reaction_svg_and_save
      expect(File.exist?(file_path)).to eq(true)
    end
  end
end
