# frozen_string_literal: true

require 'rails_helper'

# A NMR JCAMP uploaded into an analysis dataset: 2D data is left to NMRium, 1D data goes to ChemSpectra.
RSpec.describe Attachment, '#multi_dimensional_nmr_jcamp?' do
  let(:nd_fid) do
    <<~JCAMP
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
  end
  let(:one_d) do
    <<~JCAMP
      ##TITLE= 1D test
      ##JCAMP-DX= 5.00
      ##DATA TYPE= NMR SPECTRUM
      ##.OBSERVE NUCLEUS= ^1H
      ##NPOINTS= 4
      ##XYDATA= (X++(Y..Y))
      0 1 2 3 4
      ##END=
    JCAMP
  end

  let(:dataset) do
    analyses = create(:container, container_type: 'analyses')
    analysis = create(:container, container_type: 'analysis', parent: analyses)
    create(:container, container_type: 'dataset', parent: analysis)
  end
  let(:sources) { [] }
  let(:upload) { jcamp_upload('upload.dx', content) }

  # Creating the row in the dataset is what triggers the processing.
  def jcamp_upload(filename, text)
    file = Tempfile.new(['upload', File.extname(filename)])
    sources << file
    file.write(text)
    file.flush
    create(:attachment, filename: filename, file_path: file.path, attachable: dataset)
  end

  after { sources.each(&:close!) }

  context 'when it holds 2D data' do
    let(:content) { nd_fid }

    before { allow(Chemotion::Jcamp::Create).to receive(:spectrum) }

    it 'is recognised as multi-dimensional' do
      expect(upload.multi_dimensional_nmr_jcamp?).to be true
    end

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

    # The sibling check that keeps a second upload from being processed used to run first, and
    # left the 2D file queueing, which hides it from NMRium too.
    it 'is left to NMRium when the dataset already holds a JCAMP' do
      jcamp_upload('other.jdx', one_d)
      expect(upload.reload).to be_failure
      expect(described_class.where(attachable: dataset).count).to eq(2)
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

  context 'when reading the header' do
    before { allow(Chemotion::Jcamp::Create).to receive(:spectrum) }

    it 'lets an explicit NUM DIM of 1 win over an nD data type' do
      expect(jcamp_upload('a.dx', nd_fid.sub('##NUM DIM= 2', '##NUM DIM= 1')).multi_dimensional_nmr_jcamp?).to be false
    end

    it 'compares labels the JCAMP way' do
      text = nd_fid.sub('##NUM DIM= 2', '##NUM_DIM= 2').gsub('nD NMR FID', 'NMR FID')
      expect(jcamp_upload('a.dx', text).multi_dimensional_nmr_jcamp?).to be true
    end

    it 'reads the dimension off the data type when there is no NUM DIM' do
      text = nd_fid.sub("##NUM DIM= 2\n", '').gsub('nD NMR FID', '2D NMR SPECTRUM')
      expect(jcamp_upload('a.jdx', text).multi_dimensional_nmr_jcamp?).to be true
    end

    it 'reads a file with CR-only line endings' do
      expect(jcamp_upload('a.dx', nd_fid.tr("\n", "\r")).multi_dimensional_nmr_jcamp?).to be true
    end

    it 'ignores multi-dimensional data that is not NMR' do
      text = nd_fid.gsub('nD NMR FID', 'UV/VIS SPECTRUM')
      expect(jcamp_upload('a.dx', text).multi_dimensional_nmr_jcamp?).to be false
    end
  end
end
