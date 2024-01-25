# frozen_string_literal: true

module Usecases
  module Samples
    class DeleteAnnotation
      attr_reader :sample, :sample_svg_annotation_file

      def initialize(sample)
        @sample = sample
        @sample_svg_annotation_file = sample.sample_svg_annotation_file
      end

      def self.execute!(sample)
        new(sample).execute!
      end

      def execute!
        return if sample_svg_annotation_file.blank?

        delete_in_db
        delete_in_filesystem if File.exist?(file_path)
      end

      private

      def delete_in_db
        sample.sample_svg_annotation = ''
        sample.sample_svg_annotation_file = ''
        sample.save
      end

      def delete_in_filesystem
        File.delete(file_path)
      end

      def file_path
        Rails.public_path.join('images', 'samples', sample_svg_annotation_file)
      end
    end
  end
end
