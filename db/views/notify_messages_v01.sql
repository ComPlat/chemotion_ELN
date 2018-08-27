select
 notifications.id as id, messages.id as message_id, channels.subject as subject,
 messages.content,
 notifications.created_at, notifications.updated_at,
 users.id as sender_id,
 users.first_name || chr(32) || users.last_name as sender_name,
 channels.channel_type,notifications.user_id as receiver_id,
 notifications.is_ack as is_ack
from
 messages, notifications, channels, users
 where channels.id = messages.channel_id
 and messages.id = notifications.message_id
 and users.id = messages.created_by
