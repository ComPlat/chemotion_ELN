# frozen_string_literal: true

# Who is currently using or watching a device's remote display.
#
# Written and read only by +GET /api/v1/devices/current_connection+. One entry per device,
# keyed +"device/<device id>"+, holding +{ user_id => [state, polled_at] }+ where +state+ is
# 0 (using: tab focused) or 1 (watching) and +polled_at+ an epoch second. The client polls
# every 4 seconds; viewers that stop polling drop out after {NOVNC_CONNECTION_TTL}.
#
# A file store (not +Rails.cache+) so that all app processes on the host share the counts
# whatever cache store the deployment configures.
NOVNC_CONNECTIONS = ActiveSupport::Cache::FileStore.new(
  Rails.root.join('tmp/cache/novnc_connections'),
  namespace: 'novnc',
)
NOVNC_CONNECTION_TTL = 15.seconds
