# frozen_string_literal: true

require 'rails_helper'

describe InventoryIntegration::SchemaValidator do
  let(:validator) do
    described_class.new(
      'type' => 'object',
      'required' => %w[name],
      'additionalProperties' => false,
      'properties' => {
        'name' => { 'type' => 'string', 'maxLength' => 5 },
        'count' => { 'type' => 'integer', 'minimum' => 1 },
        'tags' => { 'type' => 'array', 'uniqueItems' => true, 'items' => { '$ref' => '#/definitions/tag' } },
        'day' => { 'type' => 'string', 'format' => 'date' },
        'either' => { 'anyOf' => [{ 'type' => 'integer' }, { 'enum' => %w[none] }] },
      },
      'definitions' => { 'tag' => { 'type' => 'string', 'pattern' => '^[a-z]+$' } },
    )
  end

  def keywords(data)
    validator.validate(data).map(&:keyword)
  end

  it 'accepts valid data' do
    expect(validator.validate('name' => 'abc', 'count' => 2, 'tags' => %w[a b], 'day' => '2026-10-23',
                              'either' => 'none')).to be_empty
  end

  it 'reports each kind of failure with its path' do
    failures = validator.validate('count' => 0, 'tags' => %w[a a 1], 'day' => '23.10.2026', 'extra' => 1)
    expect(failures.map { |f| [f.path, f.keyword] }).to contain_exactly(
      %w[/name required], %w[/count minimum], %w[/tags uniqueItems], %w[/tags/2 pattern],
      %w[/day format], %w[/extra additionalProperties]
    )
  end

  it 'checks types, lengths and alternatives' do
    expect(keywords('name' => 'too long')).to eq %w[max]
    expect(keywords('name' => 'a', 'count' => 1.5)).to eq %w[type]
    expect(keywords('name' => 'a', 'either' => 'some')).to eq %w[anyOf]
  end

  it 'refuses a schema with a keyword it cannot check' do
    expect { described_class.new('type' => 'object', 'oneOf' => []) }.to raise_error(ArgumentError, /oneOf/)
    expect { described_class.new('type' => 'string', 'format' => 'email') }.to raise_error(ArgumentError, /email/)
  end
end
