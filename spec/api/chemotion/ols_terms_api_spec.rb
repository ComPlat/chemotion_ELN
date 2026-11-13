# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::OlsTermsAPI do
  let(:user) { create(:admin) }
  let(:public_directory) { Dir.mktmpdir('bao-ontologies') }

  before do
    FileUtils.mkdir_p(File.join(public_directory, 'ontologies'))
    FileUtils.cp_r(Rails.public_path.join('ontologies_default'), public_directory)
    allow(Rails).to receive(:public_path).and_return(Pathname.new(public_directory))
    allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user) # rubocop:disable RSpec/AnyInstance
  end

  after { FileUtils.remove_entry(public_directory) }

  def response_nodes(nodes = parsed_json_response.fetch('ols_terms'))
    nodes.flat_map { |node| [node] + response_nodes(node.fetch('children', [])) }
  end

  [true, false].each do |edited|
    it "serves the bundled BAO subtree when edited is #{edited} and no instance file exists" do
      get '/api/v1/ols_terms/list', params: { name: 'bao', edited: edited }

      expect(response).to have_http_status(:ok)
      expect(response_nodes.map { |node| node['search'] }).to include('BAO:0002753 | assay method component')
      expect(response_nodes.size).to be > 1000
    end

    it "uses bundled terms when edited is #{edited} and an empty export exists before import" do
      filename = edited ? 'bao.edited.json' : 'bao.json'
      nodes = edited ? [OlsTerm::NODE_RECENTLY_SELECTED] : []
      Rails.public_path.join('ontologies', filename).write({ ols_terms: nodes }.to_json)

      get '/api/v1/ols_terms/list', params: { name: 'bao', edited: edited }

      expect(response).to have_http_status(:ok)
      expect(response_nodes.map { |node| node['search'] })
        .to include('BAO:0002317 | quantum chemistry computational method')
    end
  end

  it 'adds BAO history to the edited list' do
    term = { 'term_id' => 'BAO:0000001', 'title' => 'bioassay', 'value' => ' BAO:0000001 | bioassay' }
    user.profile.update!(data: user.profile.data.merge('bao' => [term]))

    get '/api/v1/ols_terms/list', params: { name: 'bao' }

    expect(parsed_json_response.fetch('ols_terms').first.fetch('children')).to eq([term])
  end

  it 'honors instance files even when all terms have been disabled' do
    OlsTerm.create!(owl_name: 'bao', term_id: 'BAO:0002317', label: 'quantum chemistry', is_enabled: false)
    Rails.public_path.join('ontologies/bao.edited.json').write(
      { ols_terms: [OlsTerm::NODE_RECENTLY_SELECTED] }.to_json,
    )

    get '/api/v1/ols_terms/list', params: { name: 'bao' }

    expect(parsed_json_response.fetch('ols_terms').size).to eq(1)
    expect(parsed_json_response.fetch('ols_terms').first.fetch('children')).to be_empty
  end

  it 'honors a populated instance file even if its terms have not been imported into the database' do
    term = { title: 'instance method', value: 'BAO:0000001 | instance method' }
    Rails.public_path.join('ontologies/bao.edited.json').write({ ols_terms: [term] }.to_json)

    get '/api/v1/ols_terms/list', params: { name: 'bao' }

    expect(parsed_json_response.fetch('ols_terms')).to eq([term.stringify_keys])
  end

  it 'imports BAO through the admin workflow and serves the generated hierarchy' do
    upload = fixture_file_upload(Rails.root.join('spec/fixtures/ontologies/bao.owl'), 'application/rdf+xml')
    post '/api/v1/admin/importOlsTerms', params: { file: upload }

    expect(response).to have_http_status(:no_content)
    get '/api/v1/ols_terms/list', params: { name: 'bao' }
    expect(response_nodes.filter_map { |node| node['term_id'] })
      .to contain_exactly('BAO:0002753', 'BAO:0000001', 'BAO:0000002')
  end

  it 'curates terms only within the selected ontology' do
    bao = OlsTerm.create!(owl_name: 'bao', term_id: 'CHEBI:1', label: 'shared term')
    chmo = OlsTerm.create!(owl_name: 'chmo', term_id: 'CHEBI:1', label: 'shared term')

    post '/api/v1/admin/olsEnableDisable', params: { owl_name: 'bao', disableIds: ['CHEBI:1 | shared term'] }

    expect(response).to have_http_status(:no_content)
    expect(bao.reload.is_enabled).to be(false)
    expect(chmo.reload.is_enabled).to be(true)
  end

  it 'keeps enabled descendants visible when a BAO parent is disabled' do
    parent = OlsTerm.create!(owl_name: 'bao', term_id: 'BAO:0002753', label: 'assay method component')
    child = OlsTerm.create!(owl_name: 'bao', term_id: 'BAO:0000001', label: 'bioassay', parent: parent)

    post '/api/v1/admin/olsEnableDisable',
         params: { owl_name: 'bao', disableIds: ['BAO:0002753 | assay method component'] }
    expect(response).to have_http_status(:no_content)

    get '/api/v1/ols_terms/list', params: { name: 'bao' }
    expect(parsed_json_response.fetch('ols_terms').last.fetch('term_id')).to eq(child.term_id)
    expect(response_nodes.filter_map { |node| node['term_id'] }).not_to include(parent.term_id)
  end
end
