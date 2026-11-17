# frozen_string_literal: true

# == Schema Information
#
# Table name: scan_results
#
#  id                :bigint           not null, primary key
#  measurement_value :float            not null
#  measurement_unit  :string           default("g"), not null
#  title             :string
#  position          :integer          default(0), not null
#  sample_task_id    :bigint
#  created_at        :datetime         not null
#  updated_at        :datetime         not null
#
# Indexes
#
#  index_scan_results_on_sample_task_id  (sample_task_id)
#
require 'rails_helper'

RSpec.describe ScanResult do
  let(:sample_task) { create(:sample_task_without_scan_results) }

  def build_scan_result(**attributes)
    described_class.new(
      sample_task: sample_task,
      attachment_attributes: attributes_for(:attachment, :with_png_image),
      measurement_value: 10,
      measurement_unit: 'g',
      **attributes,
    )
  end

  describe 'associations' do
    it { is_expected.to belong_to(:sample_task) }
    it { is_expected.to have_one(:attachment).dependent(:destroy) }
  end

  describe 'validations' do
    it 'is valid with a value, a unit and an attachment' do
      expect(build_scan_result).to be_valid
    end

    it 'requires a measurement value' do
      scan_result = build_scan_result(measurement_value: nil)

      expect(scan_result).not_to be_valid
      expect(scan_result.errors[:measurement_value]).to be_present
    end

    it 'requires a measurement unit' do
      scan_result = build_scan_result(measurement_unit: '')

      expect(scan_result).not_to be_valid
      expect(scan_result.errors[:measurement_unit]).to be_present
    end

    it 'requires an attachment' do
      scan_result = build_scan_result(attachment_attributes: {})

      expect(scan_result).not_to be_valid
      expect(scan_result.errors[:attachment]).to be_present
    end
  end

  describe 'nested attachment attributes' do
    it 'creates the attachment together with the scan result' do
      scan_result = build_scan_result
      scan_result.save!

      expect(scan_result.attachment).to be_persisted
      expect(scan_result.attachment.attachable).to eq scan_result
    end

    it 'destroys the attachment with the scan result' do
      scan_result = build_scan_result
      scan_result.save!
      attachment_id = scan_result.attachment.id

      scan_result.destroy

      expect(Attachment.where(id: attachment_id)).to be_empty
    end
  end

  describe '#measurement_value_in_mg' do
    it 'returns the value unchanged for mg' do
      expect(described_class.new(measurement_value: 250, measurement_unit: 'mg').measurement_value_in_mg).to eq 250
    end

    it 'converts grams to milligrams' do
      expect(described_class.new(measurement_value: 1.5, measurement_unit: 'g').measurement_value_in_mg).to eq 1500
    end
  end

  describe '#-' do
    let(:vessel_and_compound) { described_class.new(measurement_value: 10, measurement_unit: 'g') }
    let(:vessel) { described_class.new(measurement_value: 500, measurement_unit: 'mg') }

    it 'returns the difference in milligrams' do
      difference = vessel_and_compound - vessel

      expect(difference).to have_attributes(measurement_value: 9500, measurement_unit: 'mg')
    end

    it 'returns a new unsaved scan result' do
      difference = vessel_and_compound - vessel

      expect(difference).to be_a(described_class)
      expect(difference).to be_new_record
    end
  end
end
