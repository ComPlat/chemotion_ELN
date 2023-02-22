# frozen_string_literal: true

describe Usecases::Attachments::DerivativeBuilderFactory do
  let(:factory) { described_class.new }
  let(:builders) { factory.create_derivative_builders(data_type) }

  describe '.create()' do
    context 'with unsupported datatype' do
      let(:data_type) { 'invalide' }

      it 'no builder created' do
        assert_equal(0, builders.length)
      end
    end

    context 'with npng file' do
      let(:data_type) { 'png' }

      it 'two builders created' do
        assert_equal(2, builders.length)
      end

      it 'ThumbnailCreator was built' do
        assert_equal('Usecases::Attachments::Thumbnail::ThumbnailCreator', builders[0].class.name)
      end

      it 'AnnotationCreator was built' do
        assert_equal('Usecases::Attachments::Annotation::AnnotationCreator', builders[1].class.name)
      end
    end

    context 'with jpg' do
      let(:data_type) { '.jpg' }

      it 'two builders created' do
        assert_equal(2, builders.length)
      end

      it 'ThumbnailCreator was built' do
        assert_equal('Usecases::Attachments::Thumbnail::ThumbnailCreator', builders[0].class.name)
      end

      it 'AnnotationCreator was built' do
        assert_equal('Usecases::Attachments::Annotation::AnnotationCreator', builders[1].class.name)
      end
    end

    context 'with tiff' do
      let(:data_type) { '.tiff' }

      it 'two builders created' do
        assert_equal(3, builders.length)
      end

      it 'ThumbnailCreator was built' do
        assert_equal('Usecases::Attachments::Thumbnail::ThumbnailCreator', builders[0].class.name)
      end

      it 'AnnotationCreator was built' do
        assert_equal('Usecases::Attachments::Annotation::AnnotationCreator', builders[1].class.name)
      end

      it 'FileConverter was built' do
        assert_equal('Usecases::Attachments::Converter::FileConverter', builders[2].class.name)
      end
    end
  end
end
