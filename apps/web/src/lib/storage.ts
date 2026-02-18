/**
 * Storage module using AWS Amplify Storage SDK
 * 
 * This module provides a clean interface for document storage operations
 * using Amplify Storage with S3 backend.
 * 
 * Features:
 * - Upload documents with automatic tenant isolation
 * - Generate presigned URLs for secure downloads
 * - List documents by type and entity
 * - Delete documents (admin only)
 */

import { uploadData, getUrl, list, remove } from 'aws-amplify/storage';
import { getCurrentUser } from './auth';

export interface UploadOptions {
  documentType: 'invoices' | 'receipts' | 'documents' | 'shipments';
  entityId: string;
  file: File;
  onProgress?: (progress: number) => void;
}

export interface UploadResult {
  key: string;
  url: string;
}

/**
 * Upload a document to Amplify Storage
 * 
 * The document will be stored with tenant isolation:
 * - Path: {documentType}/{entityId}/{filename}
 * - Access: Controlled by Amplify Storage access rules
 * 
 * @param options Upload configuration
 * @returns Upload result with S3 key and presigned URL
 */
export async function uploadDocument(options: UploadOptions): Promise<UploadResult> {
  const { documentType, entityId, file, onProgress } = options;
  
  // Construct the S3 key with tenant isolation
  const timestamp = Date.now();
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `${documentType}/${entityId}/${timestamp}-${sanitizedFilename}`;
  
  try {
    // Upload file to S3 via Amplify Storage
    const result = await uploadData({
      key,
      data: file,
      options: {
        contentType: file.type,
        metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
        onProgress: (event) => {
          if (onProgress && event.totalBytes) {
            const progress = (event.transferredBytes / event.totalBytes) * 100;
            onProgress(Math.round(progress));
          }
        },
      },
    }).result;
    
    // Generate presigned URL for immediate access
    const urlResult = await getUrl({
      key: result.key,
      options: {
        expiresIn: 3600, // 1 hour
      },
    });
    
    return {
      key: result.key,
      url: urlResult.url.toString(),
    };
  } catch (error) {
    console.error('Upload failed:', error);
    throw new Error(`Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get a presigned URL for a document
 * 
 * @param key S3 key of the document
 * @param expiresIn URL expiration time in seconds (default: 1 hour)
 * @returns Presigned URL
 */
export async function getDocumentUrl(key: string, expiresIn: number = 3600): Promise<string> {
  try {
    const result = await getUrl({
      key,
      options: {
        expiresIn,
      },
    });
    
    return result.url.toString();
  } catch (error) {
    console.error('Failed to get document URL:', error);
    throw new Error(`Failed to get document URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * List documents for a specific entity
 * 
 * @param documentType Type of documents to list
 * @param entityId Entity ID (tenant-isolated)
 * @returns Array of document keys
 */
export async function listDocuments(
  documentType: 'invoices' | 'receipts' | 'documents' | 'shipments',
  entityId: string
): Promise<string[]> {
  try {
    const prefix = `${documentType}/${entityId}/`;
    const result = await list({
      prefix,
    });
    
    return result.items.map(item => item.key);
  } catch (error) {
    console.error('Failed to list documents:', error);
    throw new Error(`Failed to list documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a document (admin only)
 * 
 * @param key S3 key of the document to delete
 */
export async function deleteDocument(key: string): Promise<void> {
  try {
    // Check if user is admin
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      throw new Error('Only admin users can delete documents');
    }
    
    await remove({
      key,
    });
  } catch (error) {
    console.error('Failed to delete document:', error);
    throw new Error(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Download a document
 * 
 * @param key S3 key of the document
 * @param filename Filename for the download
 */
export async function downloadDocument(key: string, filename?: string): Promise<void> {
  try {
    const url = await getDocumentUrl(key);
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || key.split('/').pop() || 'document';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Failed to download document:', error);
    throw new Error(`Failed to download document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
