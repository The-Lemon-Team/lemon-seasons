import axios from 'axios';

const CONTAINERS_API_URL = import.meta.env.VITE_CONTAINERS_API_URL || 'http://localhost:3000';

export const containersApiClient = axios.create({
  baseURL: CONTAINERS_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

export type ContainerType = 'simple' | 'git';

export interface ContainerSummaryDto {
  id: string;
  name: string;
  type: ContainerType;
  description?: string;
  key?: string;
  totalFiles: number;
  totalSizeBytes?: number;
  currentCommit?: string;
  lastCommitMessage?: string;
  lastCommitDate?: string;
  lastModified?: string;
  isGit: boolean;
  privacy?: 'private' | 'public';
  visibility?: 'private' | 'public';
  isPublic?: boolean;
}

export interface RegisterContainerRequestDto {
  id?: string;
  name: string;
  type: ContainerType;
  description?: string;
  rootPath?: string;
  privacy?: 'private' | 'public';
  isPublic?: boolean;
}

export interface SyncStatusDto {
  status: 'ok' | 'initializing' | 'error';
  currentCommit?: string;
  totalTrackedFiles: number;
  repositoryPath: string;
  totalSizeBytes?: number;
  containerType?: ContainerType;
  lastModified?: string;
  lastCommitMessage?: string;
  lastCommitDate?: string;
}

export interface CommitSummaryDto {
  hash: string;
  shortHash: string;
  author: string;
  authorEmail?: string;
  date: string;
  relativeDate?: string;
  message: string;
  body?: string;
  filesChanged?: number;
  insertions?: number;
  deletions?: number;
}

export interface SyncPushRequestDto {
  baseCommit?: string;
  message?: string;
  files?: Array<{ path: string; content: string }>;
}

export interface SyncPushResponseDto {
  success: boolean;
  newCommit: string;
  filesChanged: number;
  message: string;
}

export interface SyncPullRequestDto {
  sinceCommit?: string;
  paths?: string[];
}

export interface SyncPullResponseDto {
  commit: string;
  files: Array<{ path: string; content: string; metadata?: any }>;
  isFullSync: boolean;
}

export const containersApi = {
  // Check health / server readiness
  checkServerHealth: async (): Promise<boolean> => {
    try {
      const res = await containersApiClient.get('/containers');
      return res.status === 200;
    } catch {
      return false;
    }
  },

  // List all registered containers from backend
  listContainers: async (): Promise<ContainerSummaryDto[]> => {
    const res = await containersApiClient.get<ContainerSummaryDto[]>('/containers');
    return res.data;
  },

  // Get specific container summary by ID
  getContainerSummary: async (id: string): Promise<ContainerSummaryDto> => {
    const res = await containersApiClient.get<ContainerSummaryDto>(`/containers/${id}`);
    return res.data;
  },

  // Connect container by key
  connectContainerByKey: async (key: string): Promise<ContainerSummaryDto> => {
    const res = await containersApiClient.post<ContainerSummaryDto>('/containers/connect', { key });
    return res.data;
  },

  // Register a new container
  registerContainer: async (input: RegisterContainerRequestDto): Promise<ContainerSummaryDto> => {
    const res = await containersApiClient.post<ContainerSummaryDto>('/containers/register', input);
    return res.data;
  },

  // Delete container by ID
  deleteContainer: async (id: string): Promise<{ success: boolean }> => {
    const res = await containersApiClient.delete<{ success: boolean }>(`/containers/${id}`);
    return res.data;
  },

  // Container File Tree
  getContainerTree: async (id: string): Promise<any> => {
    const res = await containersApiClient.get(`/containers/${id}/tree`);
    return res.data;
  },

  // Container Status
  getContainerStatus: async (id: string): Promise<SyncStatusDto> => {
    const res = await containersApiClient.get<SyncStatusDto>(`/containers/${id}/status`);
    return res.data;
  },

  // Push Changes
  pushContainer: async (id: string, dto: SyncPushRequestDto = {}): Promise<SyncPushResponseDto> => {
    const res = await containersApiClient.post<SyncPushResponseDto>(`/containers/${id}/push`, dto);
    return res.data;
  },

  // Pull Changes
  pullContainer: async (id: string, dto: SyncPullRequestDto = {}): Promise<SyncPullResponseDto> => {
    const res = await containersApiClient.post<SyncPullResponseDto>(`/containers/${id}/pull`, dto);
    return res.data;
  },

  // Commit History (Git Container Time Machine)
  getContainerCommits: async (id: string, limit = 50): Promise<CommitSummaryDto[]> => {
    const res = await containersApiClient.get<CommitSummaryDto[]>(`/containers/${id}/commits`, {
      params: { limit },
    });
    return res.data;
  },
};
