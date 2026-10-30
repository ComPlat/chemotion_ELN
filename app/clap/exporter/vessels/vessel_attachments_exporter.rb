# frozen_string_literal: true

module Clap
  module Exporter
    module Vessels
      class VesselAttachmentsExporter < Clap::Exporter::Base
        def to_clap
          []

          # TODO:  Vessel Attachments Not yet implemented. Depends on upcoming enhancements in ELN Vessel code.
          # Keeping premature implementation for reference.
          # cbuggle, 13.03.2026.
          #
          # model.attachments.map do |attachment|
          #   Clap::VesselAttachment.new(
          #     type: attachment_type(attachment),
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
        # Clap::VesselAttachment::VesselAttachmentType.const_get(attachment)
        # rescue NameError
        # Clap::VesselAttachment::VesselAttachmentType.UNSPECIFIED
        # end
      end
    end
  end
end
