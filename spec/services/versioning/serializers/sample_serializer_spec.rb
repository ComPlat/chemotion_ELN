# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Versioning::Serializers::SampleSerializer do
  let(:user) { create(:user) }

  def xref_changes(sample, field)
    sample_with_log_data = Sample.with_log_data.find(sample.id)
    described_class.call(sample_with_log_data)
                   .filter_map { |entry| entry[:changes]["xref.#{field}"] }
                   .map { |change| change.values_at(:old_value, :new_value, :revertible_value) }
  end

  # jsonb_diff logs a removed object-valued sub-key as the marker string 'deleted'.
  it 'treats a removed object-valued sub-key as gone rather than as the string "deleted"' do
    sample = create(:sample, xref: { 'cas' => '7732-18-5', 'flash_point' => { 'value' => 12, 'unit' => '°C' } })
    as_request { sample.update!(xref: { 'cas' => '7732-18-5' }) }
    as_request { sample.update!(xref: { 'cas' => '64-17-5' }) }
    as_request { sample.update!(xref: { 'cas' => '64-17-5', 'flash_point' => { 'value' => 13, 'unit' => '°C' } }) }

    expect(xref_changes(sample, 'flash_point')).to eq(
      [
        [nil, '12 °C', nil],
        ['12 °C', nil, { 'value' => 12, 'unit' => '°C' }],
        [nil, '13 °C', nil],
      ],
    )
  end

  it 'shows the flash point with its unit and reverts it as a whole' do
    flash_point = { 'value' => 12, 'unit' => '°F' }
    sample = create(:sample, xref: { 'flash_point' => flash_point })
    as_request { sample.update!(xref: { 'flash_point' => { 'value' => 20, 'unit' => '°C' } }) }

    old_value, new_value, revertible_value = xref_changes(sample, 'flash_point').last
    expect([old_value, new_value]).to eq ['12 °F', '20 °C']

    Versioning::Reverters::SampleReverter.call(
      'db_id' => sample.id, 'fields' => [{ 'name' => 'xref.flash_point', 'value' => revertible_value }],
    )

    expect(sample.reload.xref['flash_point']).to eq flash_point
  end
end
