# frozen_string_literal: true

module Usecases
  module Attachments
    class UploadChunkComplete
      attr_reader :user, :params

      def initialize(user, params)
        @user = user
        @params = params
      end

      def self.execute!(user, params)
        new(user, params).execute!
      end

      def execute! # rubocop:disable Metrics/AbcSize
        file_name = ActiveStorage::Filename.new(params[:filename]).sanitized
        FileUtils.mkdir_p(Rails.root.join('tmp/uploads/full'))
        entries = Dir["#{Rails.root.join('tmp/uploads/chunks', params[:key])}*"].sort_by do |s|
          s.scan(/\d+/).last.to_i
        end
        file_path = Rails.root.join('tmp/uploads/full', params[:key])
        file_path = "#{file_path}#{File.extname(file_name)}"
        file_checksum = Digest::MD5.new
        File.open(file_path, 'wb') do |outfile|
          entries.each do |file|
            buff = File.binread(file)
            file_checksum.update(buff)
            outfile.write(buff)
          end
        end

        return create_attachment(file_name, file_path) if file_checksum == params[:checksum]

        { ok: false, statusText: ['File upload has error. Please try again!'] }
      ensure
        entries.each do |file|
          FileUtils.rm_f(file)
        end
        FileUtils.rm_f(file_path)
      end

      def create_attachment(file_name, file_path)
        ok = true
        attachment = Attachment.new(
          bucket: nil,
          filename: file_name,
          key: params[:key],
          file_path: file_path,
          created_by: user.id,
          created_for: user.id,
          content_type: MIME::Types.type_for(file_name)[0].to_s,
        )
        status_text = []
        begin
          attachment.save!
        rescue StandardError => e
          status_text = [e.message.empty? ? attachment.errors.to_h[:attachment] : e.message] # rubocop:disable Rails/DeprecatedActiveModelErrorsMethods
          ok = false
        end

        { ok: ok, statusText: status_text }
      end
    end
  end
end
