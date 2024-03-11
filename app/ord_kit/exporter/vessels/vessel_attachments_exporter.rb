# frozen_string_literal: true

module OrdKit
  module Exporter
    module Vessels
      class VesselAttachmentsExporter < OrdKit::Exporter::Base
        def to_ord
          []
          # TODO:  Vessel Attachments. Not yet implemented
          # model.attachments.map do |attachment|
          #   OrdKit::VesselAttachment.new(
          #     type: attachment_type(attachment),
          #     details: nil, # n/a. currently nonexistant in ELN.
          #   )
          # end
        end

        private

        def attachments
          Array(model.attachments)
        end

        def attachment_type(attachment)
          OrdKit::VesselPreparation::VesselAttachmentType.const_get(attachment)
        rescue StandardError
          OrdKit::VesselPreparation::VesselAttachmentType.UNSPECIFIED
        end
      end
    end
  end
end
