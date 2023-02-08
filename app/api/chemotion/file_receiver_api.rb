# frozen_string_literal: true

require 'sys/filesystem'

module Chemotion
  # Publish-Subscription MessageAPI
  class FileReceiverAPI < Grape::API

    resource :fileservicer do
      before do
        error(401) unless current_user.is_a?(Admin)
      end

      get :all_files do
        res = Array.new

        Attachment.find_each do |f|
          unless f.attachment_data.nil?
            res.push({ "key" => f.id, "path" => f.backup_file })
          end
        end

        res.as_json
      end
    end
  end
end