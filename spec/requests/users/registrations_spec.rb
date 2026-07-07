# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'User registration affiliation routing', type: :request do
  let(:base_params) do
    {
      first_name: 'New', last_name: 'Bie',
      password: 'testtest123', password_confirmation: 'testtest123'
    }
  end

  it 'files a pending suggestion when the organization is not in the registry', :aggregate_failures do
    expect do
      post user_registration_path, params: { user: base_params.merge(
        email: 'newbie@example.com', name_abbreviation: 'nb1',
        affiliations_attributes: { '0' => { organization: 'Totally New Institute', country: 'Germany' } }
      ) }
    end.to change(AffiliationSuggestion, :count).by(1)

    user = User.find_by(email: 'newbie@example.com')
    expect(user.affiliations).to be_empty
    expect(AffiliationSuggestion.last.organization).to eq('Totally New Institute')
  end

  it 'drops a country that is not on the ISO list', :aggregate_failures do
    post user_registration_path, params: { user: base_params.merge(
      email: 'madeup@example.com', name_abbreviation: 'mu1',
      affiliations_attributes: { '0' => { organization: 'Some New Lab', country: 'Middle Earth' } }
    ) }

    expect(AffiliationSuggestion.last.organization).to eq('Some New Lab')
    expect(AffiliationSuggestion.last.country).to be_nil
  end

  it 'attaches an existing registry organization without a suggestion', :aggregate_failures do
    Affiliation.create!(organization: 'KIT', country: 'Germany')

    expect do
      post user_registration_path, params: { user: base_params.merge(
        email: 'kit@example.com', name_abbreviation: 'kt1',
        affiliations_attributes: { '0' => { organization: 'KIT', country: 'Germany' } }
      ) }
    end.not_to change(AffiliationSuggestion, :count)

    expect(User.find_by(email: 'kit@example.com').affiliations.map(&:organization)).to include('KIT')
  end
end
