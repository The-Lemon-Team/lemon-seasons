import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CommitPackage, DeviceRef, GDriveAuthStatus } from '@lenta/shared';

export interface TokenData {
  access_token: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
  user_email?: string;
}

@Injectable()
export class GDriveStorageService {
  private readonly logger = new Logger(GDriveStorageService.name);

  // Configuration for local relay or direct Google Drive
  public get defaultSyncDir(): string {
    return (
      process.env.GDRIVE_SYNC_FOLDER ||
      path.join(os.homedir(), '.lemon', 'gdrive-relay', 'LemonCalendarium')
    );
  }

  private readonly tokensPath = path.join(os.homedir(), '.lemon', 'gdrive-tokens.json');

  private readonly clientId = process.env.GDRIVE_CLIENT_ID || '';
  private readonly clientSecret = process.env.GDRIVE_CLIENT_SECRET || '';
  private readonly redirectUri =
    process.env.GDRIVE_REDIRECT_URI || 'http://localhost:3001/api/sync/gdrive/callback';

  constructor() {
    this.ensureLocalStorageDirectories();
  }

  /**
   * Initializes local directory structure for commits, refs, snapshots, and media.
   */
  public ensureLocalStorageDirectories(): void {
    const subdirs = ['commits', 'refs', 'snapshots', 'media'];
    for (const subdir of subdirs) {
      const fullPath = path.join(this.defaultSyncDir, subdir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }
    const tokenDir = path.dirname(this.tokensPath);
    if (!fs.existsSync(tokenDir)) {
      fs.mkdirSync(tokenDir, { recursive: true });
    }
  }

  /**
   * Returns current Google Drive authentication and connection status.
   */
  async getAuthStatus(): Promise<GDriveAuthStatus> {
    const tokens = this.readSavedTokens();
    if (!tokens || !tokens.access_token) {
      return {
        authenticated: false,
        userEmail: null,
        tokenExpiry: null,
      };
    }

    return {
      authenticated: true,
      userEmail: tokens.user_email || 'authorized-google-account',
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    };
  }

  /**
   * Generates OAuth2 consent URL for Google Drive.
   */
  getOAuthConsentUrl(): string {
    if (!this.clientId) {
      // If no client ID configured, return informational placeholder
      return `http://localhost:3001/api/sync/gdrive/callback?demo=true`;
    }

    const scope = encodeURIComponent(
      'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
    );
    const redirect = encodeURIComponent(this.redirectUri);

    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${this.clientId}&redirect_uri=${redirect}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  }

  /**
   * Exchanges authorization code for tokens and saves them locally.
   */
  async handleOAuthCallback(code: string): Promise<TokenData> {
    if (code === 'demo' || !this.clientId) {
      const demoToken: TokenData = {
        access_token: 'demo-token-' + Date.now(),
        refresh_token: 'demo-refresh-' + Date.now(),
        user_email: 'demo@lemon-calendarium.org',
        expiry_date: Date.now() + 3600 * 1000,
      };
      this.saveTokens(demoToken);
      return demoToken;
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Failed to exchange oauth code: ${errorText}`);
      throw new Error(`Google OAuth exchange failed: ${errorText}`);
    }

    const tokenData = (await response.json()) as TokenData;
    this.saveTokens(tokenData);
    return tokenData;
  }

  /**
   * Uploads a sealed CommitPackage into the commits directory.
   */
  async uploadCommit(commitPackage: CommitPackage): Promise<string> {
    const filename = `${commitPackage.commitId}.json`;
    const localFilePath = path.join(this.defaultSyncDir, 'commits', filename);

    // Save locally into sync hub folder (works with Google Drive desktop client or local relay)
    fs.writeFileSync(localFilePath, JSON.stringify(commitPackage, null, 2), 'utf-8');
    this.logger.log(`Saved commit file locally: ${localFilePath}`);

    // If cloud Google Drive API is active, also push via REST API
    const tokens = await this.getValidAccessToken();
    if (tokens) {
      try {
        await this.uploadFileToCloudDrive(
          filename,
          JSON.stringify(commitPackage),
          'application/json',
          'commits',
        );
      } catch (err) {
        this.logger.warn(`Cloud push failed, commit remains in local relay: ${err.message}`);
      }
    }

    return filename;
  }

  /**
   * Lists available remote commits.
   */
  async listRemoteCommits(): Promise<string[]> {
    const commitsDir = path.join(this.defaultSyncDir, 'commits');
    if (!fs.existsSync(commitsDir)) {
      return [];
    }

    const files = fs
      .readdirSync(commitsDir)
      .filter((file) => file.endsWith('.json'))
      .sort();

    return files;
  }

  /**
   * Downloads or reads a commit package by its filename or commitId.
   */
  async downloadCommit(commitFilenameOrId: string): Promise<CommitPackage> {
    const filename = commitFilenameOrId.endsWith('.json')
      ? commitFilenameOrId
      : `${commitFilenameOrId}.json`;
    const localFilePath = path.join(this.defaultSyncDir, 'commits', filename);

    if (fs.existsSync(localFilePath)) {
      const content = fs.readFileSync(localFilePath, 'utf-8');
      return JSON.parse(content) as CommitPackage;
    }

    // Try fetching from Google Drive cloud if not in local folder
    const tokens = await this.getValidAccessToken();
    if (tokens) {
      const content = await this.downloadFileFromCloudDrive(filename);
      if (content) {
        fs.writeFileSync(localFilePath, content, 'utf-8');
        return JSON.parse(content) as CommitPackage;
      }
    }

    throw new Error(`Commit file ${filename} not found locally or in Google Drive`);
  }

  /**
   * Updates or writes device HEAD reference (refs/<deviceId>.json).
   */
  async updateDeviceRef(ref: DeviceRef): Promise<void> {
    const filename = `${ref.deviceId}.json`;
    const localFilePath = path.join(this.defaultSyncDir, 'refs', filename);
    fs.writeFileSync(localFilePath, JSON.stringify(ref, null, 2), 'utf-8');

    const tokens = await this.getValidAccessToken();
    if (tokens) {
      try {
        await this.uploadFileToCloudDrive(
          filename,
          JSON.stringify(ref),
          'application/json',
          'refs',
        );
      } catch (err) {
        this.logger.warn(`Could not upload ref ${filename} to cloud: ${err.message}`);
      }
    }
  }

  /**
   * Retrieves all device references from refs/ directory.
   */
  async getAllDeviceRefs(): Promise<DeviceRef[]> {
    const refsDir = path.join(this.defaultSyncDir, 'refs');
    if (!fs.existsSync(refsDir)) {
      return [];
    }

    const files = fs.readdirSync(refsDir).filter((file) => file.endsWith('.json'));
    const refs: DeviceRef[] = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(refsDir, file), 'utf-8');
        refs.push(JSON.parse(content));
      } catch (err) {
        this.logger.warn(`Could not parse ref file ${file}`);
      }
    }

    return refs;
  }

  /**
   * Returns current sync storage path.
   */
  getSyncFolderPath(): string {
    return this.defaultSyncDir;
  }

  // --- Internal Google Drive Cloud REST Helpers ---

  private readSavedTokens(): TokenData | null {
    if (!fs.existsSync(this.tokensPath)) {
      return null;
    }
    try {
      const raw = fs.readFileSync(this.tokensPath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private saveTokens(data: TokenData): void {
    fs.writeFileSync(this.tokensPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  private async getValidAccessToken(): Promise<string | null> {
    const tokens = this.readSavedTokens();
    if (!tokens || !tokens.access_token) return null;

    if (tokens.expiry_date && tokens.expiry_date < Date.now() + 60000 && tokens.refresh_token) {
      // Refresh token
      try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            refresh_token: tokens.refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        if (response.ok) {
          const fresh = (await response.json()) as any;
          tokens.access_token = fresh.access_token;
          if (fresh.expires_in) {
            tokens.expiry_date = Date.now() + fresh.expires_in * 1000;
          }
          this.saveTokens(tokens);
          return tokens.access_token;
        }
      } catch (err) {
        this.logger.warn(`Failed to refresh token: ${err.message}`);
      }
    }

    return tokens.access_token;
  }

  private async uploadFileToCloudDrive(
    filename: string,
    content: string,
    mimeType: string,
    folder: string,
  ): Promise<void> {
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) return;

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: filename,
      mimeType,
      description: `Lemon Calendarium sync file in ${folder}`,
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}\r\n\r\n` +
      content +
      closeDelimiter;

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`GDrive upload failed: ${err}`);
    }
  }

  private async downloadFileFromCloudDrive(filename: string): Promise<string | null> {
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) return null;

    // Search for file by name
    const q = encodeURIComponent(`name = '${filename}' and trashed = false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!searchRes.ok) return null;
    const searchData = (await searchRes.json()) as any;
    if (!searchData.files || searchData.files.length === 0) return null;

    const fileId = searchData.files[0].id;
    const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!downloadRes.ok) return null;
    return downloadRes.text();
  }
}
