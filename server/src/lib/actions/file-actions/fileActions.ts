'use server'

import { createTenantKnex } from '../../../lib/db';
import { StorageService } from '../../../lib/storage/StorageService';
import { FileStoreModel } from '../../../models/storage';
import { FileStore } from '../../../types/storage';

export async function uploadFile(
    formData: FormData
): Promise<{ success: boolean; file?: FileStore; error?: string }> {
    try {
        const { knex, tenant } = await createTenantKnex();
        if (!tenant) {
            throw new Error('No tenant found');
        }

        const file = formData.get('file') as File;
        if (!file) {
            throw new Error('No file provided');
        }

        const uploaded_by = formData.get('uploaded_by') as string;

        if (!uploaded_by) {
            throw new Error('Missing required fields');
        }

        // Validate file before upload
        await StorageService.validateFileUpload(
            tenant,
            file.type,
            file.size
        );

        // Convert File to Buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload file using StorageService
        const fileRecord = await StorageService.uploadFile(tenant, buffer, file.name, {
            mime_type: file.type,
            uploaded_by,
        });

        return { success: true, file: fileRecord };
    } catch (error) {
        console.error('Upload file error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to upload file',
        };
    }
}

export async function downloadFile(
    file_id: string
): Promise<{ success: boolean; data?: { buffer: Buffer; metadata: any }; error?: string }> {
    try {
        const { tenant } = await createTenantKnex();
        if (!tenant) {
            throw new Error('No tenant found');
        }

        const result = await StorageService.downloadFile(tenant, file_id);
        return { success: true, data: result };
    } catch (error) {
        console.error('Download file error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to download file',
        };
    }
}

export async function deleteFile(
    file_id: string,
    deleted_by: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { tenant } = await createTenantKnex();
        if (!tenant) {
            throw new Error('No tenant found');
        }

        await StorageService.deleteFile(tenant, file_id, deleted_by);
        return { success: true };
    } catch (error) {
        console.error('Delete file error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete file',
        };
    }
}

export async function validateFileUpload(
    mime_type: string,
    file_size: number
): Promise<{ success: boolean; error?: string }> {
    console.log('Starting validateFileUpload:', { mime_type, file_size });
    try {
        const { tenant } = await createTenantKnex();
        if (!tenant) {
            console.log('No tenant found');
            throw new Error('No tenant found');
        }
        console.log('Tenant found:', tenant);

        await StorageService.validateFileUpload(tenant, mime_type, file_size);
        console.log('File validation successful');
        return { success: true };
    } catch (error) {
        console.error('Validate file error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to validate file',
        };
    }
}
