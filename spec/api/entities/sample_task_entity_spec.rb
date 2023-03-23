# frozen_string_literal: true

require 'rails_helper'

describe Entities::SampleTaskEntity do
  describe '.represent' do
    subject(:entity) do
      described_class.represent(sample_task, serializable: true)
    end

    context 'with scan_results' do
      let(:sample_task) { create(:sample_task_with_incomplete_scan_results) }

      it 'includes the scan_results' do
        expect(entity[:scan_results].count).to eq 1
      end
    end
  end
end
