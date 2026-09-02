# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Versioning::Serializers::ReactionSerializer do
  let(:user) { create(:user) }

  def as_request
    Logidze.with_responsible!(user.id)
    yield
  ensure
    Logidze.clear_responsible!
  end

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
end
