FactoryBot.define do
  factory :report_template do
    callback(:before_create) do |report_template|
      report_template.attachment = FactoryBot.build(:attachment) unless report_template.attachment
    end

    report_type { 'ELN_Report' }
    name { 'This is description' }
    attachment_id { attachment.id }
    association :attachment, factory: :attachment
  end
end
