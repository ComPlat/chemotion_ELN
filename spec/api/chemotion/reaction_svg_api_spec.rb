# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::ReactionSvgAPI do
  let(:user) { create(:person) }
  let(:warden_instance) { instance_double(WardenAuthentication) }
  let(:paths) { create_list(:sample, 3).filter_map(&:get_svg_path) }

  before do
    allow(WardenAuthentication).to receive(:new).and_return(warden_instance)
    allow(warden_instance).to receive(:current_user).and_return(user)
  end

  def post_svg(steps)
    post '/api/v1/reaction_svg', params: {
      materials_svg_paths: { starting_materials: [], reactants: [], products: [] },
      temperature: '', duration: '', solvents: [], conditions: '', steps: steps
    }, as: :json
  end

  it 'draws one arrow per non-empty step and skips empty ones' do
    steps = [
      { starting_materials: [[paths[0]]], reactants: [[paths[1]]],
        carried: [[paths[2], 0.5]], products: [],
        temperature: '25 C', duration: '2 h', conditions: 'first' },
      { starting_materials: [], reactants: [], carried: [], products: [],
        temperature: '', duration: '', conditions: '' },
    ]

    post_svg(steps)

    expect(response.status).to eq(201).or eq(200)
    svg = JSON.parse(response.body)['reaction_svg']
    expect(svg.scan('<line x1="0" y1="4" x2=').size).to eq(1)
    expect(svg).to include('first')
  end
end
