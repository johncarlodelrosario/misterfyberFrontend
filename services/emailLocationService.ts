import api from "./api";

export interface LocationEmails {
  breeze: string;
  sil: string;
  default: string;
}

export interface TestEmailResult {
  success: boolean;
  message: string;
  details?: {
    locationEmails: LocationEmails;
  };
}

class EmailLocationService {
  private baseUrl = "/api/billing";

  // Get all location emails from backend
  async getLocationEmails(): Promise<LocationEmails> {
    try {
      const response = await api.get(`${this.baseUrl}/location/emails`);
      return response.data.data;
    } catch (error) {
      console.error("Failed to fetch location emails:", error);
      throw error;
    }
  }

  // Test email to a specific location
  async testLocationEmail(
    location: string,
    email?: string,
  ): Promise<TestEmailResult> {
    try {
      const response = await api.post(`${this.baseUrl}/location/test`, {
        location,
        email,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to send test email:", error);
      throw error;
    }
  }

  // Get collection email for a specific location
  getLocationEmail(location: string, emails: LocationEmails): string {
    const normalizedLocation = location.toLowerCase().trim();
    if (normalizedLocation === "breeze") return emails.breeze;
    if (normalizedLocation === "sil") return emails.sil;
    return emails.default;
  }

  // Get location from building name
  getLocationFromBuildingName(
    buildingName: string,
  ): "breeze" | "sil" | "other" {
    const name = buildingName.toLowerCase().trim();
    if (name.includes("breeze")) return "breeze";
    if (name.includes("sil") || name.includes("silk")) return "sil";
    return "other";
  }
}

export default new EmailLocationService();
