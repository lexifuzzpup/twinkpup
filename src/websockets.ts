import type { BunRequest, ServerWebSocket } from "bun";

export interface WebSocketData {
    user: number | null,
    router: WebSocketRoute,
    req: BunRequest,
    id?: string
}

export class WebSocketRoute {
    private readonly sockets = new Map<string, ServerWebSocket<WebSocketData>>;

    public open(ws: ServerWebSocket<WebSocketData>) {
        do {
            ws.data.id = crypto.randomUUID();
        } while(this.sockets.has(ws.data.id));

        this.sockets.set(ws.data.id, ws);
    }
    public message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer<ArrayBuffer>) {

    }
    public close(ws: ServerWebSocket<WebSocketData>, code: number, reason: string) {
        this.sockets.delete(ws.data.id!);
    }

    public getAll() {
        return Array.from(this.sockets.values());
    }
    public getCount() {
        return this.sockets.size;
    }

    public broadcast(
        data: string | Bun.BufferSource | Blob,
        compress?: boolean,
        filter?: (socket: ServerWebSocket<WebSocketData>) => boolean
    ) {
        for(const socket of this.sockets.values()) {
            if(filter == null || filter(socket)) {
                socket.send(data, compress);
            }
        }
    }
}