# frozen_string_literal: true

describe Usecases::Attachments::Annotation::AnnotationCreator do
  describe '.create_derivative()' do
    let(:annotation_location) { Rails.root.join('spec/fixtures/annotations/20221212_valide_annotation_empty.svg') }
    let(:annotation_folder) { File.dirname(annotation_location) }
    let(:expected_annotation) { File.read(annotation_location) }
    let(:image_file) { Rails.root.join('spec/fixtures/upload.png').open }
    let(:creator) { described_class.new }

    context 'when all input is correct' do
      let(:result) { creator.create_derivative(annotation_folder, image_file, 1, {}, nil) }

      it 'annotation was added to result' do
        expect(result[:annotation]).not_to be_nil
      end

      it 'annotation file was created' do
        expect(File.read(result[:annotation])).to eq(expected_annotation)
      end
    end
  end
end
