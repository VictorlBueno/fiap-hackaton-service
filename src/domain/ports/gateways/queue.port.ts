export interface QueueMessage {
  id: string;
  videoPath: string;
  videoName: string;
  userId: string;
  userEmail?: string;
}

export interface QueuePort {
  sendMessage(message: QueueMessage): Promise<boolean>;

  consumeMessages(
    callback: (message: QueueMessage) => Promise<void>,
  ): Promise<void>;
}
