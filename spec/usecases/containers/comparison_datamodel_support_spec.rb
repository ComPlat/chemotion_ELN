# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::Containers::ComparisonDatamodelSupport do
  let(:user) { create(:user) }
  let(:combined_image) do
    file = Tempfile.new(['combined', '.png'])
    file.write('png')
    file.rewind
    file
  end

  let(:analysis_container) do
    create(
      :analysis_container,
      extended_metadata: {
        'is_comparison' => 'true',
        'kind' => 'Type: 1H NMR',
        'analyses_compared' => [],
      },
    )
  end

  def attach_spectrum
    create(:attachment, :with_spectra_file, created_by: user.id, created_for: user.id)
  end

  before do
    allow(Chemotion::Jcamp::CombineImg).to receive(:combine).and_return([nil, combined_image])
  end

  describe '.generate_comparison_dataset!' do
    it 'creates exactly one dataset child' do
      attachment = attach_spectrum
      analyses_compared = [{ 'file' => { 'id' => attachment.id }, 'layout' => 'Type: 1H NMR' }]

      described_class.generate_comparison_dataset!(analysis_container, analyses_compared)

      expect(analysis_container.children.where(container_type: 'dataset').count).to eq(1)
    end

    it 'replaces the previous dataset instead of leaving it orphaned when called again (e.g. adding a spectrum)' do
      first_attachment = attach_spectrum
      described_class.generate_comparison_dataset!(
        analysis_container,
        [{ 'file' => { 'id' => first_attachment.id }, 'layout' => 'Type: 1H NMR' }],
      )
      first_dataset = analysis_container.children.where(container_type: 'dataset').first

      second_attachment = attach_spectrum
      analysis_container.reload
      existing_analyses_compared = described_class.parse_analyses_compared(
        analysis_container.extended_metadata['analyses_compared'],
      )
      updated_analyses_compared = existing_analyses_compared + [
        { 'file' => { 'id' => second_attachment.id }, 'layout' => 'Type: 1H NMR' },
      ]

      described_class.generate_comparison_dataset!(analysis_container, updated_analyses_compared)

      expect(analysis_container.children.where(container_type: 'dataset').count).to eq(1)
      expect(Container.unscoped.where(id: first_dataset.id).first.deleted_at).not_to be_nil
    end
  end
end
