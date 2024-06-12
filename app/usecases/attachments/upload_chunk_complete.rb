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

      def execute! # rubocop:disable Metrics/AbcSize,Metrics/MethodLength
        res = UploadRawComplete.execute!(@user, @params)
        return res unless res[:ok]
        return create_attachment(res[:file_name], res[:file_path])
      ensure
        FileUtils.rm_f(res[:file_path])
      end

      def create_attachment(file_name, file_path) # rubocop:disable Metrics/MethodLength
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
        rescue StandardError
          status_text = [attachment.errors.to_h[:attachment]] # rubocop:disable Rails/DeprecatedActiveModelErrorsMethods
        end

        { ok: true, statusText: status_text }
      end
    end
  end
end
