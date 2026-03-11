# frozen_string_literal: true

module Clap
  module Exporter
    module Vessels
      class VesselAttachmentsExporter < Clap::Exporter::Base
        def to_clap
          []

          # TODO:  Vessel Attachments Not yet implemented.  Depends on upcoming enhancements in ELN Vessel code.
          # model.attachments.map do |attachment|
          #   Clap::VesselAttachment.new(
          #     type: attachment_type(attachment),
          #     details: nil, # n/a. currently nonexistant in ELN.
          #   )
          # end
        end

        # private
        #
        # def attachments
        # Array(model.attachments)
        # end
        #
        # def attachment_type(attachment)
        # Clap::VesselPreparation::VesselAttachmentType.const_get(attachment)
        # rescue StandardError
        # Clap::VesselPreparation::VesselAttachmentType.UNSPECIFIED
        # end
      end
    end
  end
end
