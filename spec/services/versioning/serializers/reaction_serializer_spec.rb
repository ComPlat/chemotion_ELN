# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Versioning::Serializers::ReactionSerializer do
  let(:user) { create(:user) }
  let(:first_id) { '00000000-0000-4000-8000-00000000000a' }

  def field_changes(reaction, field)
    reaction_with_log_data = Reaction.with_log_data.find(reaction.id)
    described_class.call(reaction_with_log_data)
                   .flat_map { |entry| entry[:changes][field.to_s] }
                   .compact
  end

  # Variations are a list of rows that each hold what they change about the reaction under `data`
  # (db/schemas/reaction_variations.schema.json).
  def variation_row(id, idx, data)
    { 'id' => id, 'idx' => idx, 'data' => data }
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

  it 'leaves the variations to ReactionVariationsSerializer' do
    reaction = create(:reaction)
    as_request { reaction.update!(variations: [variation_row(first_id, 0, 'duration' => '2 h')]) }

    expect(field_changes(reaction, :variations)).to be_empty
  end
end
