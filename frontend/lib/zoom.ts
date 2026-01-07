/**
 * Zoom API Integration
 * Handles meeting creation, updates, and management via Zoom API
 */

interface ZoomMeetingSettings {
  host_video?: boolean;
  participant_video?: boolean;
  join_before_host?: boolean;
  mute_upon_entry?: boolean;
  waiting_room?: boolean;
  audio?: 'both' | 'telephony' | 'voip';
  auto_recording?: 'local' | 'cloud' | 'none';
  approval_type?: 0 | 1 | 2; // 0=auto, 1=manual, 2=no registration
}

interface CreateZoomMeetingParams {
  topic: string;
  type: 1 | 2 | 3 | 8; // 1=instant, 2=scheduled, 3=recurring no fixed time, 8=recurring with fixed time
  start_time?: string; // ISO 8601 format
  duration?: number; // in minutes
  timezone?: string;
  password?: string;
  agenda?: string;
  settings?: ZoomMeetingSettings;
}

interface ZoomMeetingResponse {
  id: number;
  host_id: string;
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  timezone: string;
  created_at: string;
  join_url: string;
  start_url: string;
  password?: string;
}

class ZoomAPI {
  private accountId: string;
  private clientId: string;
  private clientSecret: string;
  private baseURL = 'https://api.zoom.us/v2';
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.accountId = process.env.ZOOM_ACCOUNT_ID || '';
    this.clientId = process.env.ZOOM_CLIENT_ID || '';
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET || '';

    if (!this.accountId || !this.clientId || !this.clientSecret) {
      console.warn('Zoom API credentials not configured');
    }
  }

  /**
   * Get OAuth access token using Server-to-Server OAuth
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${this.accountId}`;

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get Zoom access token: ${error}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      // Set expiry with 5-minute buffer
      this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

      return this.accessToken;
    } catch (error) {
      console.error('Error getting Zoom access token:', error);
      throw error;
    }
  }

  /**
   * Create a Zoom meeting
   */
  async createMeeting(
    userId: string, // Zoom user email or user ID
    params: CreateZoomMeetingParams
  ): Promise<ZoomMeetingResponse> {
    const token = await this.getAccessToken();

    console.log('[Zoom API] Creating meeting for user:', userId);
    console.log('[Zoom API] Meeting params:', JSON.stringify(params, null, 2));

    const response = await fetch(`${this.baseURL}/users/${userId}/meetings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Zoom API] Create meeting failed:', error);
      console.error('[Zoom API] Failed for user:', userId);
      throw new Error(`Failed to create Zoom meeting for ${userId}: ${error}`);
    }

    const result = await response.json();
    console.log('[Zoom API] Meeting created successfully:', result.id);
    return result;
  }

  /**
   * Update a Zoom meeting
   */
  async updateMeeting(
    meetingId: string | number,
    params: Partial<CreateZoomMeetingParams>
  ): Promise<void> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseURL}/meetings/${meetingId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update Zoom meeting: ${error}`);
    }
  }

  /**
   * Delete a Zoom meeting
   */
  async deleteMeeting(meetingId: string | number): Promise<void> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseURL}/meetings/${meetingId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete Zoom meeting: ${error}`);
    }
  }

  /**
   * Get meeting details
   */
  async getMeeting(meetingId: string | number): Promise<ZoomMeetingResponse> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseURL}/meetings/${meetingId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get Zoom meeting: ${error}`);
    }

    return response.json();
  }

  /**
   * List user's meetings
   */
  async listMeetings(
    userId: string,
    type: 'scheduled' | 'live' | 'upcoming' = 'scheduled'
  ): Promise<{ meetings: ZoomMeetingResponse[] }> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `${this.baseURL}/users/${userId}/meetings?type=${type}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to list Zoom meetings: ${error}`);
    }

    return response.json();
  }
}

// Singleton instance
export const zoomAPI = new ZoomAPI();

// Helper function to create a Zoom meeting for Zenora meetings
export async function createZoomMeetingForEvent(params: {
  title: string;
  startTime: Date;
  duration: number; // in minutes
  description?: string;
  hostEmail: string;
}) {
  const zoomParams: CreateZoomMeetingParams = {
    topic: params.title,
    type: 2, // Scheduled meeting
    start_time: params.startTime.toISOString(),
    duration: params.duration,
    timezone: 'UTC',
    agenda: params.description,
    settings: {
      host_video: true,
      participant_video: true,
      join_before_host: false,
      mute_upon_entry: true,
      waiting_room: true,
      audio: 'both',
      auto_recording: 'none',
      approval_type: 0, // Auto-approve
    },
  };

  return zoomAPI.createMeeting(params.hostEmail, zoomParams);
}
