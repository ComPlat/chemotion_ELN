# frozen_string_literal: true

destroy_failed_jobs = Delayed::Worker.destroy_failed_jobs

describe WelcomeMailer do
  let(:recipient) { create(:person) }
  let(:delayed_mail) { described_class.delay.mail_welcome_message(recipient.id) }

  before do
    Delayed::Worker.destroy_failed_jobs = false
    Delayed::Job.delete_all
  end

  after do
    Delayed::Worker.destroy_failed_jobs = destroy_failed_jobs
    Delayed::Job.delete_all
  end

  describe 'welcome_email' do
    it 'sends an email' do
      recipient.reload # reload the recipient to get the latest email
      expect { Delayed::Worker.new.run(delayed_mail) }.to change { ActionMailer::Base.deliveries.count }.by(1)
    end
  end

  describe 'max_attempts definition' do
    before do
      allow(described_class).to receive(:mail_welcome_message).and_raise(StandardError)
    end

    it 'has a max attempts of 1' do
      expect(described_class.max_attempts).to eq(1)
    end

    it 'leads to a failed job after 1 failed attempts' do
      begin
        Delayed::Worker.new.run(delayed_mail)
      rescue StandardError
        nil
      end
      expect(Delayed::Job.where.not(failed_at: nil).where(attempts: 1).count).to eq(1)
    end
  end
end
