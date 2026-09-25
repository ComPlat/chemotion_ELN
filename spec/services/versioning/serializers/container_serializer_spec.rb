# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Versioning::Serializers::ContainerSerializer do
  let(:user) { create(:user) }
  let(:content_before) { '{"ops":[{"insert":"first"}]}' }
  let(:content_mid) { '{"ops":[{"insert":"second"}]}' }
  let(:content_after) { '{"ops":[{"insert":"third"}]}' }

  # Each block simulates one HTTP request: LogidzeModule wraps every request in
  # Logidze.with_responsible!/clear_responsible!, which is what gives each update its own
  # version uuid so the history view groups them into separate entries.
  def as_request
    Logidze.with_responsible!(user.id)
    yield
  ensure
    Logidze.clear_responsible!
  end

  def edit_metadata(container, changes)
    container.update!(extended_metadata: container.extended_metadata.merge(changes))
  end

  def content_changes(container)
    container_with_log_data = Container.with_log_data.find(container.id)
    described_class.call(container_with_log_data, 'Dataset')
                   .flat_map { |entry| entry[:changes]['extended_metadata.content'] }
                   .compact
  end

  it 'keeps a sibling extended_metadata sub-key from blanking out an untouched one' do
    container = create(:container, extended_metadata: { 'content' => content_before })
    as_request { edit_metadata(container, 'content' => content_mid) }
    # This version only changes `status`; Logidze's jsonb diff only stores the sub-keys that
    # actually changed, so it does not mention `content` at all.
    as_request { edit_metadata(container, 'status' => 'Confirmed') }
    as_request { edit_metadata(container, 'content' => content_after) }

    # [creation (blank -> content_before), content_before -> content_mid, content_mid -> content_after].
    # The status-only version contributes no entry of its own, since content didn't change in it.
    #
    # Without the deep-merge fix, the intervening status-only version wipes out the previously
    # known content from the running "base" state, so the last old_value would come back {}.
    expect(content_changes(container).map { |change| [change[:old_value], change[:new_value]] }).to eq(
      [
        [{}, JSON.parse(content_before)],
        [JSON.parse(content_before), JSON.parse(content_mid)],
        [JSON.parse(content_mid), JSON.parse(content_after)],
      ],
    )
  end

  it 'does not surface a diff when the editor autosaves its empty-delta placeholder' do
    # A Quill editor that nobody typed into still autosaves {"ops":[{"insert":"\n"}]} - visually
    # empty, but not the same JSON value as the nil the container started with.
    container = create(:container, extended_metadata: {})
    as_request { edit_metadata(container, 'content' => '{"ops":[{"insert":"\n"}]}') }

    expect(content_changes(container)).to be_empty
  end

  it 'still surfaces a diff when real content is cleared back to the empty-delta placeholder' do
    container = create(:container, extended_metadata: { 'content' => content_before })
    as_request { edit_metadata(container, 'content' => '{"ops":[{"insert":"\n"}]}') }

    changes = content_changes(container)
    expect(changes.size).to eq 2 # creation (blank -> content_before), then content_before -> blank
    expect(changes.last[:old_value]).to eq JSON.parse(content_before)
    expect(changes.last[:new_value]).to eq({})
  end
end
