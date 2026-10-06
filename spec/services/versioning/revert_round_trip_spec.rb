# frozen_string_literal: true

require 'rails_helper'

# Reverting a field writes the revertible value the history offers back through the record type's reverter, so
# that value has to be the stored one, not what the History tab displays.
RSpec.describe 'History revert round trips' do # rubocop:disable RSpec/DescribeClass
  let(:user) { create(:person) }

  def as_request
    Logidze.with_responsible!(user.id)
    yield
  ensure
    Logidze.clear_responsible!
  end

  # Edits the record within a request, then reverts the field to the value the history offers.
  def round_trip(record, serializer, reverter, field, edit)
    as_request { record.update!(edit) }
    history = serializer.call(record.class.with_log_data.find(record.id), ['History'])
    change = history.filter_map { |entry| entry[:changes][field] }.last
    reverter.call('db_id' => record.id, 'fields' => [{ 'name' => field, 'value' => change[:revertible_value] }])
    record.reload
  end

  it 'reverts a reaction material position to the stored value' do
    material = create(:reactions_sample, position: 2)
    round_trip(material, Versioning::Serializers::ReactionsSampleSerializer,
               Versioning::Reverters::ReactionsSampleReverter, 'position', position: 3)

    expect(material.position).to eq 2
  end

  it 'reverts well readouts to the stored array' do
    readouts = [{ 'value' => '1', 'unit' => 'mM' }]
    well = create(:well, readouts: readouts)
    round_trip(well, Versioning::Serializers::WellSerializer, Versioning::Reverters::WellReverter,
               'readouts', readouts: [{ 'value' => '2', 'unit' => 'mM' }])

    expect(well.readouts).to eq readouts
  end

  it 'reverts a sample boiling point range' do
    sample = create(:sample, boiling_point: 1.0..2.0)
    round_trip(sample, Versioning::Serializers::SampleSerializer, Versioning::Reverters::SampleReverter,
               'boiling_point', boiling_point: 3.0..4.0)

    expect(sample.boiling_point).to eq 1.0..2.0
  end

  it 'reverts chemical data to the stored array' do
    chemical_data = [{ 'safetySheetPath' => [{ 'merck_link' => 'x' }] }]
    chemical = create(:chemical, chemical_data: chemical_data)
    round_trip(chemical, Versioning::Serializers::ChemicalSerializer, Versioning::Reverters::ChemicalReverter,
               'chemical_data', chemical_data: [{ 'safetySheetPath' => [] }])

    expect(chemical.chemical_data).to eq chemical_data
  end

  it 'reverts device description operators and tags to the stored arrays' do
    operators = [{ 'name' => 'Operator A', 'email' => 'a@example.org' }]
    device = create(:device_description, created_by: user.id, operators: operators, general_tags: %w[first])
    round_trip(device, Versioning::Serializers::DeviceDescriptionSerializer,
               Versioning::Reverters::DeviceDescriptionReverter, 'operators', operators: [{ 'name' => 'B' }])
    round_trip(device, Versioning::Serializers::DeviceDescriptionSerializer,
               Versioning::Reverters::DeviceDescriptionReverter, 'general_tags', general_tags: %w[second])

    expect([device.operators, device.general_tags]).to eq [operators, %w[first]]
  end

  it 'reverts a research plan metadata list to the stored array' do
    metadata = create(:research_plan_metadata, research_plan: create(:research_plan))
    stored = metadata.alternate_identifier
    round_trip(metadata, Versioning::Serializers::ResearchPlanMetadataSerializer,
               Versioning::Reverters::ResearchPlanMetadataReverter, 'alternate_identifier',
               alternate_identifier: [{ 'alternateIdentifier' => 'other', 'alternateIdentifierType' => 'URL' }])

    expect(metadata.alternate_identifier).to eq stored
  end

  it 'reverts one sub-key of a hash column to its stored value' do
    container = create(:container, extended_metadata: { 'status' => 'Confirmed', 'report' => 'true' })
    round_trip(container, Versioning::Serializers::ContainerSerializer, Versioning::Reverters::ContainerReverter,
               'extended_metadata.report', extended_metadata: { 'status' => 'Confirmed', 'report' => 'false' })

    expect(container.extended_metadata).to eq('status' => 'Confirmed', 'report' => 'true')
  end
end
