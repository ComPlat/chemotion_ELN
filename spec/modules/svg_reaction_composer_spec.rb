require 'rails_helper'

RSpec.describe SVG::ReactionComposer do

#  let(:composer) {
#    SVG::ReactionComposer.new({
#      starting_materials: ["AFABGHUZZDYHJO-UHFFFAOYSA-N", "KIWAUQFHKHLABA-AATRIKPKSA-N", "XLYOFNOQVPJJNP-UHFFFAOYSA-N"],
#      reactants:          ["AFABGHUZZDYHJO-UHFFFAOYSA-N", "KIWAUQFHKHLABA-AATRIKPKSA-N", "XLYOFNOQVPJJNP-UHFFFAOYSA-N"],
#      products:           ["AFABGHUZZDYHJO-UHFFFAOYSA-N", "KIWAUQFHKHLABA-AATRIKPKSA-N", "XLYOFNOQVPJJNP-UHFFFAOYSA-N"]
#    })
#  }
  let(:composer) {
    SVG::ReactionComposer.new(
      {
        materials_svg_paths: {
          starting_materials: ["no_image_180.svg"],
          reactants:          ["no_image_180.svg"],
          products:           ["no_image_180.svg"],
        }
      },
      {
        solvents: [],
        temperature: '',
        is_report: false
      }
    )
  }
  describe 'composing the SVG' do

    let(:svg) { composer.compose_reaction_svg }
    let(:expected_svg) { File.read(Rails.root.join("spec/fixtures/images/compose_reaction_svg.svg")) }

    it 'should generate a svg' do
      expect(svg).to eq(expected_svg)
    end

    it 'should save the svg' do
      file_path = composer.send(:file_path)
      composer.compose_reaction_svg_and_save
      expect(File.exist?(file_path)).to eq(true)
    end
  end

end
