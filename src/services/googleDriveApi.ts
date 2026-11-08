import { getAccessToken } from './googleDriveAuth';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  parents?: string[];
  iconLink?: string;
}

export interface DriveStorageQuota {
  limit?: string;
  usage?: string;
  usageInDrive?: string;
  usageInDriveTrash?: string;
  user?: {
    displayName?: string;
    emailAddress?: string;
    photoLink?: string;
  };
}

/**
 * Fetch storage quota and user info from Google Drive
 */
export const getDriveAbout = async (): Promise<DriveStorageQuota> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Drive access token not available. Please sign in.');

  const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota,user', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch Drive information (${res.status})`);
  }

  const data = await res.json();
  return {
    limit: data.storageQuota?.limit,
    usage: data.storageQuota?.usage,
    usageInDrive: data.storageQuota?.usageInDrive,
    usageInDriveTrash: data.storageQuota?.usageInDriveTrash,
    user: data.user,
  };
};

/**
 * List files and folders from Google Drive
 */
export const listDriveFiles = async (options?: {
  folderId?: string;
  searchQuery?: string;
  pageSize?: number;
}): Promise<DriveFileItem[]> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Drive access token not available. Please sign in.');

  const queryParts = ['trashed = false'];

  if (options?.folderId) {
    queryParts.push(`'${options.folderId}' in parents`);
  }

  if (options?.searchQuery?.trim()) {
    const cleanSearch = options.searchQuery.replace(/'/g, "\\'");
    queryParts.push(`name contains '${cleanSearch}'`);
  }

  const q = queryParts.join(' and ');
  const fields = 'files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,parents,iconLink)';
  const pageSize = options?.pageSize || 50;

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&fields=${encodeURIComponent(fields)}&pageSize=${pageSize}&orderBy=folder,modifiedTime desc`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to list files from Google Drive (${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
};

/**
 * Create a folder in Google Drive
 */
export const createDriveFolder = async (folderName: string, parentFolderId?: string): Promise<DriveFileItem> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Drive access token not available. Please sign in.');

  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create folder in Google Drive (${res.status})`);
  }

  return await res.json();
};

/**
 * Get or create the default POS Backups folder in Google Drive
 */
export const getOrCreatePOSFolder = async (): Promise<string> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Drive access token not available. Please sign in.');

  const folderName = 'SuperStore_POS_Backups';
  // Check if folder exists
  const files = await listDriveFiles({ searchQuery: folderName });
  const existingFolder = files.find(
    (f) => f.name === folderName && f.mimeType === 'application/vnd.google-apps.folder'
  );

  if (existingFolder) {
    return existingFolder.id;
  }

  // Create folder
  const newFolder = await createDriveFolder(folderName);
  return newFolder.id;
};

/**
 * Upload a JSON file (such as a POS database backup) to Google Drive
 */
export const uploadJsonToDrive = async (
  fileName: string,
  jsonData: any,
  parentFolderId?: string
): Promise<DriveFileItem> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Drive access token not available. Please sign in.');

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata: any = {
    name: fileName,
    mimeType: 'application/json',
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const jsonString = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData, null, 2);

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    jsonString +
    closeDelimiter;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to upload file to Google Drive (${res.status})`);
  }

  return await res.json();
};

/**
 * Upload an arbitrary file (blob) to Google Drive
 */
export const uploadFileToDrive = async (
  file: File,
  parentFolderId?: string
): Promise<DriveFileItem> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Drive access token not available. Please sign in.');

  const metadata: any = {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
  };

  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const fileData = await file.arrayBuffer();

  const metadataPart =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`;

  const encoder = new TextEncoder();
  const metadataBuffer = encoder.encode(metadataPart);
  const closeDelimiterBuffer = encoder.encode(closeDelimiter);

  // Combine into single Uint8Array
  const combined = new Uint8Array(metadataBuffer.length + fileData.byteLength + closeDelimiterBuffer.length);
  combined.set(metadataBuffer, 0);
  combined.set(new Uint8Array(fileData), metadataBuffer.length);
  combined.set(closeDelimiterBuffer, metadataBuffer.length + fileData.byteLength);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: combined,
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to upload file to Google Drive (${res.status})`);
  }

  return await res.json();
};

/**
 * Download file content as text (e.g. for restoring JSON backups)
 */
export const downloadDriveFileText = async (fileId: string): Promise<string> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Drive access token not available. Please sign in.');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to download file from Google Drive (${res.status})`);
  }

  return await res.text();
};

/**
 * Delete a file or folder from Google Drive
 * CAUTION: MUST only be called after explicit user confirmation in the UI!
 */
export const deleteDriveFile = async (fileId: string): Promise<void> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Drive access token not available. Please sign in.');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to delete file from Google Drive (${res.status})`);
  }
};
