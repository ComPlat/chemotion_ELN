# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ChemrepoIdJob do
  let(:url) { 'https://repo.example.org' }
  let!(:sample) { create(:sample) }
  let(:molecule) { sample.molecule }
  let(:taggable_data) { molecule.tag.reload.taggable_data }

  before do
    molecule.tag.update_columns(taggable_data: (molecule.tag.taggable_data || {}).except('chemrepo_id')) # rubocop:disable Rails/SkipsModelValidations
    stub_request(:get, "#{url}/api/v1/public/ping").to_return(status: 200)
    stub_request(:post, "#{url}/api/v1/public/search")
      .to_return(status: 200, body: { molecule_id: molecule_id }.to_json)
    described_class.new.perform(url)
  end

  context 'when the repository returns an integer id' do
    let(:molecule_id) { 42 }

    it 'stores the chemrepo id in the molecule tag' do
      expect(taggable_data['chemrepo_id']).to eq 42
    end
  end

  context 'when the repository returns something other than an integer' do
    let(:molecule_id) { '1abc' }

    it 'leaves the molecule tag untouched' do
      expect(molecule.tag.reload.taggable_type).to eq 'Molecule'
      expect(taggable_data).not_to have_key('chemrepo_id')
    end
  end
end
