# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::ReactionSvgAPI do
  context 'with authorized user logged in' do
    let(:user) { create(:user) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    after(:all) do
      `rm -rf #{Rails.public_path.join('images', 'reactions', 'temp*')}`
      puts "delete reaction svg #{Rails.public_path.join('images', 'reactions', 'temp*')} "
    end

    describe 'POST /api/v1/reaction_svg' do
      let(:temperature) { '37.5 °C' }
      let(:solvent_1) { 'Water' }
      let(:solvent_2) { 'Aceton' }
      let(:test_svg_path) { '/../spec/fixtures/images/molecule.svg' }
      let(:product_yield) { 0.6789 }
      let(:standard_svg) { File.read(Rails.root.join('spec/fixtures/images/reaction.svg')) }
      let(:params) do
        { materials_svg_paths: {  starting_materials: [test_svg_path],
                                  reactants: [test_svg_path],
                                  products: [[test_svg_path, product_yield]] },
          temperature: temperature,
          duration: '12.3 hour',
          solvents: [solvent_1, solvent_2] }
      end

      before do
        post '/api/v1/reaction_svg',
          params: params.to_json,
          headers: {
            'HTTP_ACCEPT' => 'application/json',
            'CONTENT_TYPE' => 'application/json'
          }
      end

      it 'returns svg with correct temperature, duration, solvents' do
        reaction_svg_path = JSON.parse(response.body)['reaction_svg']
        output_svg = File.read(Rails.public_path.join('images', 'reactions', reaction_svg_path))
        expect(output_svg).to include(solvent_1)
        expect(output_svg).to include(solvent_2)
        expect(output_svg).to include(temperature)
        expect(output_svg).to include('12.3 hr')
        expect(output_svg).to include((product_yield * 100).round(0).to_s + '%')
        expect(output_svg.strip).to eq standard_svg.strip
      end
    end
  end
end
