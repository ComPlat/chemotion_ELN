# frozen_string_literal: true

# Mailer to email an ELNer about a created/update calendar entry
class SbmmMailer < ApplicationMailer
  def request_changes(sbmm_id, requested_changes:, effective_changes:, user:)
    @sbmm = SequenceBasedMacromolecule.find(sbmm_id)
    @user = user
    @requested_changes = requested_changes
    @effective_changes = effective_changes

    mail(
      to: Admin.all.pluck(:email),
      from: user.email,
      subject: "User requests a change to a SequenceBasedMacromolecule",
    )
  end
end
