# modified from https://github.com/phallstrom/slackistrano#customizing-the-messaging
if defined?(Slackistrano::Messaging)
   module Slackistrano
     class SlackistranoCustomMessaging < Messaging::Base

       # Send failed message to #ops. Send all other messages to default channels.
       # The #ops channel must exist prior.
      #  def channels_for(action)
      #    if action == :failed
      #      "#ops"
      #    else
      #      super
      #    end
      #  end

      #  def payload_for_updating
      #    nil
      #  end

      def payload_for_updating
        t =  <<-TXT
          #{member_links}\n current revision:  #{fetch(:git_current_rev)}\n
          base revision: <#{fetch(:git_url)} | #{fetch(:git_base_rev)}>\n
          On server #{server_hostnames} #{super[:text]} \n
          ```#{fetch(:git_log_message)}```
          TXT
        {
          text: t
        }
      end

       # Fancy updated message.
       # See https://api.slack.com/docs/message-attachments
       def payload_for_updated
         {
           text: "#{member_links}",
           attachments: [{
             color: 'good',
             title: ':tada: Application Deployed :tada:',
             fields: [{
               title: 'Environment',
               value: stage,
               short: true
             }, {
               title: 'server',
               value: server_hostnames,
               short: true
             }, {
               title: 'Branch',
               value: branch,
               short: true
             }, {
               title: 'Deployer',
               value: deployer,
               short: true
             }, {
               title: 'Time',
               value: elapsed_time,
               short: true
             }],
             fallback: super[:text]
           }]
         }
       end

       # Default reverted message.  Alternatively simply do not redefine this
       # method.
      #  def payload_for_reverted
      #    super
      #  end

       # Slightly tweaked failed message.
       # See https://api.slack.com/docs/message-formatting
       def payload_for_failed
         payload = super
         payload[:text] = ":shit: on server #{server_hostnames} #{payload[:text]} "
         payload
       end

       # Override the deployer helper to pull the best name available (git, password file, env vars).
       # See https://github.com/phallstrom/slackistrano/blob/master/lib/slackistrano/messaging/helpers.rb
      #  def deployer
      #    name = `git config user.name`.strip
      #    name = nil if name.empty?
      #    name ||= Etc.getpwnam(ENV['USER']).gecos || ENV['USER'] || ENV['USERNAME']
      #    name
      #  end

       def server_hostnames
         roles(:web).map do |host|
           # "#{host.user}@#{host.hostname}"
           "#{host.hostname}"
         end.join(', ')
       end

       def member_links
         fetch(:slack_members, nil)&.map { |m| "<@#{m}>" }.join(', ')
       end
     end
   end
end
