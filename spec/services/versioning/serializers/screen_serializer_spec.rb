# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Versioning::Serializers::ScreenSerializer do
  let(:user) { create(:user) }

  def as_request
    Logidze.with_responsible!(user.id)
    yield
  ensure
    Logidze.clear_responsible!
  end

  def description_changes(screen)
    screen_with_log_data = Screen.with_log_data.find(screen.id)
    described_class.call(screen_with_log_data)
                   .flat_map { |entry| entry[:changes]['description'] }
                   .compact
  end

  # A Quill editor that nobody typed into still autosaves {"ops":[{"insert":"\n"}]} - visually
  # empty, but not the same value as the nil description started out as.
  it 'does not surface a diff when description autosaves its empty-delta placeholder' do
    screen = create(:screen, description: nil)
    as_request { screen.update!(description: { 'ops' => [{ 'insert' => "\n" }] }) }

    expect(description_changes(screen)).to be_empty
  end

  it 'still surfaces a diff for a real description change' do
    screen = create(:screen, description: { 'ops' => [{ 'insert' => 'first' }] })
    as_request { screen.update!(description: { 'ops' => [{ 'insert' => 'second' }] }) }

    changes = description_changes(screen)
    # [creation (blank -> first), first -> second]
    expect(changes.size).to eq 2
    expect(changes.last[:old_value]).to eq({ 'ops' => [{ 'insert' => 'first' }] })
    expect(changes.last[:new_value]).to eq({ 'ops' => [{ 'insert' => 'second' }] })
  end
end
