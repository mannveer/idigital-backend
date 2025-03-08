import { StorageService } from './StorageService';
import { LocalStorageService } from './LocalStorageService';
import config from '../../config';

export * from './IStorageService';

// Initialize storage service
const storage: StorageService = new LocalStorageService();

export { storage }; 