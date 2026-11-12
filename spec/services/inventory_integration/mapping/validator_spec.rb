# frozen_string_literal: true

require 'rails_helper'

describe InventoryIntegration::Mapping::Validator do
  let(:mapping) { JSON.parse(Rails.root.join('spec/fixtures/inventory_integration/mapping/example.json').read) }
  let(:settings) { JSON.parse(Rails.root.join('spec/fixtures/inventory_integration/mapping/rest_example.json').read) }

  def codes(mapping:, request_settings: nil)
    described_class.new(mapping: mapping, request_settings: request_settings).errors.map(&:code)
  end

  it 'accepts the example profile and request settings' do
    expect(described_class.new(mapping: mapping, request_settings: settings)).to be_valid
  end

  it 'rejects an unknown transform' do
    mapping['fields']['substance.name']['transform'] = ['shout']
    expect(codes(mapping: mapping)).to eq %w[mapping.invalid]
  end

  it 'rejects a regular expression in split' do
    mapping['fields']['substance.name']['transform'] = [{ 'split' => { 'regex' => '\s+' } }]
    expect(codes(mapping: mapping)).to eq %w[mapping.invalid]
  end

  it 'rejects a writable field that cannot be derived backwards' do
    mapping['reverse'] = {}
    expect(codes(mapping: mapping)).to eq %w[mapping.not_reversible]
  end

  it 'rejects targets outside the contract and values outside its vocabularies' do
    mapping['fields']['substance.colour'] = { 'from' => 'colour' }
    mapping['fields']['quantity.remaining.unit']['map'] = { 'KG' => 'KG' }
    expect(codes(mapping: mapping)).to contain_exactly('mapping.unknown_target', 'mapping.vocabulary')
  end

  it 'requires a substance name or CAS number' do
    mapping['fields'].except!('substance.name', 'substance.cas')
    expect(codes(mapping: mapping)).to eq %w[mapping.required_missing]
  end

  it 'rejects an absolute or protocol-relative list path' do
    expect(codes(mapping: mapping, request_settings: settings.deep_merge('list' => { 'path' => 'https://x.org/a' })))
      .to eq %w[mapping.invalid]
    expect(codes(mapping: mapping, request_settings: settings.deep_merge('list' => { 'path' => '//x.org/a' })))
      .to eq %w[mapping.template_invalid]
  end

  it 'offers no secret in the URL path to generic connections' do
    request_settings = settings.merge('auth' => { 'type' => 'path', 'secret' => 'api_key' })
    expect(codes(mapping: mapping, request_settings: request_settings)).to eq %w[mapping.invalid]
  end

  it 'checks templates, auth parameters and pagination parameters' do
    request_settings = settings.deep_merge('list' => { 'query' => { 'x' => '{{ENV.SECRET}}' } },
                                           'auth' => { 'type' => 'header', 'secret' => 'api_key' },
                                           'pagination' => { 'style' => 'offset' })
    expect(codes(mapping: mapping, request_settings: request_settings))
      .to contain_exactly('mapping.template_invalid', 'mapping.auth_incomplete', 'mapping.pagination_incomplete')
  end
end
