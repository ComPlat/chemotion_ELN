class FixChannelMsgTemplate < ActiveRecord::Migration[5.2]
  def change
    Channel.find_each do |c|
      if c.msg_template.is_a?(String)
        c.update(msg_template: JSON.parse(c.msg_template)) rescue JSON::ParserError
      end
    end
  end
end
