# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Versioning::Serializers::ReactionSerializer do
  let(:user) { create(:user) }

  def field_changes(reaction, field)
    reaction_with_log_data = Reaction.with_log_data.find(reaction.id)
    described_class.call(reaction_with_log_data)
                   .flat_map { |entry| entry[:changes][field.to_s] }
                   .compact
  end

  # A Quill editor that nobody typed into still autosaves {"ops":[{"insert":"\n"}]} - visually
  # empty, but not the same value as the nil description/observation start out as.
  it 'does not surface a diff when description autosaves its empty-delta placeholder' do
    reaction = create(:reaction, description: nil)
    as_request { reaction.update!(description: { 'ops' => [{ 'insert' => "\n" }] }) }

    expect(field_changes(reaction, :description)).to be_empty
  end

  it 'does not surface a diff when observation autosaves its empty-delta placeholder' do
    reaction = create(:reaction, observation: nil)
    as_request { reaction.update!(observation: { 'ops' => [{ 'insert' => "\n" }] }) }

    expect(field_changes(reaction, :observation)).to be_empty
  end

  it 'still surfaces a diff for a real description change' do
    reaction = create(:reaction, description: { 'ops' => [{ 'insert' => 'first' }] })
    as_request { reaction.update!(description: { 'ops' => [{ 'insert' => 'second' }] }) }

    changes = field_changes(reaction, :description)
    # [creation (blank -> first), first -> second]
    expect(changes.size).to eq 2
    expect(changes.last[:old_value]).to eq({ 'ops' => [{ 'insert' => 'first' }] })
    expect(changes.last[:new_value]).to eq({ 'ops' => [{ 'insert' => 'second' }] })
  end

  it 'reverts a description to the stored delta, not to its normalized display value' do
    blank = { 'ops' => [{ 'insert' => "\n" }] }
    reaction = create(:reaction, description: blank)
    as_request { reaction.update!(description: { 'ops' => [{ 'insert' => 'typed' }] }) }

    change = field_changes(reaction, :description).last
    expect(change[:old_value]).to eq({})
    expect(change[:revertible_value]).to eq blank
  end

  it 'keeps a nested removal when the same request edited that value first' do
    temperature = { 'value' => 20, 'unit' => '°C' }
    variation = { 'uuid' => 'a', 'properties' => { 'temperature' => temperature, 'duration' => { 'value' => 1 } } }
    reaction = create(:reaction, variations: [variation])
    as_request do
      reaction.update!(variations: [variation.deep_merge('properties' => { 'temperature' => { 'value' => 25 } })])
      reaction.update!(variations: [variation.merge('properties' => { 'duration' => { 'value' => 1 } })])
    end

    change = field_changes(reaction, :variations).last
    expect(change[:old_value]).to eq('a' => variation)
    expect(change[:new_value]).to eq('a' => variation.merge('properties' => { 'duration' => { 'value' => 1 } }))
  end

  it 'applies a removal inside a variation that the same request added' do
    first = { 'uuid' => 'a', 'properties' => { 'duration' => { 'value' => 1 } } }
    added = { 'uuid' => 'b', 'properties' => { 'duration' => { 'value' => 2 } } }
    reaction = create(:reaction, variations: [first])
    as_request do
      reaction.update!(variations: [first, added.deep_merge('properties' => { 'temperature' => { 'value' => 20 } })])
      reaction.update!(variations: [first, added])
    end

    expect(field_changes(reaction, :variations).last[:new_value]).to eq('a' => first, 'b' => added)
  end

  it 'returns complete previous and updated variations when one is edited and another deleted' do
    first = { 'uuid' => 'a', 'properties' => { 'temperature' => { 'value' => 20, 'unit' => '°C' } } }
    second = { 'uuid' => 'b', 'properties' => { 'temperature' => { 'value' => 30, 'unit' => '°C' } } }
    edited = first.deep_merge('properties' => { 'temperature' => { 'value' => 25 } })
    reaction = create(:reaction, variations: [first, second])
    as_request { reaction.update!(variations: [edited]) }

    change = field_changes(reaction, :variations).last
    expect(change[:old_value]).to eq('a' => first, 'b' => second)
    expect(change[:new_value]).to eq('a' => edited)
  end
end
