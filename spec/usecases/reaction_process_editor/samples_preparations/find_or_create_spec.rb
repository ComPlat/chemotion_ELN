# frozen_string_literal: true

RSpec.describe Usecases::ReactionProcessEditor::SamplesPreparations::FindOrCreate do
  subject(:usecase) do
    described_class.execute!(reaction_process: reaction_process, sample_preparation: sample_preparation_params)
  end

  let!(:reaction_process) { create_default(:reaction_process) }
  let!(:sample) { create(:sample) }
  let(:sample_preparation_params) do
    {  id: samples_preparation&.id,
       sample_id: sample.id,
       preparations: ['NEW HOMOGENIZED'] }.deep_stringify_keys
  end

  context 'without SamplesPreparation' do
    let(:samples_preparation) { nil }

    it 'creates SamplesPreparation' do
      expect { usecase }.to change { reaction_process.reload.samples_preparations.length }.by(1)
    end

    it 'updates Attributes' do
      expect { usecase }.to change {
                              reaction_process.reload.samples_preparations.first&.attributes
                            }.from(nil).to(hash_including(sample_preparation_params.except('id')))
    end
  end

  context 'with SamplesPreparation' do
    let!(:reaction_process) { create_default(:reaction_process) }
    let!(:samples_preparation) { create(:samples_preparation) }

    it 'keeps SamplesPreparation' do
      expect { usecase }.not_to change { reaction_process.samples_preparations.length }.from(1)
    end

    it 'updates attributes' do
      expect { usecase }.to change { samples_preparation.reload.preparations }.to(['NEW HOMOGENIZED'])
    end
  end
end
