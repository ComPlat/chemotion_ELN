# Mailer to email an ELNer about its data export being ready for download
class CalendarMailer < ActionMailer::Base
  default from: ENV['DEVISE_SENDER'] || 'eln'

  def send_mail(entry, user, type)
    @entry = entry
    @user = user
    @type = type

    attachments["#{entry.title.parameterize}.ics"] = {
      mime_type: 'text/calendar',
      content: @entry.ical_for(user),
    }

    mail(
      to: user.email,
      from: entry.creator.email,
      reply_to: entry.creator.email,
      subject: [entry.kind, entry.title].compact.join(' '),
    ) do |format|
      format.html
      format.text
    end
  end
end
