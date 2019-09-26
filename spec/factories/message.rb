FactoryBot.define do
  factory :channel, class: Channel do
    sequence(:subject) { |n| "Channel_#{n}" }
    channel_type { 9 }
  end

  factory :subscription, class: Subscription do
    channel_id { 0 }
    user_id { 0 }
  end

  factory :message, class: Message do
    channel_id { 0 }
    content = {
      'data' => 'Thanks for using ELN! To make our system better for you, we bring updates every Friday.'
    }
    created_by { 0 }
  end

  factory :notification, class: Notification do
    message_id { 0 }
    user_id { 0 }
    is_ack { false }
  end
end
