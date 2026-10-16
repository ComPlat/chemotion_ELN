# frozen_string_literal: true

module LogidzeHelpers
  # Runs the block the way a request saves records: LogidzeModule wraps every request in
  # Logidze.with_responsible!/clear_responsible!, which gives the versions it saves their own uuid, so the
  # History groups them into one entry.
  #
  # @param responsible [User] the user the versions are attributed to; defaults to the example's +user+
  def as_request(responsible = user)
    Logidze.with_responsible!(responsible.id)
    yield
  ensure
    Logidze.clear_responsible!
  end
end
