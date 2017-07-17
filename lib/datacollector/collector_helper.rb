class CollectorHelper
  attr_reader :sender, :sender_container, :recipient

  def initialize(from, cc = nil)
    if cc
      @sender = Device.find_by email: from
      @recipient = User.find_by email: cc
      if @sender && @recipient
        prepare_containers
      end
    else
      @sender = User.find_by email: from
      if @sender
        @recipient = @sender
        prepare_containers
      end
    end
  end

  def sender_recipient_known?
    @sender && @recipient
  end

  def prepare_dataset(subject)
    if sender_recipient_known?
      Container.create(name: subject, container_type: "dataset", parent: @sender_container)
    end
  end

  private
  def prepare_containers
    @recipient.container = Container.create(name: "inbox", container_type: "root") unless @recipient.container

    sender_box_id = "sender_box_" + @sender.id.to_s
    @sender_container = Container.where(container_type: sender_box_id, parent_id: @recipient.container.id).first
    if !@sender_container
      @sender_container = Container.create(name: @sender.first_name, container_type: sender_box_id, parent: @recipient.container)
    end
  end
end
