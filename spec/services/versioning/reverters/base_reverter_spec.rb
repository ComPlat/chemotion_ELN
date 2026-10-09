# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Versioning::Reverters::BaseReverter do
  it 'saves through the model, so derived columns such as the plain-text content are updated' do
    container = create(:container, extended_metadata: { 'content' => '{"ops":[{"insert":"current\\n"}]}' })
    Delayed::Worker.new.work_off # run the job queued by creating the container first

    Versioning::Reverters::ContainerReverter.call(
      'db_id' => container.id,
      'fields' => [{ 'name' => 'extended_metadata.content', 'value' => '{"ops":[{"insert":"reverted\\n"}]}' }],
    )
    Delayed::Worker.new.work_off # the plain-text copy is updated by a delayed job the save queues

    expect(container.reload.plain_text_content).to eq "reverted\n"
  end

  it 'applies model validations' do
    sample = create(:sample, purity: 0.5)
    change = { 'db_id' => sample.id, 'fields' => [{ 'name' => 'purity', 'value' => 5 }] }

    expect { Versioning::Reverters::SampleReverter.call(change) }.to raise_error(ActiveRecord::RecordInvalid)
    expect(sample.reload.purity).to eq 0.5
  end

  it 'only validates what the revert changes, so a record invalid for another reason can still be reverted' do
    sample = create(:sample, name: 'current')
    sample.update_column(:purity, 1.5) # rubocop:disable Rails/SkipsModelValidations -- stored before the validation

    Versioning::Reverters::SampleReverter.call(
      'db_id' => sample.id, 'fields' => [{ 'name' => 'name', 'value' => 'old' }],
    )

    expect(sample.reload.name).to eq 'old'
  end

  it 'only keeps a stored image name when reverting a structure' do
    sample = create(:sample)
    stored = "#{'b' * 128}.svg"
    revert = ->(value) { Versioning::Reverters::SampleReverter.call('db_id' => sample.id, 'fields' => [{ 'name' => 'sample_svg_file', 'value' => value }]) }

    revert.call(stored)
    expect(sample.reload.sample_svg_file).to eq stored

    revert.call('subfolder/structure.svg')
    expect(sample.reload.sample_svg_file).to be_nil
  end

  it 'keeps the other sub-keys when reverting one sub-key of a hash column' do
    container = create(:container, extended_metadata: { 'status' => 'Confirmed', 'kind' => 'NMR' })

    Versioning::Reverters::ContainerReverter.call(
      'db_id' => container.id, 'fields' => [{ 'name' => 'extended_metadata.status', 'value' => 'Unconfirmed' }],
    )

    expect(container.reload.extended_metadata).to include('status' => 'Unconfirmed', 'kind' => 'NMR')
  end
end
