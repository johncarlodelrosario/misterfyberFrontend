// frontend/src/services/websocket.ts
import { io, Socket } from "socket.io-client";

class WebSocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private isConnected: boolean = false;

  connect() {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    if (this.socket?.connected) {
      return;
    }

    this.socket = io(baseUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("🔌 WebSocket connected");
      this.isConnected = true;
      this.socket?.emit("join", { room: "admin-dashboard" });
      this.emit("connected", { timestamp: new Date() });
    });

    this.socket.on("disconnect", () => {
      console.log("🔌 WebSocket disconnected");
      this.isConnected = false;
      this.emit("disconnected", { timestamp: new Date() });
    });

    // ===== FORCE REFRESH EVENT =====
    this.socket.on("dashboard:forceRefresh", (data) => {
      console.log("🔥🔥🔥 FORCE REFRESH RECEIVED!", data);
      this.emit("dashboard:forceRefresh", data);
    });

    // Dashboard events
    this.socket.on("dashboard:dataChanged", (data) => {
      console.log("📊 Dashboard data changed:", data);
      this.emit("dashboard:dataChanged", data);
      this.emit("dashboard:update", data);
    });

    this.socket.on("dashboard:dataUpdated", (data) => {
      console.log("📊 Dashboard data updated:", data);
      this.emit("dashboard:dataUpdated", data);
      this.emit("dashboard:update", data);
    });

    this.socket.on("dashboard:refreshing", (data) => {
      console.log("🔄 Dashboard refreshing:", data);
      this.emit("dashboard:refreshing", data);
    });

    this.socket.on("dashboard:update", (data) => {
      console.log("📊 Dashboard update:", data);
      this.emit("dashboard:update", data);
      if (data.forceRefresh) {
        this.emit("dashboard:forceRefresh", data);
      }
    });

    // Billing events
    this.socket.on("billing:created", (data) => {
      console.log("💰 Bill created:", data);
      this.emit("billing:created", data);
      this.emit("dashboard:update", data);
    });

    this.socket.on("billing:paid", (data) => {
      console.log("💰 Bill paid:", data);
      this.emit("billing:paid", data);
      this.emit("dashboard:update", { ...data, forceRefresh: true });
    });

    this.socket.on("billing:updated", (data) => {
      console.log("💰 Bill updated:", data);
      this.emit("billing:updated", data);
      this.emit("dashboard:update", data);
    });

    this.socket.on("billing:deleted", (data) => {
      console.log("💰 Bill deleted:", data);
      this.emit("billing:deleted", data);
      this.emit("dashboard:update", data);
    });

    // Billing Cycle events
    this.socket.on("billingCycle:created", (data) => {
      console.log("🔄 Billing cycle created:", data);
      this.emit("billingCycle:created", data);
      this.emit("dashboard:update", data);
    });

    this.socket.on("billingCycle:updated", (data) => {
      console.log("🔄 Billing cycle updated:", data);
      this.emit("billingCycle:updated", data);
      this.emit("dashboard:update", data);
    });

    this.socket.on("billingCycle:deleted", (data) => {
      console.log("🔄 Billing cycle deleted:", data);
      this.emit("billingCycle:deleted", data);
      this.emit("dashboard:update", data);
    });

    // Customer events
    this.socket.on("customer:created", (data) => {
      console.log("👤 Customer created:", data);
      this.emit("customer:created", data);
      this.emit("dashboard:update", data);
    });

    this.socket.on("customer:updated", (data) => {
      console.log("👤 Customer updated:", data);
      this.emit("customer:updated", data);
      this.emit("dashboard:update", data);
    });

    // Payment events
    this.socket.on("payment:created", (data) => {
      console.log("💳 Payment created:", data);
      this.emit("payment:created", data);
      this.emit("dashboard:update", data);
    });

    this.socket.on("payment:confirmed", (data) => {
      console.log("💳 Payment confirmed:", data);
      this.emit("payment:confirmed", data);
      this.emit("dashboard:update", { ...data, forceRefresh: true });
    });

    // Settings events
    this.socket.on("settings:updated", (data) => {
      console.log("⚙️ Settings updated:", data);
      this.emit("settings:updated", data);
      this.emit("dashboard:update", data);
    });

    // Suspension events
    this.socket.on("suspension:updated", (data) => {
      console.log("⛔ Suspension updated:", data);
      this.emit("suspension:updated", data);
      this.emit("dashboard:update", data);
    });

    // Bills generated events
    this.socket.on("bills:generated", (data) => {
      console.log("📄 Bills generated:", data);
      this.emit("bills:generated", data);
      this.emit("dashboard:update", data);
    });

    this.socket.on("bills:recovered", (data) => {
      console.log("📄 Bills recovered:", data);
      this.emit("bills:recovered", data);
      this.emit("dashboard:update", data);
    });

    this.socket.on("new_customer:detected", (data) => {
      console.log("🆕 New customer detected:", data);
      this.emit("new_customer:detected", data);
      this.emit("dashboard:update", data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  off(event: string, callback: Function) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event) || [];
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event) || [];
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (e) {
          console.error("Error in event listener:", e);
        }
      });
    }
  }

  requestDashboardRefresh() {
    this.socket?.emit("dashboard:refresh");
  }

  isConnectedStatus() {
    return this.isConnected || this.socket?.connected || false;
  }
}

export const wsClient = new WebSocketClient();
export default wsClient;
