class CollectorHelper
  attr_reader :sender, :sender_container, :recipient

  def initialize(from, cc = nil)
    if from.is_a?(Device) && cc.is_a?(User)
      @sender = from
      @recipient = cc
      prepare_containers
    elsif cc
      @sender = Device.find_by email: from
      @recipient = User.find_by email: cc
      prepare_containers if @sender && @recipient
    else
      @sender = User.find_by email: from
      @recipient = @sender
      prepare_containers if @sender
    end
  end

  def sender_recipient_known?
    (@sender && @recipient)
  end

  def prepare_new_dataset(subject)
    return nil unless sender_recipient_known?
    Container.create(
      name: subject,
      container_type: 'dataset',
      parent: @sender_container
    )
  end

  def prepare_dataset(subject)
    return nil unless sender_recipient_known?
    Container.where(
      name: subject,
      container_type: 'dataset',
      parent: @sender_container
    ).first_or_create
  end

  def self.hash(dir_or_file, sftp)
    if sftp
      sftp.file.open(dir_or_file, 'r') do |d|
        date = d.stat.mtime
        Digest::SHA256.hexdigest(dir_or_file + date.to_s)
      end
    else
      date = File.mtime(dir_or_file).strftime('%Y%m%d%H%M')
      Digest::SHA256.hexdigest(File.new(dir_or_file).path + date)
    end
  end

  def self.write_error(e)
    error = CollectorError.new(error_code: e)
    error.save! unless CollectorError.find_by error_code: e
  end

  private

  def prepare_containers
    unless @recipient.container
      @recipient.container = Container.create(
        name: 'inbox',
        container_type: 'root'
      )
    end
    sender_box_id = 'sender_box_' + @sender.id.to_s
    @sender_container = Container.where(
      name: @sender.first_name,
      container_type: sender_box_id,
      parent_id: @recipient.container.id
    ).first_or_create
  end
end
