# frozen_string_literal: true

# Mailer to email an ELNer about its data export being ready for download
class CollectionMailer < ApplicationMailer
  # @param skipped_count [Integer] attachments left out of the archive; see
  #   {Export::ExportCollections#skipped_attachments}
  def mail_export_completed(user_id, labels, link, expires_at, skipped_count = 0)
    init_export_params(user_id, labels, link, expires_at, skipped_count)
    mail(to: @user.email, subject: "[ELN] Collection export:  #{@col_labels}") do |format|
      format.html
      format.text { render plain: export_mail_content }
    end
  end

  private

  def export_mail_content
    <<~TXT
      Export collection job completed!
      Your data has been packed.
      Collection#{@s}: #{@col_labels}.
      #{@skipped_notice}
      Download link (expires at #{@expires_at}):

        #{@link}
    TXT
  end

  def init_export_params(user_id, labels, link, expires_at, skipped_count = 0)
    @user = User.find(user_id)
    @link = link
    @expires_at = expires_at
    @skipped_notice =
      if skipped_count.to_i.zero?
        ''
      else
        "#{skipped_count} attachment#{'s' if skipped_count > 1} could not be included " \
          '(see description.txt in the archive).'
      end
    @s = labels.size > 1 ? 's' : ''
    @col_labels = "[#{labels.join('], [')}]"
    @col_labels = (@col_labels[0..40] + '...') if @col_labels.size > 40
  end
end
