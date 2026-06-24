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
  private cachedEmails: LocationEmails | null = null;
  private cacheTimestamp: number | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all location emails from backend with caching and fallback
   */
  async getLocationEmails(): Promise<LocationEmails> {
    // Check if cache is valid
    if (this.cachedEmails && this.cacheTimestamp) {
      const now = Date.now();
      if (now - this.cacheTimestamp < this.CACHE_DURATION) {
        console.log("Returning cached location emails");
        return this.cachedEmails;
      }
    }

    try {
      console.log("Fetching location emails from API...");
      const response = await api.get(`${this.baseUrl}/location/emails`);

      if (response.data && response.data.data) {
        const emails: LocationEmails = response.data.data;
        this.cachedEmails = emails;
        this.cacheTimestamp = Date.now();
        return emails;
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error: any) {
      console.error("Failed to fetch location emails:", error);

      // Handle authentication errors
      if (error.response) {
        switch (error.response.status) {
          case 401:
            console.warn("Authentication required. Please log in.");
            break;
          case 403:
            console.warn("Admin access required for location emails.");
            break;
          case 404:
            console.warn("Location emails endpoint not found.");
            break;
          case 500:
            console.warn("Server error fetching location emails.");
            break;
        }
      }

      // Return fallback emails if cache exists
      if (this.cachedEmails) {
        console.log("Using cached emails as fallback");
        return this.cachedEmails;
      }

      // Return fallback emails from environment or defaults
      const fallbackEmails: LocationEmails = {
        breeze: process.env.REACT_APP_BREEZE_EMAIL || "breeze@example.com",
        sil: process.env.REACT_APP_SIL_EMAIL || "sil@example.com",
        default: process.env.REACT_APP_DEFAULT_EMAIL || "default@example.com",
      };

      console.log("Using fallback emails:", fallbackEmails);
      return fallbackEmails;
    }
  }

  /**
   * Test email to a specific location
   */
  async testLocationEmail(
    location: string,
    email?: string,
  ): Promise<TestEmailResult> {
    try {
      if (!location) {
        throw new Error("Location is required");
      }

      const payload: any = { location };
      if (email) {
        payload.email = email;
      }

      const response = await api.post(`${this.baseUrl}/location/test`, payload);

      if (response.data) {
        return response.data;
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error: any) {
      console.error("Failed to send test email:", error);

      // Return a structured error response
      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Failed to send test email",
        details: error.response?.data?.details || undefined,
      };
    }
  }

  /**
   * Get collection email for a specific location
   */
  getLocationEmail(location: string, emails: LocationEmails): string {
    if (!location) {
      console.warn("Location is undefined or null, using default email");
      return emails.default;
    }

    const normalizedLocation = location.toLowerCase().trim();

    if (normalizedLocation === "breeze") {
      return emails.breeze;
    } else if (normalizedLocation === "sil") {
      return emails.sil;
    } else {
      return emails.default;
    }
  }

  /**
   * Get location from building name
   */
  getLocationFromBuildingName(
    buildingName: string,
  ): "breeze" | "sil" | "other" {
    if (!buildingName) {
      console.warn("Building name is undefined or null, defaulting to 'other'");
      return "other";
    }

    const name = buildingName.toLowerCase().trim();

    if (name.includes("breeze")) {
      return "breeze";
    } else if (name.includes("sil") || name.includes("silk")) {
      return "sil";
    } else {
      return "other";
    }
  }

  /**
   * Clear the cache to force a fresh fetch
   */
  clearCache(): void {
    this.cachedEmails = null;
    this.cacheTimestamp = null;
    console.log("Location emails cache cleared");
  }

  /**
   * Force refresh emails from server
   */
  async refreshLocationEmails(): Promise<LocationEmails> {
    this.clearCache();
    return this.getLocationEmails();
  }

  /**
   * Get location emails with admin check
   * Returns null if not authorized
   */
  async getLocationEmailsIfAuthorized(): Promise<LocationEmails | null> {
    try {
      return await this.getLocationEmails();
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn("User not authorized to access location emails");
        return null;
      }
      throw error;
    }
  }

  /**
   * Update location email for a specific location (requires admin)
   */
  async updateLocationEmail(location: string, email: string): Promise<boolean> {
    try {
      const response = await api.put(`${this.baseUrl}/location/email`, {
        location,
        email,
      });

      if (response.data && response.data.success) {
        // Clear cache to force refresh
        this.clearCache();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to update location email:", error);
      throw error;
    }
  }

  /**
   * Get email for specific location with auto-fetch
   */
  async getEmailForLocation(location: string): Promise<string> {
    try {
      const emails = await this.getLocationEmails();
      return this.getLocationEmail(location, emails);
    } catch (error) {
      console.error(`Failed to get email for location ${location}:`, error);
      // Return default email as ultimate fallback
      return "default@example.com";
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get all configured locations
   */
  getLocations(): string[] {
    return ["breeze", "sil", "other"];
  }

  /**
   * Check if a location is valid
   */
  isValidLocation(location: string): boolean {
    return this.getLocations().includes(location.toLowerCase().trim());
  }
}

export default new EmailLocationService();
