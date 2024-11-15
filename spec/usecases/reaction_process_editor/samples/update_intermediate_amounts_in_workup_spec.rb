# frozen_string_literal: true

RSpec.describe Usecases::ReactionProcessEditor::Samples::UpdateIntermediateAmountsInWorkup do
  subject(:usecase) do
    described_class.execute!(sample: sample)
  end

  let(:activity) do
    create_default(:reaction_process_activity_save, sample: sample, workup: { target_amount: { unit: 'lbs' } })
  end
  let(:sample) { create(:valid_sample, target_amount_value: value, target_amount_unit: base_unit, metrics: metrics) }
  let(:value) { 55 }

  {
    g: { base_unit: 'g', factor: 1, metrics_string: 'nmmm' },
    mg: { base_unit: 'g', factor: 10**3, metrics_string: 'mmmm' },
    mcg: { base_unit: 'g', factor: 10**6, metrics_string: 'ummm' },
    l: { base_unit: 'l', factor: 1, metrics_string: 'mnmm' },
    ml: { base_unit: 'l', factor: 10**3, metrics_string: 'mmmm' },
    mol: { base_unit: 'mol', factor: 1, metrics_string: 'mmnm' },
    mmol: { base_unit: 'mol', factor: 10**3, metrics_string: 'mmmm' },
    mcmol: { base_unit: 'mol', factor: 10**6, metrics_string: 'mmum' },
  }.each do |unit, eln_metric|
    context "when sample amount is in #{unit}" do
      let(:base_unit) { eln_metric[:base_unit] }
      let(:metrics) { eln_metric[:metrics_string] }

      it "sets workup target_amount value to #{55 * eln_metric[:factor]}" do
        expect { usecase }.to change {
          activity.reload.workup.dig('target_amount', 'value')
        }.to(55 * eln_metric[:factor])
      end

      it "sets workup target_amount unit to #{unit}" do
        expect { usecase }.to change { activity.reload.workup.dig('target_amount', 'unit') }.to(unit.to_s)
      end
    end
  end
end
