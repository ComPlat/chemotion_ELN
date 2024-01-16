# frozen_string_literal: true

require 'rails_helper'

describe Usecases::Samples::DeleteAnnotation do
  include_context 'sample annotation context'

  describe '.execute!' do
    let(:run_execute) { described_class.execute!(sample_with_annotation) }
    let(:run_execute_with_missing_annotation) { described_class.execute!(sample) }

    it 'empties sample_svg_annotation_file field in database' do
      run_execute
      sample_with_annotation.reload

      expect(sample_with_annotation.sample_svg_annotation_file).to eq('')
    end

    it 'deletes annotation file in filesystem' do
      annotation_file = sample_with_annotation.sample_svg_annotation_file
      run_execute

      expect(File.exist?(path_to_annotation_file(annotation_file))).to be(false)
    end

    context 'when sample_svg_annotation_file is missing' do
      before do
        annotation_file = sample_with_annotation.sample_svg_annotation_file
        File.delete(path_to_annotation_file(annotation_file))
        allow(File).to receive(:delete)
        run_execute
      end

      it 'does not try to delete the missing file' do
        expect(File).not_to have_received(:delete)
      end
    end

    context 'when sample_svg_annotation_file is empty' do
      it 'does nothing and returns nil' do
        expect(run_execute_with_missing_annotation).to be_nil
      end
    end
  end
end
