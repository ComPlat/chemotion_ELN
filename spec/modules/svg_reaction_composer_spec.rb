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
    let(:expected_svg) {
      "<svg version=\"1.1\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" xmlns:cml=\"http://www.xml-cml.org/schema\"\n          width=\"12in\" height=\"3.33in\" viewBox=\"0 0 60 110\">\n        <title>Reaction 1</title><g transform='translate(0, 0)'>        <svg stroke=\"black\" stroke-width=\"1\">\n          <line x1=\"0\" y1=\"50\" x2=\"60\" y2=\"50\" stroke=\"black\"/>\n          <polygon points=\"52,50 50,47 60,50 50,53\"/>\n        </svg>\n</g><g transform='translate(0, 0)'></g><g transform='translate(0, 0)'>        <svg font-family=\"sans-serif\">\n          <text text-anchor=\"middle\" x=\"30\" y=\"65\" font-size=\"9\"></text>\n        </svg>\n</g></svg>"
      }

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
