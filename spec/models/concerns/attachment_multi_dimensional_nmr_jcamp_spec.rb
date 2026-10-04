# frozen_string_literal: true

require 'rails_helper'

# A NMR JCAMP uploaded into an analysis dataset: 2D data is left to NMRium, 1D data goes to ChemSpectra.
RSpec.describe Attachment, '#multi_dimensional_nmr_jcamp?' do
  nd_fid = <<~JCAMP
    ##TITLE= 2D test
    ##JCAMPDX= 6.0
    ##DATA TYPE= nD NMR FID
    ##DATA CLASS= NTUPLES
    ##NUM DIM= 2
    ##NTUPLES= nD NMR FID
    ##VAR_DIM= 2, 4, 4, 4
    ##PAGE= T1=0
    ##DATA TABLE= (T2++(R..R)), PROFILE
    0 1 2 3 4
    ##END NTUPLES= nD NMR FID
    ##END=
  JCAMP
  one_d = <<~JCAMP
    ##TITLE= 1D test
    ##JCAMP-DX= 5.00
    ##DATA TYPE= NMR SPECTRUM
    ##.OBSERVE NUCLEUS= ^1H
    ##NPOINTS= 4
    ##XYDATA= (X++(Y..Y))
    0 1 2 3 4
    ##END=
  JCAMP

  let(:dataset) do
    analyses = create(:container, container_type: 'analyses')
    analysis = create(:container, container_type: 'analysis', parent: analyses)
    create(:container, container_type: 'dataset', parent: analysis)
  end
  let(:source) { Tempfile.new(['upload', '.dx']) }
  let(:upload) do
    source.write(content)
    source.flush
    create(:attachment, filename: 'upload.dx', file_path: source.path, attachable: dataset)
  end

  after { source.close! }

  context 'when it holds 2D data' do
    let(:content) { nd_fid }

    before { allow(Chemotion::Jcamp::Create).to receive(:spectrum) }

    it 'is recognised as multi-dimensional' do
      expect(upload.multi_dimensional_nmr_jcamp?).to be true
    end

    # Saving the upload into the dataset is what triggers the processing.
    it 'is not sent to ChemSpectra and is left in failure, where NMRium picks it up' do
      expect(upload.reload).to be_failure
      expect(Chemotion::Jcamp::Create).not_to have_received(:spectrum)
      expect(described_class.where(attachable: dataset).pluck(:filename)).to eq(['upload.dx'])
    end

    it 'is not sent to ChemSpectra on reprocessing either' do
      upload.generate_spectrum(true, true)
      expect(upload.reload).to be_failure
      expect(Chemotion::Jcamp::Create).not_to have_received(:spectrum)
    end
  end

  context 'when it holds 1D data' do
    let(:content) { one_d }

    before { allow(Chemotion::Jcamp::Create).to receive(:spectrum).and_raise(StandardError, 'stubbed') }

    it 'is not recognised as multi-dimensional' do
      expect(upload.multi_dimensional_nmr_jcamp?).to be false
    end

    it 'is still sent to ChemSpectra' do
      upload
      expect(Chemotion::Jcamp::Create).to have_received(:spectrum).once
    end
  end
end
