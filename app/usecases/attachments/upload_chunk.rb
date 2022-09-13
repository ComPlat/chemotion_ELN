# frozen_string_literal: true

module Usecases
  module Attachments
    class UploadChunk
      attr_reader :params

      def initialize(params)
        @params = params
      end

      def self.execute!(params)
        new(params).execute!
      end

      def execute!
        FileUtils.mkdir_p(Rails.root.join('tmp/uploads', 'chunks'))
        filename = Rails.root.join('tmp', 'uploads', 'chunks', "#{params[:key]}$#{params[:counter]}")
        File.open(filename, 'wb') do |file|
          File.open(params[:file][:tempfile], 'r') do |data|
            file.write(data.read)
          end
        end

        true
      end
    end
  end
end
