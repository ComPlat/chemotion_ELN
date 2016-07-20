require 'rails_helper'

describe Chemotion::ReactionSvgAPI do
  context 'authorized user logged in' do
    let(:user) { create(:user) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'POST /api/v1/reaction_svg' do
      let(:temperature) { "37.5 °C" }
      let(:solvent_1) { "Water" }
      let(:solvent_2) { "Aceton" }
      let(:test_svg_path) { "/../spec/fixtures/images/molecule.svg"}
      let(:standard_svg) { File.read(Rails.root.join("spec/fixtures/images/reaction.svg")) }
      let(:params) {
        { materials_svg_paths: {  starting_materials: [test_svg_path],
                                  reactants: [test_svg_path],
                                  products: [test_svg_path] },
          temperature: temperature,
          solvents: [solvent_1, solvent_2]
        }
      }

      before do
        post "/api/v1/reaction_svg", params, :format => 'json'
      end

      it 'returns svg with correct temperatrue, solvents & svg' do
        reaction_svg_path = JSON.parse(response.body)['reaction_svg']
        output_svg = File.read(Rails.root.join("public", "images", "reactions", reaction_svg_path))

        expect(output_svg).to include(solvent_1)
        expect(output_svg).to include(solvent_2)
        expect(output_svg).to include(temperature)
        expect(output_svg).to eq standard_svg
      end
    end
  end
end
