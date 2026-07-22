# frozen_string_literal: true

# Re-runs the converter pipeline for a dataset attachment that was uploaded but whose
# generic-dataset mapping never completed (converter-app outage, missing profile, or the
# {Labimotion::Converter.update_ds} crash that leaves the source attachment in
# +ConState::ERROR+ while the derived bagit zip already reads +ConState::COMPLETED+).
#
# Runs out of band because {Labimotion::Converter.process} performs a synchronous
# converter-app roundtrip bounded only by the +:timeout+ in +config/converter.yml+.
class ReconvertAttachmentJob < ApplicationJob
  queue_as :converter

  # Whether the converter pipeline can be re-run for +attachment+.
  #
  # Mirrors the preconditions of {Labimotion::AttachmentConverter#exec_converter}: only
  # container-bound attachments that were originally picked up by the converter (i.e. whose
  # extension is whitelisted, hence a +con_state+ other than +NONE+) can be replayed.
  #
  # @param attachment [Attachment]
  # @return [Boolean]
  def self.convertible?(attachment)
    return false unless attachment.has_attribute?(:con_state)
    return false unless attachment.attachable_type == Labimotion::Prop::CONTAINER

    attachment.con_state.present? && attachment.con_state != Labimotion::ConState::NONE
  end

  # @param attachment_id [Integer] id of the originally uploaded attachment
  # @param user_id [Integer] id of the user requesting the re-run
  # @return [void]
  def perform(attachment_id, user_id)
    attachment = Attachment.find_by(id: attachment_id)
    return unless attachment && self.class.convertible?(attachment)

    discard_previous_conversion(attachment)

    # Resetting to WAIT re-arms Labimotion's `after_update :exec_converter` callback, which
    # redoes the whole pipeline. The existing Labimotion::Dataset is reused rather than
    # duplicated: `build_ds` looks it up by element_type/element_id.
    attachment.update!(con_state: Labimotion::ConState::WAIT)
  rescue StandardError => e
    Labimotion::Converter.logger.error(
      ["reconvert fail: #{attachment_id} (user #{user_id})", e.message, *e.backtrace].join("\n"),
    )
    raise e
  end

  private

  # Destroys the bagit zip produced by an earlier run so repeated re-runs do not pile up
  # attachments on the container. Matches the name {Labimotion::Converter.handle_response}
  # gives its output.
  #
  # @param attachment [Attachment] the source attachment
  # @return [void]
  def discard_previous_conversion(attachment)
    derived_name = derived_filename(attachment.filename)

    Attachment.where(
      attachable_type: Labimotion::Prop::CONTAINER,
      attachable_id: attachment.attachable_id,
      filename: derived_name,
    ).where.not(id: attachment.id).find_each(&:destroy)
  end

  # @param filename [String]
  # @return [String] the name {Labimotion::Converter.handle_response} would give the bagit zip
  def derived_filename(filename)
    suffix = File.extname(filename) == '.zip' ? '.bagit.zip' : '.zip'
    "#{File.basename(filename, '.*')}#{suffix}"
  end
end
