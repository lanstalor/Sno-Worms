import Peer, { DataConnection } from 'peerjs';
import { MessageType } from '../types';

export class PeerService {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private myId: string = '';

  // Generate a friendly 4 digit code
  private generateShortId(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  // Prefix to avoid collisions on public peerjs server
  private getFullId(shortId: string): string {
    return `reef-restore-game-${shortId}`;
  }

  public init(
    onOpen: (id: string) => void,
    onConnection: (connId: string) => void,
    onData: (data: MessageType) => void,
    onError: (err: string) => void
  ): string {
    const shortId = this.generateShortId();
    this.myId = shortId;

    // Use default PeerJS public cloud
    this.peer = new Peer(this.getFullId(shortId));

    this.peer.on('open', () => {
      onOpen(shortId);
    });

    this.peer.on('connection', (connection) => {
      this.conn = connection;
      this.setupConnectionListeners(onConnection, onData, onError);
      onConnection(connection.peer);
    });

    this.peer.on('error', (err) => {
      onError(err.message);
    });

    return shortId;
  }

  public connectTo(
    targetShortId: string,
    onOpen: () => void,
    onData: (data: MessageType) => void,
    onError: (err: string) => void
  ) {
    if (!this.peer) {
      // Initialize peer if acting as joiner (random ID for self)
      this.peer = new Peer();
      this.peer.on('error', (err) => onError(err.message));
    }

    const targetFullId = this.getFullId(targetShortId);
    const connection = this.peer.connect(targetFullId);

    connection.on('open', () => {
      this.conn = connection;
      this.setupConnectionListeners(() => {}, onData, onError);
      onOpen();
    });
    
    connection.on('error', (err) => onError(err.message));
  }

  private setupConnectionListeners(
    onConnect: (id: string) => void,
    onData: (data: MessageType) => void,
    onError: (err: string) => void
  ) {
    if (!this.conn) return;

    this.conn.on('data', (data) => {
      onData(data as MessageType);
    });

    this.conn.on('close', () => {
      onError("Opponent disconnected");
    });
    
    this.conn.on('error', (err) => onError(err.message));
  }

  public send(data: MessageType) {
    if (this.conn && this.conn.open) {
      this.conn.send(data);
    } else {
      console.warn("Cannot send, connection not open");
    }
  }

  public destroy() {
    if (this.conn) {
      this.conn.close();
    }
    if (this.peer) {
      this.peer.destroy();
    }
  }
}

export const peerService = new PeerService();
